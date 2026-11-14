package com.calishome.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.calishome.api.users.UserResponse;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class AuthIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private InMemoryEmailCapture emailCapture;

    @BeforeEach
    void clearEmails() {
        emailCapture.clear();
    }

    @Test
    void fullAuthLifecycleRegisterVerifyLoginRefreshReuseDetectionAndReset() {
        String email = "atleta@calishome.app";
        String password = "Password123";

        // 1. Register
        ResponseEntity<MessageResponse> regRes = restTemplate.postForEntity(
                "/api/v1/auth/register",
                new RegisterRequest("Atleta Prueba", email, password),
                MessageResponse.class
        );
        assertThat(regRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String verifyToken = emailCapture.verificationTokens.get(email);
        assertThat(verifyToken).isNotBlank();

        // 2. Login before verification -> 403
        ResponseEntity<String> unverifiedLogin = restTemplate.postForEntity(
                "/api/v1/auth/login",
                new LoginRequest(email, password),
                String.class
        );
        assertThat(unverifiedLogin.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // 3. Verify email -> 200
        ResponseEntity<MessageResponse> verifyRes = restTemplate.postForEntity(
                "/api/v1/auth/verify-email",
                new VerifyEmailRequest(verifyToken),
                MessageResponse.class
        );
        assertThat(verifyRes.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 4. Login -> 200 + HttpOnly refresh cookie + JWT
        ResponseEntity<AuthResponse> loginRes = restTemplate.postForEntity(
                "/api/v1/auth/login",
                new LoginRequest(email, password),
                AuthResponse.class
        );
        assertThat(loginRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginRes.getBody()).isNotNull();
        String accessToken = loginRes.getBody().accessToken();
        String refreshCookie1 = extractCookie(loginRes.getHeaders().get(HttpHeaders.SET_COOKIE), "calishome_refresh");
        assertThat(refreshCookie1).isNotBlank();

        // 5. Access protected /api/v1/users/me with Bearer JWT
        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(accessToken);
        ResponseEntity<UserResponse> meRes = restTemplate.exchange(
                "/api/v1/users/me",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders),
                UserResponse.class
        );
        assertThat(meRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(meRes.getBody()).isNotNull();
        assertThat(meRes.getBody().email()).isEqualTo(email);

        // 6. Initialize CSRF cookie + rotate refresh token
        ResponseEntity<MessageResponse> csrfRes = restTemplate.getForEntity("/api/v1/auth/csrf", MessageResponse.class);
        String xsrfCookie = extractCookie(csrfRes.getHeaders().get(HttpHeaders.SET_COOKIE), "XSRF-TOKEN");
        assertThat(xsrfCookie).isNotBlank();

        HttpHeaders refreshHeaders = new HttpHeaders();
        refreshHeaders.setContentType(MediaType.APPLICATION_JSON);
        refreshHeaders.add(HttpHeaders.COOKIE, "calishome_refresh=" + refreshCookie1 + "; XSRF-TOKEN=" + xsrfCookie);
        refreshHeaders.add("X-XSRF-TOKEN", xsrfCookie);

        ResponseEntity<AuthResponse> refreshRes = restTemplate.exchange(
                "/api/v1/auth/refresh",
                HttpMethod.POST,
                new HttpEntity<>(refreshHeaders),
                AuthResponse.class
        );
        assertThat(refreshRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        String refreshCookie2 = extractCookie(refreshRes.getHeaders().get(HttpHeaders.SET_COOKIE), "calishome_refresh");
        assertThat(refreshCookie2).isNotBlank().isNotEqualTo(refreshCookie1);

        // 7. Replay old refreshCookie1 -> reuse detection revokes entire family
        ResponseEntity<String> replayRes = restTemplate.exchange(
                "/api/v1/auth/refresh",
                HttpMethod.POST,
                new HttpEntity<>(refreshHeaders),
                String.class
        );
        assertThat(replayRes.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // Even refreshCookie2 must now fail because the family was revoked
        HttpHeaders headersWithToken2 = new HttpHeaders();
        headersWithToken2.add(HttpHeaders.COOKIE, "calishome_refresh=" + refreshCookie2 + "; XSRF-TOKEN=" + xsrfCookie);
        headersWithToken2.add("X-XSRF-TOKEN", xsrfCookie);
        ResponseEntity<String> revokedChildRes = restTemplate.exchange(
                "/api/v1/auth/refresh",
                HttpMethod.POST,
                new HttpEntity<>(headersWithToken2),
                String.class
        );
        assertThat(revokedChildRes.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // 8. Forgot & reset password
        restTemplate.postForEntity("/api/v1/auth/forgot-password", new EmailRequest(email), MessageResponse.class);
        String resetToken = emailCapture.resetTokens.get(email);
        assertThat(resetToken).isNotBlank();

        ResponseEntity<MessageResponse> resetRes = restTemplate.postForEntity(
                "/api/v1/auth/reset-password",
                new ResetPasswordRequest(resetToken, "NuevaFuerza2026"),
                MessageResponse.class
        );
        assertThat(resetRes.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<AuthResponse> newLoginRes = restTemplate.postForEntity(
                "/api/v1/auth/login",
                new LoginRequest(email, "NuevaFuerza2026"),
                AuthResponse.class
        );
        assertThat(newLoginRes.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void googleOidcLoginCreatesVerifiedUser() {
        ResponseEntity<AuthResponse> res = restTemplate.postForEntity(
                "/api/v1/auth/google",
                new GoogleAuthRequest("valid-mock-google-token"),
                AuthResponse.class
        );
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().user().email()).isEqualTo("google.athlete@gmail.com");
        assertThat(res.getBody().user().emailVerified()).isTrue();
    }

    private String extractCookie(List<String> setCookies, String name) {
        if (setCookies == null) return "";
        for (String header : setCookies) {
            if (header.startsWith(name + "=")) {
                String valuePart = header.substring((name + "=").length());
                int semi = valuePart.indexOf(';');
                return semi >= 0 ? valuePart.substring(0, semi) : valuePart;
            }
        }
        return "";
    }

    static class InMemoryEmailCapture implements EmailSender {
        final Map<String, String> verificationTokens = new ConcurrentHashMap<>();
        final Map<String, String> resetTokens = new ConcurrentHashMap<>();

        @Override
        public void sendEmailVerification(String toEmail, String fullName, String rawToken) {
            verificationTokens.put(toEmail, rawToken);
        }

        @Override
        public void sendPasswordReset(String toEmail, String fullName, String rawToken) {
            resetTokens.put(toEmail, rawToken);
        }

        void clear() {
            verificationTokens.clear();
            resetTokens.clear();
        }
    }

    @TestConfiguration
    static class TestBeans {
        @Bean
        @Primary
        InMemoryEmailCapture inMemoryEmailCapture() {
            return new InMemoryEmailCapture();
        }

        @Bean
        @Primary
        GoogleTokenVerifier stubGoogleTokenVerifier() {
            return idToken -> {
                if ("valid-mock-google-token".equals(idToken)) {
                    return new GoogleUserClaims("google-sub-999", "google.athlete@gmail.com", true, "Google Athlete");
                }
                throw new IllegalArgumentException("Unexpected token");
            };
        }
    }
}
