package com.calishome.api.billing;

import java.time.Instant;
import java.util.UUID;

public record SubscriptionDto(
        UUID id,
        String provider,
        String planCode,
        String status,
        String externalReference,
        long amountCents,
        String currency,
        Instant currentPeriodStart,
        Instant currentPeriodEnd,
        Instant graceUntil,
        boolean cancelAtPeriodEnd,
        Instant canceledAt
) {
    public static SubscriptionDto from(SubscriptionEntity entity) {
        return new SubscriptionDto(
                entity.getId(),
                entity.getProvider(),
                entity.getPlanCode(),
                entity.getStatus().name(),
                entity.getExternalReference(),
                entity.getAmountCents(),
                entity.getCurrency(),
                entity.getCurrentPeriodStart(),
                entity.getCurrentPeriodEnd(),
                entity.getGraceUntil(),
                entity.isCancelAtPeriodEnd(),
                entity.getCanceledAt()
        );
    }
}
