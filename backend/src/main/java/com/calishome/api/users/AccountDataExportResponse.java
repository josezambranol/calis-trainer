package com.calishome.api.users;

import com.calishome.api.billing.SubscriptionEntity;
import com.calishome.api.nutrition.NutritionDtos.NutritionLogDto;
import com.calishome.api.planning.ScheduleDtos.ScheduledWorkoutDto;
import com.calishome.api.workouts.WorkoutLogResponse;
import java.time.Instant;
import java.util.List;

public record AccountDataExportResponse(
        Instant exportedAt,
        String privacyFramework,
        UserResponse user,
        List<WorkoutLogResponse> workoutLogs,
        List<ScheduledWorkoutDto> scheduledWorkouts,
        List<NutritionLogDto> nutritionLogs,
        List<SubscriptionExportDto> subscriptions,
        long activePushDevicesCount
) {
    public record SubscriptionExportDto(
            String provider,
            String planCode,
            String status,
            long amountCents,
            String currency,
            Instant currentPeriodStart,
            Instant currentPeriodEnd,
            boolean cancelAtPeriodEnd,
            Instant createdAt
    ) {
        public static SubscriptionExportDto from(SubscriptionEntity entity) {
            return new SubscriptionExportDto(
                    entity.getProvider(),
                    entity.getPlanCode(),
                    entity.getStatus().name(),
                    entity.getAmountCents(),
                    entity.getCurrency(),
                    entity.getCurrentPeriodStart(),
                    entity.getCurrentPeriodEnd(),
                    entity.isCancelAtPeriodEnd(),
                    entity.getCreatedAt()
            );
        }
    }
}
