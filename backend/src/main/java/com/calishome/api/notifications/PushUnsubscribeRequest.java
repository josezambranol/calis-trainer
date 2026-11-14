package com.calishome.api.notifications;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PushUnsubscribeRequest(
        @NotBlank(message = "El endpoint Push es obligatorio.")
        @Size(max = 2048)
        String endpoint
) {
}
