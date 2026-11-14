package com.calishome.api.nutrition;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NutritionLogRepository extends JpaRepository<NutritionLogEntity, UUID> {

    List<NutritionLogEntity> findByUserIdAndLocalDateOrderByLoggedAtDesc(UUID userId, LocalDate localDate);

    List<NutritionLogEntity> findByUserIdAndLocalDateBetweenOrderByLocalDateDescLoggedAtDesc(
            UUID userId,
            LocalDate from,
            LocalDate to
    );

    List<NutritionLogEntity> findByUserIdOrderByLocalDateDescLoggedAtDesc(UUID userId);

    Optional<NutritionLogEntity> findByIdAndUserId(UUID id, UUID userId);
}
