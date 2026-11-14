package com.calishome.api.notifications;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PushSubscribeRequest(
        @NotBlank(message = "El endpoint Push es obligatorio.")
        @Size(max = 2048, message = "El endpoint Push excede el tamaño permitido.")
        @Pattern(
                regexp = "^https?://.+",
                message = "El endpoint Push debe ser una URL válida."
        )
        String endpoint,

        @NotNull(message = "Las claves de cifrado Push son obligatorias.")
        @Valid
        Keys keys
) {
    public record Keys(
            @NotBlank(message = "La clave p256dh es obligatoria.")
            @Size(max = 255)
            String p256dh,

            @NotBlank(message = "La clave auth es obligatoria.")
            @Size(max = 255)
            String auth
    ) {
    }
}
