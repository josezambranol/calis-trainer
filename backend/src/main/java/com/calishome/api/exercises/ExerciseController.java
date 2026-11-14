package com.calishome.api.exercises;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/exercises")
@Tag(name = "Exercises", description = "Catálogo de ejercicios sin material")
public class ExerciseController {

    private final ExerciseService exerciseService;

    public ExerciseController(ExerciseService exerciseService) {
        this.exerciseService = exerciseService;
    }

    @GetMapping
    @Operation(summary = "Listar ejercicios con filtros opcionales por categoría, dificultad y búsqueda")
    public List<ExerciseResponse> listExercises(
            @RequestParam(required = false) @Size(max = 50, message = "La categoría no puede superar 50 caracteres.") String category,
            @RequestParam(required = false) @Size(max = 50, message = "La dificultad no puede superar 50 caracteres.") String difficulty,
            @RequestParam(required = false, name = "q") @Size(max = 80, message = "La búsqueda no puede superar 80 caracteres.") String query) {
        return exerciseService.listExercises(category, difficulty, query);
    }
}
