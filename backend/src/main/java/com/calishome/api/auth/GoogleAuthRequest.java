package com.calishome.api.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleAuthRequest(
        @NotBlank(message = "El idToken de Google es obligatorio.")
        @Size(max = 4096)
        String idToken
) {
}
