package com.calishome.api.billing;

public record BillingOverviewResponse(
        String effectivePlanTier,
        boolean hasAnalyticsAccess,
        int maxWorkoutHistoryVisible,
        int maxPushDevices,
        String provider,
        boolean sandboxMode,
        SubscriptionDto subscription
) {
}
