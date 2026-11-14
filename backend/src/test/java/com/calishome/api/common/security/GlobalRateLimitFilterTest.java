package com.calishome.api.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class GlobalRateLimitFilterTest {

    @Test
    void clientIpResolverIgnoresSpoofedForwardedHeaderWhenUntrusted() {
        SecurityProperties untrustedProps = new SecurityProperties(
                new SecurityProperties.Cors(List.of("http://localhost:5173")),
                new SecurityProperties.GlobalRateLimit(true, 100),
                false
        );
        ClientIpResolver resolver = new ClientIpResolver(untrustedProps);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.10");
        request.addHeader("X-Forwarded-For", "127.0.0.1");

        assertThat(resolver.resolve(request)).isEqualTo("198.51.100.10");
    }

    @Test
    void clientIpResolverHonorsSanitizedForwardedHeaderWhenTrusted() {
        SecurityProperties trustedProps = new SecurityProperties(
                new SecurityProperties.Cors(List.of("http://localhost:5173")),
                new SecurityProperties.GlobalRateLimit(true, 100),
                true
        );
        ClientIpResolver resolver = new ClientIpResolver(trustedProps);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.2");
        request.addHeader("X-Forwarded-For", "203.0.113.45\r\n, 10.0.0.2");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.45");
    }

    @Test
    void globalRateLimitReturns429ProblemDetailAndSkipsHealth() throws Exception {
        SecurityProperties props = new SecurityProperties(
                new SecurityProperties.Cors(List.of("http://localhost:5173")),
                new SecurityProperties.GlobalRateLimit(true, 2),
                false
        );
        ClientIpResolver resolver = new ClientIpResolver(props);
        GlobalRateLimitFilter filter = new GlobalRateLimitFilter(props, resolver, new ObjectMapper());
        AtomicInteger passedCalls = new AtomicInteger();

        for (int i = 0; i < 2; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/exercises");
            req.setRemoteAddr("198.51.100.77");
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, (r, s) -> passedCalls.incrementAndGet());
            assertThat(res.getStatus()).isEqualTo(HttpStatus.OK.value());
        }

        MockHttpServletRequest limitedReq = new MockHttpServletRequest("GET", "/api/v1/exercises");
        limitedReq.setRemoteAddr("198.51.100.77");
        MockHttpServletResponse limitedRes = new MockHttpServletResponse();
        filter.doFilter(limitedReq, limitedRes, (r, s) -> passedCalls.incrementAndGet());

        assertThat(passedCalls.get()).isEqualTo(2);
        assertThat(limitedRes.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
        assertThat(limitedRes.getHeader("Retry-After")).isEqualTo("60");
        assertThat(limitedRes.getContentType()).contains(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        assertThat(limitedRes.getContentAsString()).contains("rate-limit-exceeded");

        // El endpoint /api/v1/health no debe quedar bloqueado por el rate limit global
        MockHttpServletRequest healthReq = new MockHttpServletRequest("GET", "/api/v1/health");
        healthReq.setRemoteAddr("198.51.100.77");
        MockHttpServletResponse healthRes = new MockHttpServletResponse();
        filter.doFilter(healthReq, healthRes, (r, s) -> passedCalls.incrementAndGet());
        assertThat(passedCalls.get()).isEqualTo(3);
    }
}
