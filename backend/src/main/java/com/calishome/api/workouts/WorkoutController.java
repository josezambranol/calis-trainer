package com.calishome.api.workouts;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/workouts")
@Tag(name = "Workouts", description = "Registro e historial de sesiones de entrenamiento")
@SecurityRequirement(name = "bearerAuth")
public class WorkoutController {

    private final WorkoutService workoutService;

    public WorkoutController(WorkoutService workoutService) {
        this.workoutService = workoutService;
    }

    @GetMapping
    @Operation(summary = "Listar historial de entrenamientos del usuario autenticado")
    public List<WorkoutLogResponse> listWorkouts(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "30") int limit) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutService.listWorkouts(userId, limit);
    }

    @GetMapping("/analytics")
    @Operation(summary = "Obtener analíticas avanzadas de entrenamiento (Plan Pro)")
    public WorkoutAnalyticsResponse getAnalytics(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return workoutService.getAnalytics(userId);
    }

    @PostMapping
    @Operation(summary = "Registrar entrenamiento completado, recalcular racha y adaptación")
    public ResponseEntity<CompleteWorkoutResponse> completeWorkout(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateWorkoutLogRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        CompleteWorkoutResponse result = workoutService.recordWorkout(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }
}
