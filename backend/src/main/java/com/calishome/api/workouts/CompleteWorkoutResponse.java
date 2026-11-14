package com.calishome.api.workouts;

import com.calishome.api.users.UserResponse;

public record CompleteWorkoutResponse(
        WorkoutLogResponse log,
        UserResponse user
) {
}
