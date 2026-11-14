package com.calishome.api.planning;

import static org.assertj.core.api.Assertions.assertThat;

import com.calishome.api.auth.AuthResponse;
import com.calishome.api.auth.GoogleAuthRequest;
import com.calishome.api.auth.GoogleTokenVerifier;
import com.calishome.api.auth.GoogleUserClaims;
import com.calishome.api.coaching.CoachingDtos.PrecisionCoachingResponse;
import com.calishome.api.nutrition.MealType;
import com.calishome.api.nutrition.NutritionDtos.BiometricsProfileDto;
import com.calishome.api.nutrition.NutritionDtos.CreateNutritionLogRequest;
import com.calishome.api.nutrition.NutritionDtos.DevelopmentRoadmapResponse;
import com.calishome.api.nutrition.NutritionDtos.NutritionDayOverviewResponse;
import com.calishome.api.nutrition.NutritionDtos.UpdateBiometricsRequest;
import com.calishome.api.planning.ScheduleDtos.RescheduleRequest;
import com.calishome.api.planning.ScheduleDtos.ScheduleOverviewResponse;
import com.calishome.api.planning.ScheduleDtos.ScheduledWorkoutDto;
import com.calishome.api.planning.ScheduleDtos.UpsertScheduleRequest;
import com.calishome.api.users.UpdateProfileRequest;
import com.calishome.api.users.UserResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class PlanningNutritionCoachingIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void detectsMissedSessionsReschedulesCalculatesMacrosEnforcesOwnershipAndEmitsTelemetryCoaching() {
        HttpHeaders user1Headers = authenticateAs("pnc-athlete-1");
        HttpHeaders user2Headers = authenticateAs("pnc-athlete-2");

        // 1. Configurar objetivo perder grasa para validar déficit y coaching preciso
        ResponseEntity<UserResponse> profileRes = restTemplate.exchange(
                "/api/v1/users/me/profile",
                HttpMethod.PATCH,
                new HttpEntity<>(new UpdateProfileRequest(
                        "intermedio",
                        "resistencia_quemagrasa",
                        30,
                        List.of("lunes", "miercoles", "viernes"),
                        "19:00",
                        "America/Bogota",
                        true,
                        true,
                        false
                ), user1Headers),
                UserResponse.class
        );
        assertThat(profileRes.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 2. Programar sesión en fecha pasada (hace 2 días) y verificar que GET /schedule la marca MISSED
        LocalDate today = LocalDate.now(ZoneId.of("America/Bogota"));
        LocalDate twoDaysAgo = today.minusDays(2);

        ResponseEntity<ScheduledWorkoutDto> pastSessionRes = restTemplate.exchange(
                "/api/v1/schedule/sessions",
                HttpMethod.POST,
                new HttpEntity<>(new UpsertScheduleRequest(
                        twoDaysAgo,
                        "Circuito Quemagrasa Base",
                        "Déficit y control de core",
                        30
                ), user1Headers),
                ScheduledWorkoutDto.class
        );
        assertThat(pastSessionRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        ScheduledWorkoutDto pastSession = pastSessionRes.getBody();
        assertThat(pastSession).isNotNull();

        ResponseEntity<ScheduleOverviewResponse> scheduleRes = restTemplate.exchange(
                "/api/v1/schedule",
                HttpMethod.GET,
                new HttpEntity<>(user1Headers),
                ScheduleOverviewResponse.class
        );
        assertThat(scheduleRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(scheduleRes.getBody()).isNotNull();
        assertThat(scheduleRes.getBody().adherence().missedCount14d()).isGreaterThanOrEqualTo(1);
        assertThat(scheduleRes.getBody().adherence().unaddressedMissedDates()).contains(twoDaysAgo);

        // 3. Validar aislamiento IDOR: usuario 2 no puede reprogramar sesión del usuario 1
        ResponseEntity<String> idorReschedule = restTemplate.exchange(
                "/api/v1/schedule/sessions/" + pastSession.id() + "/reschedule",
                HttpMethod.POST,
                new HttpEntity<>(new RescheduleRequest(today.plusDays(1), "Intento ajeno"), user2Headers),
                String.class
        );
        assertThat(idorReschedule.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // 4. Reprogramar sesión saltada hacia mañana
        ResponseEntity<ScheduledWorkoutDto> rescheduleRes = restTemplate.exchange(
                "/api/v1/schedule/sessions/" + pastSession.id() + "/reschedule",
                HttpMethod.POST,
                new HttpEntity<>(new RescheduleRequest(today.plusDays(1), "Viaje laboral"), user1Headers),
                ScheduledWorkoutDto.class
        );
        assertThat(rescheduleRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rescheduleRes.getBody()).isNotNull();
        assertThat(rescheduleRes.getBody().status()).isEqualTo(ScheduledWorkoutStatus.SCHEDULED);
        assertThat(rescheduleRes.getBody().scheduledDate()).isEqualTo(today.plusDays(1));

        ResponseEntity<ScheduleOverviewResponse> afterReschedule = restTemplate.exchange(
                "/api/v1/schedule",
                HttpMethod.GET,
                new HttpEntity<>(user1Headers),
                ScheduleOverviewResponse.class
        );
        assertThat(afterReschedule.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(afterReschedule.getBody().adherence().unaddressedMissedDates()).doesNotContain(twoDaysAgo);
        assertThat(afterReschedule.getBody().adherence().rescheduledCount14d()).isEqualTo(1);

        // 5. Actualizar biometría y validar metas Mifflin-St Jeor + hoja de ruta
        ResponseEntity<BiometricsProfileDto> bioRes = restTemplate.exchange(
                "/api/v1/nutrition/biometrics",
                HttpMethod.PUT,
                new HttpEntity<>(new UpdateBiometricsRequest(
                        new BigDecimal("80.0"),
                        178,
                        30,
                        "M",
                        "MODERATE",
                        3000
                ), user1Headers),
                BiometricsProfileDto.class
        );
        assertThat(bioRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(bioRes.getBody().weightKg()).isEqualTo(80.0);

        ResponseEntity<DevelopmentRoadmapResponse> roadmapRes = restTemplate.exchange(
                "/api/v1/nutrition/roadmap",
                HttpMethod.GET,
                new HttpEntity<>(user1Headers),
                DevelopmentRoadmapResponse.class
        );
        assertThat(roadmapRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(roadmapRes.getBody()).isNotNull();
        assertThat(roadmapRes.getBody().phases()).hasSize(3);
        assertThat(roadmapRes.getBody().skillLadders()).hasSize(4);
        assertThat(roadmapRes.getBody().muscleRecovery()).hasSize(4);
        assertThat(roadmapRes.getBody().targets().caloricDelta()).isEqualTo(-400);
        assertThat(roadmapRes.getBody().targets().proteinGrams()).isEqualTo(160);

        // 6. Registrar alimento con cálculo o macros reales y validar aislamiento IDOR al borrar
        ResponseEntity<NutritionDayOverviewResponse> logFoodRes = restTemplate.exchange(
                "/api/v1/nutrition/logs",
                HttpMethod.POST,
                new HttpEntity<>(new CreateNutritionLogRequest(
                        today,
                        MealType.LUNCH,
                        "Pechuga + arroz + ensalada",
                        620,
                        48.0,
                        64.0,
                        14.0,
                        500
                ), user1Headers),
                NutritionDayOverviewResponse.class
        );
        assertThat(logFoodRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(logFoodRes.getBody()).isNotNull();
        assertThat(logFoodRes.getBody().totals().calories()).isEqualTo(620);
        assertThat(logFoodRes.getBody().logs()).hasSize(1);

        String createdFoodId = logFoodRes.getBody().logs().getFirst().id().toString();
        ResponseEntity<String> idorDeleteFood = restTemplate.exchange(
                "/api/v1/nutrition/logs/" + createdFoodId,
                HttpMethod.DELETE,
                new HttpEntity<>(user2Headers),
                String.class
        );
        assertThat(idorDeleteFood.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // 7. Coaching de precisión con telemetría real (proteína baja respecto a 160g -> insight de déficit real)
        ResponseEntity<PrecisionCoachingResponse> coachingRes = restTemplate.exchange(
                "/api/v1/coaching/insights",
                HttpMethod.GET,
                new HttpEntity<>(user1Headers),
                PrecisionCoachingResponse.class
        );
        assertThat(coachingRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(coachingRes.getBody()).isNotNull();
        assertThat(coachingRes.getBody().avgCalories7d()).isEqualTo(620.0);
        assertThat(coachingRes.getBody().avgProtein7d()).isEqualTo(48.0);
        assertThat(coachingRes.getBody().insights())
                .anySatisfy(insight -> assertThat(insight.id()).isEqualTo("nutrition-protein-gap"));
    }

    private HttpHeaders authenticateAs(String tokenKey) {
        ResponseEntity<AuthResponse> authRes = restTemplate.postForEntity(
                "/api/v1/auth/google",
                new GoogleAuthRequest(tokenKey),
                AuthResponse.class
        );
        assertThat(authRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(authRes.getBody()).isNotNull();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(authRes.getBody().accessToken());
        return headers;
    }

    @TestConfiguration
    static class TestBeans {
        @Bean
        @Primary
        GoogleTokenVerifier stubGoogleTokenVerifier() {
            return idToken -> "pnc-athlete-2".equals(idToken)
                    ? new GoogleUserClaims("google-sub-pnc-2", "pnc2@gmail.com", true, "Athlete Two")
                    : new GoogleUserClaims("google-sub-pnc-1", "pnc1@gmail.com", true, "Athlete One");
        }
    }
}
