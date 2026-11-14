package com.calishome.api.workouts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "workout_logs")
public class WorkoutLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "routine_title", nullable = false, length = 150)
    private String routineTitle;

    @Column(name = "completed_at", nullable = false)
    private Instant completedAt;

    @Column(name = "local_date", nullable = false)
    private LocalDate localDate;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(name = "exercises_completed", nullable = false)
    private int exercisesCompleted;

    @Column(nullable = false, length = 20)
    private String feedback;

    @Column(name = "adaptation_score_after", nullable = false)
    private int adaptationScoreAfter;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (this.completedAt == null) {
            this.completedAt = now;
        }
        this.createdAt = now;
    }

    public static WorkoutLogEntity create(
            UUID userId,
            String routineTitle,
            Instant completedAt,
            LocalDate localDate,
            int durationSeconds,
            int exercisesCompleted,
            String feedback,
            int adaptationScoreAfter) {
        WorkoutLogEntity entity = new WorkoutLogEntity();
        entity.userId = userId;
        entity.routineTitle = routineTitle;
        entity.completedAt = completedAt;
        entity.localDate = localDate;
        entity.durationSeconds = durationSeconds;
        entity.exercisesCompleted = exercisesCompleted;
        entity.feedback = feedback;
        entity.adaptationScoreAfter = adaptationScoreAfter;
        return entity;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getRoutineTitle() {
        return routineTitle;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public LocalDate getLocalDate() {
        return localDate;
    }

    public int getDurationSeconds() {
        return durationSeconds;
    }

    public int getExercisesCompleted() {
        return exercisesCompleted;
    }

    public String getFeedback() {
        return feedback;
    }

    public int getAdaptationScoreAfter() {
        return adaptationScoreAfter;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
