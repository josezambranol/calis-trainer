package com.calishome.api.users;

public record ImportProgressResponse(
        UserResponse user,
        int importedLogsCount
) {
}
