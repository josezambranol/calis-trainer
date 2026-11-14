package com.calishome.api.auth;

import com.calishome.api.users.UserResponse;

public record AuthResponse(
        String accessToken,
        long expiresInSeconds,
        UserResponse user
) {
}
