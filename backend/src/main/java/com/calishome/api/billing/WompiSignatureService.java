package com.calishome.api.billing;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class WompiSignatureService {

    public String computeCheckoutIntegrity(
            String reference,
            long amountCents,
            String currency,
            String integritySecret) {
        String raw = reference + amountCents + currency + integritySecret;
        return sha256Hex(raw);
    }

    public String computeEventChecksum(WompiWebhookPayload payload, String eventsSecret) {
        WompiWebhookPayload.Transaction tx = payload.data().transaction();
        List<String> props = (payload.signature() != null && payload.signature().properties() != null)
                ? payload.signature().properties()
                : List.of("transaction.id", "transaction.status", "transaction.amount_in_cents");

        StringBuilder concatenated = new StringBuilder();
        for (String prop : props) {
            concatenated.append(resolveTransactionProperty(tx, prop));
        }
        concatenated.append(payload.timestamp());
        concatenated.append(eventsSecret);
        return sha256Hex(concatenated.toString());
    }

    public boolean verifyEventSignature(
            WompiWebhookPayload payload,
            String headerChecksum,
            String eventsSecret) {
        if (eventsSecret == null || eventsSecret.isBlank() || payload == null || payload.data() == null) {
            return false;
        }
        String provided = (headerChecksum != null && !headerChecksum.isBlank())
                ? headerChecksum.trim().toLowerCase(Locale.ROOT)
                : (payload.signature() != null && payload.signature().checksum() != null
                        ? payload.signature().checksum().trim().toLowerCase(Locale.ROOT)
                        : "");
        if (provided.isEmpty()) {
            return false;
        }

        String expected = computeEventChecksum(payload, eventsSecret);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8)
        );
    }

    public String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 no disponible en JVM.", ex);
        }
    }

    private String resolveTransactionProperty(WompiWebhookPayload.Transaction tx, String property) {
        return switch (property) {
            case "transaction.id" -> nonNull(tx.id());
            case "transaction.status" -> nonNull(tx.status());
            case "transaction.amount_in_cents" -> String.valueOf(tx.amountInCents());
            case "transaction.reference" -> nonNull(tx.reference());
            case "transaction.currency" -> nonNull(tx.currency());
            default -> "";
        };
    }

    private String nonNull(String value) {
        return value != null ? value : "";
    }
}
