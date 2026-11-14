package com.calishome.api.billing;

import java.util.List;

public record BillingPlansResponse(
        String provider,
        boolean sandboxMode,
        List<BillingPlanDto> plans
) {
}
