package com.calishome.api.routines;

import static org.assertj.core.api.Assertions.assertThat;

import com.calishome.api.auth.AuthResponse;
import com.calishome.api.auth.GoogleAuthRequest;
import com.calishome.api.auth.GoogleTokenVerifier;
import com.calishome.api.auth.GoogleUserClaims;
import com.calishome.api.exercises.ExerciseResponse;
import com.calishome.api.users.ImportLocalProgressRequest;
import com.calishome.api.users.ImportProgressResponse;
import com.calishome.api.users.UpdateProfileRequest;
import com.calishome.api.users.UserResponse;
import com.calishome.api.workouts.CompleteWorkoutResponse;
import com.calishome.api.workouts.CreateWorkoutLogRequest;
import com.calishome.api.workouts.WorkoutLogResponse;
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
class TrainingIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void exercisesSeededRoutineGenerationWorkoutCompletionAndIdempotentImport() {
        // 1. Catalogo publico con los 24 ejercicios de V3__seed_exercises.sql
        ResponseEntity<ExerciseResponse[]> catalogRes = restTemplate.getForEntity(
                "/api/v1/exercises",
                ExerciseResponse[].class
        );
        assertThat(catalogRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(catalogRes.getBody()).hasSize(24);

        // 2. Preview anonimo antes de registro (onboarding-first)
        ResponseEntity<WeeklyPlanResponse> previewRes = restTemplate.postForEntity(
                "/api/v1/routines/preview",
                new RoutinePreviewRequest("principiante", "movilidad_salud", 15, List.of("lunes", "miercoles", "viernes"), "America/Bogota", 0),
                WeeklyPlanResponse.class
        );
        assertThat(previewRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(previewRes.getBody()).isNotNull();
        assertThat(previewRes.getBody().days()).hasSize(7);

        // 3. Login via stub Google OIDC
        ResponseEntity<AuthResponse> authRes = restTemplate.postForEntity(
                "/api/v1/auth/google",
                new GoogleAuthRequest("valid-training-token"),
                AuthResponse.class
        );
        assertThat(authRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(authRes.getBody()).isNotNull();

        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(authRes.getBody().accessToken());

        // 4. Actualizar perfil de usuario
        ResponseEntity<UserResponse> patchRes = restTemplate.exchange(
                "/api/v1/users/me/profile",
                HttpMethod.PATCH,
                new HttpEntity<>(new UpdateProfileRequest(
                        "intermedio",
                        "resistencia_quemagrasa",
                        30,
                        List.of("lunes", "miercoles", "viernes", "sabado"),
                        "18:30",
                        "America/Bogota",
                        true,
                        true,
                        true
                ), authHeaders),
                UserResponse.class
        );
        assertThat(patchRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(patchRes.getBody()).isNotNull();
        assertThat(patchRes.getBody().goal()).isEqualTo("resistencia_quemagrasa");
        assertThat(patchRes.getBody().scheduledDays()).containsExactly("lunes", "miercoles", "viernes", "sabado");

        // 5. Consultar plan semanal autenticado
        ResponseEntity<WeeklyPlanResponse> weeklyRes = restTemplate.exchange(
                "/api/v1/routines/weekly",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders),
                WeeklyPlanResponse.class
        );
        assertThat(weeklyRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(weeklyRes.getBody()).isNotNull();
        assertThat(weeklyRes.getBody().days()).hasSize(7);

        // 6. Registrar entrenamiento completado
        ResponseEntity<CompleteWorkoutResponse> completeRes = restTemplate.exchange(
                "/api/v1/workouts",
                HttpMethod.POST,
                new HttpEntity<>(new CreateWorkoutLogRequest("Circuito CalisHome", 920, 5, "too_easy"), authHeaders),
                CompleteWorkoutResponse.class
        );
        assertThat(completeRes.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(completeRes.getBody()).isNotNull();
        assertThat(completeRes.getBody().user().streak()).isEqualTo(1);
        assertThat(completeRes.getBody().user().adaptationScore()).isEqualTo(1);
        assertThat(completeRes.getBody().user().totalWorkoutsCompleted()).isEqualTo(1);

        // 7. Importacion idempotente de localStorage previo
        ImportLocalProgressRequest importReq = new ImportLocalProgressRequest(
                null,
                List.of(new ImportLocalProgressRequest.ImportedWorkoutLog(
                        "2026-11-01T10:00:00Z",
                        "Rutina Previa Local",
                        650,
                        4,
                        "just_right"
                ))
        );
        ResponseEntity<ImportProgressResponse> importRes1 = restTemplate.exchange(
                "/api/v1/users/me/import",
                HttpMethod.POST,
                new HttpEntity<>(importReq, authHeaders),
                ImportProgressResponse.class
        );
        ResponseEntity<ImportProgressResponse> importRes2 = restTemplate.exchange(
                "/api/v1/users/me/import",
                HttpMethod.POST,
                new HttpEntity<>(importReq, authHeaders),
                ImportProgressResponse.class
        );
        assertThat(importRes1.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(importRes1.getBody().importedLogsCount()).isEqualTo(1);
        assertThat(importRes2.getBody().importedLogsCount()).isEqualTo(0);

        ResponseEntity<WorkoutLogResponse[]> logsRes = restTemplate.exchange(
                "/api/v1/workouts",
                HttpMethod.GET,
                new HttpEntity<>(authHeaders),
                WorkoutLogResponse[].class
        );
        assertThat(logsRes.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(logsRes.getBody()).hasSize(2);
    }

    @TestConfiguration
    static class TestBeans {
        @Bean
        @Primary
        GoogleTokenVerifier stubGoogleTokenVerifier() {
            return idToken -> new GoogleUserClaims(
                    "google-sub-training-1",
                    "training.athlete@gmail.com",
                    true,
                    "Training Athlete"
            );
        }
    }
}
