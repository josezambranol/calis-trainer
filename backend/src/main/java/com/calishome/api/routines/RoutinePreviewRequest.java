package com.calishome.api.routines;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
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

        List<String> scheduledDays,

        String timezone,

        @Min(-3) @Max(3)
        Integer adaptationScore
) {
}
