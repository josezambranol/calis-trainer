package com.calishome.api.users;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ImportLocalProgressRequest(
        @Valid
        LocalProfileSnapshot profile,

        @Size(max = 100, message = "Se pueden importar como máximo 100 entrenamientos por lote.")
        List<@Valid ImportedWorkoutLog> logs
) {
    public record LocalProfileSnapshot(
            @Pattern(regexp = "^(principiante|intermedio|avanzado)$")
            String level,

            @Pattern(regexp = "^(fuerza_hipertrofia|resistencia_quemagrasa|movilidad_salud)$")
            String goal,

            Integer durationMinutes,

            List<String> scheduledDays,

            @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$")
            String reminderTime,

            String timezone,

            Boolean notificationsEnabled,

            Boolean soundEnabled,

            Boolean voiceCoachEnabled,

            @Min(-3) @Max(3)
            Integer adaptationScore
    ) {
    }

    public record ImportedWorkoutLog(
            @NotBlank
            String date,

            @NotBlank
            @Size(max = 150)
            String routineTitle,

            @Min(1) @Max(14400)
            int durationSeconds,

            @Min(1) @Max(50)
            int exercisesCompleted,

            @NotBlank
            @Pattern(regexp = "^(too_easy|just_right|too_hard)$")
            String feedback
    ) {
    }
}
