package com.calishome.api.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "user_profiles")
public class UserProfileEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Column(nullable = false, length = 20)
    private String level = "principiante";

    @Column(nullable = false, length = 40)
    private String goal = "fuerza_hipertrofia";

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes = 30;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scheduled_days", nullable = false, columnDefinition = "jsonb")
    private List<String> scheduledDays = new ArrayList<>(List.of("lunes", "miercoles", "viernes"));

    @Column(name = "reminder_time", nullable = false, length = 5)
    private String reminderTime = "19:00";

    @Column(nullable = false, length = 64)
    private String timezone = "America/Bogota";

    @Column(name = "notifications_enabled", nullable = false)
    private boolean notificationsEnabled = true;

    @Column(name = "sound_enabled", nullable = false)
    private boolean soundEnabled = true;

    @Column(name = "voice_coach_enabled", nullable = false)
    private boolean voiceCoachEnabled = true;

    @Column(nullable = false)
    private int streak = 0;

    @Column(name = "last_completed_local_date")
    private LocalDate lastCompletedLocalDate;

    @Column(name = "total_workouts_completed", nullable = false)
    private int totalWorkoutsCompleted = 0;

    @Column(name = "adaptation_score", nullable = false)
    private int adaptationScore = 0;

    @Column(name = "weight_kg", nullable = false, precision = 5, scale = 2)
    private BigDecimal weightKg = new BigDecimal("72.00");

    @Column(name = "height_cm", nullable = false)
    private int heightCm = 173;

    @Column(nullable = false)
    private int age = 27;

    @Column(name = "biological_sex", nullable = false, length = 10)
    private String biologicalSex = "M";

    @Column(name = "activity_level", nullable = false, length = 20)
    private String activityLevel = "MODERATE";

    @Column(name = "daily_water_goal_ml", nullable = false)
    private int dailyWaterGoalMl = 2500;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public UUID getUserId() {
        return userId;
    }

    public UserEntity getUser() {
        return user;
    }

    public void setUser(UserEntity user) {
        this.user = user;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public String getGoal() {
        return goal;
    }

    public void setGoal(String goal) {
        this.goal = goal;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public List<String> getScheduledDays() {
        return scheduledDays;
    }

    public void setScheduledDays(List<String> scheduledDays) {
        this.scheduledDays = scheduledDays;
    }

    public String getReminderTime() {
        return reminderTime;
    }

    public void setReminderTime(String reminderTime) {
        this.reminderTime = reminderTime;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public boolean isNotificationsEnabled() {
        return notificationsEnabled;
    }

    public void setNotificationsEnabled(boolean notificationsEnabled) {
        this.notificationsEnabled = notificationsEnabled;
    }

    public boolean isSoundEnabled() {
        return soundEnabled;
    }

    public void setSoundEnabled(boolean soundEnabled) {
        this.soundEnabled = soundEnabled;
    }

    public boolean isVoiceCoachEnabled() {
        return voiceCoachEnabled;
    }

    public void setVoiceCoachEnabled(boolean voiceCoachEnabled) {
        this.voiceCoachEnabled = voiceCoachEnabled;
    }

    public int getStreak() {
        return streak;
    }

    public void setStreak(int streak) {
        this.streak = streak;
    }

    public LocalDate getLastCompletedLocalDate() {
        return lastCompletedLocalDate;
    }

    public void setLastCompletedLocalDate(LocalDate lastCompletedLocalDate) {
        this.lastCompletedLocalDate = lastCompletedLocalDate;
    }

    public int getTotalWorkoutsCompleted() {
        return totalWorkoutsCompleted;
    }

    public void setTotalWorkoutsCompleted(int totalWorkoutsCompleted) {
        this.totalWorkoutsCompleted = totalWorkoutsCompleted;
    }

    public int getAdaptationScore() {
        return adaptationScore;
    }

    public void setAdaptationScore(int adaptationScore) {
        this.adaptationScore = adaptationScore;
    }

    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }

    public int getHeightCm() {
        return heightCm;
    }

    public void setHeightCm(int heightCm) {
        this.heightCm = heightCm;
    }

    public int getAge() {
        return age;
    }

    public void setAge(int age) {
        this.age = age;
    }

    public String getBiologicalSex() {
        return biologicalSex;
    }

    public void setBiologicalSex(String biologicalSex) {
        this.biologicalSex = biologicalSex;
    }

    public String getActivityLevel() {
        return activityLevel;
    }

    public void setActivityLevel(String activityLevel) {
        this.activityLevel = activityLevel;
    }

    public int getDailyWaterGoalMl() {
        return dailyWaterGoalMl;
    }

    public void setDailyWaterGoalMl(int dailyWaterGoalMl) {
        this.dailyWaterGoalMl = dailyWaterGoalMl;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
