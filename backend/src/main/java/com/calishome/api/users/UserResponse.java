package com.calishome.api.users;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String fullName,
        boolean emailVerified,
        String role,
        String planTier,
        String level,
        String goal,
        int durationMinutes,
        List<String> scheduledDays,
        String reminderTime,
        String timezone,
        boolean notificationsEnabled,
        boolean soundEnabled,
        boolean voiceCoachEnabled,
        int streak,
        LocalDate lastCompletedLocalDate,
        int totalWorkoutsCompleted,
        int adaptationScore
) {
    public static UserResponse from(UserEntity user, UserProfileEntity profile) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.isEmailVerified(),
                user.getRole().name(),
                user.getPlanTier().name(),
                profile.getLevel(),
                profile.getGoal(),
                profile.getDurationMinutes(),
                List.copyOf(profile.getScheduledDays()),
                profile.getReminderTime(),
                profile.getTimezone(),
                profile.isNotificationsEnabled(),
                profile.isSoundEnabled(),
                profile.isVoiceCoachEnabled(),
                profile.getStreak(),
                profile.getLastCompletedLocalDate(),
                profile.getTotalWorkoutsCompleted(),
                profile.getAdaptationScore()
        );
    }
}
