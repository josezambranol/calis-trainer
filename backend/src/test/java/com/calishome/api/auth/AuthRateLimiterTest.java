package com.calishome.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.calishome.api.common.web.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class AuthRateLimiterTest {

    @Test
    void blocksRequestsExceedingConfiguredLimit() {
        AuthProperties props = new AuthProperties(
                new AuthProperties.Jwt("test-secret-key-at-least-32-bytes-long!!", "calishome-api", 15),
                new AuthProperties.Refresh(30, "calishome_refresh", false, "Lax"),
                new AuthProperties.Google(""),
                "http://localhost:5173",
                new AuthProperties.Lockout(5, 15),
                new AuthProperties.RateLimit(true, 2)
        );
        AuthRateLimiter limiter = new AuthRateLimiter(props);

        limiter.checkLimit("login", "10.0.0.1");
        limiter.checkLimit("login", "10.0.0.1");

        assertThatThrownBy(() -> limiter.checkLimit("login", "10.0.0.1"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }
}
