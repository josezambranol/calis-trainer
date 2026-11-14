package com.calishome.api.workouts;

import com.calishome.api.billing.BillingService;
import com.calishome.api.common.util.TrainingDayUtil;
import com.calishome.api.common.web.ApiException;
import com.calishome.api.common.web.ResourceNotFoundException;
import com.calishome.api.planning.ScheduledWorkoutRepository;
import com.calishome.api.planning.ScheduledWorkoutStatus;
import com.calishome.api.users.PlanTier;
import com.calishome.api.users.UserEntity;
import com.calishome.api.users.UserProfileEntity;
import com.calishome.api.users.UserProfileRepository;
import com.calishome.api.users.UserRepository;
import com.calishome.api.users.UserResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkoutService {

    private final WorkoutLogRepository workoutLogRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final ScheduledWorkoutRepository scheduledWorkoutRepository;
    private final Clock clock;

    @Autowired
    public WorkoutService(
            WorkoutLogRepository workoutLogRepository,
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            ScheduledWorkoutRepository scheduledWorkoutRepository) {
        this(
                workoutLogRepository,
                userRepository,
                userProfileRepository,
                scheduledWorkoutRepository,
                Clock.systemUTC()
        );
    }

    WorkoutService(
            WorkoutLogRepository workoutLogRepository,
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            Clock clock) {
        this(workoutLogRepository, userRepository, userProfileRepository, null, clock);
    }

    WorkoutService(
            WorkoutLogRepository workoutLogRepository,
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            ScheduledWorkoutRepository scheduledWorkoutRepository,
            Clock clock) {
        this.workoutLogRepository = workoutLogRepository;
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.scheduledWorkoutRepository = scheduledWorkoutRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<WorkoutLogResponse> listWorkouts(UUID userId, int limit) {
        UserEntity user = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));
        int maxAllowed = user.getPlanTier() == PlanTier.PREMIUM
                ? BillingService.PRO_MAX_WORKOUT_HISTORY
                : BillingService.FREE_MAX_WORKOUT_HISTORY;
        int safeLimit = Math.max(1, Math.min(maxAllowed, limit));
        return workoutLogRepository.findByUserIdOrderByCompletedAtDesc(userId, PageRequest.of(0, safeLimit))
                .stream()
                .map(WorkoutLogResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkoutAnalyticsResponse getAnalytics(UUID userId) {
        UserEntity user = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));
        if (user.getPlanTier() != PlanTier.PREMIUM) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "Función exclusiva de CalisHome Pro",
                    "Las analíticas avanzadas están disponibles únicamente para suscriptores de CalisHome Pro.",
                    "plan-upgrade-required"
            );
        }

        UserProfileEntity profile = userProfileRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil de usuario no encontrado."));

        List<WorkoutLogEntity> logs = workoutLogRepository.findByUserIdOrderByCompletedAtDesc(userId);
        Instant now = Instant.now(clock);
        Instant cutoff7 = now.minus(Duration.ofDays(7));
        Instant cutoff30 = now.minus(Duration.ofDays(30));

        long totalSeconds = 0;
        int last7 = 0;
        int last30 = 0;
        int tooEasy = 0;
        int justRight = 0;
        int tooHard = 0;

        for (WorkoutLogEntity entry : logs) {
            totalSeconds += entry.getDurationSeconds();
            if (!entry.getCompletedAt().isBefore(cutoff7)) {
                last7++;
            }
            if (!entry.getCompletedAt().isBefore(cutoff30)) {
                last30++;
            }
            switch (entry.getFeedback()) {
                case "too_easy" -> tooEasy++;
                case "just_right" -> justRight++;
                case "too_hard" -> tooHard++;
                default -> {
                    // Otros valores históricos ignorados en conteo de distribución
                }
            }
        }

        int totalMinutes = Math.toIntExact(Math.round(totalSeconds / 60.0));
        return new WorkoutAnalyticsResponse(
                logs.size(),
                totalMinutes,
                profile.getStreak(),
                profile.getAdaptationScore(),
                last7,
                last30,
                tooEasy,
                justRight,
                tooHard
        );
    }

    @Transactional
    public CompleteWorkoutResponse recordWorkout(UUID userId, CreateWorkoutLogRequest request) {
        UserEntity user = userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));
        UserProfileEntity profile = userProfileRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil de usuario no encontrado."));

        Instant now = Instant.now(clock);
        ZoneId zoneId = TrainingDayUtil.resolveZoneIdOrDefault(profile.getTimezone());
        LocalDate localDate = LocalDate.ofInstant(now, zoneId);

        int newAdaptationScore = TrainingDayUtil.applyFeedbackToScore(profile.getAdaptationScore(), request.feedback());
        int nextStreak = TrainingDayUtil.calculateNextStreak(
                profile.getStreak(),
                profile.getLastCompletedLocalDate(),
                localDate,
                profile.getScheduledDays()
        );

        profile.setAdaptationScore(newAdaptationScore);
        profile.setStreak(nextStreak);
        if (profile.getLastCompletedLocalDate() == null || localDate.isAfter(profile.getLastCompletedLocalDate())) {
            profile.setLastCompletedLocalDate(localDate);
        }
        profile.setTotalWorkoutsCompleted(profile.getTotalWorkoutsCompleted() + 1);
        userProfileRepository.save(profile);

        WorkoutLogEntity savedLog = workoutLogRepository.save(
                WorkoutLogEntity.create(
                        userId,
                        request.routineTitle().trim(),
                        now,
                        localDate,
                        request.durationSeconds(),
                        request.exercisesCompleted(),
                        request.feedback(),
                        newAdaptationScore
                )
        );

        if (scheduledWorkoutRepository != null) {
            scheduledWorkoutRepository.findByUserIdAndScheduledDate(userId, localDate)
                    .ifPresent(scheduled -> {
                        scheduled.setStatus(ScheduledWorkoutStatus.COMPLETED);
                        scheduled.setCompletedWorkoutId(savedLog.getId());
                        scheduledWorkoutRepository.save(scheduled);
                    });
        }

        return new CompleteWorkoutResponse(
                WorkoutLogResponse.from(savedLog),
                UserResponse.from(user, profile)
        );
    }
}
