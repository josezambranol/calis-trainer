package com.calishome.api.common.util;

import com.calishome.api.common.web.ApiException;
import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;

public final class TrainingDayUtil {

    public static final String DEFAULT_TIMEZONE = "America/Bogota";

    public record DayDescriptor(String id, String name, DayOfWeek javaDay) {}

    public static final List<DayDescriptor> ORDERED_DAYS = List.of(
            new DayDescriptor("lunes", "Lunes", DayOfWeek.MONDAY),
            new DayDescriptor("martes", "Martes", DayOfWeek.TUESDAY),
            new DayDescriptor("miercoles", "Miércoles", DayOfWeek.WEDNESDAY),
            new DayDescriptor("jueves", "Jueves", DayOfWeek.THURSDAY),
            new DayDescriptor("viernes", "Viernes", DayOfWeek.FRIDAY),
            new DayDescriptor("sabado", "Sábado", DayOfWeek.SATURDAY),
            new DayDescriptor("domingo", "Domingo", DayOfWeek.SUNDAY)
    );

    private static final Map<DayOfWeek, String> JAVA_TO_ID = Map.of(
            DayOfWeek.MONDAY, "lunes",
            DayOfWeek.TUESDAY, "martes",
            DayOfWeek.WEDNESDAY, "miercoles",
            DayOfWeek.THURSDAY, "jueves",
            DayOfWeek.FRIDAY, "viernes",
            DayOfWeek.SATURDAY, "sabado",
            DayOfWeek.SUNDAY, "domingo"
    );

    public static final Set<String> VALID_DAY_IDS = Set.of(
            "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"
    );

    private TrainingDayUtil() {
    }

    public static ZoneId resolveZoneIdOrDefault(String timezone) {
        if (timezone == null || timezone.isBlank()) {
            return ZoneId.of(DEFAULT_TIMEZONE);
        }
        try {
            return ZoneId.of(timezone.trim());
        } catch (DateTimeException ex) {
            return ZoneId.of(DEFAULT_TIMEZONE);
        }
    }

    public static String validateAndNormalizeTimezone(String timezone) {
        try {
            return ZoneId.of(timezone.trim()).getId();
        } catch (Exception ex) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Zona horaria inválida",
                    "La zona horaria proporcionada no es un identificador IANA válido.",
                    "invalid-timezone"
            );
        }
    }

    public static String toDayId(DayOfWeek dayOfWeek) {
        return JAVA_TO_ID.get(dayOfWeek);
    }

    public static List<String> normalizeAndValidateScheduledDays(List<String> days) {
        if (days == null || days.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Días de entrenamiento inválidos",
                    "Debes seleccionar al menos un día de entrenamiento.",
                    "invalid-scheduled-days"
            );
        }
        Set<String> normalized = new HashSet<>();
        for (String d : days) {
            if (d == null) continue;
            String clean = d.trim().toLowerCase(Locale.ROOT);
            if (!VALID_DAY_IDS.contains(clean)) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Día de semana inválido",
                        "Día no reconocido: " + d,
                        "invalid-scheduled-days"
                );
            }
            normalized.add(clean);
        }
        if (normalized.isEmpty()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Días de entrenamiento inválidos",
                    "Debes seleccionar al menos un día de entrenamiento.",
                    "invalid-scheduled-days"
            );
        }
        // Mantener orden canónico lunes..domingo
        return ORDERED_DAYS.stream()
                .map(DayDescriptor::id)
                .filter(normalized::contains)
                .toList();
    }

    public static int calculateNextStreak(
            int currentStreak,
            LocalDate lastCompletedDate,
            LocalDate completionDate,
            List<String> scheduledDays) {
        if (lastCompletedDate == null) {
            return 1;
        }
        if (!completionDate.isAfter(lastCompletedDate)) {
            return Math.max(1, currentStreak);
        }
        Set<String> scheduled = new HashSet<>(scheduledDays == null ? List.of() : scheduledDays);
        if (scheduled.isEmpty()) {
            return completionDate.equals(lastCompletedDate.plusDays(1))
                    ? Math.max(1, currentStreak) + 1
                    : 1;
        }

        // Si el usuario no falló ningún día programado estrictamente entre su última sesión y hoy, la racha continúa
        LocalDate cursor = lastCompletedDate.plusDays(1);
        while (cursor.isBefore(completionDate)) {
            String dayId = toDayId(cursor.getDayOfWeek());
            if (scheduled.contains(dayId)) {
                return 1;
            }
            cursor = cursor.plusDays(1);
        }
        return Math.max(0, currentStreak) + 1;
    }

    public static int clampAdaptationScore(int score) {
        return Math.max(-3, Math.min(3, score));
    }

    public static int applyFeedbackToScore(int currentScore, String feedback) {
        int delta = switch (feedback) {
            case "too_easy" -> 1;
            case "too_hard" -> -1;
            default -> 0;
        };
        return clampAdaptationScore(currentScore + delta);
    }
}
