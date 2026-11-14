package com.calishome.api.billing;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class WompiSignatureServiceTest {

    private final WompiSignatureService service = new WompiSignatureService();

    @Test
    void verifiesValidEventSignatureAndRejectsTampering() {
        String eventsSecret = "test-events-secret-123";
        WompiWebhookPayload unsigned = new WompiWebhookPayload(
                "transaction.updated",
                new WompiWebhookPayload.DataBlock(
                        new WompiWebhookPayload.Transaction(
                                "tx-1001",
                                1990000L,
                                "CALIS-TEST0001",
                                "COP",
                                "APPROVED"
                        )
                ),
                new WompiWebhookPayload.SignatureBlock(
                        List.of("transaction.id", "transaction.status", "transaction.amount_in_cents"),
                        ""
                ),
                1760000000L
        );

        String checksum = service.computeEventChecksum(unsigned, eventsSecret);
        WompiWebhookPayload signed = new WompiWebhookPayload(
                unsigned.event(),
                unsigned.data(),
                new WompiWebhookPayload.SignatureBlock(unsigned.signature().properties(), checksum),
                unsigned.timestamp()
        );

        assertThat(service.verifyEventSignature(signed, checksum, eventsSecret)).isTrue();
        assertThat(service.verifyEventSignature(signed, null, eventsSecret)).isTrue();
        assertThat(service.verifyEventSignature(signed, "badchecksum", eventsSecret)).isFalse();

        WompiWebhookPayload tamperedAmount = new WompiWebhookPayload(
                signed.event(),
                new WompiWebhookPayload.DataBlock(
                        new WompiWebhookPayload.Transaction(
                                "tx-1001",
                                100L,
                                "CALIS-TEST0001",
                                "COP",
                                "APPROVED"
                        )
                ),
                signed.signature(),
                signed.timestamp()
        );
        assertThat(service.verifyEventSignature(tamperedAmount, checksum, eventsSecret)).isFalse();
    }

    @Test
    void computesDeterministicCheckoutIntegrityHash() {
        String hashA = service.computeCheckoutIntegrity("CALIS-REF1", 1990000L, "COP", "sec_123");
        String hashB = service.computeCheckoutIntegrity("CALIS-REF1", 1990000L, "COP", "sec_123");

        assertThat(hashA).hasSize(64).isEqualTo(hashB);
    }
}
