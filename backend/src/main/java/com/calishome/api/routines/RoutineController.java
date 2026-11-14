package com.calishome.api.routines;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/routines")
@Tag(name = "Routines", description = "Generación determinista y adaptativa de rutinas por objetivo y zona horaria")
public class RoutineController {

    private final RoutineService routineService;

    public RoutineController(RoutineService routineService) {
        this.routineService = routineService;
    }

    @GetMapping("/today")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Obtener la rutina de hoy según perfil y zona horaria del usuario")
    public DailyRoutineResponse getTodayRoutine(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return routineService.getTodayRoutine(userId);
    }

    @GetMapping("/weekly")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Obtener el plan semanal completo del usuario autenticado")
    public WeeklyPlanResponse getWeeklyPlan(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return routineService.getWeeklyPlan(userId);
    }

    @PostMapping("/preview")
    @Operation(summary = "Previsualizar un plan semanal antes de registrarse (onboarding-first)")
    public WeeklyPlanResponse previewPlan(@Valid @RequestBody RoutinePreviewRequest request) {
        return routineService.previewPlan(request);
    }
}
