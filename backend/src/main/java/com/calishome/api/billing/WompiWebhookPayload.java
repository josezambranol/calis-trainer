package com.calishome.api.billing;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record WompiWebhookPayload(
        @NotBlank(message = "El tipo de evento es obligatorio.")
        @Size(max = 80)
        String event,

        @NotNull(message = "El bloque data es obligatorio.")
        @Valid
        DataBlock data,

        @Valid
        SignatureBlock signature,

        long timestamp
) {
    public record DataBlock(
            @NotNull(message = "El objeto transaction es obligatorio.")
            @Valid
            Transaction transaction
    ) {
    }

    public record Transaction(
            @NotBlank
            @Size(max = 120)
            String id,

            @JsonProperty("amount_in_cents")
            long amountInCents,

            @NotBlank
            @Size(max = 120)
            String reference,

            @Size(max = 10)
            String currency,

            @NotBlank
            @Size(max = 40)
            String status
    ) {
    }

    public record SignatureBlock(
            List<String> properties,
            String checksum
    ) {
    }
}
