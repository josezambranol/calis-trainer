package com.calishome.api.planning;

import com.calishome.api.planning.ScheduleDtos.AutoPopulateRequest;
import com.calishome.api.planning.ScheduleDtos.MissedReasonRequest;
import com.calishome.api.planning.ScheduleDtos.RescheduleRequest;
import com.calishome.api.planning.ScheduleDtos.ScheduleOverviewResponse;
import com.calishome.api.planning.ScheduleDtos.ScheduledWorkoutDto;
import com.calishome.api.planning.ScheduleDtos.UpsertScheduleRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/schedule")
@Tag(name = "Schedule", description = "Calendario de entrenamientos, verificación de faltas y reprogramación")
@SecurityRequirement(name = "bearerAuth")
public class TrainingScheduleController {

    private final TrainingScheduleService trainingScheduleService;

    public TrainingScheduleController(TrainingScheduleService trainingScheduleService) {
        this.trainingScheduleService = trainingScheduleService;
    }

    @GetMapping
    @Operation(summary = "Consultar calendario de entrenamientos y verificar sesiones saltadas vs completadas")
    public ScheduleOverviewResponse getSchedule(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return trainingScheduleService.getScheduleAndReconcile(userId, from, to);
    }

    @PostMapping("/sessions")
    @Operation(summary = "Programar o actualizar una sesión de entrenamiento en fecha específica")
    public ResponseEntity<ScheduledWorkoutDto> upsertSession(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpsertScheduleRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(trainingScheduleService.upsertSession(userId, request));
    }

    @PostMapping("/auto-populate")
    @Operation(summary = "Auto-programar próximas semanas según los días configurados en el perfil")
    public List<ScheduledWorkoutDto> autoPopulate(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody(required = false) @Valid AutoPopulateRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        int weeks = request != null && request.weeks() != null ? request.weeks() : 2;
        return trainingScheduleService.autoPopulateUpcoming(userId, weeks);
    }

    @PostMapping("/sessions/{id}/reschedule")
    @Operation(summary = "Reprogramar una sesión saltada o futura a una nueva fecha")
    public ScheduledWorkoutDto reschedule(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @Valid @RequestBody RescheduleRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return trainingScheduleService.rescheduleSession(userId, id, request);
    }

    @PatchMapping("/sessions/{id}/missed-reason")
    @Operation(summary = "Registrar motivo de ausencia en una sesión saltada")
    public ScheduledWorkoutDto recordMissedReason(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @Valid @RequestBody MissedReasonRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return trainingScheduleService.recordMissedReason(userId, id, request);
    }

    @DeleteMapping("/sessions/{id}")
    @Operation(summary = "Eliminar una sesión programada del calendario")
    public ResponseEntity<Void> deleteSession(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(jwt.getSubject());
        trainingScheduleService.deleteSession(userId, id);
        return ResponseEntity.noContent().build();
    }
}
