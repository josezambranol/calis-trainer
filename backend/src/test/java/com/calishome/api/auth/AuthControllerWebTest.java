package com.calishome.api.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.calishome.api.common.config.SecurityConfig;
import com.calishome.api.users.UserResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class AuthControllerWebTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private AuthRateLimiter rateLimiter;

    @Test
    void registerRejectsWeakPasswordWithRfc7807ValidationErrors() throws Exception {
        String body = """
                {
                  "fullName": "Jose",
                  "email": "jose@calishome.app",
                  "password": "123"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value("Error de validación"))
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void refreshWithoutCsrfTokenIsRejectedWith403() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void refreshWithCsrfTokenSucceeds() throws Exception {
        UserResponse userDto = new UserResponse(
                UUID.randomUUID(), "jose@calishome.app", "Jose", true,
                "USER", "FREE", "principiante", "fuerza_hipertrofia",
                30, List.of("lunes"), "19:00", "America/Bogota",
                true, true, true, 0, null, 0, 0
        );
        when(authService.refresh(any(), any(), any()))
                .thenReturn(new AuthSessionResult(new AuthResponse("jwt-access", 900, userDto), "new-refresh"));

        mockMvc.perform(post("/api/v1/auth/refresh").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("jwt-access"));
    }
}
