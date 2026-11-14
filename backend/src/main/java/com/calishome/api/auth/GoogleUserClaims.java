package com.calishome.api.auth;

public record GoogleUserClaims(
        String sub,
        String email,
        boolean emailVerified,
        String fullName
) {
}
