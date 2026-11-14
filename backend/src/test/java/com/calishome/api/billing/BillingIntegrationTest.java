package com.calishome.api.billing;

import static org.assertj.core.api.Assertions.assertThat;

import com.calishome.api.auth.AuthResponse;
import com.calishome.api.auth.EmailSender;
import com.calishome.api.auth.GoogleAuthRequest;
import com.calishome.api.auth.GoogleTokenVerifier;
import com.calishome.api.auth.GoogleUserClaims;
import com.calishome.api.notifications.NotificationStatusResponse;
import com.calishome.api.notifications.PushSubscribeRequest;
import com.calishome.api.workouts.CompleteWorkoutResponse;
import com.calishome.api.workouts.CreateWorkoutLogRequest;
import com.calishome.api.workouts.WorkoutAnalyticsResponse;
import com.calishome.api.workouts.WorkoutLogResponse;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
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
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class BillingIntegrationTest {

    private static final String TEST_EVENTS_SECRET = "test-wompi-events-secret-2026";

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private WompiSignatureService signatureService;

    @Autowired
    private ReceiptEmailCapture emailCapture;

    @BeforeEach
    void resetReceipts() {
        emailCapture.receipts.clear();
    }

    @Test
    void freemiumLimitsWebhookIdempotencyOutOfOrderAndLifecycle() {
        // 1. Planes públicos
        ResponseEntity<BillingPlansResponse> plansRes = restTemplate.getForEntity(
                "/api/v1/billing/plans",
                BillingPlansResponse.class
        );
        assertThat(plansRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(plansRes.getBody()).isNotNull();
        assertThat(plansRes.getBody().plans()).hasSize(3);
        assertThat(plansRes.getBody().sandboxMode()).isTrue();

        // 2. Autenticación
        ResponseEntity<AuthResponse> authRes = restTemplate.postForEntity(
                "/api/v1/auth/google",
                new GoogleAuthRequest("billing-athlete-token"),
                AuthResponse.class
        );
        assertThat(authRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(authRes.getBody()).isNotNull();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(authRes.getBody().accessToken());

        // 3. Usuario FREE: registrar 7 entrenamientos -> historial limitado a 5
        for (int i = 1; i <= 7; i++) {
            ResponseEntity<CompleteWorkoutResponse> logRes = restTemplate.postForEntity(
                    "/api/v1/workouts",
                    new HttpEntity<>(new CreateWorkoutLogRequest(
                            "Sesión Fuerza #" + i,
                            1200 + i,
                            4,
                            i % 2 == 0 ? "just_right" : "too_easy"
                    ), headers),
                    CompleteWorkoutResponse.class
            );
            assertThat(logRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        }

        ResponseEntity<WorkoutLogResponse[]> freeHistory = restTemplate.exchange(
                "/api/v1/workouts?limit=30",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                WorkoutLogResponse[].class
        );
        assertThat(freeHistory.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(freeHistory.getBody()).hasSize(BillingService.FREE_MAX_WORKOUT_HISTORY);

        // 4. Usuario FREE: analíticas bloqueadas -> 403
        ResponseEntity<String> freeAnalytics = restTemplate.exchange(
                "/api/v1/workouts/analytics",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class
        );
        assertThat(freeAnalytics.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // 5. Usuario FREE: 1 dispositivo Push permitido, 2do bloqueado -> 403
        ResponseEntity<NotificationStatusResponse> firstPush = restTemplate.postForEntity(
                "/api/v1/notifications/subscribe",
                new HttpEntity<>(new PushSubscribeRequest(
                        "https://fcm.googleapis.com/fcm/send/billing-device-1",
                        new PushSubscribeRequest.Keys("p256dh-key-1", "auth-key-1")
                ), headers),
                NotificationStatusResponse.class
        );
        assertThat(firstPush.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(firstPush.getBody().activeDevicesCount()).isEqualTo(1);

        ResponseEntity<String> secondPushFree = restTemplate.postForEntity(
                "/api/v1/notifications/subscribe",
                new HttpEntity<>(new PushSubscribeRequest(
                        "https://fcm.googleapis.com/fcm/send/billing-device-2",
                        new PushSubscribeRequest.Keys("p256dh-key-2", "auth-key-2")
                ), headers),
                String.class
        );
        assertThat(secondPushFree.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // 6. Crear sesión de checkout Pro mensual
        ResponseEntity<CheckoutSessionResponse> checkoutRes = restTemplate.postForEntity(
                "/api/v1/billing/checkout",
                new HttpEntity<>(new CreateCheckoutRequest("pro_monthly"), headers),
                CheckoutSessionResponse.class
        );
        assertThat(checkoutRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        CheckoutSessionResponse checkout = checkoutRes.getBody();
        assertThat(checkout).isNotNull();
        assertThat(checkout.externalReference()).startsWith("CALIS-");
        assertThat(checkout.amountCents()).isEqualTo(1990000L);

        // 7. Webhook con firma inválida -> 401
        WompiWebhookPayload invalidSigPayload = signPayload(
                "tx-bad-1",
                checkout.externalReference(),
                checkout.amountCents(),
                "APPROVED",
                2000L,
                "wrong-secret"
        );
        HttpHeaders badWebhookHeaders = new HttpHeaders();
        badWebhookHeaders.set("X-Event-Checksum", "deadbeef");
        ResponseEntity<String> badWebhookRes = restTemplate.postForEntity(
                "/api/v1/billing/webhooks/wompi",
                new HttpEntity<>(invalidSigPayload, badWebhookHeaders),
                String.class
        );
        assertThat(badWebhookRes.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // 8. Webhook válido APPROVED (t=2000) -> activa PREMIUM y envía recibo
        WompiWebhookPayload approvedPayload = signPayload(
                "tx-ok-2000",
                checkout.externalReference(),
                checkout.amountCents(),
                "APPROVED",
                2000L,
                TEST_EVENTS_SECRET
        );
        HttpHeaders okWebhookHeaders = new HttpHeaders();
        okWebhookHeaders.set("X-Event-Checksum", approvedPayload.signature().checksum());

        ResponseEntity<WebhookAckResponse> approvedRes = restTemplate.postForEntity(
                "/api/v1/billing/webhooks/wompi",
                new HttpEntity<>(approvedPayload, okWebhookHeaders),
                WebhookAckResponse.class
        );
        assertThat(approvedRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(approvedRes.getBody().outcome()).isEqualTo("APPLIED");
        assertThat(approvedRes.getBody().subscriptionStatus()).isEqualTo("ACTIVE");
        assertThat(emailCapture.receipts).hasSize(1);
        assertThat(emailCapture.receipts.get(0)).contains(checkout.externalReference());

        // 9. Usuario ahora PREMIUM: historial completo (7), analytics 200 y 2do push permitido
        ResponseEntity<WorkoutLogResponse[]> proHistory = restTemplate.exchange(
                "/api/v1/workouts?limit=30",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                WorkoutLogResponse[].class
        );
        assertThat(proHistory.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(proHistory.getBody()).hasSize(7);

        ResponseEntity<WorkoutAnalyticsResponse> proAnalytics = restTemplate.exchange(
                "/api/v1/workouts/analytics",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                WorkoutAnalyticsResponse.class
        );
        assertThat(proAnalytics.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(proAnalytics.getBody()).isNotNull();
        assertThat(proAnalytics.getBody().totalWorkouts()).isEqualTo(7);
        assertThat(proAnalytics.getBody().tooEasyCount()).isEqualTo(4);
        assertThat(proAnalytics.getBody().justRightCount()).isEqualTo(3);

        ResponseEntity<NotificationStatusResponse> secondPushPro = restTemplate.postForEntity(
                "/api/v1/notifications/subscribe",
                new HttpEntity<>(new PushSubscribeRequest(
                        "https://fcm.googleapis.com/fcm/send/billing-device-2",
                        new PushSubscribeRequest.Keys("p256dh-key-2", "auth-key-2")
                ), headers),
                NotificationStatusResponse.class
        );
        assertThat(secondPushPro.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(secondPushPro.getBody().activeDevicesCount()).isEqualTo(2);

        // 10. Webhook repetido exacto -> DUPLICATE_IGNORED y NO duplica correo
        ResponseEntity<WebhookAckResponse> duplicateRes = restTemplate.postForEntity(
                "/api/v1/billing/webhooks/wompi",
                new HttpEntity<>(approvedPayload, okWebhookHeaders),
                WebhookAckResponse.class
        );
        assertThat(duplicateRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(duplicateRes.getBody().outcome()).isEqualTo("DUPLICATE_IGNORED");
        assertThat(emailCapture.receipts).hasSize(1);

        // 11. Webhook desordenado (timestamp menor t=1000 < 2000) -> STALE_OUT_OF_ORDER, conserva ACTIVE
        WompiWebhookPayload staleDeclined = signPayload(
                "tx-old-1000",
                checkout.externalReference(),
                checkout.amountCents(),
                "DECLINED",
                1000L,
                TEST_EVENTS_SECRET
        );
        HttpHeaders staleHeaders = new HttpHeaders();
        staleHeaders.set("X-Event-Checksum", staleDeclined.signature().checksum());
        ResponseEntity<WebhookAckResponse> staleRes = restTemplate.postForEntity(
                "/api/v1/billing/webhooks/wompi",
                new HttpEntity<>(staleDeclined, staleHeaders),
                WebhookAckResponse.class
        );
        assertThat(staleRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(staleRes.getBody().outcome()).isEqualTo("STALE_OUT_OF_ORDER");
        assertThat(staleRes.getBody().subscriptionStatus()).isEqualTo("ACTIVE");

        // 12. Webhook DECLINED más reciente (t=3000) -> entra en IN_GRACE conservando acceso PREMIUM
        WompiWebhookPayload graceDeclined = signPayload(
                "tx-declined-3000",
                checkout.externalReference(),
                checkout.amountCents(),
                "DECLINED",
                3000L,
                TEST_EVENTS_SECRET
        );
        HttpHeaders graceHeaders = new HttpHeaders();
        graceHeaders.set("X-Event-Checksum", graceDeclined.signature().checksum());
        ResponseEntity<WebhookAckResponse> graceRes = restTemplate.postForEntity(
                "/api/v1/billing/webhooks/wompi",
                new HttpEntity<>(graceDeclined, graceHeaders),
                WebhookAckResponse.class
        );
        assertThat(graceRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(graceRes.getBody().subscriptionStatus()).isEqualTo("IN_GRACE");

        // 13. Cancelación solicitada por el usuario (mantiene PREMIUM hasta fin de período)
        ResponseEntity<BillingOverviewResponse> cancelRes = restTemplate.postForEntity(
                "/api/v1/billing/subscription/cancel",
                new HttpEntity<>(headers),
                BillingOverviewResponse.class
        );
        assertThat(cancelRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(cancelRes.getBody().subscription().status()).isEqualTo("CANCELED");
        assertThat(cancelRes.getBody().subscription().cancelAtPeriodEnd()).isTrue();
        assertThat(cancelRes.getBody().effectivePlanTier()).isEqualTo("PREMIUM");

        // 14. Webhook VOIDED (t=4000) -> revierte usuario a FREE inmediatamente
        WompiWebhookPayload voidedPayload = signPayload(
                "tx-voided-4000",
                checkout.externalReference(),
                checkout.amountCents(),
                "VOIDED",
                4000L,
                TEST_EVENTS_SECRET
        );
        HttpHeaders voidHeaders = new HttpHeaders();
        voidHeaders.set("X-Event-Checksum", voidedPayload.signature().checksum());
        ResponseEntity<WebhookAckResponse> voidRes = restTemplate.postForEntity(
                "/api/v1/billing/webhooks/wompi",
                new HttpEntity<>(voidedPayload, voidHeaders),
                WebhookAckResponse.class
        );
        assertThat(voidRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(voidRes.getBody().subscriptionStatus()).isEqualTo("CANCELED");

        ResponseEntity<BillingOverviewResponse> afterVoid = restTemplate.exchange(
                "/api/v1/billing/subscription",
                HttpMethod.GET,
                new HttpEntity<>(headers),
                BillingOverviewResponse.class
        );
        assertThat(afterVoid.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(afterVoid.getBody().effectivePlanTier()).isEqualTo("FREE");
    }

    private WompiWebhookPayload signPayload(
            String txId,
            String reference,
            long amountCents,
            String status,
            long timestamp,
            String secret) {
        WompiWebhookPayload unsigned = new WompiWebhookPayload(
                "transaction.updated",
                new WompiWebhookPayload.DataBlock(
                        new WompiWebhookPayload.Transaction(txId, amountCents, reference, "COP", status)
                ),
                new WompiWebhookPayload.SignatureBlock(
                        List.of("transaction.id", "transaction.status", "transaction.amount_in_cents"),
                        ""
                ),
                timestamp
        );
        String checksum = signatureService.computeEventChecksum(unsigned, secret);
        return new WompiWebhookPayload(
                unsigned.event(),
                unsigned.data(),
                new WompiWebhookPayload.SignatureBlock(unsigned.signature().properties(), checksum),
                timestamp
        );
    }

    static class ReceiptEmailCapture implements EmailSender {
        final List<String> receipts = new CopyOnWriteArrayList<>();

        @Override
        public void sendEmailVerification(String toEmail, String fullName, String rawToken) {
        }

        @Override
        public void sendPasswordReset(String toEmail, String fullName, String rawToken) {
        }

        @Override
        public void sendPaymentReceipt(
                String toEmail,
                String fullName,
                String planName,
                String formattedAmount,
                String reference) {
            receipts.add(toEmail + "|" + planName + "|" + formattedAmount + "|" + reference);
        }
    }

    @TestConfiguration
    static class TestBeans {
        @Bean
        @Primary
        ReceiptEmailCapture receiptEmailCapture() {
            return new ReceiptEmailCapture();
        }

        @Bean
        @Primary
        GoogleTokenVerifier stubGoogleTokenVerifier() {
            return idToken -> {
                if ("billing-athlete-token".equals(idToken)) {
                    return new GoogleUserClaims("google-billing-1", "billing.athlete@calishome.app", true, "Billing Athlete");
                }
                throw new IllegalArgumentException("Unexpected token");
            };
        }
    }
}
