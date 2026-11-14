package com.calishome.api.routines;

import com.calishome.api.common.util.TrainingDayUtil;
import com.calishome.api.common.web.ApiException;
import com.calishome.api.exercises.ExerciseResponse;
import com.calishome.api.exercises.ExerciseService;
import com.calishome.api.users.UserProfileEntity;
import com.calishome.api.users.UserService;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoutineService {

    private static final Set<Integer> ALLOWED_DURATIONS = Set.of(15, 30, 45);

    private final ExerciseService exerciseService;
    private final UserService userService;
    private final RoutinePlanner routinePlanner;
    private final Clock clock;

    @Autowired
    public RoutineService(
            ExerciseService exerciseService,
            UserService userService,
            RoutinePlanner routinePlanner) {
        this(exerciseService, userService, routinePlanner, Clock.systemUTC());
    }

    RoutineService(
            ExerciseService exerciseService,
            UserService userService,
            RoutinePlanner routinePlanner,
            Clock clock) {
        this.exerciseService = exerciseService;
        this.userService = userService;
        this.routinePlanner = routinePlanner;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public DailyRoutineResponse getTodayRoutine(UUID userId) {
        return getWeeklyPlan(userId).today();
    }

    @Transactional(readOnly = true)
    public WeeklyPlanResponse getWeeklyPlan(UUID userId) {
        UserProfileEntity profile = userService.getProfileEntity(userId);
        List<ExerciseResponse> catalog = exerciseService.listExercises(null, null, null);
        ZoneId zoneId = TrainingDayUtil.resolveZoneIdOrDefault(profile.getTimezone());
        LocalDate localDate = LocalDate.now(clock.withZone(zoneId));

        RoutinePlanner.PlanConfig config = new RoutinePlanner.PlanConfig(
                userId.toString(),
                profile.getLevel(),
                profile.getGoal(),
                profile.getDurationMinutes(),
                profile.getScheduledDays(),
                profile.getAdaptationScore(),
                localDate,
                zoneId.getId()
        );
        return routinePlanner.buildWeeklyPlan(catalog, config);
    }

    @Transactional(readOnly = true)
    public WeeklyPlanResponse previewPlan(RoutinePreviewRequest request) {
        String level = request.level() != null ? request.level() : "intermedio";
        String goal = request.goal() != null ? request.goal() : "fuerza_hipertrofia";
        int duration = 30;
        if (request.durationMinutes() != null) {
            if (!ALLOWED_DURATIONS.contains(request.durationMinutes())) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Duración inválida",
                        "La duración debe ser 15, 30 o 45 minutos.",
                        "invalid-duration"
                );
            }
            duration = request.durationMinutes();
        }
        List<String> scheduledDays = request.scheduledDays() != null
                ? TrainingDayUtil.normalizeAndValidateScheduledDays(request.scheduledDays())
                : List.of("lunes", "miercoles", "viernes");
        ZoneId zoneId = request.timezone() != null && !request.timezone().isBlank()
                ? TrainingDayUtil.resolveZoneIdOrDefault(TrainingDayUtil.validateAndNormalizeTimezone(request.timezone()))
                : ZoneId.of(TrainingDayUtil.DEFAULT_TIMEZONE);
        int adaptationScore = request.adaptationScore() != null
                ? TrainingDayUtil.clampAdaptationScore(request.adaptationScore())
                : 0;

        List<ExerciseResponse> catalog = exerciseService.listExercises(null, null, null);
        LocalDate localDate = LocalDate.now(clock.withZone(zoneId));
        RoutinePlanner.PlanConfig config = new RoutinePlanner.PlanConfig(
                "preview",
                level,
                goal,
                duration,
                scheduledDays,
                adaptationScore,
                localDate,
                zoneId.getId()
        );
        return routinePlanner.buildWeeklyPlan(catalog, config);
    }
}
