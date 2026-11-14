package com.calishome.api.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerifyEmailRequest(
        @NotBlank(message = "El token de verificación es obligatorio.")
        @Size(max = 256)
        String token
) {
}
