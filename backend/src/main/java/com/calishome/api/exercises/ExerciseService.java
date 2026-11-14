package com.calishome.api.exercises;

import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;

    public ExerciseService(ExerciseRepository exerciseRepository) {
        this.exerciseRepository = exerciseRepository;
    }

    @Transactional(readOnly = true)
    public List<ExerciseResponse> listExercises(String category, String difficulty, String query) {
        String normCat = normalize(category);
        String normDiff = normalize(difficulty);
        String normQuery = normalize(query);

        return exerciseRepository.findAllByOrderByCategoryAscDifficultyAscNameAsc().stream()
                .filter(ex -> normCat == null || normCat.equals("all") || ex.getCategory().equalsIgnoreCase(normCat))
                .filter(ex -> normDiff == null || normDiff.equals("all") || ex.getDifficulty().equalsIgnoreCase(normDiff))
                .filter(ex -> normQuery == null
                        || ex.getName().toLowerCase(Locale.ROOT).contains(normQuery)
                        || ex.getTargetMuscle().toLowerCase(Locale.ROOT).contains(normQuery))
                .map(ExerciseResponse::from)
                .toList();
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
