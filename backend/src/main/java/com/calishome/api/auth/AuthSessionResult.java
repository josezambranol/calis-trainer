package com.calishome.api.auth;

public record AuthSessionResult(
        AuthResponse response,
        String rawRefreshToken
) {
}
