package com.calishome.api.routines;

import static org.assertj.core.api.Assertions.assertThat;

import com.calishome.api.exercises.ExerciseResponse;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class RoutinePlannerTest {

    private final RoutinePlanner planner = new RoutinePlanner();

    private final List<ExerciseResponse> sampleCatalog = List.of(
            ex("push-wall-pushups", "push", "principiante", "reps", 12, 35),
            ex("push-classic-pushups", "push", "intermedio", "reps", 12, 45),
            ex("pull-superman-hold", "pull", "principiante", "time", 30, 35),
            ex("pull-swimmers", "pull", "intermedio", "time", 35, 40),
            ex("legs-air-squats", "legs", "principiante", "reps", 15, 40),
            ex("legs-walking-lunges", "legs", "intermedio", "reps", 12, 45),
            ex("core-elbow-plank", "core", "principiante", "time", 40, 35),
            ex("core-mountain-climbers", "core", "intermedio", "time", 35, 40)
    );

    @Test
    void generatesDeterministicWeeklyPlanForSameUserAndWeek() {
        var config = new RoutinePlanner.PlanConfig(
                "user-123",
                "intermedio",
                "fuerza_hipertrofia",
                30,
                List.of("lunes", "miercoles", "viernes"),
                0,
                LocalDate.of(2026, 11, 11),
                "America/Bogota"
        );

        WeeklyPlanResponse plan1 = planner.buildWeeklyPlan(sampleCatalog, config);
        WeeklyPlanResponse plan2 = planner.buildWeeklyPlan(sampleCatalog, config);

        assertThat(plan1).isEqualTo(plan2);
        assertThat(plan1.days()).hasSize(7);
        assertThat(plan1.today().dayId()).isEqualTo("miercoles");
        assertThat(plan1.today().isRestDay()).isFalse();
        assertThat(plan1.today().exercises()).hasSize(5);
    }

    @Test
    void differentiatesGoalForFatLossVsStrengthAndAppliesAdaptation() {
        var strengthConfig = new RoutinePlanner.PlanConfig(
                "user-123",
                "principiante",
                "fuerza_hipertrofia",
                30,
                List.of("lunes", "miercoles", "viernes"),
                0,
                LocalDate.of(2026, 11, 9),
                "America/Bogota"
        );
        var metabolicConfig = new RoutinePlanner.PlanConfig(
                "user-123",
                "principiante",
                "resistencia_quemagrasa",
                30,
                List.of("lunes", "miercoles", "viernes"),
                2,
                LocalDate.of(2026, 11, 9),
                "America/Bogota"
        );

        WeeklyPlanResponse strengthPlan = planner.buildWeeklyPlan(sampleCatalog, strengthConfig);
        WeeklyPlanResponse metabolicPlan = planner.buildWeeklyPlan(sampleCatalog, metabolicConfig);

        assertThat(metabolicPlan.today().title()).isNotEqualTo(strengthPlan.today().title());
        // Con adaptationScore = +2 y goal = resistencia_quemagrasa, se desbloquean ejercicios intermedios y más volumen
        assertThat(metabolicPlan.today().exercises())
                .anyMatch(item -> item.exercise().difficulty().equals("intermedio"));
        int totalStrengthAmount = strengthPlan.today().exercises().stream()
                .mapToInt(RoutineExerciseItemResponse::repsOrSeconds).sum();
        int totalMetabolicAmount = metabolicPlan.today().exercises().stream()
                .mapToInt(RoutineExerciseItemResponse::repsOrSeconds).sum();
        assertThat(totalMetabolicAmount).isGreaterThan(totalStrengthAmount);
    }

    private ExerciseResponse ex(
            String id,
            String category,
            String difficulty,
            String type,
            int defaultAmount,
            int restSeconds) {
        return new ExerciseResponse(
                id,
                id,
                "Músculo",
                category,
                difficulty,
                type,
                defaultAmount,
                restSeconds,
                List.of("Paso 1"),
                "Tip",
                "Solo suelo"
        );
    }
}
