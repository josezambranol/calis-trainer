package com.calishome.api.routines;

import java.time.LocalDate;
import java.util.List;

public record WeeklyPlanResponse(
        LocalDate localDate,
        String timezone,
        DailyRoutineResponse today,
        List<DailyRoutineResponse> days
) {
}
