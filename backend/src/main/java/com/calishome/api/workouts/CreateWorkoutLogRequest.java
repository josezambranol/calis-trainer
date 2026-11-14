package com.calishome.api.workouts;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateWorkoutLogRequest(
        @NotBlank(message = "El título de la rutina es obligatorio.")
        @Size(max = 150, message = "El título de la rutina no puede superar 150 caracteres.")
        String routineTitle,

        @Min(value = 1, message = "La duración mínima es de 1 segundo.")
        @Max(value = 14400, message = "La duración máxima permitida es de 4 horas.")
        int durationSeconds,

        @Min(value = 1, message = "Debes completar al menos 1 ejercicio.")
        @Max(value = 50, message = "Número máximo de ejercicios superado.")
        int exercisesCompleted,

        @NotBlank(message = "El feedback post-entreno es obligatorio.")
        @Pattern(
                regexp = "^(too_easy|just_right|too_hard)$",
                message = "El feedback debe ser too_easy, just_right o too_hard."
        )
        String feedback
) {
}
