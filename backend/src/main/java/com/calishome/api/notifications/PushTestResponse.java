package com.calishome.api.notifications;

public record PushTestResponse(
        int sentCount,
        int removedExpiredCount,
        String message
) {
}
