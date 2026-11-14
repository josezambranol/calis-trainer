package com.calishome.api.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public record AuthProperties(
        Jwt jwt,
        Refresh refresh,
        Google google,
        String frontendUrl,
        Lockout lockout,
        RateLimit rateLimit
) {
    public record Jwt(
            String secret,
            String issuer,
            long accessTokenTtlMinutes
    ) {
    }

    public record Refresh(
            long ttlDays,
            String cookieName,
            boolean cookieSecure,
            String cookieSameSite
    ) {
    }

    public record Google(
            String clientId
    ) {
    }

    public record Lockout(
            int maxAttempts,
            long durationMinutes
    ) {
    }

    public record RateLimit(
            boolean enabled,
            long requestsPerMinute
    ) {
    }
}
