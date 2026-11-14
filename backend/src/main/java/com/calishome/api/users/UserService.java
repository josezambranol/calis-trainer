package com.calishome.api.users;

import com.calishome.api.common.util.TrainingDayUtil;
import com.calishome.api.common.web.ApiException;
import com.calishome.api.common.web.ResourceNotFoundException;
import com.calishome.api.workouts.WorkoutLogEntity;
import com.calishome.api.workouts.WorkoutLogRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private static final Set<Integer> ALLOWED_DURATIONS = Set.of(15, 30, 45);

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final WorkoutLogRepository workoutLogRepository;

    public UserService(
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            WorkoutLogRepository workoutLogRepository) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.workoutLogRepository = workoutLogRepository;
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        UserEntity user = findActiveUser(userId);
        UserProfileEntity profile = findProfile(userId);
        return UserResponse.from(user, profile);
    }

    @Transactional(readOnly = true)
    public UserProfileEntity getProfileEntity(UUID userId) {
        findActiveUser(userId);
        return findProfile(userId);
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        UserEntity user = findActiveUser(userId);
        UserProfileEntity profile = findProfile(userId);

        if (request.level() != null) {
            profile.setLevel(request.level());
        }
        if (request.goal() != null) {
            profile.setGoal(request.goal());
        }
        if (request.durationMinutes() != null) {
            if (!ALLOWED_DURATIONS.contains(request.durationMinutes())) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Duración inválida",
                        "La duración debe ser 15, 30 o 45 minutos.",
                        "invalid-duration"
                );
            }
            profile.setDurationMinutes(request.durationMinutes());
        }
        if (request.scheduledDays() != null) {
            profile.setScheduledDays(TrainingDayUtil.normalizeAndValidateScheduledDays(request.scheduledDays()));
        }
        if (request.reminderTime() != null) {
            profile.setReminderTime(request.reminderTime());
        }
        if (request.timezone() != null && !request.timezone().isBlank()) {
            profile.setTimezone(TrainingDayUtil.validateAndNormalizeTimezone(request.timezone()));
        }
        if (request.notificationsEnabled() != null) {
            profile.setNotificationsEnabled(request.notificationsEnabled());
        }
        if (request.soundEnabled() != null) {
            profile.setSoundEnabled(request.soundEnabled());
        }
        if (request.voiceCoachEnabled() != null) {
            profile.setVoiceCoachEnabled(request.voiceCoachEnabled());
        }

        userProfileRepository.save(profile);
        return UserResponse.from(user, profile);
    }

    @Transactional
    public ImportProgressResponse importLocalProgress(UUID userId, ImportLocalProgressRequest request) {
        UserEntity user = findActiveUser(userId);
        UserProfileEntity profile = findProfile(userId);

        if (request.profile() != null) {
            applyLocalProfileSnapshot(profile, request.profile());
        }

        int importedCount = 0;
        if (request.logs() != null && !request.logs().isEmpty()) {
            ZoneId zoneId = TrainingDayUtil.resolveZoneIdOrDefault(profile.getTimezone());
            List<ParsedImportedLog> parsedLogs = request.logs().stream()
                    .map(item -> parseLog(item, zoneId))
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(ParsedImportedLog::completedAt))
                    .toList();

            for (ParsedImportedLog item : parsedLogs) {
                boolean alreadyExists = workoutLogRepository
                        .existsByUserIdAndLocalDateAndRoutineTitleAndDurationSeconds(
                                userId,
                                item.localDate(),
                                item.routineTitle(),
                                item.durationSeconds()
                        );
                if (alreadyExists) {
                    continue;
                }

                int nextScore = TrainingDayUtil.applyFeedbackToScore(profile.getAdaptationScore(), item.feedback());
                int nextStreak = TrainingDayUtil.calculateNextStreak(
                        profile.getStreak(),
                        profile.getLastCompletedLocalDate(),
                        item.localDate(),
                        profile.getScheduledDays()
                );

                profile.setAdaptationScore(nextScore);
                profile.setStreak(nextStreak);
                if (profile.getLastCompletedLocalDate() == null
                        || item.localDate().isAfter(profile.getLastCompletedLocalDate())) {
                    profile.setLastCompletedLocalDate(item.localDate());
                }
                profile.setTotalWorkoutsCompleted(profile.getTotalWorkoutsCompleted() + 1);

                workoutLogRepository.save(WorkoutLogEntity.create(
                        userId,
                        item.routineTitle(),
                        item.completedAt(),
                        item.localDate(),
                        item.durationSeconds(),
                        item.exercisesCompleted(),
                        item.feedback(),
                        nextScore
                ));
                importedCount++;
            }
        }

        userProfileRepository.save(profile);
        return new ImportProgressResponse(UserResponse.from(user, profile), importedCount);
    }

    private void applyLocalProfileSnapshot(
            UserProfileEntity profile,
            ImportLocalProgressRequest.LocalProfileSnapshot snapshot) {
        if (snapshot.level() != null) {
            profile.setLevel(snapshot.level());
        }
        if (snapshot.goal() != null) {
            profile.setGoal(snapshot.goal());
        }
        if (snapshot.durationMinutes() != null && ALLOWED_DURATIONS.contains(snapshot.durationMinutes())) {
            profile.setDurationMinutes(snapshot.durationMinutes());
        }
        if (snapshot.scheduledDays() != null && !snapshot.scheduledDays().isEmpty()) {
            profile.setScheduledDays(TrainingDayUtil.normalizeAndValidateScheduledDays(snapshot.scheduledDays()));
        }
        if (snapshot.reminderTime() != null) {
            profile.setReminderTime(snapshot.reminderTime());
        }
        if (snapshot.timezone() != null && !snapshot.timezone().isBlank()) {
            profile.setTimezone(TrainingDayUtil.validateAndNormalizeTimezone(snapshot.timezone()));
        }
        if (snapshot.notificationsEnabled() != null) {
            profile.setNotificationsEnabled(snapshot.notificationsEnabled());
        }
        if (snapshot.soundEnabled() != null) {
            profile.setSoundEnabled(snapshot.soundEnabled());
        }
        if (snapshot.voiceCoachEnabled() != null) {
            profile.setVoiceCoachEnabled(snapshot.voiceCoachEnabled());
        }
        if (snapshot.adaptationScore() != null && profile.getTotalWorkoutsCompleted() == 0) {
            profile.setAdaptationScore(TrainingDayUtil.clampAdaptationScore(snapshot.adaptationScore()));
        }
    }

    private ParsedImportedLog parseLog(ImportLocalProgressRequest.ImportedWorkoutLog item, ZoneId zoneId) {
        Instant completedAt = parseInstantFlexible(item.date(), zoneId);
        if (completedAt == null) {
            return null;
        }
        LocalDate localDate = LocalDate.ofInstant(completedAt, zoneId);
        return new ParsedImportedLog(
                completedAt,
                localDate,
                item.routineTitle().trim(),
                item.durationSeconds(),
                item.exercisesCompleted(),
                item.feedback()
        );
    }

    private Instant parseInstantFlexible(String rawDate, ZoneId zoneId) {
        try {
            return Instant.parse(rawDate.trim());
        } catch (Exception ignored) {
        }
        try {
            return OffsetDateTime.parse(rawDate.trim()).toInstant();
        } catch (Exception ignored) {
        }
        try {
            return LocalDate.parse(rawDate.trim()).atTime(12, 0).atZone(zoneId).toInstant();
        } catch (Exception ignored) {
            return null;
        }
    }

    private UserEntity findActiveUser(UUID userId) {
        return userRepository.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado."));
    }

    private UserProfileEntity findProfile(UUID userId) {
        return userProfileRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil de usuario no encontrado."));
    }

    private record ParsedImportedLog(
            Instant completedAt,
            LocalDate localDate,
            String routineTitle,
            int durationSeconds,
            int exercisesCompleted,
            String feedback
    ) {
    }
}
