package com.calishome.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.calishome.api.common.web.ApiException;
import com.calishome.api.users.AuthProvider;
import com.calishome.api.users.UserEntity;
import com.calishome.api.users.UserProfileEntity;
import com.calishome.api.users.UserProfileRepository;
import com.calishome.api.users.UserRepository;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.util.ReflectionTestUtils;

class AuthServiceTest {

    private UserRepository userRepository;
    private UserProfileRepository userProfileRepository;
    private RefreshTokenRepository refreshTokenRepository;
    private EmailVerificationTokenRepository emailVerificationTokenRepository;
    private PasswordResetTokenRepository passwordResetTokenRepository;
    private PasswordEncoder passwordEncoder;
    private TokenHashService tokenHashService;
    private JwtService jwtService;
    private GoogleTokenVerifier googleTokenVerifier;
    private EmailSender emailSender;
    private AuthProperties authProperties;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        userProfileRepository = mock(UserProfileRepository.class);
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        emailVerificationTokenRepository = mock(EmailVerificationTokenRepository.class);
        passwordResetTokenRepository = mock(PasswordResetTokenRepository.class);
        passwordEncoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
        tokenHashService = new TokenHashService();
        authProperties = new AuthProperties(
                new AuthProperties.Jwt("test-secret-key-at-least-32-bytes-long!!", "calishome-api", 15),
                new AuthProperties.Refresh(30, "calishome_refresh", false, "Lax"),
                new AuthProperties.Google("test-client-id"),
                "http://localhost:5173",
                new AuthProperties.Lockout(5, 15),
                new AuthProperties.RateLimit(false, 10)
        );
        SecretKeySpec secretKey = new SecretKeySpec(
                authProperties.jwt().secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        jwtService = new JwtService(new NimbusJwtEncoder(new ImmutableSecret<>(secretKey)), authProperties);
        googleTokenVerifier = mock(GoogleTokenVerifier.class);
        emailSender = mock(EmailSender.class);

        authService = new AuthService(
                userRepository,
                userProfileRepository,
                refreshTokenRepository,
                emailVerificationTokenRepository,
                passwordResetTokenRepository,
                passwordEncoder,
                tokenHashService,
                jwtService,
                googleTokenVerifier,
                emailSender,
                authProperties
        );
    }

    @Test
    void registerHashesPasswordWithArgon2AndStoresOnlyTokenHash() {
        when(userRepository.existsByEmailAndDeletedAtIsNull("jose@calishome.app")).thenReturn(false);
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> {
            UserEntity u = inv.getArgument(0);
            ReflectionTestUtils.setField(u, "id", UUID.randomUUID());
            return u;
        });

        authService.register(new RegisterRequest("Jose Zambrano", "Jose@CalisHome.app", "Fuerza2026"));

        ArgumentCaptor<UserEntity> userCaptor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(userCaptor.capture());
        UserEntity savedUser = userCaptor.getValue();
        assertThat(savedUser.getEmail()).isEqualTo("jose@calishome.app");
        assertThat(savedUser.getPasswordHash()).startsWith("$argon2id$");
        assertThat(savedUser.isEmailVerified()).isFalse();

        ArgumentCaptor<String> rawTokenCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailSender).sendEmailVerification(eq("jose@calishome.app"), eq("Jose Zambrano"), rawTokenCaptor.capture());
        String rawToken = rawTokenCaptor.getValue();

        ArgumentCaptor<EmailVerificationTokenEntity> tokenCaptor = ArgumentCaptor.forClass(EmailVerificationTokenEntity.class);
        verify(emailVerificationTokenRepository).save(tokenCaptor.capture());
        assertThat(tokenCaptor.getValue().getTokenHash()).isEqualTo(tokenHashService.sha256Hex(rawToken));
        assertThat(tokenCaptor.getValue().getTokenHash()).isNotEqualTo(rawToken);
    }

    @Test
    void loginLocksAccountAfterFiveFailedAttempts() {
        UserEntity user = createVerifiedUser("jose@calishome.app", "Fuerza2026");
        user.setFailedLoginAttempts(4);
        when(userRepository.findByEmailAndDeletedAtIsNull("jose@calishome.app")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(
                new LoginRequest("jose@calishome.app", "WrongPass1"), "JUnit", "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.LOCKED));

        assertThat(user.getFailedLoginAttempts()).isEqualTo(5);
        assertThat(user.getLockedUntil()).isAfter(Instant.now());
    }

    @Test
    void refreshReuseDetectionRevokesEntireTokenFamily() {
        UUID familyId = UUID.randomUUID();
        String rawToken = "reused-token-value";
        RefreshTokenEntity revokedEntity = new RefreshTokenEntity();
        revokedEntity.setUserId(UUID.randomUUID());
        revokedEntity.setFamilyId(familyId);
        revokedEntity.setTokenHash(tokenHashService.sha256Hex(rawToken));
        revokedEntity.setExpiresAt(Instant.now().plus(10, ChronoUnit.DAYS));
        revokedEntity.setRevokedAt(Instant.now().minus(1, ChronoUnit.MINUTES));

        when(refreshTokenRepository.findByTokenHash(tokenHashService.sha256Hex(rawToken)))
                .thenReturn(Optional.of(revokedEntity));

        assertThatThrownBy(() -> authService.refresh(rawToken, "JUnit", "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));

        verify(refreshTokenRepository).revokeFamily(eq(familyId), any(Instant.class));
    }

    @Test
    void googleLoginLinksExistingLocalAccountAsBothProvider() {
        UserEntity existing = createVerifiedUser("jose@gmail.com", "Fuerza2026");
        UserProfileEntity profile = new UserProfileEntity();
        profile.setUser(existing);

        when(googleTokenVerifier.verify("google-id-token"))
                .thenReturn(new GoogleUserClaims("sub-123", "jose@gmail.com", true, "Jose"));
        when(userRepository.findByGoogleSubAndDeletedAtIsNull("sub-123")).thenReturn(Optional.empty());
        when(userRepository.findByEmailAndDeletedAtIsNull("jose@gmail.com")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userProfileRepository.findById(existing.getId())).thenReturn(Optional.of(profile));

        AuthSessionResult result = authService.loginWithGoogle(
                new GoogleAuthRequest("google-id-token"), "JUnit", "127.0.0.1");

        assertThat(existing.getAuthProvider()).isEqualTo(AuthProvider.BOTH);
        assertThat(existing.getGoogleSub()).isEqualTo("sub-123");
        assertThat(result.response().accessToken()).isNotBlank();
        assertThat(result.rawRefreshToken()).isNotBlank();
    }

    private UserEntity createVerifiedUser(String email, String rawPassword) {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        user.setEmail(email);
        user.setFullName("Jose");
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setEmailVerified(true);
        return user;
    }
}
