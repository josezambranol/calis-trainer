package com.calishome.api.common.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.calishome.api.common.web.ApiException;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class TrainingDayUtilTest {

    @Test
    void preservesAndIncrementsStreakAcrossScheduledRestDays() {
        List<String> schedule = List.of("lunes", "miercoles", "viernes");
        LocalDate monday = LocalDate.of(2026, 11, 9);
        LocalDate wednesday = LocalDate.of(2026, 11, 11);

        int nextStreak = TrainingDayUtil.calculateNextStreak(2, monday, wednesday, schedule);

        assertThat(nextStreak).isEqualTo(3);
    }

    @Test
    void resetsStreakWhenUserMissesScheduledWorkoutDay() {
        List<String> schedule = List.of("lunes", "miercoles", "viernes");
        LocalDate monday = LocalDate.of(2026, 11, 9);
        LocalDate friday = LocalDate.of(2026, 11, 13);

        int nextStreak = TrainingDayUtil.calculateNextStreak(5, monday, friday, schedule);

        assertThat(nextStreak).isEqualTo(1);
    }

    @Test
    void keepsStreakUnchangedWhenCompletingTwiceSameDay() {
        List<String> schedule = List.of("lunes", "miercoles", "viernes");
        LocalDate monday = LocalDate.of(2026, 11, 9);

        int nextStreak = TrainingDayUtil.calculateNextStreak(4, monday, monday, schedule);

        assertThat(nextStreak).isEqualTo(4);
    }

    @Test
    void clampsAdaptationScoreAndAppliesFeedback() {
        assertThat(TrainingDayUtil.applyFeedbackToScore(3, "too_easy")).isEqualTo(3);
        assertThat(TrainingDayUtil.applyFeedbackToScore(-3, "too_hard")).isEqualTo(-3);
        assertThat(TrainingDayUtil.applyFeedbackToScore(0, "too_easy")).isEqualTo(1);
        assertThat(TrainingDayUtil.applyFeedbackToScore(0, "just_right")).isEqualTo(0);
    }

    @Test
    void normalizesScheduledDaysInCanonicalOrderAndRejectsEmpty() {
        List<String> normalized = TrainingDayUtil.normalizeAndValidateScheduledDays(List.of("viernes", "LUNES", "viernes"));
        assertThat(normalized).containsExactly("lunes", "viernes");

        assertThatThrownBy(() -> TrainingDayUtil.normalizeAndValidateScheduledDays(List.of()))
                .isInstanceOf(ApiException.class);
    }
}
