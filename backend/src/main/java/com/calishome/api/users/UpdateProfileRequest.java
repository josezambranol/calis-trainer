package com.calishome.api.users;

import jakarta.validation.constraints.Pattern;
import java.util.List;

public record UpdateProfileRequest(
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

        @Pattern(
                regexp = "^([01]\\d|2[0-3]):[0-5]\\d$",
                message = "La hora de recordatorio debe tener formato HH:MM."
        )
        String reminderTime,

        String timezone,

        Boolean notificationsEnabled,

        Boolean soundEnabled,

        Boolean voiceCoachEnabled
) {
}
