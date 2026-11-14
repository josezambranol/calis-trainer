package com.calishome.api.nutrition;

import com.calishome.api.common.util.TrainingDayUtil;
import com.calishome.api.common.web.ResourceNotFoundException;
import com.calishome.api.nutrition.NutritionDtos.BiometricsProfileDto;
import com.calishome.api.nutrition.NutritionDtos.CreateNutritionLogRequest;
import com.calishome.api.nutrition.NutritionDtos.DailyTotalsDto;
import com.calishome.api.nutrition.NutritionDtos.DevelopmentPhaseDto;
import com.calishome.api.nutrition.NutritionDtos.DevelopmentRoadmapResponse;
import com.calishome.api.nutrition.NutritionDtos.MacroTargetsDto;
import com.calishome.api.nutrition.NutritionDtos.MuscleRecoveryDto;
import com.calishome.api.nutrition.NutritionDtos.NutritionDayOverviewResponse;
import com.calishome.api.nutrition.NutritionDtos.NutritionLogDto;
import com.calishome.api.nutrition.NutritionDtos.SkillLadderDto;
import com.calishome.api.nutrition.NutritionDtos.SkillStepDto;
import com.calishome.api.nutrition.NutritionDtos.UpdateBiometricsRequest;
import com.calishome.api.users.UserProfileEntity;
import com.calishome.api.users.UserProfileRepository;
import com.calishome.api.users.UserRepository;
import com.calishome.api.users.UserService;
import com.calishome.api.workouts.WorkoutLogEntity;
import com.calishome.api.workouts.WorkoutLogRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NutritionService {

    private final NutritionLogRepository nutritionLogRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final WorkoutLogRepository workoutLogRepository;
    private final UserService userService;
    private final Clock clock;

    @Autowired
    public NutritionService(
            NutritionLogRepository nutritionLogRepository,
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            WorkoutLogRepository workoutLogRepository,
            UserService userService) {
        this(nutritionLogRepository, userRepository, userProfileRepository, workoutLogRepository, userService, Clock.systemUTC());
    }

    NutritionService(
            NutritionLogRepository nutritionLogRepository,
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            WorkoutLogRepository workoutLogRepository,
            UserService userService,
            Clock clock) {
        this.nutritionLogRepository = nutritionLogRepository;
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.workoutLogRepository = workoutLogRepository;
        this.userService = userService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public NutritionDayOverviewResponse getDayOverview(UUID userId, LocalDate requestedDate) {
        UserProfileEntity profile = userService.getProfileEntity(userId);
        ZoneId zoneId = TrainingDayUtil.resolveZoneIdOrDefault(profile.getTimezone());
        LocalDate today = LocalDate.now(clock.withZone(zoneId));
        LocalDate targetDate = requestedDate != null ? requestedDate : today;

        List<NutritionLogEntity> dayLogs =
                nutritionLogRepository.findByUserIdAndLocalDateOrderByLoggedAtDesc(userId, targetDate);

        LocalDate rollingStart = targetDate.minusDays(6);
        List<NutritionLogEntity> windowLogs =
                nutritionLogRepository.findByUserIdAndLocalDateBetweenOrderByLocalDateDescLoggedAtDesc(
                        userId, rollingStart, targetDate
                );

        RollingAverages averages = computeRollingAverages(windowLogs);

        return new NutritionDayOverviewResponse(
                targetDate,
                zoneId.getId(),
                profile.getGoal(),
                BiometricsProfileDto.from(profile),
                calculateTargets(profile),
                sumDailyTotals(dayLogs),
                averages.avgCalories(),
                averages.avgProtein(),
                averages.avgWater(),
                averages.loggedDaysCount(),
                dayLogs.stream().map(NutritionLogDto::from).toList()
        );
    }

    @Transactional
    public NutritionDayOverviewResponse logIntake(UUID userId, CreateNutritionLogRequest request) {
        UserProfileEntity profile = userService.getProfileEntity(userId);
        ZoneId zoneId = TrainingDayUtil.resolveZoneIdOrDefault(profile.getTimezone());
        LocalDate targetDate = request.localDate() != null ? request.localDate() : LocalDate.now(clock.withZone(zoneId));

        int autoCalculatedCalories = request.calories();
        if (autoCalculatedCalories == 0 && request.mealType() != MealType.HYDRATION) {
            autoCalculatedCalories = (int) Math.round(
                    (request.proteinGrams() * 4.0)
                            + (request.carbsGrams() * 4.0)
                            + (request.fatsGrams() * 9.0)
            );
        }

        NutritionLogEntity entity = new NutritionLogEntity();
        entity.setUserId(userId);
        entity.setLocalDate(targetDate);
        entity.setMealType(request.mealType());
        entity.setFoodName(request.foodName().trim());
        entity.setCalories(Math.max(0, autoCalculatedCalories));
        entity.setProteinGrams(BigDecimal.valueOf(request.proteinGrams()).setScale(1, RoundingMode.HALF_UP));
        entity.setCarbsGrams(BigDecimal.valueOf(request.carbsGrams()).setScale(1, RoundingMode.HALF_UP));
        entity.setFatsGrams(BigDecimal.valueOf(request.fatsGrams()).setScale(1, RoundingMode.HALF_UP));
        entity.setWaterMl(Math.max(0, request.waterMl()));
        entity.setLoggedAt(clock.instant());
        nutritionLogRepository.save(entity);

        return getDayOverview(userId, targetDate);
    }

    @Transactional
    public NutritionDayOverviewResponse deleteLog(UUID userId, UUID logId) {
        NutritionLogEntity entity = nutritionLogRepository.findByIdAndUserId(logId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Registro nutricional no encontrado."));
        LocalDate date = entity.getLocalDate();
        nutritionLogRepository.delete(entity);
        return getDayOverview(userId, date);
    }

    @Transactional
    public BiometricsProfileDto updateBiometrics(UUID userId, UpdateBiometricsRequest request) {
        UserProfileEntity profile = userService.getProfileEntity(userId);
        profile.setWeightKg(request.weightKg().setScale(2, RoundingMode.HALF_UP));
        profile.setHeightCm(request.heightCm());
        profile.setAge(request.age());
        profile.setBiologicalSex(request.biologicalSex());
        profile.setActivityLevel(request.activityLevel());
        profile.setDailyWaterGoalMl(request.dailyWaterGoalMl());
        userProfileRepository.save(profile);
        return BiometricsProfileDto.from(profile);
    }

    @Transactional(readOnly = true)
    public DevelopmentRoadmapResponse buildDevelopmentRoadmap(UUID userId) {
        userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));
        UserProfileEntity profile = userService.getProfileEntity(userId);
        List<WorkoutLogEntity> recentWorkouts = workoutLogRepository.findByUserIdOrderByCompletedAtDesc(userId);

        int completed = profile.getTotalWorkoutsCompleted();
        List<DevelopmentPhaseDto> phases = buildPhasesForGoal(profile.getGoal(), completed);
        List<SkillLadderDto> ladders = buildSkillLadders(profile.getLevel(), profile.getAdaptationScore(), completed);
        List<MuscleRecoveryDto> recovery = computeMuscleRecovery(recentWorkouts);

        return new DevelopmentRoadmapResponse(
                profile.getGoal(),
                resolveGoalLabel(profile.getGoal()),
                profile.getLevel(),
                profile.getAdaptationScore(),
                completed,
                profile.getScheduledDays().size(),
                BiometricsProfileDto.from(profile),
                calculateTargets(profile),
                phases,
                ladders,
                recovery
        );
    }

    public MacroTargetsDto calculateTargets(UserProfileEntity profile) {
        double weight = profile.getWeightKg().doubleValue();
        int height = profile.getHeightCm();
        int age = profile.getAge();
        boolean isFemale = "F".equalsIgnoreCase(profile.getBiologicalSex());

        // Ecuación Mifflin-St Jeor validada clínicamente
        double bmr = (10.0 * weight) + (6.25 * height) - (5.0 * age) + (isFemale ? -161.0 : 5.0);
        double activityFactor = switch (profile.getActivityLevel()) {
            case "SEDENTARY" -> 1.25;
            case "LIGHT" -> 1.40;
            case "ACTIVE" -> 1.72;
            default -> 1.55; // MODERATE
        };

        int bmrCalories = (int) Math.round(bmr);
        int tdeeCalories = (int) Math.round(bmr * activityFactor);

        int caloricDelta;
        double proteinFactor;
        double fatFactor;
        String strategyLabel;
        String rationale;

        switch (profile.getGoal()) {
            case "resistencia_quemagrasa" -> {
                caloricDelta = -400;
                proteinFactor = 2.0;
                fatFactor = 0.80;
                strategyLabel = "Déficit Controlado (-400 kcal) · Preservación Muscular";
                rationale = String.format(
                        "Con %.1f kg y %d cm, tu TDEE es %d kcal. Prioriza %.0fg de proteína (2.0 g/kg) para perder grasa sin sacrificar fuerza relativa.",
                        weight, height, tdeeCalories, weight * proteinFactor
                );
            }
            case "fuerza_hipertrofia" -> {
                caloricDelta = 250;
                proteinFactor = 2.1;
                fatFactor = 0.90;
                strategyLabel = "Superávit Limpio (+250 kcal) · Síntesis Proteica";
                rationale = String.format(
                        "Superávit moderado sobre %d kcal para ganar masa magra manteniendo alto ratio fuerza/peso en calistenia.",
                        tdeeCalories
                );
            }
            default -> {
                caloricDelta = 0;
                proteinFactor = 1.7;
                fatFactor = 0.85;
                strategyLabel = "Normocalórico · Recomposición & Salud Articular";
                rationale = String.format(
                        "Mantenimiento energético en %d kcal con aporte proteico suficiente para recuperación de tendones y tejido conectivo.",
                        tdeeCalories
                );
            }
        }

        int targetCalories = Math.max(Math.max(1350, bmrCalories - 50), tdeeCalories + caloricDelta);
        int effectiveDelta = targetCalories - tdeeCalories;
        int proteinGrams = (int) Math.round(weight * proteinFactor);
        int fatsGrams = (int) Math.round(weight * fatFactor);
        int remainingCalories = Math.max(320, targetCalories - (proteinGrams * 4) - (fatsGrams * 9));
        int carbsGrams = (int) Math.round(remainingCalories / 4.0);

        return new MacroTargetsDto(
                bmrCalories,
                tdeeCalories,
                targetCalories,
                effectiveDelta,
                proteinGrams,
                carbsGrams,
                fatsGrams,
                profile.getDailyWaterGoalMl(),
                strategyLabel,
                rationale
        );
    }

    RollingAverages computeRollingAverages(List<NutritionLogEntity> windowLogs) {
        if (windowLogs.isEmpty()) {
            return new RollingAverages(0.0, 0.0, 0.0, 0);
        }
        Map<LocalDate, List<NutritionLogEntity>> byDate = windowLogs.stream()
                .collect(Collectors.groupingBy(NutritionLogEntity::getLocalDate));

        int daysWithFood = 0;
        double sumCalories = 0.0;
        double sumProtein = 0.0;
        int daysWithAnyLog = byDate.size();
        double sumWater = 0.0;

        for (List<NutritionLogEntity> entries : byDate.values()) {
            DailyTotalsDto totals = sumDailyTotals(entries);
            sumWater += totals.waterMl();
            if (totals.calories() > 0 || totals.proteinGrams() > 0) {
                daysWithFood++;
                sumCalories += totals.calories();
                sumProtein += totals.proteinGrams();
            }
        }

        double avgCalories = daysWithFood > 0 ? round1(sumCalories / daysWithFood) : 0.0;
        double avgProtein = daysWithFood > 0 ? round1(sumProtein / daysWithFood) : 0.0;
        double avgWater = daysWithAnyLog > 0 ? round1(sumWater / daysWithAnyLog) : 0.0;
        return new RollingAverages(avgCalories, avgProtein, avgWater, daysWithAnyLog);
    }

    private DailyTotalsDto sumDailyTotals(List<NutritionLogEntity> logs) {
        int calories = 0;
        double protein = 0.0;
        double carbs = 0.0;
        double fats = 0.0;
        int water = 0;

        for (NutritionLogEntity log : logs) {
            calories += log.getCalories();
            protein += log.getProteinGrams().doubleValue();
            carbs += log.getCarbsGrams().doubleValue();
            fats += log.getFatsGrams().doubleValue();
            water += log.getWaterMl();
        }
        return new DailyTotalsDto(calories, round1(protein), round1(carbs), round1(fats), water, logs.size());
    }

    private List<DevelopmentPhaseDto> buildPhasesForGoal(String goal, int completedWorkouts) {
        int activePhase = completedWorkouts >= 24 ? 3 : (completedWorkouts >= 10 ? 2 : 1);
        return switch (goal) {
            case "resistencia_quemagrasa" -> List.of(
                    new DevelopmentPhaseDto(1, "Semanas 1–4", "Fase 1: Base Metabólica y Técnica",
                            "Crear adherencia de 4+ sesiones/semana sin fatiga articular excesiva.",
                            "Circuitos full-body con descansos de 35–45s y control excéntrico de 2s.",
                            "Déficit suave (-350/-400 kcal) y mínimo 1.8–2.0 g/kg de proteína diaria.",
                            activePhase == 1),
                    new DevelopmentPhaseDto(2, "Semanas 5–8", "Fase 2: Densidad Calórica y Recomposición",
                            "Elevar volumen total por minuto y mantener masa magra activa.",
                            "Superseries Push + Core y zancadas/sentadillas continuas con pausa corta.",
                            "Ajustar carbohidratos alrededor del entrenamiento y garantizar ≥2.5L de agua.",
                            activePhase == 2),
                    new DevelopmentPhaseDto(3, "Semanas 9–12", "Fase 3: Definición Atlética y Potencia",
                            "Consolidar pérdida de grasa manteniendo progresiones intermedias/avanzadas.",
                            "Variantes exigentes (Pike Pushups, Mountain Climbers prolongados, Wall Sit).",
                            "Evaluar promedio calórico de 14 días; si el peso estanca, añadir +1500 pasos diarios.",
                            activePhase == 3)
            );
            case "fuerza_hipertrofia" -> List.of(
                    new DevelopmentPhaseDto(1, "Semanas 1–4", "Fase 1: Adaptación Tendinosa y Control Motor",
                            "Fortalecer muñecas, escápulas y línea media antes de cargas de palanca altas.",
                            "Tempos 3-1-1, escápula activa en suelo y rango completo en cada repetición.",
                            "Normocalórico a +200 kcal; 2.0–2.1 g/kg de proteína repartida en 3–4 tomas.",
                            activePhase == 1),
                    new DevelopmentPhaseDto(2, "Semanas 5–8", "Fase 2: Hipertrofia Mecánica y Progresión",
                            "Incrementar tensión mecánica usando palancas más difíciles (diamante/unilateral).",
                            "4 series de trabajo cerca del fallo técnico (RIR 1–2) con 55–75s de descanso.",
                            "Superávit limpio (+250 kcal) priorizando carbohidratos complejos para rendimiento.",
                            activePhase == 2),
                    new DevelopmentPhaseDto(3, "Semanas 9–12", "Fase 3: Fuerza Relativa Avanzada",
                            "Desbloquear variantes pico (Decline Pushups, Hollow Body, Sentadilla Búlgara).",
                            "Alta intensidad neuromuscular con descansos completos y registro estricto de RPE.",
                            "Mantener consistencia proteica incluso en días de descanso para reconstrucción.",
                            activePhase == 3)
            );
            default -> List.of(
                    new DevelopmentPhaseDto(1, "Semanas 1–4", "Fase 1: Higiene Postural y Estabilidad",
                            "Revertir rigidez de espalda/cadera y estabilizar escápulas y core profundo.",
                            "Isometrías limpias (Superman, Deadbug, Puente de Glúteos) sin compensar lumbar.",
                            "Alimentación normocalórica antiinflamatoria, proteína ≥1.6 g/kg y buena hidratación.",
                            activePhase == 1),
                    new DevelopmentPhaseDto(2, "Semanas 5–8", "Fase 2: Fuerza Funcional sin Impacto",
                            "Ampliar rangos articulares bajo control activo de musculatura estabilizadora.",
                            "Transiciones fluidas entre tracción escapular, zancadas controladas y planchas.",
                            "Mantener balance hídrico y micronutrientes (potasio, magnesio y fibra diaria).",
                            activePhase == 2),
                    new DevelopmentPhaseDto(3, "Semanas 9–12", "Fase 3: Longevidad Física y Autonomía",
                            "Integrar fuerza asimétrica, equilibrio unilateral y resistencia postural sostenida.",
                            "Progresiones unilaterales (Single-Leg Bridge, Side Plank) y control respiratorio.",
                            "Consolidar hábitos sostenibles sin dietas restrictivas ni saltos de adherencia.",
                            activePhase == 3)
            );
        };
    }

    private List<SkillLadderDto> buildSkillLadders(String level, int adaptationScore, int completedWorkouts) {
        int baseTier = switch (level) {
            case "avanzado" -> 4;
            case "intermedio" -> 3;
            default -> 2;
        };
        int bonus = Math.max(0, completedWorkouts / 6) + Math.max(0, adaptationScore);
        int powerPoints = baseTier + bonus;

        return List.of(
                buildLadder("push", "Cadena de Empuje Horizontal", powerPoints, List.of(
                        new StepSpec("push-wall-pushups", "Flexiones en Pared", "3×15 limpias"),
                        new StepSpec("push-knee-pushups", "Flexiones de Rodillas", "3×12 tempo 2s"),
                        new StepSpec("push-classic-pushups", "Flexiones Clásicas", "4×12 rango completo"),
                        new StepSpec("push-diamond-pushups", "Flexiones Diamante", "4×10 codos cerrados"),
                        new StepSpec("push-pike-pushups", "Pike Pushups", "4×10 hombro estricto"),
                        new StepSpec("push-decline-pushups", "Flexiones Declinadas", "4×12 pies elevados")
                )),
                buildLadder("pull", "Cadena Posterior y Escápula", powerPoints, List.of(
                        new StepSpec("pull-superman-hold", "Superman Isométrico", "3×30s dorsales"),
                        new StepSpec("pull-floor-scapular-pull", "Retracción Escapular Suelo", "3×12 control"),
                        new StepSpec("pull-swimmers", "Swimmers Dorsales", "4×12 movilidad"),
                        new StepSpec("pull-elbow-press", "Elbow Press Dorsal", "4×10 empuje posterior")
                )),
                buildLadder("legs", "Cadena Tren Inferior y Unilateral", powerPoints, List.of(
                        new StepSpec("legs-glute-bridge", "Puente de Glúteos", "3×15 pausa 1s"),
                        new StepSpec("legs-air-squats", "Sentadillas Libres", "4×15 profundidad paralela"),
                        new StepSpec("legs-walking-lunges", "Zancadas Alternas", "4×12 por pierna"),
                        new StepSpec("legs-single-leg-bridge", "Puente Unilateral", "3×10 por lado"),
                        new StepSpec("legs-bulgarian-wall", "Búlgara Isométrica Pared", "4×10 estabilidad")
                )),
                buildLadder("core", "Cadena Media y Bracing", powerPoints, List.of(
                        new StepSpec("core-deadbug", "Deadbug Controlado", "3×12 lumbar pegada"),
                        new StepSpec("core-elbow-plank", "Plancha de Codos", "3×45s línea neutra"),
                        new StepSpec("core-side-plank", "Plancha Lateral", "3×30s por lado"),
                        new StepSpec("core-leg-raises", "Elevaciones de Piernas", "4×12 bajada lenta"),
                        new StepSpec("core-hollow-body", "Hollow Body Hold", "4×30s tensión total")
                ))
        );
    }

    private SkillLadderDto buildLadder(String category, String ladderName, int powerPoints, List<StepSpec> specs) {
        int unlockedCount = Math.min(specs.size(), Math.max(1, Math.min(specs.size(), (powerPoints + 1) / 2 + 1)));
        List<SkillStepDto> steps = new ArrayList<>(specs.size());
        String currentTitle = specs.getFirst().title();
        String nextTitle = null;

        for (int i = 0; i < specs.size(); i++) {
            StepSpec spec = specs.get(i);
            boolean unlocked = i < unlockedCount;
            if (unlocked) {
                currentTitle = spec.title();
            } else if (nextTitle == null) {
                nextTitle = spec.title();
            }
            steps.add(new SkillStepDto(i + 1, spec.exerciseId(), spec.title(), spec.targetMetric(), unlocked));
        }

        int progress = (int) Math.round((unlockedCount * 100.0) / specs.size());
        return new SkillLadderDto(
                category,
                ladderName,
                currentTitle,
                nextTitle != null ? nextTitle : "Dominio total del árbol",
                progress,
                steps
        );
    }

    private List<MuscleRecoveryDto> computeMuscleRecovery(List<WorkoutLogEntity> recentWorkouts) {
        Instant now = clock.instant();
        WorkoutLogEntity latestAll = recentWorkouts.isEmpty() ? null : recentWorkouts.getFirst();
        WorkoutLogEntity latestUpper = findLatestMatching(recentWorkouts, "torso", "empuje", "superior", "full", "base");
        WorkoutLogEntity latestPull = findLatestMatching(recentWorkouts, "espalda", "postura", "movilidad", "full", "torso");
        WorkoutLogEntity latestLegs = findLatestMatching(recentWorkouts, "pierna", "inferior", "cadera", "full");
        WorkoutLogEntity latestCore = latestAll; // El core participa en casi todas las sesiones calisténicas

        return List.of(
                buildRecovery("Pecho, Hombro y Tríceps", latestUpper != null ? latestUpper : latestAll, now, 48),
                buildRecovery("Espalda y Cadena Escapular", latestPull != null ? latestPull : latestAll, now, 42),
                buildRecovery("Cuádriceps, Glúteo e Isquios", latestLegs != null ? latestLegs : latestAll, now, 48),
                buildRecovery("Core y Estabilidad Lumbar", latestCore, now, 24)
        );
    }

    private WorkoutLogEntity findLatestMatching(List<WorkoutLogEntity> logs, String... keywords) {
        for (WorkoutLogEntity log : logs) {
            String title = log.getRoutineTitle().toLowerCase();
            for (String kw : keywords) {
                if (title.contains(kw)) {
                    return log;
                }
            }
        }
        return null;
    }

    private MuscleRecoveryDto buildRecovery(String group, WorkoutLogEntity lastLog, Instant now, int fullHours) {
        if (lastLog == null) {
            return new MuscleRecoveryDto(group, 100, 99, "Listo para estimular");
        }
        int hours = (int) Math.max(0, Duration.between(lastLog.getCompletedAt(), now).toHours());
        int readiness = Math.min(100, (int) Math.round((hours * 100.0) / fullHours));
        String status = readiness >= 85
                ? "Óptimo para progreso"
                : (readiness >= 55 ? "Recuperación media" : "En reconstrucción");
        return new MuscleRecoveryDto(group, readiness, hours, status);
    }

    private String resolveGoalLabel(String goal) {
        return switch (goal) {
            case "resistencia_quemagrasa" -> "Perder Grasa y Definición";
            case "fuerza_hipertrofia" -> "Ganar Músculo y Fuerza";
            default -> "Movilidad, Postura y Salud";
        };
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    record RollingAverages(double avgCalories, double avgProtein, double avgWater, int loggedDaysCount) {
    }

    private record StepSpec(String exerciseId, String title, String targetMetric) {
    }
}
