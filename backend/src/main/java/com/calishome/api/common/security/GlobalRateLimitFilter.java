package com.calishome.api.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.web.filter.OncePerRequestFilter;

public class GlobalRateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_TRACKED_KEYS = 10_000;

    private final SecurityProperties securityProperties;
    private final ClientIpResolver clientIpResolver;
    private final ObjectMapper objectMapper;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public GlobalRateLimitFilter(
            SecurityProperties securityProperties,
            ClientIpResolver clientIpResolver,
            ObjectMapper objectMapper) {
        this.securityProperties = securityProperties;
        this.clientIpResolver = clientIpResolver;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (securityProperties.globalRateLimit() == null || !securityProperties.globalRateLimit().enabled()) {
            return true;
        }
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI();
        return !path.startsWith("/api/") || path.equals("/api/v1/health");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (buckets.size() >= MAX_TRACKED_KEYS) {
            buckets.clear();
        }

        String clientKey = clientIpResolver.resolve(request);
        Bucket bucket = buckets.computeIfAbsent(clientKey, k -> createBucket());
        if (!bucket.tryConsume(1)) {
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Has superado el límite global de solicitudes por minuto. Intenta de nuevo en breve."
            );
            problem.setTitle("Demasiadas solicitudes");
            problem.setType(URI.create("https://calishome.app/errors/rate-limit-exceeded"));
            problem.setInstance(URI.create(request.getRequestURI()));

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader(HttpHeaders.RETRY_AFTER, "60");
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            objectMapper.writeValue(response.getOutputStream(), problem);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private Bucket createBucket() {
        long capacity = Math.max(1, securityProperties.globalRateLimit().requestsPerMinute());
        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(capacity, Duration.ofMinutes(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }
}
