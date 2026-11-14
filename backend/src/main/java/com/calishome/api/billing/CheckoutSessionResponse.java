package com.calishome.api.billing;

public record CheckoutSessionResponse(
        String provider,
        boolean sandboxMode,
        String planCode,
        String externalReference,
        long amountCents,
        String currency,
        String checkoutUrl
) {
}
