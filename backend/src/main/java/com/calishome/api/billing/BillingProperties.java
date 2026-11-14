package com.calishome.api.billing;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.billing")
public record BillingProperties(
        String provider,
        String checkoutBaseUrl,
        String publicKey,
        String integritySecret,
        String eventsSecret,
        String currency,
        long proMonthlyCents,
        long proYearlyCents,
        int gracePeriodDays,
        boolean sandboxEnabled
) {
    public boolean hasRealWompiCredentials() {
        return publicKey != null && !publicKey.isBlank()
                && integritySecret != null && !integritySecret.isBlank()
                && eventsSecret != null && !eventsSecret.isBlank();
    }
}
