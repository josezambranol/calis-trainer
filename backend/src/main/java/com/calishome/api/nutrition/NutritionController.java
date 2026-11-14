package com.calishome.api.nutrition;

import com.calishome.api.nutrition.NutritionDtos.BiometricsProfileDto;
import com.calishome.api.nutrition.NutritionDtos.CreateNutritionLogRequest;
import com.calishome.api.nutrition.NutritionDtos.DevelopmentRoadmapResponse;
import com.calishome.api.nutrition.NutritionDtos.NutritionDayOverviewResponse;
import com.calishome.api.nutrition.NutritionDtos.UpdateBiometricsRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/nutrition")
@Tag(name = "Nutrition & Roadmap", description = "Biometría Mifflin-St Jeor, macros diarios, hidratación y mapa de desarrollo")
@SecurityRequirement(name = "bearerAuth")
public class NutritionController {

    private final NutritionService nutritionService;

    public NutritionController(NutritionService nutritionService) {
        this.nutritionService = nutritionService;
    }

    @GetMapping("/day")
    @Operation(summary = "Consultar resumen nutricional, macros objetivo e hidratación del día")
    public NutritionDayOverviewResponse getDay(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return nutritionService.getDayOverview(userId, date);
    }

    @PostMapping("/logs")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Registrar comida o ingesta hídrica en la fecha indicada")
    public NutritionDayOverviewResponse createLog(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateNutritionLogRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return nutritionService.logIntake(userId, request);
    }

    @DeleteMapping("/logs/{id}")
    @Operation(summary = "Eliminar un registro nutricional propio")
    public NutritionDayOverviewResponse deleteLog(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return nutritionService.deleteLog(userId, id);
    }

    @PutMapping("/biometrics")
    @Operation(summary = "Actualizar peso, estatura, edad, actividad y meta de hidratación")
    public BiometricsProfileDto updateBiometrics(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateBiometricsRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return nutritionService.updateBiometrics(userId, request);
    }

    @GetMapping("/roadmap")
    @Operation(summary = "Obtener plan de desarrollo 12 semanas, árboles de habilidades y matriz de recuperación muscular")
    public DevelopmentRoadmapResponse getRoadmap(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return nutritionService.buildDevelopmentRoadmap(userId);
    }
}
