package com.calishome.api.coaching;

import com.calishome.api.coaching.CoachingDtos.CoachingInsightDto;
import com.calishome.api.coaching.CoachingDtos.InsightSeverity;
import com.calishome.api.coaching.CoachingDtos.PrecisionCoachingResponse;
import com.calishome.api.common.util.TrainingDayUtil;
import com.calishome.api.nutrition.NutritionDtos.MacroTargetsDto;
import com.calishome.api.nutrition.NutritionLogEntity;
import com.calishome.api.nutrition.NutritionLogRepository;
import com.calishome.api.nutrition.NutritionService;
import com.calishome.api.planning.ScheduleDtos.AdherenceMetrics;
import com.calishome.api.planning.TrainingScheduleService;
import com.calishome.api.users.UserProfileEntity;
import com.calishome.api.users.UserService;
import com.calishome.api.workouts.WorkoutLogEntity;
import com.calishome.api.workouts.WorkoutLogRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CoachingService {

    private final UserService userService;
    private final TrainingScheduleService trainingScheduleService;
    private final NutritionService nutritionService;
    private final NutritionLogRepository nutritionLogRepository;
    private final WorkoutLogRepository workoutLogRepository;
    private final Clock clock;

    @Autowired
    public CoachingService(
            UserService userService,
            TrainingScheduleService trainingScheduleService,
            NutritionService nutritionService,
            NutritionLogRepository nutritionLogRepository,
            WorkoutLogRepository workoutLogRepository) {
        this(
                userService,
                trainingScheduleService,
                nutritionService,
                nutritionLogRepository,
                workoutLogRepository,
                Clock.systemUTC()
        );
    }

    CoachingService(
            UserService userService,
            TrainingScheduleService trainingScheduleService,
            NutritionService nutritionService,
            NutritionLogRepository nutritionLogRepository,
            WorkoutLogRepository workoutLogRepository,
            Clock clock) {
        this.userService = userService;
        this.trainingScheduleService = trainingScheduleService;
        this.nutritionService = nutritionService;
        this.nutritionLogRepository = nutritionLogRepository;
        this.workoutLogRepository = workoutLogRepository;
        this.clock = clock;
    }

    @Transactional
    public PrecisionCoachingResponse evaluateAthlete(UUID userId) {
        UserProfileEntity profile = userService.getProfileEntity(userId);
        ZoneId zoneId = TrainingDayUtil.resolveZoneIdOrDefault(profile.getTimezone());
        LocalDate today = LocalDate.now(clock.withZone(zoneId));

        AdherenceMetrics adherence = trainingScheduleService.getReconciledAdherence14d(userId);
        MacroTargetsDto targets = nutritionService.calculateTargets(profile);

        List<NutritionLogEntity> windowNutrition =
                nutritionLogRepository.findByUserIdAndLocalDateBetweenOrderByLocalDateDescLoggedAtDesc(
                        userId, today.minusDays(6), today
                );
        NutritionWindowSummary nutritionSummary = summarizeNutritionWindow(windowNutrition);
        List<WorkoutLogEntity> recentWorkouts =
                workoutLogRepository.findByUserIdOrderByCompletedAtDesc(userId, PageRequest.of(0, 6));

        List<CoachingInsightDto> insights = new ArrayList<>();
        insights.add(buildAdherenceInsight(adherence, recentWorkouts, today));
        insights.add(buildCaloricInsight(profile, targets, nutritionSummary));
        insights.add(buildProteinInsight(profile, targets, nutritionSummary));
        insights.add(buildLoadAndHydrationInsight(profile, targets, recentWorkouts, nutritionSummary, today));

        return new PrecisionCoachingResponse(
                clock.instant(),
                profile.getGoal(),
                adherence.adherencePercent14d(),
                adherence.missedCount14d(),
                nutritionSummary.avgCalories(),
                nutritionSummary.avgProteinGrams(),
                nutritionSummary.avgWaterMl(),
                targets,
                adherence,
                insights
        );
    }

    private CoachingInsightDto buildAdherenceInsight(
            AdherenceMetrics adherence,
            List<WorkoutLogEntity> recentWorkouts,
            LocalDate today) {
        if (!adherence.unaddressedMissedDates().isEmpty()) {
            String missedDatesJoined = adherence.unaddressedMissedDates().stream()
                    .limit(3)
                    .map(LocalDate::toString)
                    .collect(Collectors.joining(", "));
            return new CoachingInsightDto(
                    "adherence-missed-sessions",
                    "CUMPLIMIENTO DE AGENDA",
                    InsightSeverity.CRITICAL,
                    String.format("Falta detectada en %d sesión(es) programada(s)", adherence.unaddressedMissedDates().size()),
                    String.format(
                            "Agenda verificada: sin registro en [%s]. Adherencia 14 días en %.1f%% (%d/%d sesiones).",
                            missedDatesJoined,
                            adherence.adherencePercent14d(),
                            adherence.completedCount14d(),
                            adherence.plannedCount14d()
                    ),
                    "Reprograma la sesión pendiente hacia hoy o mañana para recuperar el estímulo semanal sin doblar fatiga articular.",
                    "Reprogramar en Agenda",
                    "schedule"
            );
        }

        if (adherence.plannedCount14d() == 0) {
            return new CoachingInsightDto(
                    "adherence-no-schedule",
                    "PLANIFICACIÓN POR FECHAS",
                    InsightSeverity.WARNING,
                    "Sin fechas bloqueadas en calendario",
                    "0 sesiones programadas en los últimos 14 días; entrenar sin fecha asignada eleva la deserción.",
                    "Genera automáticamente tu calendario de los próximos 14 días para activar la verificación real de asistencia.",
                    "Autopoblar Calendario",
                    "schedule"
            );
        }

        long daysSinceLast = recentWorkouts.isEmpty()
                ? 99
                : Math.max(0, ChronoUnit.DAYS.between(recentWorkouts.getFirst().getLocalDate(), today));
        if (!recentWorkouts.isEmpty() && daysSinceLast >= 4) {
            return new CoachingInsightDto(
                    "adherence-detraining-gap",
                    "CONTINUIDAD NEUROMUSCULAR",
                    InsightSeverity.WARNING,
                    String.format("%d días sin sesión registrada", daysSinceLast),
                    String.format(
                            "Último entrenamiento el %s. Tras 96h cae el reclutamiento técnico aunque la fuerza base permanezca.",
                            recentWorkouts.getFirst().getLocalDate()
                    ),
                    "Completa hoy una sesión de reactivación y reduce la primera serie un 10% para evitar agujetas excesivas.",
                    "Ir al Entrenamiento",
                    "training"
            );
        }

        return new CoachingInsightDto(
                "adherence-on-track",
                "CUMPLIMIENTO DE AGENDA",
                adherence.adherencePercent14d() >= 80.0 ? InsightSeverity.POSITIVE : InsightSeverity.INFO,
                String.format("Adherencia verificada del %.1f%% (14 días)", adherence.adherencePercent14d()),
                String.format(
                        "Completaste %d de %d sesiones evaluadas (%d reprogramadas, %d sin completar).",
                        adherence.completedCount14d(),
                        adherence.plannedCount14d(),
                        adherence.rescheduledCount14d(),
                        adherence.missedCount14d()
                ),
                "Mantén al menos 48h entre bloques intensos del mismo grupo y protege tu bloque horario fijo.",
                "Ver Calendario",
                "schedule"
        );
    }

    private CoachingInsightDto buildCaloricInsight(
            UserProfileEntity profile,
            MacroTargetsDto targets,
            NutritionWindowSummary nutrition) {
        if (nutrition.foodDaysCount() == 0) {
            return new CoachingInsightDto(
                    "nutrition-missing-calories",
                    "BALANCE ENERGÉTICO",
                    InsightSeverity.WARNING,
                    "Sin datos de ingesta calórica en 7 días",
                    String.format(
                            "Tu objetivo exige %d kcal/día (TDEE estimado %d kcal), pero hay 0 comidas registradas esta semana.",
                            targets.targetCalories(),
                            targets.tdeeCalories()
                    ),
                    "Registra al menos tus comidas de hoy para auditar si estás realmente en déficit, mantenimiento o superávit.",
                    "Registrar Dieta",
                    "nutrition"
            );
        }

        double deltaAvg = nutrition.avgCalories() - targets.targetCalories();
        if ("resistencia_quemagrasa".equals(profile.getGoal()) && deltaAvg > 180) {
            return new CoachingInsightDto(
                    "nutrition-fatloss-surplus",
                    "BALANCE ENERGÉTICO",
                    InsightSeverity.WARNING,
                    String.format("Exceso de +%.0f kcal/día frena la pérdida de grasa", deltaAvg),
                    String.format(
                            "Promedio registrado: %.0f kcal/día en %d día(s) frente a tu meta de déficit de %d kcal/día.",
                            nutrition.avgCalories(),
                            nutrition.foodDaysCount(),
                            targets.targetCalories()
                    ),
                    "Recorta ~200 kcal en aceites, bebidas o harinas nocturnas y prioriza volumen vegetal con proteína magra.",
                    "Ajustar Comidas",
                    "nutrition"
            );
        }

        if ("fuerza_hipertrofia".equals(profile.getGoal()) && deltaAvg < -220) {
            return new CoachingInsightDto(
                    "nutrition-hypertrophy-deficit",
                    "BALANCE ENERGÉTICO",
                    InsightSeverity.WARNING,
                    String.format("Déficit oculto de %.0f kcal/día limita la hipertrofia", deltaAvg),
                    String.format(
                            "Promedio real: %.0f kcal/día frente a meta anabólica de %d kcal/día (TDEE %d kcal).",
                            nutrition.avgCalories(),
                            targets.targetCalories(),
                            targets.tdeeCalories()
                    ),
                    "Añade 1 toma de carbohidrato complejo + fruta post-entreno (avena, arroz o banano) para sostener el superávit.",
                    "Completar Calorías",
                    "nutrition"
            );
        }

        return new CoachingInsightDto(
                "nutrition-calories-aligned",
                "BALANCE ENERGÉTICO",
                InsightSeverity.POSITIVE,
                String.format("Ingesta alineada: %.0f / %d kcal", nutrition.avgCalories(), targets.targetCalories()),
                String.format(
                        "Desviación promedio de %+.0f kcal sobre los %d días con registro nutricional esta semana.",
                        deltaAvg,
                        nutrition.foodDaysCount()
                ),
                "La coherencia energética de 7 días pesa más que un solo día aislado; sostén el mismo patrón este fin de semana.",
                "Revisar Macros",
                "nutrition"
        );
    }

    private CoachingInsightDto buildProteinInsight(
            UserProfileEntity profile,
            MacroTargetsDto targets,
            NutritionWindowSummary nutrition) {
        if (nutrition.foodDaysCount() == 0) {
            return new CoachingInsightDto(
                    "nutrition-missing-protein",
                    "SÍNTESIS PROTEICA",
                    InsightSeverity.INFO,
                    String.format("Meta mínima: %dg de proteína diaria", targets.proteinGrams()),
                    String.format(
                            "Para %.1f kg en tu objetivo actual necesitas ~%.1f g/kg diarios; falta telemetría de comidas.",
                            profile.getWeightKg().doubleValue(),
                            targets.proteinGrams() / Math.max(30.0, profile.getWeightKg().doubleValue())
                    ),
                    "Incluye 30–40g de proteína en desayuno y comida principal (huevos, pechuga, atún, yogur griego o lentejas+arroz).",
                    "Cargar Proteína",
                    "nutrition"
            );
        }

        double deficitGrams = targets.proteinGrams() - nutrition.avgProteinGrams();
        double gramsPerKg = nutrition.avgProteinGrams() / Math.max(30.0, profile.getWeightKg().doubleValue());
        if (deficitGrams > 15.0) {
            return new CoachingInsightDto(
                    "nutrition-protein-gap",
                    "SÍNTESIS PROTEICA",
                    InsightSeverity.WARNING,
                    String.format("Déficit proteico de %.0fg/día (%.2f g/kg)", deficitGrams, gramsPerKg),
                    String.format(
                            "Tu promedio real de proteína es %.1fg/día frente a %dg requeridos para evitar pérdida muscular.",
                            nutrition.avgProteinGrams(),
                            targets.proteinGrams()
                    ),
                    String.format("Suma +%.0fg hoy con 2 huevos + clara o 120g de pechuga/atún para cerrar la brecha sin pasarte de grasas.", Math.ceil(deficitGrams)),
                    "Registrar Toma Proteica",
                    "nutrition"
            );
        }

        return new CoachingInsightDto(
                "nutrition-protein-optimal",
                "SÍNTESIS PROTEICA",
                InsightSeverity.POSITIVE,
                String.format("Proteína óptima: %.1fg/día (%.2f g/kg)", nutrition.avgProteinGrams(), gramsPerKg),
                String.format("Cubres el %.0f%% del requerimiento estructural (%dg/día).",
                        (nutrition.avgProteinGrams() * 100.0) / Math.max(1, targets.proteinGrams()),
                        targets.proteinGrams()),
                "Reparte ese aporte en 3–4 comidas separadas por 4h para maximizar picos de leucina y recuperación tendinosa.",
                "Ver Detalle Diario",
                "nutrition"
        );
    }

    private CoachingInsightDto buildLoadAndHydrationInsight(
            UserProfileEntity profile,
            MacroTargetsDto targets,
            List<WorkoutLogEntity> recentWorkouts,
            NutritionWindowSummary nutrition,
            LocalDate today) {
        long tooHard = recentWorkouts.stream().filter(w -> "too_hard".equals(w.getFeedback())).count();
        long tooEasy = recentWorkouts.stream().filter(w -> "too_easy".equals(w.getFeedback())).count();
        int waterDeficit = nutrition.anyLogDaysCount() > 0
                ? (int) Math.round(targets.waterGoalMl() - nutrition.avgWaterMl())
                : targets.waterGoalMl();

        if (tooHard >= 2) {
            return new CoachingInsightDto(
                    "load-overload-guard",
                    "CARGA E HIDRATACIÓN",
                    InsightSeverity.WARNING,
                    String.format("Fatiga alta detectada (%d de últimas sesiones 'muy duras')", tooHard),
                    String.format(
                            "Score de adaptación actual: %+d. Hidratación media: %.0f / %d ml.",
                            profile.getAdaptationScore(),
                            nutrition.avgWaterMl(),
                            targets.waterGoalMl()
                    ),
                    "Prioriza técnica perfecta dejando 2 repeticiones en reserva (RIR 2) y aumenta pausas a 60s hasta normalizar esfuerzo.",
                    "Ver Progresión",
                    "roadmap"
            );
        }

        if (tooEasy >= 2) {
            return new CoachingInsightDto(
                    "load-progression-ready",
                    "CARGA E HIDRATACIÓN",
                    InsightSeverity.POSITIVE,
                    String.format("Sobrecarga lista: %d sesiones recientes evaluadas como fáciles", tooEasy),
                    String.format(
                            "El algoritmo ya ajustó dosis (score %+d). Siguiente paso: escalar variante en tu árbol de habilidades.",
                            profile.getAdaptationScore()
                    ),
                    "Desbloquea el siguiente peldaño en Plan & Habilidades y alarga la fase excéntrica a 3 segundos.",
                    "Escalar Habilidad",
                    "roadmap"
            );
        }

        if (waterDeficit > 600 && nutrition.anyLogDaysCount() > 0) {
            return new CoachingInsightDto(
                    "hydration-gap",
                    "HIDRATACIÓN CELULAR",
                    InsightSeverity.WARNING,
                    String.format("Déficit hídrico de -%d ml/día", waterDeficit),
                    String.format(
                            "Promedio medido: %.0f ml/día frente a meta biométrica de %d ml/día (%s).",
                            nutrition.avgWaterMl(),
                            targets.waterGoalMl(),
                            today
                    ),
                    "Un 2% de deshidratación reduce hasta 10% el rendimiento anaeróbico; añade un vaso de 400 ml al despertar y tras entrenar.",
                    "Sumar Agua (+500ml)",
                    "nutrition"
            );
        }

        return new CoachingInsightDto(
                "load-optimal-balance",
                "CARGA Y RECUPERACIÓN",
                InsightSeverity.INFO,
                String.format("Zona óptima de estímulo (%d sesiones recientes analizadas)", recentWorkouts.size()),
                String.format(
                        "Score adaptativo %+d · Agua promedio: %.0f / %d ml.",
                        profile.getAdaptationScore(),
                        nutrition.avgWaterMl(),
                        targets.waterGoalMl()
                ),
                "Sigue registrando tu RPE real al finalizar cada rutina para que el árbol de habilidades escale en el momento exacto.",
                "Ver Plan 12 Semanas",
                "roadmap"
        );
    }

    private NutritionWindowSummary summarizeNutritionWindow(List<NutritionLogEntity> windowLogs) {
        if (windowLogs.isEmpty()) {
            return new NutritionWindowSummary(0.0, 0.0, 0.0, 0, 0);
        }
        Map<LocalDate, List<NutritionLogEntity>> byDate = windowLogs.stream()
                .collect(Collectors.groupingBy(NutritionLogEntity::getLocalDate));

        int foodDays = 0;
        double sumCalories = 0.0;
        double sumProtein = 0.0;
        double sumWater = 0.0;

        for (List<NutritionLogEntity> dayLogs : byDate.values()) {
            int cal = 0;
            double prot = 0.0;
            int water = 0;
            for (NutritionLogEntity log : dayLogs) {
                cal += log.getCalories();
                prot += log.getProteinGrams().doubleValue();
                water += log.getWaterMl();
            }
            sumWater += water;
            if (cal > 0 || prot > 0) {
                foodDays++;
                sumCalories += cal;
                sumProtein += prot;
            }
        }

        int anyDays = byDate.size();
        return new NutritionWindowSummary(
                foodDays > 0 ? round1(sumCalories / foodDays) : 0.0,
                foodDays > 0 ? round1(sumProtein / foodDays) : 0.0,
                anyDays > 0 ? round1(sumWater / anyDays) : 0.0,
                foodDays,
                anyDays
        );
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private record NutritionWindowSummary(
            double avgCalories,
            double avgProteinGrams,
            double avgWaterMl,
            int foodDaysCount,
            int anyLogDaysCount
    ) {
    }
}
