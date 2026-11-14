package com.calishome.api.common.config;

import com.calishome.api.billing.SubscriptionEntity;
import com.calishome.api.billing.SubscriptionRepository;
import com.calishome.api.billing.SubscriptionStatus;
import com.calishome.api.nutrition.MealType;
import com.calishome.api.nutrition.NutritionLogEntity;
import com.calishome.api.nutrition.NutritionLogRepository;
import com.calishome.api.planning.ScheduledWorkoutEntity;
import com.calishome.api.planning.ScheduledWorkoutRepository;
import com.calishome.api.planning.ScheduledWorkoutStatus;
import com.calishome.api.users.AuthProvider;
import com.calishome.api.users.PlanTier;
import com.calishome.api.users.UserEntity;
import com.calishome.api.users.UserProfileEntity;
import com.calishome.api.users.UserProfileRepository;
import com.calishome.api.users.UserRepository;
import com.calishome.api.users.UserRole;
import com.calishome.api.workouts.WorkoutLogEntity;
import com.calishome.api.workouts.WorkoutLogRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@ConditionalOnProperty(name = "app.demo.seed-enabled", havingValue = "true")
public class DemoDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);
    static final String DEMO_EMAIL = "demo@calishome.app";
    static final String DEMO_PASSWORD = "DemoCalis2026!";

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final WorkoutLogRepository workoutLogRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ScheduledWorkoutRepository scheduledWorkoutRepository;
    private final NutritionLogRepository nutritionLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate transactionTemplate;

    public DemoDataInitializer(
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            WorkoutLogRepository workoutLogRepository,
            SubscriptionRepository subscriptionRepository,
            ScheduledWorkoutRepository scheduledWorkoutRepository,
            NutritionLogRepository nutritionLogRepository,
            PasswordEncoder passwordEncoder,
            TransactionTemplate transactionTemplate) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.workoutLogRepository = workoutLogRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.scheduledWorkoutRepository = scheduledWorkoutRepository;
        this.nutritionLogRepository = nutritionLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        transactionTemplate.executeWithoutResult(status -> seedDemoAthlete());
    }

    private void seedDemoAthlete() {
        ZoneId bogota = ZoneId.of("America/Bogota");
        LocalDate today = LocalDate.now(bogota);

        UserEntity savedUser = userRepository.findByEmailAndDeletedAtIsNull(DEMO_EMAIL).orElse(null);
        if (savedUser == null) {
            UserEntity user = new UserEntity();
            user.setEmail(DEMO_EMAIL);
            user.setFullName("Mateo Ríos (Demo Pro)");
            user.setPasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
            user.setAuthProvider(AuthProvider.LOCAL);
            user.setEmailVerified(true);
            user.setRole(UserRole.USER);
            user.setPlanTier(PlanTier.PREMIUM);
            savedUser = userRepository.save(user);

            UserProfileEntity profile = new UserProfileEntity();
            profile.setUser(savedUser);
            profile.setLevel("intermedio");
            profile.setGoal("fuerza_hipertrofia");
            profile.setDurationMinutes(30);
            profile.setScheduledDays(List.of("lunes", "martes", "miercoles", "viernes", "sabado"));
            profile.setReminderTime("19:00");
            profile.setTimezone("America/Bogota");
            profile.setNotificationsEnabled(true);
            profile.setSoundEnabled(true);
            profile.setVoiceCoachEnabled(true);
            profile.setStreak(6);
            profile.setLastCompletedLocalDate(today.minusDays(1));
            profile.setTotalWorkoutsCompleted(8);
            profile.setAdaptationScore(1);
            profile.setWeightKg(new BigDecimal("74.50"));
            profile.setHeightCm(176);
            profile.setAge(28);
            profile.setBiologicalSex("M");
            profile.setActivityLevel("MODERATE");
            profile.setDailyWaterGoalMl(2800);
            userProfileRepository.save(profile);

            Instant now = Instant.now();
            SubscriptionEntity subscription = new SubscriptionEntity();
            subscription.setUserId(savedUser.getId());
            subscription.setProvider("sandbox");
            subscription.setPlanCode("pro_monthly");
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            subscription.setExternalReference("calis-demo-pro-" + savedUser.getId());
            subscription.setProviderTransactionId("demo-tx-" + savedUser.getId());
            subscription.setAmountCents(1990000L);
            subscription.setCurrency("COP");
            subscription.setCurrentPeriodStart(now.minus(12, ChronoUnit.DAYS));
            subscription.setCurrentPeriodEnd(now.plus(18, ChronoUnit.DAYS));
            subscription.setLastEventTimestamp(now.toEpochMilli());
            subscriptionRepository.save(subscription);

            record SeedSession(int daysAgo, String title, int durationSeconds, int exercises, String feedback, int scoreAfter) {}
            List<SeedSession> sessions = List.of(
                    new SeedSession(20, "Fuerza Upper Push & Core", 1620, 6, "just_right", 0),
                    new SeedSession(18, "Piernas & Potencia Basal", 1740, 6, "too_easy", 1),
                    new SeedSession(15, "Tracción Suelo & Postura", 1560, 5, "just_right", 1),
                    new SeedSession(12, "Empuje Explosivo & Core", 1800, 6, "just_right", 1),
                    new SeedSession(9, "Piernas & Estabilidad Unilateral", 1680, 6, "too_easy", 2),
                    new SeedSession(6, "Hipertrofia Push / Core", 1860, 6, "too_hard", 1),
                    new SeedSession(3, "Circuito Integral Intermedio", 1710, 6, "just_right", 1),
                    new SeedSession(1, "Fuerza Funcional Cero Equipo", 1790, 6, "just_right", 1)
            );

            for (SeedSession s : sessions) {
                Instant completedAt = today.minusDays(s.daysAgo())
                        .atTime(19, 15)
                        .atZone(bogota)
                        .toInstant();
                workoutLogRepository.save(WorkoutLogEntity.create(
                        savedUser.getId(),
                        s.title(),
                        completedAt,
                        today.minusDays(s.daysAgo()),
                        s.durationSeconds(),
                        s.exercises(),
                        s.feedback(),
                        s.scoreAfter()
                ));
            }
        }

        UUID demoUserId = savedUser.getId();
        seedDemoScheduleIfEmpty(demoUserId, today);
        seedDemoNutritionIfEmpty(demoUserId, today, bogota);
    }

    private void seedDemoScheduleIfEmpty(UUID userId, LocalDate today) {
        if (!scheduledWorkoutRepository.findByUserIdOrderByScheduledDateDesc(userId).isEmpty()) {
            return;
        }
        saveScheduled(userId, today.minusDays(6), "Hipertrofia Push / Core", "Sobrecarga pectoral, hombros y bracing", 30, ScheduledWorkoutStatus.COMPLETED);
        saveScheduled(userId, today.minusDays(3), "Circuito Integral Intermedio", "Fuerza full body cero equipamiento", 30, ScheduledWorkoutStatus.COMPLETED);
        saveScheduled(userId, today.minusDays(2), "Tracción Escapular y Pierna", "Cadena posterior y zancadas unilaterales", 30, ScheduledWorkoutStatus.MISSED);
        saveScheduled(userId, today.minusDays(1), "Fuerza Funcional Cero Equipo", "Empuje estricto + core anti-extensión", 30, ScheduledWorkoutStatus.COMPLETED);
        saveScheduled(userId, today, "Empuje y Core de Alta Tensión", "Hipertrofia pectoral, tríceps y hollow body", 30, ScheduledWorkoutStatus.SCHEDULED);
        saveScheduled(userId, today.plusDays(1), "Tren Inferior Unilateral y Postura", "Sentadilla búlgara en pared y glúteos", 30, ScheduledWorkoutStatus.SCHEDULED);
        saveScheduled(userId, today.plusDays(3), "Resistencia Torso & Escápulas", "Control excéntrico y tracción en suelo", 30, ScheduledWorkoutStatus.SCHEDULED);
        log.info("Demo Pro schedule seeded with adherence & missed-session showcase: {}", DEMO_EMAIL);
    }

    private void saveScheduled(
            UUID userId,
            LocalDate date,
            String title,
            String focus,
            int durationMinutes,
            ScheduledWorkoutStatus status) {
        ScheduledWorkoutEntity entity = new ScheduledWorkoutEntity();
        entity.setUserId(userId);
        entity.setScheduledDate(date);
        entity.setRoutineTitle(title);
        entity.setFocus(focus);
        entity.setDurationMinutes(durationMinutes);
        entity.setStatus(status);
        scheduledWorkoutRepository.save(entity);
    }

    private void seedDemoNutritionIfEmpty(UUID userId, LocalDate today, ZoneId bogota) {
        if (!nutritionLogRepository.findByUserIdOrderByLocalDateDescLoggedAtDesc(userId).isEmpty()) {
            return;
        }
        saveFood(userId, today.minusDays(1), bogota, 8, MealType.BREAKFAST, "3 huevos revueltos + arepa integral + aguacate", 540, 29.0, 42.0, 27.0, 400);
        saveFood(userId, today.minusDays(1), bogota, 13, MealType.LUNCH, "180g pechuga plancha + arroz + lentejas + ensalada", 740, 56.0, 78.0, 18.0, 600);
        saveFood(userId, today.minusDays(1), bogota, 20, MealType.DINNER, "160g atún + papa cocida + aceite de oliva", 580, 44.0, 52.0, 19.0, 600);
        saveFood(userId, today, bogota, 8, MealType.BREAKFAST, "Avena 60g + 2 huevos cocidos + banano", 510, 22.0, 68.0, 15.0, 500);
        saveFood(userId, today, bogota, 13, MealType.LUNCH, "170g carne magra + yuca + frijoles", 790, 48.0, 82.0, 24.0, 600);
        saveFood(userId, today, bogota, 16, MealType.HYDRATION, "Botella electrolitos entrenamiento", 0, 0.0, 0.0, 0.0, 700);
        log.info("Demo Pro nutrition telemetry seeded: {}", DEMO_EMAIL);
    }

    private void saveFood(
            UUID userId,
            LocalDate date,
            ZoneId zoneId,
            int hour,
            MealType mealType,
            String name,
            int calories,
            double protein,
            double carbs,
            double fats,
            int waterMl) {
        NutritionLogEntity entity = new NutritionLogEntity();
        entity.setUserId(userId);
        entity.setLocalDate(date);
        entity.setMealType(mealType);
        entity.setFoodName(name);
        entity.setCalories(calories);
        entity.setProteinGrams(BigDecimal.valueOf(protein));
        entity.setCarbsGrams(BigDecimal.valueOf(carbs));
        entity.setFatsGrams(BigDecimal.valueOf(fats));
        entity.setWaterMl(waterMl);
        entity.setLoggedAt(date.atTime(hour, 15).atZone(zoneId).toInstant());
        nutritionLogRepository.save(entity);
    }
}
