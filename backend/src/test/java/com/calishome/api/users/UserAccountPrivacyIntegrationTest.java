package com.calishome.api.users;

import static org.assertj.core.api.Assertions.assertThat;

import com.calishome.api.auth.AuthResponse;
import com.calishome.api.auth.EmailSender;
import com.calishome.api.auth.LoginRequest;
import com.calishome.api.auth.MessageResponse;
import com.calishome.api.auth.RegisterRequest;
import com.calishome.api.auth.VerifyEmailRequest;
import com.calishome.api.workouts.CompleteWorkoutResponse;
import com.calishome.api.workouts.CreateWorkoutLogRequest;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
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
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class UserAccountPrivacyIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private InMemoryCaptureEmailSender emailCapture;

    @Test
    void exportAndDeleteAccountLifecycleAnonymizesPiiAndAllowsReRegistration() {
        String email = "privacy.athlete@calishome.app";
        String password = "PrivacyPass2026!";

        ResponseEntity<MessageResponse> regRes = restTemplate.postForEntity(
                "/api/v1/auth/register",
                new RegisterRequest("Atleta Privacidad", email, password),
                MessageResponse.class
        );
        assertThat(regRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        String verifyToken = emailCapture.verificationTokens.get(email);
        assertThat(verifyToken).isNotBlank();
        ResponseEntity<MessageResponse> verifyRes = restTemplate.postForEntity(
                "/api/v1/auth/verify-email",
                new VerifyEmailRequest(verifyToken),
                MessageResponse.class
        );
        assertThat(verifyRes.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<AuthResponse> loginRes = restTemplate.postForEntity(
                "/api/v1/auth/login",
                new LoginRequest(email, password),
                AuthResponse.class
        );
        assertThat(loginRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        String accessToken = loginRes.getBody().accessToken();

        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(accessToken);

        ResponseEntity<CompleteWorkoutResponse> workoutRes = restTemplate.exchange(
                "/api/v1/workouts",
                HttpMethod.POST,
                new HttpEntity<>(
                        new CreateWorkoutLogRequest("Sesión Portabilidad", 920, 4, "just_right"),
                        authHeaders
                ),
                CompleteWorkoutResponse.class
        );
        assertThat(workoutRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<String> exportRawRes = restTemplate.exchange(
                "/api/v1/users/me/export",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders),
                String.class
        );
        assertThat(exportRawRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(exportRawRes.getBody()).doesNotContain("passwordHash");
        assertThat(exportRawRes.getBody()).contains("Sesión Portabilidad");

        ResponseEntity<AccountDataExportResponse> exportDtoRes = restTemplate.exchange(
                "/api/v1/users/me/export",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders),
                AccountDataExportResponse.class
        );
        assertThat(exportDtoRes.getBody()).isNotNull();
        assertThat(exportDtoRes.getBody().privacyFramework()).contains("Ley 1581");
        assertThat(exportDtoRes.getBody().user().email()).isEqualTo(email);
        assertThat(exportDtoRes.getBody().workoutLogs()).hasSize(1);

        ResponseEntity<Void> deleteRes = restTemplate.exchange(
                "/api/v1/users/me",
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders),
                Void.class
        );
        assertThat(deleteRes.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(deleteRes.getHeaders().get(HttpHeaders.SET_COOKIE))
                .anySatisfy(cookie -> assertThat(cookie).contains("Max-Age=0"));

        ResponseEntity<String> meAfterDelete = restTemplate.exchange(
                "/api/v1/users/me",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders),
                String.class
        );
        assertThat(meAfterDelete.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<String> loginAfterDelete = restTemplate.postForEntity(
                "/api/v1/auth/login",
                new LoginRequest(email, password),
                String.class
        );
        assertThat(loginAfterDelete.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<MessageResponse> reRegisterRes = restTemplate.postForEntity(
                "/api/v1/auth/register",
                new RegisterRequest("Atleta Nuevo", email, password),
                MessageResponse.class
        );
        assertThat(reRegisterRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    static class InMemoryCaptureEmailSender implements EmailSender {
        final Map<String, String> verificationTokens = new ConcurrentHashMap<>();

        @Override
        public void sendEmailVerification(String toEmail, String fullName, String rawToken) {
            verificationTokens.put(toEmail, rawToken);
        }

        @Override
        public void sendPasswordReset(String toEmail, String fullName, String rawToken) {
            // No-op in test
        }
    }

    @TestConfiguration
    static class TestBeans {
        @Bean
        @Primary
        InMemoryCaptureEmailSender inMemoryCaptureEmailSender() {
            return new InMemoryCaptureEmailSender();
        }
    }
}
