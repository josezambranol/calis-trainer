package com.calishome.api.notifications;

public record PushDeliveryResult(
        int statusCode,
        boolean delivered,
        boolean subscriptionGone
) {
    public static PushDeliveryResult fromHttpStatus(int statusCode) {
        boolean ok = statusCode >= 200 && statusCode < 300;
        boolean gone = statusCode == 404 || statusCode == 410;
        return new PushDeliveryResult(statusCode, ok, gone);
    }
}
