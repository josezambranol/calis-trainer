package com.calishome.api.notifications;

import static org.assertj.core.api.Assertions.assertThat;

import com.calishome.api.auth.AuthResponse;
import com.calishome.api.auth.GoogleAuthRequest;
import com.calishome.api.auth.GoogleTokenVerifier;
import com.calishome.api.auth.GoogleUserClaims;
import com.calishome.api.users.UpdateProfileRequest;
import com.calishome.api.users.UserResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
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
class NotificationIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private StubPushClient stubPushClient;

    @Test
    void pushSubscriptionTestReminderDispatchDeduplicationAndExpiredCleanup() {
        // 1. Clave publica VAPID accesible sin autenticacion
        ResponseEntity<VapidKeyResponse> vapidRes = restTemplate.getForEntity(
                "/api/v1/notifications/vapid-public-key",
                VapidKeyResponse.class
        );
        assertThat(vapidRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(vapidRes.getBody()).isNotNull();
        assertThat(vapidRes.getBody().enabled()).isTrue();
        assertThat(vapidRes.getBody().publicKey()).isNotBlank();

        // 2. Autenticacion con stub Google OIDC
        ResponseEntity<AuthResponse> authRes = restTemplate.postForEntity(
                "/api/v1/auth/google",
                new GoogleAuthRequest("valid-push-token"),
                AuthResponse.class
        );
        assertThat(authRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(authRes.getBody()).isNotNull();

        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(authRes.getBody().accessToken());

        // 3. Configurar perfil: lunes y miercoles a las 18:30 America/Bogota
        ResponseEntity<UserResponse> profileRes = restTemplate.exchange(
                "/api/v1/users/me/profile",
                HttpMethod.PATCH,
                new HttpEntity<>(new UpdateProfileRequest(
                        null,
                        null,
                        null,
                        List.of("lunes", "miercoles"),
                        "18:30",
                        "America/Bogota",
                        true,
                        null,
                        null
                ), authHeaders),
                UserResponse.class
        );
        assertThat(profileRes.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 4. Registrar suscripcion Web Push
        String endpoint = "https://fcm.googleapis.com/fcm/send/test-device-1";
        PushSubscribeRequest subRequest = new PushSubscribeRequest(
                endpoint,
                new PushSubscribeRequest.Keys("p256dh-test-key-value", "auth-test-secret")
        );
        ResponseEntity<NotificationStatusResponse> subRes = restTemplate.exchange(
                "/api/v1/notifications/subscribe",
                HttpMethod.POST,
                new HttpEntity<>(subRequest, authHeaders),
                NotificationStatusResponse.class
        );
        assertThat(subRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(subRes.getBody()).isNotNull();
        assertThat(subRes.getBody().activeDevicesCount()).isEqualTo(1);

        // 5. Consultar estado de suscripcion
        ResponseEntity<NotificationStatusResponse> statusRes = restTemplate.exchange(
                "/api/v1/notifications/status",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders),
                NotificationStatusResponse.class
        );
        assertThat(statusRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(statusRes.getBody().activeDevicesCount()).isEqualTo(1);

        // 6. Enviar notificacion de prueba desde backend
        stubPushClient.reset(201);
        ResponseEntity<PushTestResponse> testRes = restTemplate.exchange(
                "/api/v1/notifications/test",
                HttpMethod.POST,
                new HttpEntity<>(authHeaders),
                PushTestResponse.class
        );
        assertThat(testRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(testRes.getBody()).isNotNull();
        assertThat(testRes.getBody().sentCount()).isEqualTo(1);
        assertThat(stubPushClient.sentPayloads()).hasSize(1);

        // 7. Scheduler: Lunes 2026-04-06 18:30 America/Bogota (UTC-5 -> 23:30Z)
        Instant mondayReminderTime = Instant.parse("2026-04-06T23:30:00Z");
        int firstDispatch = notificationService.dispatchDueReminders(mondayReminderTime);
        assertThat(firstDispatch).isEqualTo(1);

        // Segunda ejecucion en el mismo dia/minuto: deduplicado por lastSentLocalDate
        int duplicateDispatch = notificationService.dispatchDueReminders(mondayReminderTime);
        assertThat(duplicateDispatch).isEqualTo(0);

        // 8. Limpieza automatica de suscripciones expiradas (HTTP 410 Gone)
        stubPushClient.setNextStatus(410);
        Instant wednesdayReminderTime = Instant.parse("2026-04-08T23:30:00Z");
        int expiredDispatch = notificationService.dispatchDueReminders(wednesdayReminderTime);
        assertThat(expiredDispatch).isEqualTo(0);

        ResponseEntity<NotificationStatusResponse> afterCleanupStatus = restTemplate.exchange(
                "/api/v1/notifications/status",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders),
                NotificationStatusResponse.class
        );
        assertThat(afterCleanupStatus.getBody().activeDevicesCount()).isEqualTo(0);

        // 9. Re-suscripcion y eliminacion manual via DELETE /unsubscribe
        restTemplate.exchange(
                "/api/v1/notifications/subscribe",
                HttpMethod.POST,
                new HttpEntity<>(subRequest, authHeaders),
                NotificationStatusResponse.class
        );
        ResponseEntity<Void> unsubRes = restTemplate.exchange(
                "/api/v1/notifications/unsubscribe",
                HttpMethod.DELETE,
                new HttpEntity<>(new PushUnsubscribeRequest(endpoint), authHeaders),
                Void.class
        );
        assertThat(unsubRes.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<NotificationStatusResponse> finalStatus = restTemplate.exchange(
                "/api/v1/notifications/status",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders),
                NotificationStatusResponse.class
        );
        assertThat(finalStatus.getBody().activeDevicesCount()).isEqualTo(0);
    }

    static class StubPushClient implements PushClient {
        private final AtomicInteger nextStatus = new AtomicInteger(201);
        private final List<String> payloads = new ArrayList<>();

        @Override
        public boolean isEnabled() {
            return true;
        }

        @Override
        public String getVapidPublicKey() {
            return "BStubVapidPublicKeyForCalisHomeTestingOnly1234567890";
        }

        @Override
        public PushDeliveryResult send(PushSubscriptionEntity subscription, String jsonPayload) {
            payloads.add(jsonPayload);
            return PushDeliveryResult.fromHttpStatus(nextStatus.get());
        }

        void reset(int statusCode) {
            nextStatus.set(statusCode);
            payloads.clear();
        }

        void setNextStatus(int statusCode) {
            nextStatus.set(statusCode);
        }

        List<String> sentPayloads() {
            return payloads;
        }
    }

    @TestConfiguration
    static class TestBeans {
        @Bean
        @Primary
        StubPushClient stubPushClient() {
            return new StubPushClient();
        }

        @Bean
        @Primary
        GoogleTokenVerifier stubGoogleTokenVerifier() {
            return idToken -> new GoogleUserClaims(
                    "google-sub-push-1",
                    "push.athlete@gmail.com",
                    true,
                    "Push Athlete"
            );
        }
    }
}
