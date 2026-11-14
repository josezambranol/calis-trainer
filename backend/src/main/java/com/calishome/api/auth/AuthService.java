package com.calishome.api.auth;

import com.calishome.api.common.web.ApiException;
import com.calishome.api.users.AuthProvider;
import com.calishome.api.users.UserEntity;
import com.calishome.api.users.UserProfileEntity;
import com.calishome.api.users.UserProfileRepository;
import com.calishome.api.users.UserRepository;
import com.calishome.api.users.UserResponse;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenHashService tokenHashService;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final EmailSender emailSender;
    private final AuthProperties authProperties;

    public AuthService(
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            RefreshTokenRepository refreshTokenRepository,
            EmailVerificationTokenRepository emailVerificationTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            TokenHashService tokenHashService,
            JwtService jwtService,
            GoogleTokenVerifier googleTokenVerifier,
            EmailSender emailSender,
            AuthProperties authProperties) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenHashService = tokenHashService;
        this.jwtService = jwtService;
        this.googleTokenVerifier = googleTokenVerifier;
        this.emailSender = emailSender;
        this.authProperties = authProperties;
    }

    @Transactional
    public MessageResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailAndDeletedAtIsNull(email)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Correo ya registrado",
                    "Ya existe una cuenta registrada con ese correo electrónico.",
                    "email-already-exists"
            );
        }

        UserEntity user = new UserEntity();
        user.setEmail(email);
        user.setFullName(request.fullName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setEmailVerified(false);
        user = userRepository.save(user);

        UserProfileEntity profile = createDefaultProfile(user);
        userProfileRepository.save(profile);

        issueAndSendEmailVerification(user);

        return new MessageResponse(
                "Cuenta creada. Revisa tu correo electrónico para verificar tu cuenta antes de iniciar sesión."
        );
    }

    @Transactional
    public MessageResponse verifyEmail(VerifyEmailRequest request) {
        String hash = tokenHashService.sha256Hex(request.token().trim());
        EmailVerificationTokenEntity token = emailVerificationTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> invalidTokenException("El enlace de verificación es inválido o expiró."));

        Instant now = Instant.now();
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(now)) {
            throw invalidTokenException("El enlace de verificación es inválido o ya fue utilizado.");
        }

        UserEntity user = userRepository.findByIdAndDeletedAtIsNull(token.getUserId())
                .orElseThrow(() -> invalidTokenException("Usuario asociado no encontrado."));

        token.setUsedAt(now);
        emailVerificationTokenRepository.save(token);

        user.setEmailVerified(true);
        userRepository.save(user);

        return new MessageResponse("Correo verificado correctamente. Ya puedes iniciar sesión.");
    }

    @Transactional
    public MessageResponse resendVerification(EmailRequest request) {
        String email = normalizeEmail(request.email());
        userRepository.findByEmailAndDeletedAtIsNull(email).ifPresent(user -> {
            if (!user.isEmailVerified()) {
                emailVerificationTokenRepository.invalidateActiveForUser(user.getId(), Instant.now());
                issueAndSendEmailVerification(user);
            }
        });
        return new MessageResponse(
                "Si el correo existe y está pendiente de verificación, hemos enviado un nuevo enlace."
        );
    }

    @Transactional(noRollbackFor = ApiException.class)
    public AuthSessionResult login(LoginRequest request, String userAgent, String ipAddress) {
        String email = normalizeEmail(request.email());
        UserEntity user = userRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(this::invalidCredentialsException);

        Instant now = Instant.now();
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            throw accountLockedException();
        }

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            registerFailedAttempt(user, now);
            throw invalidCredentialsException();
        }

        if (!user.isEmailVerified()) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Correo no verificado",
                    "Debes verificar tu correo electrónico antes de iniciar sesión.",
                    "email-not-verified"
            );
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        UserProfileEntity profile = getOrCreateProfile(user);
        return issueSession(user, profile, UUID.randomUUID(), userAgent, ipAddress);
    }

    @Transactional
    public AuthSessionResult loginWithGoogle(GoogleAuthRequest request, String userAgent, String ipAddress) {
        GoogleUserClaims claims = googleTokenVerifier.verify(request.idToken());
        String email = normalizeEmail(claims.email());

        UserEntity user = userRepository.findByGoogleSubAndDeletedAtIsNull(claims.sub())
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(email))
                .orElseGet(() -> {
                    UserEntity created = new UserEntity();
                    created.setEmail(email);
                    created.setFullName(claims.fullName());
                    created.setAuthProvider(AuthProvider.GOOGLE);
                    created.setGoogleSub(claims.sub());
                    created.setEmailVerified(true);
                    return userRepository.save(created);
                });

        if (user.getGoogleSub() == null) {
            user.setGoogleSub(claims.sub());
        }
        if (user.getAuthProvider() == AuthProvider.LOCAL) {
            user.setAuthProvider(AuthProvider.BOTH);
        }
        user.setEmailVerified(true);
        user = userRepository.save(user);

        UserProfileEntity profile = getOrCreateProfile(user);
        return issueSession(user, profile, UUID.randomUUID(), userAgent, ipAddress);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public AuthSessionResult refresh(String rawRefreshToken, String userAgent, String ipAddress) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw unauthorizedRefreshException("Refresh token ausente.");
        }

        String hash = tokenHashService.sha256Hex(rawRefreshToken);
        RefreshTokenEntity existing = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> unauthorizedRefreshException("Refresh token inválido."));

        Instant now = Instant.now();
        if (existing.getRevokedAt() != null) {
            // Detección de reuso: revoca toda la familia de tokens inmediatamente
            refreshTokenRepository.revokeFamily(existing.getFamilyId(), now);
            throw unauthorizedRefreshException("Sesión revocada por detección de reuso de token.");
        }

        if (existing.getExpiresAt().isBefore(now)) {
            existing.setRevokedAt(now);
            refreshTokenRepository.save(existing);
            throw unauthorizedRefreshException("La sesión expiró. Inicia sesión nuevamente.");
        }

        UserEntity user = userRepository.findByIdAndDeletedAtIsNull(existing.getUserId())
                .orElseThrow(() -> unauthorizedRefreshException("Usuario no disponible."));

        UserProfileEntity profile = getOrCreateProfile(user);
        AuthSessionResult rotated = issueSession(user, profile, existing.getFamilyId(), userAgent, ipAddress);

        String newHash = tokenHashService.sha256Hex(rotated.rawRefreshToken());
        RefreshTokenEntity newEntity = refreshTokenRepository.findByTokenHash(newHash).orElseThrow();
        existing.setRevokedAt(now);
        existing.setReplacedByTokenId(newEntity.getId());
        refreshTokenRepository.save(existing);

        return rotated;
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        String hash = tokenHashService.sha256Hex(rawRefreshToken);
        refreshTokenRepository.findByTokenHash(hash).ifPresent(token ->
                refreshTokenRepository.revokeFamily(token.getFamilyId(), Instant.now())
        );
    }

    @Transactional
    public MessageResponse forgotPassword(EmailRequest request) {
        String email = normalizeEmail(request.email());
        userRepository.findByEmailAndDeletedAtIsNull(email).ifPresent(user -> {
            Instant now = Instant.now();
            passwordResetTokenRepository.invalidateActiveForUser(user.getId(), now);

            String rawToken = tokenHashService.generateOpaqueToken();
            PasswordResetTokenEntity resetToken = new PasswordResetTokenEntity();
            resetToken.setUserId(user.getId());
            resetToken.setTokenHash(tokenHashService.sha256Hex(rawToken));
            resetToken.setExpiresAt(now.plus(1, ChronoUnit.HOURS));
            passwordResetTokenRepository.save(resetToken);

            emailSender.sendPasswordReset(user.getEmail(), user.getFullName(), rawToken);
        });

        return new MessageResponse(
                "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."
        );
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        String hash = tokenHashService.sha256Hex(request.token().trim());
        PasswordResetTokenEntity token = passwordResetTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> invalidTokenException("El enlace de recuperación es inválido o expiró."));

        Instant now = Instant.now();
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(now)) {
            throw invalidTokenException("El enlace de recuperación es inválido o ya fue utilizado.");
        }

        UserEntity user = userRepository.findByIdAndDeletedAtIsNull(token.getUserId())
                .orElseThrow(() -> invalidTokenException("Usuario asociado no encontrado."));

        token.setUsedAt(now);
        passwordResetTokenRepository.save(token);

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        if (user.getAuthProvider() == AuthProvider.GOOGLE) {
            user.setAuthProvider(AuthProvider.BOTH);
        }
        userRepository.save(user);

        // Invalidar todas las sesiones activas tras cambio de contraseña
        refreshTokenRepository.revokeAllForUser(user.getId(), now);

        return new MessageResponse("Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
    }

    private void registerFailedAttempt(UserEntity user, Instant now) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= authProperties.lockout().maxAttempts()) {
            user.setLockedUntil(now.plus(authProperties.lockout().durationMinutes(), ChronoUnit.MINUTES));
            userRepository.save(user);
            throw accountLockedException();
        }
        userRepository.save(user);
    }

    private AuthSessionResult issueSession(
            UserEntity user,
            UserProfileEntity profile,
            UUID familyId,
            String userAgent,
            String ipAddress) {

        String accessToken = jwtService.issueAccessToken(user);
        String rawRefreshToken = tokenHashService.generateOpaqueToken();

        RefreshTokenEntity refreshEntity = new RefreshTokenEntity();
        refreshEntity.setUserId(user.getId());
        refreshEntity.setFamilyId(familyId);
        refreshEntity.setTokenHash(tokenHashService.sha256Hex(rawRefreshToken));
        refreshEntity.setExpiresAt(Instant.now().plus(authProperties.refresh().ttlDays(), ChronoUnit.DAYS));
        refreshEntity.setUserAgent(truncate(userAgent, 255));
        refreshEntity.setIpAddress(truncate(ipAddress, 45));
        refreshTokenRepository.save(refreshEntity);

        AuthResponse response = new AuthResponse(
                accessToken,
                jwtService.getAccessTokenTtlSeconds(),
                UserResponse.from(user, profile)
        );
        return new AuthSessionResult(response, rawRefreshToken);
    }

    private void issueAndSendEmailVerification(UserEntity user) {
        String rawToken = tokenHashService.generateOpaqueToken();
        EmailVerificationTokenEntity verification = new EmailVerificationTokenEntity();
        verification.setUserId(user.getId());
        verification.setTokenHash(tokenHashService.sha256Hex(rawToken));
        verification.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        emailVerificationTokenRepository.save(verification);

        emailSender.sendEmailVerification(user.getEmail(), user.getFullName(), rawToken);
    }

    private UserProfileEntity getOrCreateProfile(UserEntity user) {
        return userProfileRepository.findById(user.getId())
                .orElseGet(() -> userProfileRepository.save(createDefaultProfile(user)));
    }

    private UserProfileEntity createDefaultProfile(UserEntity user) {
        UserProfileEntity profile = new UserProfileEntity();
        profile.setUser(user);
        return profile;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String truncate(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLen ? value : value.substring(0, maxLen);
    }

    private ApiException invalidCredentialsException() {
        return new ApiException(
                HttpStatus.UNAUTHORIZED,
                "Credenciales inválidas",
                "Correo o contraseña incorrectos.",
                "invalid-credentials"
        );
    }

    private ApiException accountLockedException() {
        return new ApiException(
                HttpStatus.LOCKED,
                "Cuenta bloqueada temporalmente",
                "Demasiados intentos fallidos. Intenta de nuevo en unos minutos.",
                "account-locked"
        );
    }

    private ApiException invalidTokenException(String detail) {
        return new ApiException(
                HttpStatus.BAD_REQUEST,
                "Token inválido",
                detail,
                "invalid-token"
        );
    }

    private ApiException unauthorizedRefreshException(String detail) {
        return new ApiException(
                HttpStatus.UNAUTHORIZED,
                "Sesión inválida",
                detail,
                "invalid-refresh-token"
        );
    }
}
