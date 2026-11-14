package com.calishome.api.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateCheckoutRequest(
        @NotBlank(message = "El código del plan es obligatorio.")
        @Pattern(
                regexp = "^(pro_monthly|pro_yearly)$",
                message = "Plan inválido. Usa pro_monthly o pro_yearly."
        )
        String planCode
) {
}
