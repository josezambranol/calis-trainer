package com.calishome.api.notifications;

public record NotificationStatusResponse(
        boolean pushEnabled,
        int activeDevicesCount
) {
}
