package com.calishome.api.notifications;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications", description = "Suscripciones Web Push VAPID y recordatorios programados")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/vapid-public-key")
    @Operation(summary = "Obtener clave pública VAPID para suscripción Push del navegador")
    public VapidKeyResponse getVapidPublicKey() {
        return notificationService.getVapidPublicKey();
    }

    @GetMapping("/status")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Consultar dispositivos suscritos a Web Push del usuario autenticado")
    public NotificationStatusResponse getStatus(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return notificationService.getStatus(userId);
    }

    @PostMapping("/subscribe")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Registrar o actualizar suscripción Web Push del navegador actual")
    public ResponseEntity<NotificationStatusResponse> subscribe(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PushSubscribeRequest request,
            HttpServletRequest httpRequest) {
        UUID userId = UUID.fromString(jwt.getSubject());
        NotificationStatusResponse status = notificationService.subscribe(
                userId,
                request,
                httpRequest.getHeader(HttpHeaders.USER_AGENT)
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(status);
    }

    @DeleteMapping("/unsubscribe")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Eliminar suscripción Web Push de un dispositivo")
    public ResponseEntity<Void> unsubscribe(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PushUnsubscribeRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        notificationService.unsubscribe(userId, request.endpoint());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/test")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Enviar notificación Web Push de prueba desde el servidor")
    public PushTestResponse sendTest(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return notificationService.sendTestNotification(userId);
    }
}
