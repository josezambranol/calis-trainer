package com.calishome.api.common.security;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security")
public record SecurityProperties(
        Cors cors,
        GlobalRateLimit globalRateLimit,
        boolean trustForwardedHeaders
) {
    public record Cors(
            List<String> allowedOrigins
    ) {
    }

    public record GlobalRateLimit(
            boolean enabled,
            long requestsPerMinute
    ) {
    }
}
