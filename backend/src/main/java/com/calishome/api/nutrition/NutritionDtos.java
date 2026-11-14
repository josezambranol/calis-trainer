package com.calishome.api.nutrition;

import com.calishome.api.users.UserProfileEntity;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class NutritionDtos {

    private NutritionDtos() {
    }

    public record BiometricsProfileDto(
            double weightKg,
            int heightCm,
            int age,
            String biologicalSex,
            String activityLevel,
            int dailyWaterGoalMl
    ) {
        public static BiometricsProfileDto from(UserProfileEntity profile) {
            return new BiometricsProfileDto(
                    profile.getWeightKg().doubleValue(),
                    profile.getHeightCm(),
                    profile.getAge(),
                    profile.getBiologicalSex(),
                    profile.getActivityLevel(),
                    profile.getDailyWaterGoalMl()
            );
        }
    }

    public record UpdateBiometricsRequest(
            @NotNull @DecimalMin("30.0") @DecimalMax("250.0") BigDecimal weightKg,
            @Min(120) @Max(230) int heightCm,
            @Min(14) @Max(95) int age,
            @NotBlank @Pattern(regexp = "M|F", message = "El sexo biológico debe ser M o F.") String biologicalSex,
            @NotBlank @Pattern(regexp = "SEDENTARY|LIGHT|MODERATE|ACTIVE", message = "Nivel de actividad inválido.") String activityLevel,
            @Min(1000) @Max(6000) int dailyWaterGoalMl
    ) {
    }

    public record MacroTargetsDto(
            int bmrCalories,
            int tdeeCalories,
            int targetCalories,
            int caloricDelta,
            int proteinGrams,
            int carbsGrams,
            int fatsGrams,
            int waterGoalMl,
            String strategyLabel,
            String rationale
    ) {
    }

    public record DailyTotalsDto(
            int calories,
            double proteinGrams,
            double carbsGrams,
            double fatsGrams,
            int waterMl,
            int entriesCount
    ) {
    }

    public record NutritionLogDto(
            UUID id,
            LocalDate localDate,
            MealType mealType,
            String foodName,
            int calories,
            double proteinGrams,
            double carbsGrams,
            double fatsGrams,
            int waterMl,
            Instant loggedAt
    ) {
        public static NutritionLogDto from(NutritionLogEntity entity) {
            return new NutritionLogDto(
                    entity.getId(),
                    entity.getLocalDate(),
                    entity.getMealType(),
                    entity.getFoodName(),
                    entity.getCalories(),
                    entity.getProteinGrams().doubleValue(),
                    entity.getCarbsGrams().doubleValue(),
                    entity.getFatsGrams().doubleValue(),
                    entity.getWaterMl(),
                    entity.getLoggedAt()
            );
        }
    }

    public record CreateNutritionLogRequest(
            LocalDate localDate,
            @NotNull MealType mealType,
            @NotBlank @Size(min = 2, max = 140) String foodName,
            @Min(0) @Max(5000) int calories,
            @DecimalMin("0.0") @DecimalMax("400.0") double proteinGrams,
            @DecimalMin("0.0") @DecimalMax("600.0") double carbsGrams,
            @DecimalMin("0.0") @DecimalMax("300.0") double fatsGrams,
            @Min(0) @Max(4000) int waterMl
    ) {
    }

    public record NutritionDayOverviewResponse(
            LocalDate date,
            String timezone,
            String goal,
            BiometricsProfileDto biometrics,
            MacroTargetsDto targets,
            DailyTotalsDto totals,
            double rolling7dAvgCalories,
            double rolling7dAvgProteinGrams,
            double rolling7dAvgWaterMl,
            int loggedDaysLast7,
            List<NutritionLogDto> logs
    ) {
    }

    public record DevelopmentPhaseDto(
            int phaseNumber,
            String weeksRange,
            String title,
            String objective,
            String trainingFocus,
            String nutritionRule,
            boolean isCurrent
    ) {
    }

    public record SkillStepDto(
            int order,
            String exerciseId,
            String title,
            String targetMetric,
            boolean unlocked
    ) {
    }

    public record SkillLadderDto(
            String category,
            String ladderName,
            String currentStepTitle,
            String nextUnlockTitle,
            int progressPercent,
            List<SkillStepDto> steps
    ) {
    }

    public record MuscleRecoveryDto(
            String muscleGroup,
            int readinessPercent,
            int hoursSinceLastStimulus,
            String statusLabel
    ) {
    }

    public record DevelopmentRoadmapResponse(
            String goal,
            String goalLabel,
            String currentLevel,
            int adaptationScore,
            int totalWorkoutsCompleted,
            int weeklyWorkoutsTarget,
            BiometricsProfileDto biometrics,
            MacroTargetsDto targets,
            List<DevelopmentPhaseDto> phases,
            List<SkillLadderDto> skillLadders,
            List<MuscleRecoveryDto> muscleRecovery
    ) {
    }
}
