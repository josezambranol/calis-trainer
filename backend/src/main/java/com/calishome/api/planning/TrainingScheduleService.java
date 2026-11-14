package com.calishome.api.planning;

import com.calishome.api.common.util.TrainingDayUtil;
import com.calishome.api.common.web.ApiException;
import com.calishome.api.common.web.ResourceNotFoundException;
import com.calishome.api.planning.ScheduleDtos.AdherenceMetrics;
import com.calishome.api.planning.ScheduleDtos.MissedReasonRequest;
import com.calishome.api.planning.ScheduleDtos.RescheduleRequest;
import com.calishome.api.planning.ScheduleDtos.ScheduleOverviewResponse;
import com.calishome.api.planning.ScheduleDtos.ScheduledWorkoutDto;
import com.calishome.api.planning.ScheduleDtos.UpsertScheduleRequest;
import com.calishome.api.routines.DailyRoutineResponse;
import com.calishome.api.routines.RoutinePlanner;
import com.calishome.api.routines.RoutineService;
import com.calishome.api.users.UserProfileEntity;
import com.calishome.api.users.UserService;
import com.calishome.api.workouts.WorkoutLogEntity;
import com.calishome.api.workouts.WorkoutLogRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrainingScheduleService {

    private final ScheduledWorkoutRepository scheduledWorkoutRepository;
    private final WorkoutLogRepository workoutLogRepository;
    private final UserService userService;
    private final RoutineService routineService;
    private final Clock clock;

    @Autowired
    public TrainingScheduleService(
            ScheduledWorkoutRepository scheduledWorkoutRepository,
            WorkoutLogRepository workoutLogRepository,
            UserService userService,
            RoutineService routineService) {
        this(scheduledWorkoutRepository, workoutLogRepository, userService, routineService, Clock.systemUTC());
    }

    TrainingScheduleService(
            ScheduledWorkoutRepository scheduledWorkoutRepository,
            WorkoutLogRepository workoutLogRepository,
            UserService userService,
            RoutineService routineService,
            Clock clock) {
        this.scheduledWorkoutRepository = scheduledWorkoutRepository;
        this.workoutLogRepository = workoutLogRepository;
        this.userService = userService;
        this.routineService = routineService;
        this.clock = clock;
    }

    @Transactional
    public ScheduleOverviewResponse getScheduleAndReconcile(UUID userId, LocalDate from, LocalDate to) {
        UserProfileEntity profile = userService.getProfileEntity(userId);
        ZoneId zoneId = TrainingDayUtil.resolveZoneIdOrDefault(profile.getTimezone());
        LocalDate today = LocalDate.now(clock.withZone(zoneId));

        LocalDate rangeStart = from != null ? from : today.minusDays(14);
        LocalDate rangeEnd = to != null ? to : today.plusDays(14);
        if (rangeEnd.isBefore(rangeStart)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Rango de fechas inválido",
                    "La fecha final debe ser igual o posterior a la fecha inicial.",
                    "invalid-date-range"
            );
        }

        LocalDate auditStart = today.minusDays(14);
        LocalDate reconcileStart = rangeStart.isBefore(auditStart) ? rangeStart : auditStart;
        reconcileScheduledSessions(userId, today, reconcileStart, rangeEnd);

        List<ScheduledWorkoutEntity> visible =
                scheduledWorkoutRepository.findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        userId, rangeStart, rangeEnd
                );
        List<ScheduledWorkoutEntity> last14 =
                scheduledWorkoutRepository.findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        userId, auditStart, today
                );

        AdherenceMetrics metrics = computeAdherenceMetrics(last14);
        return new ScheduleOverviewResponse(
                today,
                zoneId.getId(),
                metrics,
                visible.stream().map(ScheduledWorkoutDto::from).toList()
        );
    }

    @Transactional(readOnly = true)
    public AdherenceMetrics getReconciledAdherence14d(UUID userId) {
        UserProfileEntity profile = userService.getProfileEntity(userId);
        ZoneId zoneId = TrainingDayUtil.resolveZoneIdOrDefault(profile.getTimezone());
        LocalDate today = LocalDate.now(clock.withZone(zoneId));
        List<ScheduledWorkoutEntity> last14 =
                scheduledWorkoutRepository.findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        userId, today.minusDays(14), today
                );
        return computeAdherenceMetrics(last14);
    }

    @Transactional
    public ScheduledWorkoutDto upsertSession(UUID userId, UpsertScheduleRequest request) {
        userService.getProfileEntity(userId);
        UserProfileEntity profile = userService.getProfileEntity(userId);

        ScheduledWorkoutEntity entity = scheduledWorkoutRepository
                .findByUserIdAndScheduledDate(userId, request.scheduledDate())
                .orElseGet(ScheduledWorkoutEntity::new);

        if (entity.getId() != null && entity.getStatus() == ScheduledWorkoutStatus.COMPLETED) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Sesión ya completada",
                    "No puedes sobrescribir una sesión ya registrada como completada.",
                    "schedule-already-completed"
            );
        }

        entity.setUserId(userId);
        entity.setScheduledDate(request.scheduledDate());
        entity.setRoutineTitle(request.routineTitle().trim());
        entity.setFocus(
                request.focus() != null && !request.focus().isBlank()
                        ? request.focus().trim()
                        : describeGoalFocus(profile.getGoal())
        );
        entity.setDurationMinutes(
                request.durationMinutes() != null ? request.durationMinutes() : profile.getDurationMinutes()
        );

        ZoneId zoneId = TrainingDayUtil.resolveZoneIdOrDefault(profile.getTimezone());
        LocalDate today = LocalDate.now(clock.withZone(zoneId));
        entity.setStatus(
                request.scheduledDate().isBefore(today)
                        ? ScheduledWorkoutStatus.MISSED
                        : ScheduledWorkoutStatus.SCHEDULED
        );
        entity.setMissedReason(null);
        entity.setRescheduledTo(null);

        ScheduledWorkoutEntity saved = scheduledWorkoutRepository.save(entity);
        return ScheduledWorkoutDto.from(saved);
    }

    @Transactional
    public List<ScheduledWorkoutDto> autoPopulateUpcoming(UUID userId, int weeks) {
        UserProfileEntity profile = userService.getProfileEntity(userId);
        ZoneId zoneId = TrainingDayUtil.resolveZoneIdOrDefault(profile.getTimezone());
        LocalDate today = LocalDate.now(clock.withZone(zoneId));
        LocalDate end = today.plusDays((long) Math.max(1, Math.min(4, weeks)) * 7 - 1);

        Set<String> scheduledDays = new HashSet<>(profile.getScheduledDays());
        List<ScheduledWorkoutEntity> existing =
                scheduledWorkoutRepository.findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        userId, today, end
                );
        Map<LocalDate, ScheduledWorkoutEntity> byDate = new HashMap<>();
        for (ScheduledWorkoutEntity s : existing) {
            byDate.put(s.getScheduledDate(), s);
        }

        var weeklyPlan = routineService.getWeeklyPlan(userId);
        Map<String, DailyRoutineResponse> byDayId = new HashMap<>();
        for (DailyRoutineResponse d : weeklyPlan.days()) {
            byDayId.put(d.dayId(), d);
        }

        for (LocalDate cursor = today; !cursor.isAfter(end); cursor = cursor.plusDays(1)) {
            String dayId = TrainingDayUtil.toDayId(cursor.getDayOfWeek());
            if (!scheduledDays.contains(dayId) || byDate.containsKey(cursor)) {
                continue;
            }
            DailyRoutineResponse template = byDayId.get(dayId);
            String title = template != null && !template.isRestDay()
                    ? template.title()
                    : RoutinePlanner.buildFreestyleFallbackTitle(profile.getLevel());
            String focus = template != null && !template.isRestDay()
                    ? template.focus()
                    : describeGoalFocus(profile.getGoal());

            ScheduledWorkoutEntity entity = new ScheduledWorkoutEntity();
            entity.setUserId(userId);
            entity.setScheduledDate(cursor);
            entity.setRoutineTitle(title);
            entity.setFocus(focus);
            entity.setDurationMinutes(profile.getDurationMinutes());
            entity.setStatus(ScheduledWorkoutStatus.SCHEDULED);
            scheduledWorkoutRepository.save(entity);
        }

        return scheduledWorkoutRepository
                .findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(userId, today, end)
                .stream()
                .map(ScheduledWorkoutDto::from)
                .toList();
    }

    @Transactional
    public ScheduledWorkoutDto rescheduleSession(UUID userId, UUID sessionId, RescheduleRequest request) {
        UserProfileEntity profile = userService.getProfileEntity(userId);
        ZoneId zoneId = TrainingDayUtil.resolveZoneIdOrDefault(profile.getTimezone());
        LocalDate today = LocalDate.now(clock.withZone(zoneId));

        if (request.targetDate().isBefore(today)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Fecha destino inválida",
                    "Solo puedes reprogramar hacia hoy o una fecha futura.",
                    "invalid-reschedule-date"
            );
        }

        ScheduledWorkoutEntity source = scheduledWorkoutRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Sesión programada no encontrada."));

        if (source.getStatus() == ScheduledWorkoutStatus.COMPLETED) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "Sesión ya completada",
                    "No es necesario reprogramar una sesión que ya completaste.",
                    "schedule-already-completed"
            );
        }

        source.setStatus(ScheduledWorkoutStatus.RESCHEDULED);
        source.setRescheduledTo(request.targetDate());
        if (request.reason() != null && !request.reason().isBlank()) {
            source.setMissedReason(request.reason().trim());
        }
        scheduledWorkoutRepository.save(source);

        ScheduledWorkoutEntity target = scheduledWorkoutRepository
                .findByUserIdAndScheduledDate(userId, request.targetDate())
                .orElseGet(ScheduledWorkoutEntity::new);
        target.setUserId(userId);
        target.setScheduledDate(request.targetDate());
        target.setRoutineTitle(source.getRoutineTitle());
        target.setFocus(source.getFocus());
        target.setDurationMinutes(source.getDurationMinutes());
        target.setStatus(ScheduledWorkoutStatus.SCHEDULED);
        target.setMissedReason(null);
        target.setRescheduledTo(null);
        ScheduledWorkoutEntity savedTarget = scheduledWorkoutRepository.save(target);

        return ScheduledWorkoutDto.from(savedTarget);
    }

    @Transactional
    public ScheduledWorkoutDto recordMissedReason(UUID userId, UUID sessionId, MissedReasonRequest request) {
        ScheduledWorkoutEntity session = scheduledWorkoutRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Sesión programada no encontrada."));
        session.setMissedReason(request.reason().trim());
        return ScheduledWorkoutDto.from(scheduledWorkoutRepository.save(session));
    }

    @Transactional
    public void deleteSession(UUID userId, UUID sessionId) {
        ScheduledWorkoutEntity session = scheduledWorkoutRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Sesión programada no encontrada."));
        scheduledWorkoutRepository.delete(session);
    }

    private void reconcileScheduledSessions(
            UUID userId,
            LocalDate today,
            LocalDate from,
            LocalDate to) {
        List<ScheduledWorkoutEntity> sessions =
                scheduledWorkoutRepository.findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
                        userId, from, to
                );
        if (sessions.isEmpty()) {
            return;
        }

        List<WorkoutLogEntity> logs = workoutLogRepository.findByUserIdOrderByCompletedAtDesc(userId);
        Map<LocalDate, UUID> completedByDate = new HashMap<>();
        for (WorkoutLogEntity log : logs) {
            completedByDate.putIfAbsent(log.getLocalDate(), log.getId());
        }

        for (ScheduledWorkoutEntity session : sessions) {
            UUID matchingWorkoutId = completedByDate.get(session.getScheduledDate());
            if (matchingWorkoutId != null && session.getStatus() != ScheduledWorkoutStatus.COMPLETED) {
                session.setStatus(ScheduledWorkoutStatus.COMPLETED);
                session.setCompletedWorkoutId(matchingWorkoutId);
                scheduledWorkoutRepository.save(session);
            } else if (matchingWorkoutId == null
                    && session.getScheduledDate().isBefore(today)
                    && session.getStatus() == ScheduledWorkoutStatus.SCHEDULED) {
                session.setStatus(ScheduledWorkoutStatus.MISSED);
                scheduledWorkoutRepository.save(session);
            }
        }
    }

    private AdherenceMetrics computeAdherenceMetrics(List<ScheduledWorkoutEntity> last14) {
        int planned = 0;
        int completed = 0;
        int missed = 0;
        int rescheduled = 0;
        List<LocalDate> unaddressedMissed = new java.util.ArrayList<>();

        for (ScheduledWorkoutEntity s : last14) {
            if (s.getStatus() == ScheduledWorkoutStatus.COMPLETED) {
                planned++;
                completed++;
            } else if (s.getStatus() == ScheduledWorkoutStatus.MISSED) {
                planned++;
                missed++;
                unaddressedMissed.add(s.getScheduledDate());
            } else if (s.getStatus() == ScheduledWorkoutStatus.RESCHEDULED) {
                planned++;
                rescheduled++;
            }
        }

        double adherence = planned > 0
                ? Math.round(((double) completed / planned) * 1000.0) / 10.0
                : 100.0;
        return new AdherenceMetrics(planned, completed, missed, rescheduled, adherence, unaddressedMissed);
    }

    private String describeGoalFocus(String goal) {
        return switch (goal) {
            case "resistencia_quemagrasa" -> "Déficit calórico + Densidad metabólica";
            case "movilidad_salud" -> "Control articular, postura y core";
            default -> "Tensión mecánica e hipertrofia corporal";
        };
    }
}
