package com.calishome.api.notifications;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.push")
public record PushProperties(
        boolean enabled,
        boolean schedulerEnabled,
        String subject,
        String vapidPublicKey,
        String vapidPrivateKey
) {
}
