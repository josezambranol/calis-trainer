package com.calishome.api.notifications;

public record VapidKeyResponse(
        boolean enabled,
        String publicKey
) {
}
