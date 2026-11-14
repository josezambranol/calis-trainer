package com.calishome.api.workouts;

public record WorkoutAnalyticsResponse(
        int totalWorkouts,
        int totalMinutes,
        int currentStreak,
        int adaptationScore,
        int workoutsLast7Days,
        int workoutsLast30Days,
        int tooEasyCount,
        int justRightCount,
        int tooHardCount
) {
}
