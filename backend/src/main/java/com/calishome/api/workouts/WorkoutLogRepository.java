package com.calishome.api.workouts;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkoutLogRepository extends JpaRepository<WorkoutLogEntity, UUID> {

    List<WorkoutLogEntity> findByUserIdOrderByCompletedAtDesc(UUID userId, Pageable pageable);

    List<WorkoutLogEntity> findByUserIdOrderByCompletedAtDesc(UUID userId);

    boolean existsByUserIdAndLocalDateAndRoutineTitleAndDurationSeconds(
            UUID userId,
            LocalDate localDate,
            String routineTitle,
            int durationSeconds);
}
