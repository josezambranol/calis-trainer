package com.calishome.api.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SandboxCompleteRequest(
        @NotBlank(message = "La referencia externa es obligatoria.")
        @Size(max = 120)
        String externalReference,

        @NotBlank(message = "El estado simulado es obligatorio.")
        @Pattern(
                regexp = "^(APPROVED|DECLINED|VOIDED)$",
                message = "Estado permitido en sandbox: APPROVED, DECLINED o VOIDED."
        )
        String transactionStatus
) {
}
