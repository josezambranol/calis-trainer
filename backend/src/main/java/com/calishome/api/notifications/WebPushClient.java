package com.calishome.api.notifications;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Security;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.interfaces.ECPrivateKey;
import org.bouncycastle.jce.interfaces.ECPublicKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.util.BigIntegers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

@Component
public class WebPushClient implements PushClient {

    private static final Logger log = LoggerFactory.getLogger(WebPushClient.class);

    private final boolean enabled;
    private final String publicKey;
    private final PushService pushService;

    public WebPushClient(PushProperties properties, Environment environment) {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }

        if (!properties.enabled()) {
            this.enabled = false;
            this.publicKey = "";
            this.pushService = null;
            return;
        }

        String resolvedPublic = properties.vapidPublicKey() != null ? properties.vapidPublicKey().trim() : "";
        String resolvedPrivate = properties.vapidPrivateKey() != null ? properties.vapidPrivateKey().trim() : "";

        if (resolvedPublic.isEmpty() || resolvedPrivate.isEmpty()) {
            if (environment.acceptsProfiles(Profiles.of("prod"))) {
                throw new IllegalStateException(
                        "VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY son obligatorias en producción cuando app.push.enabled=true.");
            }
            VapidPair ephemeral = generateEphemeralVapidKeys();
            resolvedPublic = ephemeral.publicKey();
            resolvedPrivate = ephemeral.privateKey();
            log.warn("Usando claves VAPID efímeras para desarrollo/test. Configura VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en producción.");
        }

        String subject = (properties.subject() == null || properties.subject().isBlank())
                ? "mailto:soporte@calishome.app"
                : properties.subject().trim();

        try {
            this.pushService = new PushService(resolvedPublic, resolvedPrivate, subject);
            this.publicKey = resolvedPublic;
            this.enabled = true;
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudieron inicializar las claves VAPID para Web Push.", ex);
        }
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public String getVapidPublicKey() {
        return publicKey;
    }

    @Override
    public PushDeliveryResult send(PushSubscriptionEntity subscription, String jsonPayload) {
        if (!enabled || pushService == null) {
            return new PushDeliveryResult(503, false, false);
        }
        if (!PushEndpointValidator.isSafeExternalEndpoint(subscription.getEndpoint())) {
            log.warn("Bloqueado envío Web Push a endpoint restringido subscriptionId={}", subscription.getId());
            return PushDeliveryResult.fromHttpStatus(410);
        }

        try {
            Notification notification = new Notification(
                    subscription.getEndpoint(),
                    subscription.getP256dh(),
                    subscription.getAuth(),
                    jsonPayload.getBytes(StandardCharsets.UTF_8)
            );
            HttpResponse response = pushService.send(notification);
            int statusCode = response.getStatusLine().getStatusCode();
            return PushDeliveryResult.fromHttpStatus(statusCode);
        } catch (Exception ex) {
            log.warn("Error enviando notificación Web Push a {}: {}", subscription.getId(), ex.getMessage());
            return new PushDeliveryResult(500, false, false);
        }
    }

    private VapidPair generateEphemeralVapidKeys() {
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC", BouncyCastleProvider.PROVIDER_NAME);
            kpg.initialize(new ECGenParameterSpec("prime256v1"));
            KeyPair keyPair = kpg.generateKeyPair();

            ECPublicKey ecPub = (ECPublicKey) keyPair.getPublic();
            ECPrivateKey ecPriv = (ECPrivateKey) keyPair.getPrivate();

            byte[] uncompressedPub = ecPub.getQ().getEncoded(false);
            byte[] rawPriv = BigIntegers.asUnsignedByteArray(32, ecPriv.getD());

            Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
            return new VapidPair(
                    encoder.encodeToString(uncompressedPub),
                    encoder.encodeToString(rawPriv)
            );
        } catch (Exception ex) {
            throw new IllegalStateException("Error generando par de claves VAPID efímero.", ex);
        }
    }

    private record VapidPair(String publicKey, String privateKey) {}
}
