package com.calishome.api.billing;

public record WebhookAckResponse(
        String outcome,
        String externalReference,
        String subscriptionStatus
) {
}
