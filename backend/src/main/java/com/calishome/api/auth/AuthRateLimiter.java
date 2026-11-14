package com.calishome.api.auth;

import com.calishome.api.common.web.ApiException;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class AuthRateLimiter {

    private static final int MAX_TRACKED_KEYS = 10_000;

    private final AuthProperties authProperties;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public AuthRateLimiter(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    public void checkLimit(String action, String clientKey) {
        if (!authProperties.rateLimit().enabled()) {
            return;
        }

        if (buckets.size() >= MAX_TRACKED_KEYS) {
            // Evicción simple acotada para evitar crecimiento ilimitado de memoria ante rotación de IPs
            buckets.clear();
        }

        String bucketKey = action + ":" + clientKey;
        Bucket bucket = buckets.computeIfAbsent(bucketKey, k -> createBucket());
        if (!bucket.tryConsume(1)) {
            throw new ApiException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Demasiados intentos",
                    "Has superado el límite temporal de solicitudes. Intenta de nuevo en un minuto.",
                    "rate-limit-exceeded"
            );
        }
    }

    private Bucket createBucket() {
        long capacity = Math.max(1, authProperties.rateLimit().requestsPerMinute());
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(capacity, Duration.ofMinutes(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }
}
