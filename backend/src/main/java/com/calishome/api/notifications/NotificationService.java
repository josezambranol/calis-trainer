package com.calishome.api.notifications;

import com.calishome.api.common.util.TrainingDayUtil;
import com.calishome.api.common.web.ApiException;
import com.calishome.api.common.web.ResourceNotFoundException;
import com.calishome.api.users.UserEntity;
import com.calishome.api.users.UserProfileEntity;
import com.calishome.api.users.UserProfileRepository;
import com.calishome.api.users.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final PushSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final PushClient pushClient;
    private final PushProperties pushProperties;
    private final ObjectMapper objectMapper;

    public NotificationService(
            PushSubscriptionRepository subscriptionRepository,
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            PushClient pushClient,
            PushProperties pushProperties,
            ObjectMapper objectMapper) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.pushClient = pushClient;
        this.pushProperties = pushProperties;
        this.objectMapper = objectMapper;
    }

    public VapidKeyResponse getVapidPublicKey() {
        return new VapidKeyResponse(pushClient.isEnabled(), pushClient.getVapidPublicKey());
    }

    @Transactional(readOnly = true)
    public NotificationStatusResponse getStatus(UUID userId) {
        int count = (int) subscriptionRepository.countByUserId(userId);
        return new NotificationStatusResponse(pushClient.isEnabled(), count);
    }

    @Transactional
    public NotificationStatusResponse subscribe(UUID userId, PushSubscribeRequest request, String userAgent) {
        userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));

        String endpoint = request.endpoint().trim();
        PushSubscriptionEntity entity = subscriptionRepository.findByEndpoint(endpoint)
                .orElseGet(PushSubscriptionEntity::new);

        entity.setUserId(userId);
        entity.setEndpoint(endpoint);
        entity.setP256dh(request.keys().p256dh().trim());
        entity.setAuth(request.keys().auth().trim());
        entity.setUserAgent(truncate(userAgent, 255));
        subscriptionRepository.save(entity);

        UserProfileEntity profile = userProfileRepository.findById(userId).orElse(null);
        if (profile != null && !profile.isNotificationsEnabled()) {
            profile.setNotificationsEnabled(true);
            userProfileRepository.save(profile);
        }

        int count = (int) subscriptionRepository.countByUserId(userId);
        return new NotificationStatusResponse(pushClient.isEnabled(), count);
    }

    @Transactional
    public void unsubscribe(UUID userId, String endpoint) {
        subscriptionRepository.deleteByUserIdAndEndpoint(userId, endpoint.trim());
    }

    @Transactional
    public PushTestResponse sendTestNotification(UUID userId) {
        if (!pushClient.isEnabled()) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Web Push deshabilitado",
                    "Las notificaciones Web Push no están activas en el servidor.",
                    "push-disabled"
            );
        }

        List<PushSubscriptionEntity> subscriptions =
                subscriptionRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
        if (subscriptions.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Sin dispositivos suscritos",
                    "Activa primero las notificaciones Push en este dispositivo para probar el envío desde el servidor.",
                    "no-push-subscriptions"
            );
        }

        String payload = serializePayload(
                "🔥 CalisHome: ¡Push Activo!",
                "Las notificaciones en segundo plano están listas para recordarte tu rutina sin material.",
                "calishome-test"
        );

        int sentCount = 0;
        int removedCount = 0;
        for (PushSubscriptionEntity sub : subscriptions) {
            PushDeliveryResult result = pushClient.send(sub, payload);
            if (result.subscriptionGone()) {
                subscriptionRepository.delete(sub);
                removedCount++;
            } else if (result.delivered()) {
                sentCount++;
            }
        }

        String msg = sentCount > 0
                ? "✅ Notificación Push enviada a " + sentCount + " dispositivo(s)."
                : "No se pudo entregar la notificación al servicio Push del navegador.";
        return new PushTestResponse(sentCount, removedCount, msg);
    }

    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void scheduledReminderTick() {
        if (!pushClient.isEnabled() || !pushProperties.schedulerEnabled()) {
            return;
        }
        int sent = dispatchDueReminders(Instant.now());
        if (sent > 0) {
            log.info("Web Push reminders dispatched count={}", sent);
        }
    }

    @Transactional
    public int dispatchDueReminders(Instant referenceInstant) {
        if (!pushClient.isEnabled()) {
            return 0;
        }

        List<PushSubscriptionEntity> allSubs = subscriptionRepository.findAll();
        if (allSubs.isEmpty()) {
            return 0;
        }

        int sentCount = 0;
        for (PushSubscriptionEntity sub : allSubs) {
            UserEntity user = userRepository.findByIdAndDeletedAtIsNull(sub.getUserId()).orElse(null);
            UserProfileEntity profile = userProfileRepository.findById(sub.getUserId()).orElse(null);
            if (user == null || profile == null || !profile.isNotificationsEnabled()) {
                continue;
            }

            ZoneId zoneId = TrainingDayUtil.resolveZoneIdOrDefault(profile.getTimezone());
            ZonedDateTime userNow = ZonedDateTime.ofInstant(referenceInstant, zoneId);
            LocalDate userLocalDate = userNow.toLocalDate();
            String currentDayId = TrainingDayUtil.toDayId(userLocalDate.getDayOfWeek());
            String currentTime = String.format("%02d:%02d", userNow.getHour(), userNow.getMinute());

            boolean isScheduledDay = profile.getScheduledDays() != null
                    && profile.getScheduledDays().contains(currentDayId);
            boolean isReminderMinute = currentTime.equals(profile.getReminderTime());
            boolean alreadySentToday = userLocalDate.equals(sub.getLastSentLocalDate());
            boolean alreadyTrainedToday = userLocalDate.equals(profile.getLastCompletedLocalDate());

            if (!isScheduledDay || !isReminderMinute || alreadySentToday || alreadyTrainedToday) {
                continue;
            }

            String payload = serializePayload(
                    "⏰ ¡Hora de entrenar en CalisHome!",
                    "Hola " + user.getFullName() + ", tu rutina de "
                            + profile.getDurationMinutes()
                            + " min está lista. ¡Mantén tu racha viva!",
                    "calishome-reminder"
            );

            PushDeliveryResult result = pushClient.send(sub, payload);
            if (result.subscriptionGone()) {
                subscriptionRepository.delete(sub);
                log.info("Removed expired push subscription id={}", sub.getId());
            } else if (result.delivered()) {
                sub.setLastSentLocalDate(userLocalDate);
                subscriptionRepository.save(sub);
                sentCount++;
            }
        }
        return sentCount;
    }

    private String serializePayload(String title, String body, String tag) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "title", title,
                    "body", body,
                    "tag", tag,
                    "url", "/"
            ));
        } catch (JsonProcessingException ex) {
            return "{\"title\":\"CalisHome\",\"body\":\"¡Hora de entrenar!\",\"url\":\"/\"}";
        }
    }

    private String truncate(String value, int maxLength) {
        if (value == null) return null;
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
