package com.calishome.api.health;

import java.time.Instant;

public record HealthResponse(
        String status,
        String service,
        String database,
        Instant timestamp
) {
}
