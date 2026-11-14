package com.calishome.api.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Auth", description = "Registro, login, verificación de email, recuperación y refresh token")
public class AuthController {

    private final AuthService authService;
    private final AuthRateLimiter rateLimiter;
    private final AuthProperties authProperties;

    public AuthController(
            AuthService authService,
            AuthRateLimiter rateLimiter,
            AuthProperties authProperties) {
        this.authService = authService;
        this.rateLimiter = rateLimiter;
        this.authProperties = authProperties;
    }

    @GetMapping("/csrf")
    @Operation(summary = "Emitir token CSRF en cookie para clientes SPA")
    public ResponseEntity<MessageResponse> getCsrfToken(CsrfToken csrfToken) {
        // Acceder al token garantiza que Spring Security emita la cookie XSRF-TOKEN
        csrfToken.getToken();
        return ResponseEntity.ok(new MessageResponse("CSRF cookie initialized."));
    }

    @PostMapping("/register")
    @Operation(summary = "Registrar usuario con correo y contraseña")
    public ResponseEntity<MessageResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        rateLimiter.checkLimit("register", resolveClientIp(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/verify-email")
    @Operation(summary = "Verificar correo electrónico con token")
    public ResponseEntity<MessageResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request));
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Reenviar enlace de verificación")
    public ResponseEntity<MessageResponse> resendVerification(
            @Valid @RequestBody EmailRequest request,
            HttpServletRequest httpRequest) {
        rateLimiter.checkLimit("resend-verification", resolveClientIp(httpRequest));
        return ResponseEntity.accepted().body(authService.resendVerification(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión con correo y contraseña")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        rateLimiter.checkLimit("login", resolveClientIp(httpRequest));
        AuthSessionResult session = authService.login(
                request,
                httpRequest.getHeader(HttpHeaders.USER_AGENT),
                resolveClientIp(httpRequest)
        );
        return buildSessionResponse(session);
    }

    @PostMapping("/google")
    @Operation(summary = "Iniciar sesión con Google OIDC (idToken validado en servidor)")
    public ResponseEntity<AuthResponse> loginWithGoogle(
            @Valid @RequestBody GoogleAuthRequest request,
            HttpServletRequest httpRequest) {
        rateLimiter.checkLimit("google", resolveClientIp(httpRequest));
        AuthSessionResult session = authService.loginWithGoogle(
                request,
                httpRequest.getHeader(HttpHeaders.USER_AGENT),
                resolveClientIp(httpRequest)
        );
        return buildSessionResponse(session);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotar refresh token HttpOnly y emitir nuevo access token JWT")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = "${app.auth.refresh.cookie-name}", required = false) String rawRefreshToken,
            HttpServletRequest httpRequest) {
        AuthSessionResult session = authService.refresh(
                rawRefreshToken,
                httpRequest.getHeader(HttpHeaders.USER_AGENT),
                resolveClientIp(httpRequest)
        );
        return buildSessionResponse(session);
    }

    @PostMapping("/logout")
    @Operation(summary = "Cerrar sesión y revocar familia de refresh tokens")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "${app.auth.refresh.cookie-name}", required = false) String rawRefreshToken) {
        authService.logout(rawRefreshToken);
        ResponseCookie clearedCookie = buildRefreshCookie("", Duration.ZERO);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearedCookie.toString())
                .build();
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Solicitar enlace de recuperación de contraseña")
    public ResponseEntity<MessageResponse> forgotPassword(
            @Valid @RequestBody EmailRequest request,
            HttpServletRequest httpRequest) {
        rateLimiter.checkLimit("forgot-password", resolveClientIp(httpRequest));
        return ResponseEntity.accepted().body(authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Restablecer contraseña usando token de un solo uso")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    private ResponseEntity<AuthResponse> buildSessionResponse(AuthSessionResult session) {
        ResponseCookie cookie = buildRefreshCookie(
                session.rawRefreshToken(),
                Duration.ofDays(authProperties.refresh().ttlDays())
        );
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(session.response());
    }

    private ResponseCookie buildRefreshCookie(String value, Duration maxAge) {
        return ResponseCookie.from(authProperties.refresh().cookieName(), value)
                .httpOnly(true)
                .secure(authProperties.refresh().cookieSecure())
                .sameSite(authProperties.refresh().cookieSameSite())
                .path("/api/v1/auth")
                .maxAge(maxAge)
                .build();
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
