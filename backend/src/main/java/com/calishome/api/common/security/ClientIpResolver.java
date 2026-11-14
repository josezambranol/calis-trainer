package com.calishome.api.common.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

public class ClientIpResolver {

    private final SecurityProperties securityProperties;

    public ClientIpResolver(SecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
    }

    public String resolve(HttpServletRequest request) {
        if (securityProperties.trustForwardedHeaders()) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (StringUtils.hasText(forwarded)) {
                String first = forwarded.split(",")[0].trim();
                String sanitized = sanitize(first);
                if (!sanitized.isEmpty()) {
                    return sanitized;
                }
            }
        }
        String remoteAddr = sanitize(request.getRemoteAddr());
        return remoteAddr.isEmpty() ? "unknown" : remoteAddr;
    }

    private String sanitize(String raw) {
        if (raw == null) {
            return "";
        }
        String cleaned = raw.replaceAll("[^0-9a-fA-F.:%]", "");
        return cleaned.length() <= 64 ? cleaned : cleaned.substring(0, 64);
    }
}
