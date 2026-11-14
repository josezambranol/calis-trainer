package com.calishome.api.coaching;

import com.calishome.api.nutrition.NutritionDtos.MacroTargetsDto;
import com.calishome.api.planning.ScheduleDtos.AdherenceMetrics;
import java.time.Instant;
import java.util.List;

public final class CoachingDtos {

    private CoachingDtos() {
    }

    public enum InsightSeverity {
        CRITICAL,
        WARNING,
        POSITIVE,
        INFO
    }

    public record CoachingInsightDto(
            String id,
            String category,
            InsightSeverity severity,
            String title,
            String telemetryEvidence,
            String recommendation,
            String actionLabel,
            String actionTab
    ) {
    }

    public record PrecisionCoachingResponse(
            Instant generatedAt,
            String goal,
            double adherencePercent14d,
            int missedSessions14d,
            double avgCalories7d,
            double avgProtein7d,
            double avgWaterMl7d,
            MacroTargetsDto macroTargets,
            AdherenceMetrics adherence,
            List<CoachingInsightDto> insights
    ) {
    }
}
