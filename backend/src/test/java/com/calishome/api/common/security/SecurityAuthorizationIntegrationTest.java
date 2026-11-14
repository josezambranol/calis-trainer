package com.calishome.api.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.calishome.api.auth.AuthResponse;
import com.calishome.api.auth.GoogleAuthRequest;
import com.calishome.api.auth.GoogleTokenVerifier;
import com.calishome.api.auth.GoogleUserClaims;
import com.calishome.api.notifications.NotificationStatusResponse;
import com.calishome.api.notifications.PushSubscribeRequest;
import com.calishome.api.notifications.PushUnsubscribeRequest;
import com.calishome.api.users.UpdateProfileRequest;
import com.calishome.api.users.UserResponse;
import com.calishome.api.workouts.CompleteWorkoutResponse;
import com.calishome.api.workouts.CreateWorkoutLogRequest;
import com.calishome.api.workouts.WorkoutLogResponse;
import java.util.List;
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
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class SecurityAuthorizationIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void enforcesSecurityHeadersRestrictiveCorsValidationAndCrossUserIdorIsolation() {
        // 1. Cabeceras de seguridad HTTP activas en respuestas API
        ResponseEntity<String> healthRes = restTemplate.getForEntity("/api/v1/health", String.class);
        assertThat(healthRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(healthRes.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(healthRes.getHeaders().getFirst("X-Frame-Options")).isEqualTo("DENY");
        assertThat(healthRes.getHeaders().getFirst("Referrer-Policy")).isEqualTo("strict-origin-when-cross-origin");
        assertThat(healthRes.getHeaders().getFirst("Content-Security-Policy")).contains("frame-ancestors 'none'");

        // 2. CORS restrictivo: permite origen configurado y rechaza origen externo arbitrario
        HttpHeaders allowedCorsHeaders = new HttpHeaders();
        allowedCorsHeaders.setOrigin("http://localhost:5173");
        allowedCorsHeaders.setAccessControlRequestMethod(HttpMethod.GET);
        ResponseEntity<String> allowedPreflight = restTemplate.exchange(
                "/api/v1/exercises",
                HttpMethod.OPTIONS,
                new HttpEntity<>(allowedCorsHeaders),
                String.class
        );
        assertThat(allowedPreflight.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(allowedPreflight.getHeaders().getAccessControlAllowOrigin()).isEqualTo("http://localhost:5173");

        HttpHeaders evilCorsHeaders = new HttpHeaders();
        evilCorsHeaders.setOrigin("https://evil.attacker.example");
        evilCorsHeaders.setAccessControlRequestMethod(HttpMethod.GET);
        ResponseEntity<String> evilPreflight = restTemplate.exchange(
                "/api/v1/exercises",
                HttpMethod.OPTIONS,
                new HttpEntity<>(evilCorsHeaders),
                String.class
        );
        assertThat(evilPreflight.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(evilPreflight.getHeaders().getAccessControlAllowOrigin()).isNull();

        // 3. Validacion de limites de tamano en query param (?q > 80 chars -> 400 RFC 7807)
        String oversizedQuery = "a".repeat(120);
        ResponseEntity<ProblemDetail> invalidSearchRes = restTemplate.getForEntity(
                "/api/v1/exercises?q=" + oversizedQuery,
                ProblemDetail.class
        );
        assertThat(invalidSearchRes.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(invalidSearchRes.getBody()).isNotNull();
        assertThat(invalidSearchRes.getBody().getTitle()).isEqualTo("Error de validación");

        // 4. Acceso sin autenticar rechazado con 401 RFC 7807 en endpoints privados
        assertThat(restTemplate.getForEntity("/api/v1/users/me", ProblemDetail.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(restTemplate.getForEntity("/api/v1/workouts", ProblemDetail.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(restTemplate.getForEntity("/api/v1/routines/today", ProblemDetail.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(restTemplate.getForEntity("/api/v1/notifications/status", ProblemDetail.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        // 5. Autenticar Usuario A y Usuario B independientes
        HttpHeaders userAHeaders = authenticateAs("token-user-a");
        HttpHeaders userBHeaders = authenticateAs("token-user-b");

        // Usuario A actualiza perfil, registra entrenamiento y suscribe dispositivo Web Push
        restTemplate.exchange(
                "/api/v1/users/me/profile",
                HttpMethod.PATCH,
                new HttpEntity<>(new UpdateProfileRequest(
                        "avanzado",
                        "fuerza_hipertrofia",
                        45,
                        List.of("lunes", "martes", "jueves", "viernes"),
                        "07:00",
                        "America/Bogota",
                        true,
                        true,
                        true
                ), userAHeaders),
                UserResponse.class
        );
        ResponseEntity<CompleteWorkoutResponse> workoutA = restTemplate.exchange(
                "/api/v1/workouts",
                HttpMethod.POST,
                new HttpEntity<>(new CreateWorkoutLogRequest("Fuerza Privada A", 1800, 6, "just_right"), userAHeaders),
                CompleteWorkoutResponse.class
        );
        assertThat(workoutA.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        String endpointA = "https://fcm.googleapis.com/fcm/send/device-owned-by-user-a";
        ResponseEntity<NotificationStatusResponse> subA = restTemplate.exchange(
                "/api/v1/notifications/subscribe",
                HttpMethod.POST,
                new HttpEntity<>(new PushSubscribeRequest(
                        endpointA,
                        new PushSubscribeRequest.Keys("p256dh-user-a-key", "auth-user-a-key")
                ), userAHeaders),
                NotificationStatusResponse.class
        );
        assertThat(subA.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // SSRF check: Usuario B intenta registrar endpoint interno/metadata
        ResponseEntity<ProblemDetail> ssrfRes = restTemplate.exchange(
                "/api/v1/notifications/subscribe",
                HttpMethod.POST,
                new HttpEntity<>(new PushSubscribeRequest(
                        "https://169.254.169.254/latest/meta-data/",
                        new PushSubscribeRequest.Keys("p256dh-b", "auth-b")
                ), userBHeaders),
                ProblemDetail.class
        );
        assertThat(ssrfRes.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        // 6. Aislamiento estricto IDOR: Usuario B no ve ni altera ningun recurso de Usuario A
        ResponseEntity<UserResponse> userBProfile = restTemplate.exchange(
                "/api/v1/users/me",
                HttpMethod.GET,
                new HttpEntity<>(userBHeaders),
                UserResponse.class
        );
        assertThat(userBProfile.getBody()).isNotNull();
        assertThat(userBProfile.getBody().email()).isEqualTo("user.b@calishome.app");
        assertThat(userBProfile.getBody().level()).isEqualTo("principiante");

        ResponseEntity<WorkoutLogResponse[]> userBWorkouts = restTemplate.exchange(
                "/api/v1/workouts",
                HttpMethod.GET,
                new HttpEntity<>(userBHeaders),
                WorkoutLogResponse[].class
        );
        assertThat(userBWorkouts.getBody()).isEmpty();

        // Usuario B no puede secuestrar endpoint Push de Usuario A
        ResponseEntity<ProblemDetail> hijackAttempt = restTemplate.exchange(
                "/api/v1/notifications/subscribe",
                HttpMethod.POST,
                new HttpEntity<>(new PushSubscribeRequest(
                        endpointA,
                        new PushSubscribeRequest.Keys("p256dh-attacker-b", "auth-attacker-b")
                ), userBHeaders),
                ProblemDetail.class
        );
        assertThat(hijackAttempt.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // Usuario B no puede eliminar la suscripcion Push de Usuario A
        restTemplate.exchange(
                "/api/v1/notifications/unsubscribe",
                HttpMethod.DELETE,
                new HttpEntity<>(new PushUnsubscribeRequest(endpointA), userBHeaders),
                Void.class
        );
        ResponseEntity<NotificationStatusResponse> statusAAfterAttack = restTemplate.exchange(
                "/api/v1/notifications/status",
                HttpMethod.GET,
                new HttpEntity<>(userAHeaders),
                NotificationStatusResponse.class
        );
        assertThat(statusAAfterAttack.getBody().activeDevicesCount()).isEqualTo(1);
    }

    private HttpHeaders authenticateAs(String idToken) {
        ResponseEntity<AuthResponse> res = restTemplate.postForEntity(
                "/api/v1/auth/google",
                new GoogleAuthRequest(idToken),
                AuthResponse.class
        );
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).isNotNull();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(res.getBody().accessToken());
        return headers;
    }

    @TestConfiguration
    static class SecurityTestBeans {
        @Bean
        @Primary
        GoogleTokenVerifier multiUserGoogleTokenVerifier() {
            return idToken -> {
                if ("token-user-b".equals(idToken)) {
                    return new GoogleUserClaims(
                            "google-sub-sec-b",
                            "user.b@calishome.app",
                            true,
                            "User B"
                    );
                }
                return new GoogleUserClaims(
                        "google-sub-sec-a",
                        "user.a@calishome.app",
                        true,
                        "User A"
                );
            };
        }
    }
}
