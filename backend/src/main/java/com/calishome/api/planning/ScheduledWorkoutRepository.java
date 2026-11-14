package com.calishome.api.planning;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduledWorkoutRepository extends JpaRepository<ScheduledWorkoutEntity, UUID> {

    List<ScheduledWorkoutEntity> findByUserIdAndScheduledDateBetweenOrderByScheduledDateAsc(
            UUID userId,
            LocalDate from,
            LocalDate to
    );

    List<ScheduledWorkoutEntity> findByUserIdOrderByScheduledDateDesc(UUID userId);

    Optional<ScheduledWorkoutEntity> findByUserIdAndScheduledDate(UUID userId, LocalDate scheduledDate);

    Optional<ScheduledWorkoutEntity> findByIdAndUserId(UUID id, UUID userId);
}
