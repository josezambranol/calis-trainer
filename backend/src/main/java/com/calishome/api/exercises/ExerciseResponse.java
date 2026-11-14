package com.calishome.api.exercises;

import java.util.List;

public record ExerciseResponse(
        String id,
        String name,
        String targetMuscle,
        String category,
        String difficulty,
        String type,
        int defaultAmount,
        int restSeconds,
        List<String> instructions,
        String tips,
        String equipment
) {
    public static ExerciseResponse from(ExerciseEntity entity) {
        return new ExerciseResponse(
                entity.getId(),
                entity.getName(),
                entity.getTargetMuscle(),
                entity.getCategory(),
                entity.getDifficulty(),
                entity.getExerciseType(),
                entity.getDefaultAmount(),
                entity.getRestSeconds(),
                List.copyOf(entity.getInstructions()),
                entity.getTips(),
                entity.getEquipment()
        );
    }
}
