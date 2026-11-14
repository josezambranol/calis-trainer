package com.calishome.api.planning;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class ScheduleDtos {

    private ScheduleDtos() {
    }

    public record ScheduledWorkoutDto(
            UUID id,
            LocalDate scheduledDate,
            String routineTitle,
            String focus,
            int durationMinutes,
            ScheduledWorkoutStatus status,
            String missedReason,
            UUID completedWorkoutId,
            LocalDate rescheduledTo
    ) {
        public static ScheduledWorkoutDto from(ScheduledWorkoutEntity entity) {
            return new ScheduledWorkoutDto(
                    entity.getId(),
                    entity.getScheduledDate(),
                    entity.getRoutineTitle(),
                    entity.getFocus(),
                    entity.getDurationMinutes(),
                    entity.getStatus(),
                    entity.getMissedReason(),
                    entity.getCompletedWorkoutId(),
                    entity.getRescheduledTo()
            );
        }
    }

    public record AdherenceMetrics(
            int plannedCount14d,
            int completedCount14d,
            int missedCount14d,
            int rescheduledCount14d,
            double adherencePercent14d,
            List<LocalDate> unaddressedMissedDates
    ) {
    }

    public record ScheduleOverviewResponse(
            LocalDate today,
            String timezone,
            AdherenceMetrics adherence,
            List<ScheduledWorkoutDto> sessions
    ) {
    }

    public record UpsertScheduleRequest(
            @NotNull(message = "La fecha programada es obligatoria.")
            LocalDate scheduledDate,

            @NotBlank(message = "El título de la rutina es obligatorio.")
            @Size(max = 150, message = "El título no debe exceder 150 caracteres.")
            String routineTitle,

            @Size(max = 150, message = "El enfoque no debe exceder 150 caracteres.")
            String focus,

            @Min(value = 10, message = "La duración mínima es 10 minutos.")
            @Max(value = 90, message = "La duración máxima es 90 minutos.")
            Integer durationMinutes
    ) {
    }

    public record AutoPopulateRequest(
            @Min(1)
            @Max(4)
            Integer weeks
    ) {
    }

    public record RescheduleRequest(
            @NotNull(message = "La nueva fecha es obligatoria.")
            LocalDate targetDate,

            @Size(max = 120, message = "El motivo no debe exceder 120 caracteres.")
            String reason
    ) {
    }

    public record MissedReasonRequest(
            @NotBlank(message = "Indica un motivo breve para tu registro de adherencia.")
            @Size(max = 120, message = "El motivo no debe exceder 120 caracteres.")
            String reason
    ) {
    }
}
