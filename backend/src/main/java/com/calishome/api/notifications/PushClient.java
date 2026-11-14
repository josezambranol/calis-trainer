package com.calishome.api.notifications;

public interface PushClient {

    boolean isEnabled();

    String getVapidPublicKey();

    PushDeliveryResult send(PushSubscriptionEntity subscription, String jsonPayload);
}
