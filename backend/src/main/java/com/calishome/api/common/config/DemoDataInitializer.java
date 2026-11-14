package com.calishome.api.common.config;

import com.calishome.api.billing.SubscriptionEntity;
import com.calishome.api.billing.SubscriptionRepository;
import com.calishome.api.billing.SubscriptionStatus;
import com.calishome.api.users.AuthProvider;
import com.calishome.api.users.PlanTier;
import com.calishome.api.users.UserEntity;
import com.calishome.api.users.UserProfileEntity;
import com.calishome.api.users.UserProfileRepository;
import com.calishome.api.users.UserRepository;
import com.calishome.api.users.UserRole;
import com.calishome.api.workouts.WorkoutLogEntity;
import com.calishome.api.workouts.WorkoutLogRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
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
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate transactionTemplate;

    public DemoDataInitializer(
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            WorkoutLogRepository workoutLogRepository,
            SubscriptionRepository subscriptionRepository,
            PasswordEncoder passwordEncoder,
            TransactionTemplate transactionTemplate) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.workoutLogRepository = workoutLogRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.passwordEncoder = passwordEncoder;
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        transactionTemplate.executeWithoutResult(status -> seedDemoAthlete());
    }

    private void seedDemoAthlete() {
        if (userRepository.existsByEmailAndDeletedAtIsNull(DEMO_EMAIL)) {
            return;
        }

        UserEntity user = new UserEntity();
        user.setEmail(DEMO_EMAIL);
        user.setFullName("Mateo Ríos (Demo Pro)");
        user.setPasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setEmailVerified(true);
        user.setRole(UserRole.USER);
        user.setPlanTier(PlanTier.PREMIUM);
        UserEntity savedUser = userRepository.save(user);

        ZoneId bogota = ZoneId.of("America/Bogota");
        LocalDate today = LocalDate.now(bogota);

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

        log.info("Demo Pro athlete seeded for sandbox showcase: {}", DEMO_EMAIL);
    }
}
