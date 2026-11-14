package com.calishome.api.routines;

import java.util.List;

public record DailyRoutineResponse(
        String id,
        String dayId,
        String dayName,
        String title,
        String focus,
        String level,
        String goal,
        int estimatedMinutes,
        List<RoutineExerciseItemResponse> exercises,
        boolean isRestDay
) {
}
