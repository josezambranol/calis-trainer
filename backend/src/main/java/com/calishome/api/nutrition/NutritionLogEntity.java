package com.calishome.api.nutrition;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "nutrition_logs")
public class NutritionLogEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "local_date", nullable = false)
    private LocalDate localDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false, length = 20)
    private MealType mealType;

    @Column(name = "food_name", nullable = false, length = 140)
    private String foodName;

    @Column(nullable = false)
    private int calories;

    @Column(name = "protein_grams", nullable = false, precision = 6, scale = 1)
    private BigDecimal proteinGrams = BigDecimal.ZERO;

    @Column(name = "carbs_grams", nullable = false, precision = 6, scale = 1)
    private BigDecimal carbsGrams = BigDecimal.ZERO;

    @Column(name = "fats_grams", nullable = false, precision = 6, scale = 1)
    private BigDecimal fatsGrams = BigDecimal.ZERO;

    @Column(name = "water_ml", nullable = false)
    private int waterMl;

    @Column(name = "logged_at", nullable = false)
    private Instant loggedAt;

    @PrePersist
    void initDefaults() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.loggedAt == null) {
            this.loggedAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public LocalDate getLocalDate() {
        return localDate;
    }

    public void setLocalDate(LocalDate localDate) {
        this.localDate = localDate;
    }

    public MealType getMealType() {
        return mealType;
    }

    public void setMealType(MealType mealType) {
        this.mealType = mealType;
    }

    public String getFoodName() {
        return foodName;
    }

    public void setFoodName(String foodName) {
        this.foodName = foodName;
    }

    public int getCalories() {
        return calories;
    }

    public void setCalories(int calories) {
        this.calories = calories;
    }

    public BigDecimal getProteinGrams() {
        return proteinGrams;
    }

    public void setProteinGrams(BigDecimal proteinGrams) {
        this.proteinGrams = proteinGrams;
    }

    public BigDecimal getCarbsGrams() {
        return carbsGrams;
    }

    public void setCarbsGrams(BigDecimal carbsGrams) {
        this.carbsGrams = carbsGrams;
    }

    public BigDecimal getFatsGrams() {
        return fatsGrams;
    }

    public void setFatsGrams(BigDecimal fatsGrams) {
        this.fatsGrams = fatsGrams;
    }

    public int getWaterMl() {
        return waterMl;
    }

    public void setWaterMl(int waterMl) {
        this.waterMl = waterMl;
    }

    public Instant getLoggedAt() {
        return loggedAt;
    }

    public void setLoggedAt(Instant loggedAt) {
        this.loggedAt = loggedAt;
    }
}
