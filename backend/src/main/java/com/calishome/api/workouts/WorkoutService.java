package com.calishome.api.workouts;

import com.calishome.api.common.util.TrainingDayUtil;
import com.calishome.api.common.web.ResourceNotFoundException;
import com.calishome.api.users.UserEntity;
import com.calishome.api.users.UserProfileEntity;
import com.calishome.api.users.UserProfileRepository;
import com.calishome.api.users.UserRepository;
import com.calishome.api.users.UserResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkoutService {

    private final WorkoutLogRepository workoutLogRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final Clock clock;

    @Autowired
    public WorkoutService(
            WorkoutLogRepository workoutLogRepository,
            UserRepository userRepository,
            UserProfileRepository userProfileRepository) {
        this(workoutLogRepository, userRepository, userProfileRepository, Clock.systemUTC());
    }

    WorkoutService(
            WorkoutLogRepository workoutLogRepository,
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            Clock clock) {
        this.workoutLogRepository = workoutLogRepository;
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<WorkoutLogResponse> listWorkouts(UUID userId, int limit) {
        int safeLimit = Math.max(1, Math.min(100, limit));
        return workoutLogRepository.findByUserIdOrderByCompletedAtDesc(userId, PageRequest.of(0, safeLimit))
                .stream()
                .map(WorkoutLogResponse::from)
                .toList();
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

        return new CompleteWorkoutResponse(
                WorkoutLogResponse.from(savedLog),
                UserResponse.from(user, profile)
        );
    }
}
