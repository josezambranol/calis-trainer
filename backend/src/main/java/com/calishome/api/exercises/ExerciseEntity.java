package com.calishome.api.exercises;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "exercises")
public class ExerciseEntity {

    @Id
    @Column(length = 80)
    private String id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "target_muscle", nullable = false, length = 150)
    private String targetMuscle;

    @Column(nullable = false, length = 20)
    private String category;

    @Column(nullable = false, length = 20)
    private String difficulty;

    @Column(name = "exercise_type", nullable = false, length = 10)
    private String exerciseType;

    @Column(name = "default_amount", nullable = false)
    private int defaultAmount;

    @Column(name = "rest_seconds", nullable = false)
    private int restSeconds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<String> instructions = new ArrayList<>();

    @Column(nullable = false, columnDefinition = "text")
    private String tips;

    @Column(nullable = false, length = 40)
    private String equipment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getTargetMuscle() {
        return targetMuscle;
    }

    public String getCategory() {
        return category;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public String getExerciseType() {
        return exerciseType;
    }

    public int getDefaultAmount() {
        return defaultAmount;
    }

    public int getRestSeconds() {
        return restSeconds;
    }

    public List<String> getInstructions() {
        return instructions;
    }

    public String getTips() {
        return tips;
    }

    public String getEquipment() {
        return equipment;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
