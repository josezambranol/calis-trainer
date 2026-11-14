package com.calishome.api.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "El correo es obligatorio.")
        @Email(message = "Formato de correo electrónico inválido.")
        @Size(max = 255)
        String email,

        @NotBlank(message = "La contraseña es obligatoria.")
        @Size(max = 128)
        String password
) {
}
