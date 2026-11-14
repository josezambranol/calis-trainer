package com.calishome.api.users;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users", description = "Perfil, preferencias e importación de progreso del usuario autenticado")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    @Operation(summary = "Obtener usuario y perfil del usuario autenticado")
    public UserResponse getMe(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return userService.getCurrentUser(userId);
    }

    @GetMapping("/me/profile")
    @Operation(summary = "Obtener perfil de entrenamiento del usuario autenticado")
    public UserResponse getMyProfile(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return userService.getCurrentUser(userId);
    }

    @PatchMapping("/me/profile")
    @Operation(summary = "Actualizar preferencias de entrenamiento, días programados, zona horaria y audio")
    public UserResponse updateMyProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return userService.updateProfile(userId, request);
    }

    @PostMapping("/me/import")
    @Operation(summary = "Importar progreso y preferencias previas desde localStorage de forma idempotente")
    public ImportProgressResponse importLocalProgress(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ImportLocalProgressRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return userService.importLocalProgress(userId, request);
    }
}
