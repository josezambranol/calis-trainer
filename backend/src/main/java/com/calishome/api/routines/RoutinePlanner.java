package com.calishome.api.routines;

import com.calishome.api.common.util.TrainingDayUtil;
import com.calishome.api.exercises.ExerciseResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class RoutinePlanner {

    private static final Set<String> METABOLIC_PREFERRED_IDS = Set.of(
            "core-mountain-climbers",
            "pull-swimmers",
            "legs-walking-lunges",
            "legs-air-squats"
    );

    private static final Set<String> MOBILITY_PREFERRED_IDS = Set.of(
            "pull-superman-hold",
            "pull-floor-scapular-pull",
            "core-deadbug",
            "core-side-plank",
            "legs-glute-bridge"
    );

    public record PlanConfig(
            String seedKey,
            String level,
            String goal,
            int durationMinutes,
            List<String> scheduledDays,
            int adaptationScore,
            LocalDate localDate,
            String timezone
    ) {
    }

    public static String buildFreestyleFallbackTitle(String level) {
        return switch (level) {
            case "avanzado" -> "Sesión Libre Avanzada de Calistenia";
            case "intermedio" -> "Sesión Progresiva de Calistenia";
            default -> "Sesión Base de Control Corporal";
        };
    }

    public WeeklyPlanResponse buildWeeklyPlan(List<ExerciseResponse> catalog, PlanConfig config) {
        LocalDate weekStart = config.localDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        String todayId = TrainingDayUtil.toDayId(config.localDate().getDayOfWeek());

        List<DailyRoutineResponse> days = new ArrayList<>(7);
        DailyRoutineResponse todayRoutine = null;

        for (int i = 0; i < TrainingDayUtil.ORDERED_DAYS.size(); i++) {
            TrainingDayUtil.DayDescriptor day = TrainingDayUtil.ORDERED_DAYS.get(i);
            DailyRoutineResponse routine = generateRoutineForDay(catalog, config, weekStart, day, i);
            days.add(routine);
            if (day.id().equals(todayId)) {
                todayRoutine = routine;
            }
        }

        if (todayRoutine == null) {
            todayRoutine = days.getFirst();
        }

        return new WeeklyPlanResponse(config.localDate(), config.timezone(), todayRoutine, days);
    }

    DailyRoutineResponse generateRoutineForDay(
            List<ExerciseResponse> catalog,
            PlanConfig config,
            LocalDate weekStart,
            TrainingDayUtil.DayDescriptor day,
            int dayIndexInWeek) {

        boolean isTrainingDay = config.scheduledDays().contains(day.id());
        if (!isTrainingDay) {
            return new DailyRoutineResponse(
                    "rest-" + day.id(),
                    day.id(),
                    day.name(),
                    "Día de Recuperación y Crecimiento",
                    "Descanso activo, hidratación y regeneración muscular",
                    config.level(),
                    config.goal(),
                    0,
                    List.of(),
                    true
            );
        }

        boolean isSplit = config.scheduledDays().size() >= 4;
        boolean isEvenWorkout = dayIndexInWeek % 2 == 0;
        SlotTemplate template = resolveTemplate(config.durationMinutes(), config.goal(), isSplit, isEvenWorkout);

        List<RoutineExerciseItemResponse> items = new ArrayList<>();
        Set<String> usedIds = new HashSet<>();

        for (int slotIndex = 0; slotIndex < template.slots().size(); slotIndex++) {
            String category = template.slots().get(slotIndex);
            String deterministicSeed = config.seedKey() + ":" + weekStart + ":" + day.id() + ":" + slotIndex;
            ExerciseResponse selected = pickExerciseForSlot(
                    catalog,
                    category,
                    config.level(),
                    config.goal(),
                    config.adaptationScore(),
                    usedIds,
                    deterministicSeed
            );
            usedIds.add(selected.id());
            items.add(calculateDose(selected, config.durationMinutes(), config.goal(), config.adaptationScore()));
        }

        return new DailyRoutineResponse(
                "routine-" + day.id(),
                day.id(),
                day.name(),
                template.title(),
                template.focus(),
                config.level(),
                config.goal(),
                config.durationMinutes(),
                items,
                false
        );
    }

    private SlotTemplate resolveTemplate(int durationMinutes, String goal, boolean isSplit, boolean isEvenWorkout) {
        if ("movilidad_salud".equals(goal)) {
            if (durationMinutes == 15) {
                return isSplit && isEvenWorkout
                        ? new SlotTemplate("Postura y Espalda Express", "Activación escapular y control de core", List.of("pull", "core", "push"))
                        : new SlotTemplate("Movilidad y Cadera Express", "Estabilidad pélvica, glúteos y abdomen profundo", List.of("legs", "core", "pull"));
            }
            if (durationMinutes == 30) {
                return isSplit && !isEvenWorkout
                        ? new SlotTemplate("Estabilidad Inferior y Postura", "Cadena posterior, movilidad de cadera y core profundo", List.of("legs", "core", "pull", "legs", "core"))
                        : new SlotTemplate("Postura, Espalda Sana y Control", "Higiene postural, dorsales y equilibrio articular", List.of("pull", "core", "legs", "push", "pull"));
            }
            return isSplit && !isEvenWorkout
                    ? new SlotTemplate("Cadena Inferior y Estabilidad Total", "Control unilateral, glúteos protectores y core", List.of("legs", "core", "pull", "legs", "core", "pull"))
                    : new SlotTemplate("Movilidad Corporal Completa", "Descompresión lumbar, escápulas fuertes y control motor", List.of("pull", "core", "push", "legs", "pull", "core"));
        }

        boolean isMetabolic = "resistencia_quemagrasa".equals(goal);
        if (durationMinutes == 15) {
            if (isSplit) {
                return isEvenWorkout
                        ? new SlotTemplate(
                                isMetabolic ? "Circuito Metabólico Torso" : "Torso Express (Empuje y Espalda)",
                                isMetabolic ? "Ritmo continuo de pecho, tríceps y espalda" : "Pectoral, tríceps y dorsales en suelo",
                                List.of("push", "pull", "push"))
                        : new SlotTemplate(
                                isMetabolic ? "Piernas y Core Quemagrasa" : "Piernas y Core Express",
                                isMetabolic ? "Alta densidad para tren inferior y abdomen" : "Tren inferior y estabilidad de abdomen",
                                List.of("legs", "core", "legs"));
            }
            return new SlotTemplate(
                    isMetabolic ? "Full Body Metabólico Express" : "Full Body Calistenia Cero Material",
                    isMetabolic ? "Activación cardiovascular y muscular sin equipamiento" : "Fuerza completa: Pecho, Espalda, Piernas y Core",
                    List.of("push", "legs", "core")
            );
        }

        if (durationMinutes == 30) {
            if (isSplit) {
                return isEvenWorkout
                        ? new SlotTemplate(
                                isMetabolic ? "Torso y Core de Alta Densidad" : "Torso y Espalda Alta Potente",
                                isMetabolic ? "Descansos breves para gasto calórico sostenido" : "Construcción de pecho, hombros, tríceps y postura escapular",
                                List.of("push", "pull", "push", "core", "pull"))
                        : new SlotTemplate(
                                isMetabolic ? "Tren Inferior y Cardio Core" : "Pierna, Glúteos y Abdomen de Acero",
                                isMetabolic ? "Circuito continuo de piernas y core dinámico" : "Cuádriceps, glúteos y resistencia abdominal",
                                List.of("legs", "core", "legs", "core", "legs"));
            }
            return new SlotTemplate(
                    isMetabolic ? "Full Body Resistencia y Quema" : "Full Body Balance Calisténico",
                    isMetabolic ? "Mayor volumen por serie con transiciones rápidas" : "Equilibrio simétrico de fuerza en todo el cuerpo",
                    List.of("push", "pull", "legs", "core", "legs")
            );
        }

        // 45 minutos
        if (isSplit) {
            return isEvenWorkout
                    ? new SlotTemplate(
                            isMetabolic ? "Superior Metabólico Total" : "Sesión Superior Intensa de Torso",
                            isMetabolic ? "Resistencia muscular de empuje, tracción y core" : "Sobrecarga de empuje y cadena posterior",
                            List.of("push", "pull", "push", "pull", "push", "core"))
                    : new SlotTemplate(
                            isMetabolic ? "Inferior y Core Alta Quema" : "Sesión Inferior Intensa y Core Profundo",
                            isMetabolic ? "Circuito exigente de piernas y abdomen dinámico" : "Fuerza unilateral de piernas y control de hollow body",
                            List.of("legs", "core", "legs", "core", "legs", "core"));
        }
        return new SlotTemplate(
                isMetabolic ? "Full Body Resistencia Máxima" : "Full Body Máxima Intensidad",
                isMetabolic ? "Circuito completo de alto gasto energético" : "Entrenamiento integral de hipertrofia y potencia",
                List.of("push", "pull", "legs", "core", "push", "legs", "core")
        );
    }

    private ExerciseResponse pickExerciseForSlot(
            List<ExerciseResponse> catalog,
            String category,
            String preferredLevel,
            String goal,
            int adaptationScore,
            Set<String> excludeIds,
            String deterministicSeed) {

        List<ExerciseResponse> candidates = catalog.stream()
                .filter(ex -> ex.category().equals(category) && !excludeIds.contains(ex.id()))
                .toList();

        if (candidates.isEmpty()) {
            candidates = catalog.stream()
                    .filter(ex -> ex.category().equals(category))
                    .toList();
        }
        if (candidates.isEmpty()) {
            return catalog.getFirst();
        }

        String targetLevel = resolveTargetLevel(preferredLevel, adaptationScore);
        List<ExerciseResponse> exactMatches = candidates.stream()
                .filter(ex -> ex.difficulty().equals(targetLevel))
                .sorted(Comparator.comparing(ExerciseResponse::id))
                .toList();

        List<ExerciseResponse> pool = exactMatches.isEmpty()
                ? candidates.stream().sorted(Comparator.comparing(ExerciseResponse::id)).toList()
                : exactMatches;

        // Priorizar ejercicios afines al objetivo si existen en el pool
        if ("resistencia_quemagrasa".equals(goal)) {
            List<ExerciseResponse> metabolicPool = pool.stream()
                    .filter(ex -> METABOLIC_PREFERRED_IDS.contains(ex.id()))
                    .toList();
            if (!metabolicPool.isEmpty()) {
                pool = metabolicPool;
            }
        } else if ("movilidad_salud".equals(goal)) {
            List<ExerciseResponse> mobilityPool = pool.stream()
                    .filter(ex -> MOBILITY_PREFERRED_IDS.contains(ex.id()))
                    .toList();
            if (!mobilityPool.isEmpty()) {
                pool = mobilityPool;
            }
        }

        int index = deterministicIndex(deterministicSeed, pool.size());
        return pool.get(index);
    }

    private String resolveTargetLevel(String preferredLevel, int adaptationScore) {
        if (adaptationScore >= 2 && "principiante".equals(preferredLevel)) {
            return "intermedio";
        }
        if (adaptationScore >= 3 && "intermedio".equals(preferredLevel)) {
            return "avanzado";
        }
        if (adaptationScore <= -2 && "avanzado".equals(preferredLevel)) {
            return "intermedio";
        }
        if (adaptationScore <= -3 && "intermedio".equals(preferredLevel)) {
            return "principiante";
        }
        return preferredLevel;
    }

    private RoutineExerciseItemResponse calculateDose(
            ExerciseResponse exercise,
            int durationMinutes,
            String goal,
            int adaptationScore) {
        int sets = switch (durationMinutes) {
            case 15 -> 2;
            case 45 -> 4;
            default -> 3;
        };

        double adaptationMultiplier = 1.0 + (adaptationScore * 0.10);
        double goalMultiplier = switch (goal) {
            case "resistencia_quemagrasa" -> 1.20;
            case "movilidad_salud" -> "time".equals(exercise.type()) ? 1.15 : 0.90;
            default -> 1.0;
        };

        int amount = (int) Math.round(exercise.defaultAmount() * adaptationMultiplier * goalMultiplier);
        if ("reps".equals(exercise.type())) {
            amount = Math.max(6, amount);
        } else {
            amount = Math.max(20, amount);
        }

        int restSeconds = exercise.restSeconds();
        if ("resistencia_quemagrasa".equals(goal)) {
            restSeconds -= 10;
        } else if ("movilidad_salud".equals(goal) || "fuerza_hipertrofia".equals(goal)) {
            restSeconds += 5;
        }
        if (adaptationScore <= -1) {
            restSeconds += 10;
        } else if (adaptationScore >= 2) {
            restSeconds -= 5;
        }
        restSeconds = Math.max(20, restSeconds);

        return new RoutineExerciseItemResponse(exercise, sets, amount, restSeconds);
    }

    private int deterministicIndex(String seed, int bound) {
        if (bound <= 1) {
            return 0;
        }
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(seed.getBytes(StandardCharsets.UTF_8));
            int raw = ByteBuffer.wrap(digest).getInt();
            return Math.floorMod(raw, bound);
        } catch (NoSuchAlgorithmException ex) {
            return Math.floorMod(seed.hashCode(), bound);
        }
    }

    private record SlotTemplate(String title, String focus, List<String> slots) {}
}
