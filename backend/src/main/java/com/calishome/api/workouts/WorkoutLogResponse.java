package com.calishome.api.workouts;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record WorkoutLogResponse(
        UUID id,
        Instant completedAt,
        LocalDate localDate,
        String routineTitle,
        int durationSeconds,
        int exercisesCompleted,
        String feedback,
        int adaptationScoreAfter
) {
    public static WorkoutLogResponse from(WorkoutLogEntity entity) {
        return new WorkoutLogResponse(
                entity.getId(),
                entity.getCompletedAt(),
                entity.getLocalDate(),
                entity.getRoutineTitle(),
                entity.getDurationSeconds(),
                entity.getExercisesCompleted(),
                entity.getFeedback(),
                entity.getAdaptationScoreAfter()
        );
    }
}
