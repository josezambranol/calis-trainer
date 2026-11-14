package com.calishome.api.planning;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "scheduled_workouts")
public class ScheduledWorkoutEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Column(name = "routine_title", nullable = false, length = 150)
    private String routineTitle;

    @Column(nullable = false, length = 150)
    private String focus;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes = 30;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private ScheduledWorkoutStatus status = ScheduledWorkoutStatus.SCHEDULED;

    @Column(name = "missed_reason", length = 120)
    private String missedReason;

    @Column(name = "completed_workout_id")
    private UUID completedWorkoutId;

    @Column(name = "rescheduled_to")
    private LocalDate rescheduledTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public LocalDate getScheduledDate() {
        return scheduledDate;
    }

    public void setScheduledDate(LocalDate scheduledDate) {
        this.scheduledDate = scheduledDate;
    }

    public String getRoutineTitle() {
        return routineTitle;
    }

    public void setRoutineTitle(String routineTitle) {
        this.routineTitle = routineTitle;
    }

    public String getFocus() {
        return focus;
    }

    public void setFocus(String focus) {
        this.focus = focus;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public ScheduledWorkoutStatus getStatus() {
        return status;
    }

    public void setStatus(ScheduledWorkoutStatus status) {
        this.status = status;
    }

    public String getMissedReason() {
        return missedReason;
    }

    public void setMissedReason(String missedReason) {
        this.missedReason = missedReason;
    }

    public UUID getCompletedWorkoutId() {
        return completedWorkoutId;
    }

    public void setCompletedWorkoutId(UUID completedWorkoutId) {
        this.completedWorkoutId = completedWorkoutId;
    }

    public LocalDate getRescheduledTo() {
        return rescheduledTo;
    }

    public void setRescheduledTo(LocalDate rescheduledTo) {
        this.rescheduledTo = rescheduledTo;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
