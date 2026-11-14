package com.calishome.api.billing;

import java.util.List;

public record BillingPlanDto(
        String code,
        String name,
        String billingCycle,
        long amountCents,
        String currency,
        String formattedPrice,
        boolean recommended,
        List<String> features
) {
}
