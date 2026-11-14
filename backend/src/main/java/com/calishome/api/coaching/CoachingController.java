package com.calishome.api.coaching;

import com.calishome.api.coaching.CoachingDtos.PrecisionCoachingResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/coaching")
@Tag(name = "Precision Coaching", description = "Motor de diagnóstico cuantitativo basado en agenda, dieta y RPE real")
@SecurityRequirement(name = "bearerAuth")
public class CoachingController {

    private final CoachingService coachingService;

    public CoachingController(CoachingService coachingService) {
        this.coachingService = coachingService;
    }

    @GetMapping("/insights")
    @Operation(summary = "Evaluar telemetría real del atleta y emitir recomendaciones accionables")
    public PrecisionCoachingResponse getInsights(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return coachingService.evaluateAthlete(userId);
    }
}
