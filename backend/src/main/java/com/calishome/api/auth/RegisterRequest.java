package com.calishome.api.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "El nombre completo es obligatorio.")
        @Size(min = 2, max = 120, message = "El nombre debe tener entre 2 y 120 caracteres.")
        String fullName,

        @NotBlank(message = "El correo es obligatorio.")
        @Email(message = "Formato de correo electrónico inválido.")
        @Size(max = 255, message = "El correo no puede superar 255 caracteres.")
        String email,

        @NotBlank(message = "La contraseña es obligatoria.")
        @Size(min = 8, max = 128, message = "La contraseña debe tener entre 8 y 128 caracteres.")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                message = "La contraseña debe incluir al menos una letra y un número."
        )
        String password
) {
}
