package com.calishome.api.billing;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/billing")
@Tag(name = "Billing", description = "Planes Freemium/Pro, checkout hospedado Wompi/Sandbox y webhooks idempotentes")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @GetMapping("/plans")
    @Operation(summary = "Listar planes Gratis y Pro disponibles")
    public BillingPlansResponse getPlans() {
        return billingService.getPlans();
    }

    @GetMapping("/subscription")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Consultar plan efectivo, límites y estado de suscripción del usuario")
    public BillingOverviewResponse getSubscription(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return billingService.getOverview(userId);
    }

    @PostMapping("/checkout")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Crear sesión de checkout hospedado para CalisHome Pro")
    public ResponseEntity<CheckoutSessionResponse> createCheckout(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateCheckoutRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.status(HttpStatus.CREATED).body(billingService.createCheckout(userId, request));
    }

    @PostMapping("/subscription/cancel")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Cancelar suscripción Pro conservando acceso hasta fin de período")
    public BillingOverviewResponse cancelSubscription(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return billingService.cancelSubscription(userId);
    }

    @PostMapping("/webhooks/wompi")
    @Operation(summary = "Recibir eventos firmados de pago Wompi con idempotencia")
    public ResponseEntity<WebhookAckResponse> handleWompiWebhook(
            @RequestHeader(value = "X-Event-Checksum", required = false) String eventChecksum,
            @Valid @RequestBody WompiWebhookPayload payload) {
        return ResponseEntity.ok(billingService.processWompiWebhook(eventChecksum, payload));
    }

    @PostMapping("/sandbox/complete")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Completar flujo de demostración sandbox pasando por webhook SHA-256 real")
    public WebhookAckResponse completeSandboxCheckout(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SandboxCompleteRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return billingService.completeSandboxCheckout(userId, request);
    }
}
