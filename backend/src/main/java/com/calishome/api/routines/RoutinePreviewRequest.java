package com.calishome.api.routines;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record RoutinePreviewRequest(
        @Pattern(
                regexp = "^(principiante|intermedio|avanzado)$",
                message = "El nivel debe ser principiante, intermedio o avanzado."
        )
        String level,

        @Pattern(
                regexp = "^(fuerza_hipertrofia|resistencia_quemagrasa|movilidad_salud)$",
                message = "El objetivo debe ser fuerza_hipertrofia, resistencia_quemagrasa o movilidad_salud."
        )
        String goal,

        Integer durationMinutes,

        @Size(max = 7, message = "Máximo 7 días programados por semana.")
        List<@Size(max = 20) String> scheduledDays,

        @Size(max = 64, message = "La zona horaria excede la longitud máxima.")
        String timezone,

        @Min(-3) @Max(3)
        Integer adaptationScore
) {
}
