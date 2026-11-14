package com.calishome.api.billing;

import com.calishome.api.auth.AuthProperties;
import com.calishome.api.auth.EmailSender;
import com.calishome.api.common.web.ApiException;
import com.calishome.api.common.web.ResourceNotFoundException;
import com.calishome.api.users.PlanTier;
import com.calishome.api.users.UserEntity;
import com.calishome.api.users.UserRepository;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BillingService {

    public static final int FREE_MAX_WORKOUT_HISTORY = 5;
    public static final int PRO_MAX_WORKOUT_HISTORY = 100;
    public static final int FREE_MAX_PUSH_DEVICES = 1;
    public static final int PRO_MAX_PUSH_DEVICES = 5;

    private static final String SANDBOX_EVENTS_SECRET = "sandbox-only-wompi-events-secret-calishome";

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentEventRepository paymentEventRepository;
    private final UserRepository userRepository;
    private final WompiSignatureService signatureService;
    private final EmailSender emailSender;
    private final BillingProperties billingProperties;
    private final AuthProperties authProperties;
    private final Environment environment;
    private final Clock clock;

    @Autowired
    public BillingService(
            SubscriptionRepository subscriptionRepository,
            PaymentEventRepository paymentEventRepository,
            UserRepository userRepository,
            WompiSignatureService signatureService,
            EmailSender emailSender,
            BillingProperties billingProperties,
            AuthProperties authProperties,
            Environment environment) {
        this(
                subscriptionRepository,
                paymentEventRepository,
                userRepository,
                signatureService,
                emailSender,
                billingProperties,
                authProperties,
                environment,
                Clock.systemUTC()
        );
    }

    BillingService(
            SubscriptionRepository subscriptionRepository,
            PaymentEventRepository paymentEventRepository,
            UserRepository userRepository,
            WompiSignatureService signatureService,
            EmailSender emailSender,
            BillingProperties billingProperties,
            AuthProperties authProperties,
            Environment environment,
            Clock clock) {
        this.subscriptionRepository = subscriptionRepository;
        this.paymentEventRepository = paymentEventRepository;
        this.userRepository = userRepository;
        this.signatureService = signatureService;
        this.emailSender = emailSender;
        this.billingProperties = billingProperties;
        this.authProperties = authProperties;
        this.environment = environment;
        this.clock = clock;
    }

    public BillingPlansResponse getPlans() {
        String currency = billingProperties.currency();
        BillingPlanDto freePlan = new BillingPlanDto(
                "free",
                "CalisHome Gratis",
                "forever",
                0L,
                currency,
                "$0 COP",
                false,
                List.of(
                        "Rutina adaptativa diaria personalizada",
                        "Catálogo completo de 24 ejercicios sin material",
                        "Cálculo de racha y sobrecarga progresiva",
                        "Últimos " + FREE_MAX_WORKOUT_HISTORY + " entrenamientos en historial",
                        FREE_MAX_PUSH_DEVICES + " dispositivo Web Push activo"
                )
        );
        BillingPlanDto proMonthly = new BillingPlanDto(
                "pro_monthly",
                "CalisHome Pro Mensual",
                "monthly",
                billingProperties.proMonthlyCents(),
                currency,
                formatCop(billingProperties.proMonthlyCents()) + " / mes",
                true,
                List.of(
                        "Analíticas avanzadas de volumen, consistencia y feedback",
                        "Historial completo de sesiones",
                        "Hasta " + PRO_MAX_PUSH_DEVICES + " dispositivos con recordatorios Push",
                        "Soporte prioritario y acceso anticipado a programas"
                )
        );
        BillingPlanDto proYearly = new BillingPlanDto(
                "pro_yearly",
                "CalisHome Pro Anual",
                "yearly",
                billingProperties.proYearlyCents(),
                currency,
                formatCop(billingProperties.proYearlyCents()) + " / año",
                false,
                List.of(
                        "Todo lo incluido en CalisHome Pro Mensual",
                        "Ahorra más del 33% frente al pago mensual",
                        "Recibo anual y renovación flexible sin permanencia"
                )
        );
        return new BillingPlansResponse(
                effectiveProviderName(),
                isSandboxActive(),
                List.of(freePlan, proMonthly, proYearly)
        );
    }

    @Transactional
    public BillingOverviewResponse getOverview(UUID userId) {
        UserEntity user = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));

        SubscriptionEntity latest = subscriptionRepository.findFirstByUserIdOrderByUpdatedAtDesc(userId)
                .orElse(null);

        if (latest != null) {
            reconcileLifecycle(user, latest, Instant.now(clock));
        }

        boolean isPro = user.getPlanTier() == PlanTier.PREMIUM;
        return new BillingOverviewResponse(
                user.getPlanTier().name(),
                isPro,
                isPro ? PRO_MAX_WORKOUT_HISTORY : FREE_MAX_WORKOUT_HISTORY,
                isPro ? PRO_MAX_PUSH_DEVICES : FREE_MAX_PUSH_DEVICES,
                effectiveProviderName(),
                isSandboxActive(),
                latest != null ? SubscriptionDto.from(latest) : null
        );
    }

    @Transactional
    public CheckoutSessionResponse createCheckout(UUID userId, CreateCheckoutRequest request) {
        userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));

        long amountCents = "pro_yearly".equals(request.planCode())
                ? billingProperties.proYearlyCents()
                : billingProperties.proMonthlyCents();
        String currency = billingProperties.currency();
        String reference = "CALIS-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase(Locale.ROOT);
        String provider = effectiveProviderName();

        SubscriptionEntity sub = new SubscriptionEntity();
        sub.setUserId(userId);
        sub.setProvider(provider);
        sub.setPlanCode(request.planCode());
        sub.setStatus(SubscriptionStatus.PENDING);
        sub.setExternalReference(reference);
        sub.setAmountCents(amountCents);
        sub.setCurrency(currency);
        subscriptionRepository.save(sub);

        String checkoutUrl = buildCheckoutUrl(sub);
        return new CheckoutSessionResponse(
                provider,
                isSandboxActive(),
                sub.getPlanCode(),
                reference,
                amountCents,
                currency,
                checkoutUrl
        );
    }

    @Transactional
    public WebhookAckResponse processWompiWebhook(String headerChecksum, WompiWebhookPayload payload) {
        String eventsSecret = resolveEventsSecret();
        if (!signatureService.verifyEventSignature(payload, headerChecksum, eventsSecret)) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "Firma de webhook inválida",
                    "No se pudo verificar la autenticidad criptográfica del evento de pago.",
                    "invalid-webhook-signature"
            );
        }

        WompiWebhookPayload.Transaction tx = payload.data().transaction();
        String providerEventId = payload.event() + ":" + tx.id() + ":" + tx.status() + ":" + payload.timestamp();
        String payloadHash = signatureService.sha256Hex(
                providerEventId + "|" + tx.reference() + "|" + tx.amountInCents()
        );

        if (paymentEventRepository.existsByProviderEventId(providerEventId)) {
            String currentStatus = subscriptionRepository.findByExternalReference(tx.reference())
                    .map(s -> s.getStatus().name())
                    .orElse("UNKNOWN");
            return new WebhookAckResponse("DUPLICATE_IGNORED", tx.reference(), currentStatus);
        }

        SubscriptionEntity sub = subscriptionRepository.findByExternalReference(tx.reference()).orElse(null);
        if (sub == null) {
            paymentEventRepository.save(PaymentEventEntity.create(
                    effectiveProviderName(),
                    providerEventId,
                    payload.event(),
                    tx.reference(),
                    tx.status(),
                    payload.timestamp(),
                    payloadHash,
                    "SUBSCRIPTION_NOT_FOUND",
                    Instant.now(clock)
            ));
            return new WebhookAckResponse("SUBSCRIPTION_NOT_FOUND", tx.reference(), "NOT_FOUND");
        }

        if (tx.amountInCents() > 0 && tx.amountInCents() != sub.getAmountCents()) {
            paymentEventRepository.save(PaymentEventEntity.create(
                    sub.getProvider(),
                    providerEventId,
                    payload.event(),
                    tx.reference(),
                    tx.status(),
                    payload.timestamp(),
                    payloadHash,
                    "AMOUNT_MISMATCH",
                    Instant.now(clock)
            ));
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Monto de pago inconsistente",
                    "El monto recibido en el webhook no coincide con la suscripción.",
                    "invalid-payment-amount"
            );
        }

        if (payload.timestamp() < sub.getLastEventTimestamp()) {
            paymentEventRepository.save(PaymentEventEntity.create(
                    sub.getProvider(),
                    providerEventId,
                    payload.event(),
                    tx.reference(),
                    tx.status(),
                    payload.timestamp(),
                    payloadHash,
                    "STALE_OUT_OF_ORDER",
                    Instant.now(clock)
            ));
            return new WebhookAckResponse("STALE_OUT_OF_ORDER", tx.reference(), sub.getStatus().name());
        }

        Instant now = Instant.now(clock);
        UserEntity user = userRepository.findByIdAndDeletedAtIsNull(sub.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario de suscripción no encontrado."));

        String normalizedStatus = tx.status().trim().toUpperCase(Locale.ROOT);
        boolean sendReceipt = false;

        switch (normalizedStatus) {
            case "APPROVED" -> {
                Duration cycle = "pro_yearly".equals(sub.getPlanCode())
                        ? Duration.ofDays(365)
                        : Duration.ofDays(30);
                sendReceipt = sub.getStatus() != SubscriptionStatus.ACTIVE;
                sub.setStatus(SubscriptionStatus.ACTIVE);
                sub.setProviderTransactionId(tx.id());
                sub.setCurrentPeriodStart(now);
                sub.setCurrentPeriodEnd(now.plus(cycle));
                sub.setGraceUntil(null);
                sub.setCancelAtPeriodEnd(false);
                sub.setCanceledAt(null);
                user.setPlanTier(PlanTier.PREMIUM);
            }
            case "DECLINED", "ERROR" -> {
                if (sub.getStatus() == SubscriptionStatus.ACTIVE || sub.getStatus() == SubscriptionStatus.IN_GRACE) {
                    sub.setStatus(SubscriptionStatus.IN_GRACE);
                    if (sub.getGraceUntil() == null) {
                        sub.setGraceUntil(now.plus(Duration.ofDays(Math.max(1, billingProperties.gracePeriodDays()))));
                    }
                    user.setPlanTier(PlanTier.PREMIUM);
                } else {
                    sub.setStatus(SubscriptionStatus.PAST_DUE);
                    user.setPlanTier(PlanTier.FREE);
                }
            }
            case "VOIDED" -> {
                sub.setStatus(SubscriptionStatus.CANCELED);
                sub.setCanceledAt(now);
                sub.setCancelAtPeriodEnd(false);
                user.setPlanTier(PlanTier.FREE);
            }
            default -> {
                // PENDING u otro estado intermedio: no degrada ni activa anticipadamente
            }
        }

        sub.setLastEventTimestamp(payload.timestamp());
        subscriptionRepository.save(sub);
        userRepository.save(user);

        paymentEventRepository.save(PaymentEventEntity.create(
                sub.getProvider(),
                providerEventId,
                payload.event(),
                tx.reference(),
                normalizedStatus,
                payload.timestamp(),
                payloadHash,
                "APPLIED",
                now
        ));

        if (sendReceipt) {
            String planLabel = "pro_yearly".equals(sub.getPlanCode())
                    ? "CalisHome Pro Anual"
                    : "CalisHome Pro Mensual";
            emailSender.sendPaymentReceipt(
                    user.getEmail(),
                    user.getFullName(),
                    planLabel,
                    formatCop(sub.getAmountCents()) + " " + sub.getCurrency(),
                    sub.getExternalReference()
            );
        }

        return new WebhookAckResponse("APPLIED", tx.reference(), sub.getStatus().name());
    }

    @Transactional
    public WebhookAckResponse completeSandboxCheckout(UUID userId, SandboxCompleteRequest request) {
        if (!isSandboxAllowed()) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Sandbox deshabilitado",
                    "La simulación de pagos está deshabilitada en este entorno.",
                    "sandbox-disabled"
            );
        }

        SubscriptionEntity sub = subscriptionRepository.findByExternalReference(request.externalReference().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Referencia de checkout no encontrada."));

        if (!sub.getUserId().equals(userId)) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Acceso denegado",
                    "Esta sesión de checkout pertenece a otro usuario.",
                    "forbidden"
            );
        }

        long eventTimestamp = Instant.now(clock).getEpochSecond();
        String txId = "sandbox-tx-" + UUID.randomUUID().toString().substring(0, 8);
        WompiWebhookPayload unsigned = new WompiWebhookPayload(
                "transaction.updated",
                new WompiWebhookPayload.DataBlock(
                        new WompiWebhookPayload.Transaction(
                                txId,
                                sub.getAmountCents(),
                                sub.getExternalReference(),
                                sub.getCurrency(),
                                request.transactionStatus()
                        )
                ),
                new WompiWebhookPayload.SignatureBlock(
                        List.of("transaction.id", "transaction.status", "transaction.amount_in_cents"),
                        ""
                ),
                eventTimestamp
        );
        String checksum = signatureService.computeEventChecksum(unsigned, resolveEventsSecret());
        WompiWebhookPayload signedPayload = new WompiWebhookPayload(
                unsigned.event(),
                unsigned.data(),
                new WompiWebhookPayload.SignatureBlock(
                        unsigned.signature().properties(),
                        checksum
                ),
                eventTimestamp
        );
        return processWompiWebhook(checksum, signedPayload);
    }

    @Transactional
    public BillingOverviewResponse cancelSubscription(UUID userId) {
        UserEntity user = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));

        SubscriptionEntity sub = subscriptionRepository.findFirstByUserIdAndStatusInOrderByUpdatedAtDesc(
                userId,
                List.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.IN_GRACE)
        ).orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND,
                "Sin suscripción activa",
                "No tienes una suscripción Pro activa para cancelar.",
                "no-active-subscription"
        ));

        Instant now = Instant.now(clock);
        sub.setStatus(SubscriptionStatus.CANCELED);
        sub.setCanceledAt(now);
        sub.setCancelAtPeriodEnd(true);
        subscriptionRepository.save(sub);

        if (sub.getCurrentPeriodEnd() == null || !sub.getCurrentPeriodEnd().isAfter(now)) {
            user.setPlanTier(PlanTier.FREE);
            userRepository.save(user);
        }

        return getOverview(userId);
    }

    private void reconcileLifecycle(UserEntity user, SubscriptionEntity sub, Instant now) {
        boolean dirty = false;
        if (sub.getStatus() == SubscriptionStatus.IN_GRACE
                && sub.getGraceUntil() != null
                && !sub.getGraceUntil().isAfter(now)) {
            sub.setStatus(SubscriptionStatus.PAST_DUE);
            user.setPlanTier(PlanTier.FREE);
            dirty = true;
        } else if (sub.getStatus() == SubscriptionStatus.CANCELED
                && sub.isCancelAtPeriodEnd()
                && sub.getCurrentPeriodEnd() != null
                && !sub.getCurrentPeriodEnd().isAfter(now)
                && user.getPlanTier() == PlanTier.PREMIUM) {
            user.setPlanTier(PlanTier.FREE);
            dirty = true;
        }
        if (dirty) {
            subscriptionRepository.save(sub);
            userRepository.save(user);
        }
    }

    private String buildCheckoutUrl(SubscriptionEntity sub) {
        if (billingProperties.hasRealWompiCredentials()) {
            String integrity = signatureService.computeCheckoutIntegrity(
                    sub.getExternalReference(),
                    sub.getAmountCents(),
                    sub.getCurrency(),
                    billingProperties.integritySecret()
            );
            String redirect = URLEncoder.encode(authProperties.frontendUrl() + "/plans?ref=" + sub.getExternalReference(), StandardCharsets.UTF_8);
            return billingProperties.checkoutBaseUrl()
                    + "?public-key=" + URLEncoder.encode(billingProperties.publicKey(), StandardCharsets.UTF_8)
                    + "&currency=" + URLEncoder.encode(sub.getCurrency(), StandardCharsets.UTF_8)
                    + "&amount-in-cents=" + sub.getAmountCents()
                    + "&reference=" + URLEncoder.encode(sub.getExternalReference(), StandardCharsets.UTF_8)
                    + "&signature:integrity=" + integrity
                    + "&redirect-url=" + redirect;
        }

        return authProperties.frontendUrl()
                + "/billing/sandbox-checkout?ref="
                + URLEncoder.encode(sub.getExternalReference(), StandardCharsets.UTF_8)
                + "&plan="
                + URLEncoder.encode(sub.getPlanCode(), StandardCharsets.UTF_8);
    }

    private String resolveEventsSecret() {
        if (billingProperties.eventsSecret() != null && !billingProperties.eventsSecret().isBlank()) {
            return billingProperties.eventsSecret().trim();
        }
        if (isSandboxAllowed()) {
            return SANDBOX_EVENTS_SECRET;
        }
        return "";
    }

    private String effectiveProviderName() {
        return billingProperties.hasRealWompiCredentials() ? "wompi" : "sandbox";
    }

    private boolean isSandboxActive() {
        return !billingProperties.hasRealWompiCredentials() && isSandboxAllowed();
    }

    private boolean isSandboxAllowed() {
        return billingProperties.sandboxEnabled() && !environment.acceptsProfiles(Profiles.of("prod"));
    }

    private String formatCop(long amountCents) {
        long pesos = amountCents / 100L;
        NumberFormat fmt = NumberFormat.getIntegerInstance(Locale.forLanguageTag("es-CO"));
        return "$" + fmt.format(pesos) + " COP";
    }
}
