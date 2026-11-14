package com.calishome.api.routines;

import com.calishome.api.exercises.ExerciseResponse;

public record RoutineExerciseItemResponse(
        ExerciseResponse exercise,
        int sets,
        int repsOrSeconds,
        int restSeconds
) {
}
