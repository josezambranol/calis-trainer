import { EXERCISE_DATABASE } from '../data/exercises';
import type { DailyRoutine, DayOfWeek, Exercise, RoutineExerciseItem, UserProfile } from '../types';

export const DAYS_MAP: { id: DayOfWeek; name: string; short: string }[] = [
  { id: 'lunes', name: 'Lunes', short: 'Lun' },
  { id: 'martes', name: 'Martes', short: 'Mar' },
  { id: 'miercoles', name: 'Miércoles', short: 'Mié' },
  { id: 'jueves', name: 'Jueves', short: 'Jue' },
  { id: 'viernes', name: 'Viernes', short: 'Vie' },
  { id: 'sabado', name: 'Sábado', short: 'Sáb' },
  { id: 'domingo', name: 'Domingo', short: 'Dom' },
];

/**
 * Obtiene el día actual en formato DayOfWeek
 */
export const getCurrentDayOfWeek = (): DayOfWeek => {
  const days: DayOfWeek[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const todayIndex = new Date().getDay();
  return days[todayIndex];
};

/**
 * Filtra ejercicios por categoría y nivel adecuado
 */
function pickExerciseForSlot(
  category: Exercise['category'],
  preferredLevel: UserProfile['level'],
  adaptationScore: number,
  excludeIds: string[] = []
): Exercise {
  const candidates = EXERCISE_DATABASE.filter(
    (ex) => ex.category === category && !excludeIds.includes(ex.id)
  );

  // Si la adaptación es muy alta (>= 2), intentamos buscar variantes más avanzadas
  let targetLevel = preferredLevel;
  if (adaptationScore >= 2 && preferredLevel === 'principiante') targetLevel = 'intermedio';
  if (adaptationScore >= 3 && preferredLevel === 'intermedio') targetLevel = 'avanzado';
  if (adaptationScore <= -2 && preferredLevel === 'avanzado') targetLevel = 'intermedio';
  if (adaptationScore <= -3 && preferredLevel === 'intermedio') targetLevel = 'principiante';

  // Buscar coincidencia exacta de nivel
  const exact = candidates.filter((ex) => ex.difficulty === targetLevel);
  if (exact.length > 0) {
    return exact[Math.floor(Math.random() * exact.length)];
  }

  // Si no hay exacto, cualquier candidato de esa categoría
  if (candidates.length > 0) {
    return candidates[0];
  }

  // Fallback
  return EXERCISE_DATABASE.find((ex) => ex.category === category) || EXERCISE_DATABASE[0];
}

/**
 * Calcula series y repeticiones/tiempo adaptados
 */
function calculateSetsAndReps(
  exercise: Exercise,
  durationMinutes: number,
  adaptationScore: number
): { sets: number; repsOrSeconds: number; restSeconds: number } {
  let sets = 3;
  if (durationMinutes === 15) sets = 2;
  if (durationMinutes === 45) sets = 4;

  // Ajuste de repeticiones según el adaptation score (-3 a +3)
  const multiplier = 1 + adaptationScore * 0.1; // e.g. score +2 => +20% reps
  let repsOrSeconds = Math.round(exercise.defaultAmount * multiplier);

  // Mínimos lógicos
  if (exercise.type === 'reps' && repsOrSeconds < 6) repsOrSeconds = 6;
  if (exercise.type === 'time' && repsOrSeconds < 20) repsOrSeconds = 20;

  // Descansos adaptados (si es demasiado exigente, se da un poco más de descanso)
  let restSeconds = exercise.restSeconds;
  if (adaptationScore <= -1) restSeconds += 10;
  if (adaptationScore >= 2) restSeconds = Math.max(30, restSeconds - 5);

  return { sets, repsOrSeconds, restSeconds };
}

/**
 * Genera la rutina para un día específico
 */
export function generateRoutineForDay(
  day: DayOfWeek,
  dayIndexInWeek: number,
  profile: UserProfile
): DailyRoutine {
  const isTrainingDay = profile.scheduledDays.includes(day);

  if (!isTrainingDay) {
    return {
      id: `rest-${day}`,
      dayName: DAYS_MAP.find((d) => d.id === day)?.name || day,
      title: 'Día de Recuperación y Crecimiento',
      focus: 'Descanso activo, hidratación y regeneración muscular',
      level: profile.level,
      estimatedMinutes: 0,
      exercises: [],
      isRestDay: true,
    };
  }

  // Determinar estructura de la rutina según días de entreno
  // Si entrena 1-3 días: Full Body
  // Si entrena 4+ días: Alternancia Torso/Empuje vs Pierna/Core
  const trainingDaysCount = profile.scheduledDays.length;
  const isSplit = trainingDaysCount >= 4;
  const isEvenWorkout = dayIndexInWeek % 2 === 0;

  let routineTitle = 'Full Body Calistenia Cero Material';
  let focus = 'Fuerza completa: Pecho, Espalda, Piernas y Core';
  let categorySlots: Exercise['category'][] = [];

  if (profile.duration === 15) {
    // 3 ejercicios express
    if (isSplit) {
      if (isEvenWorkout) {
        routineTitle = 'Torso Express (Empuje y Espalda)';
        focus = 'Pectoral, tríceps y dorsales en suelo';
        categorySlots = ['push', 'pull', 'push'];
      } else {
        routineTitle = 'Piernas y Core Express';
        focus = 'Tren inferior y estabilidad de abdomen';
        categorySlots = ['legs', 'core', 'legs'];
      }
    } else {
      categorySlots = ['push', 'legs', 'core'];
    }
  } else if (profile.duration === 30) {
    // 5 ejercicios estándar
    if (isSplit) {
      if (isEvenWorkout) {
        routineTitle = 'Torso y Espalda Alta Potente';
        focus = 'Construcción de pecho, hombros, tríceps y postura escapular';
        categorySlots = ['push', 'pull', 'push', 'core', 'pull'];
      } else {
        routineTitle = 'Pierna, Glúteos y Abdomen de Acero';
        focus = 'Cuádriceps, glúteos y resistencia abdominal';
        categorySlots = ['legs', 'core', 'legs', 'core', 'legs'];
      }
    } else {
      routineTitle = 'Full Body Balance Calisténico';
      focus = 'Equilibrio simétrico de fuerza en todo el cuerpo';
      categorySlots = ['push', 'pull', 'legs', 'core', 'legs'];
    }
  } else {
    // 45 minutos: 6-7 ejercicios completos
    if (isSplit) {
      if (isEvenWorkout) {
        routineTitle = 'Sesión Superior Intensa de Torso';
        focus = 'Sobrecarga de empuje y cadena posterior';
        categorySlots = ['push', 'pull', 'push', 'pull', 'push', 'core'];
      } else {
        routineTitle = 'Sesión Inferior Intensa y Core Profundo';
        focus = 'Fuerza unilateral de piernas y control de hollow body';
        categorySlots = ['legs', 'core', 'legs', 'core', 'legs', 'core'];
      }
    } else {
      routineTitle = 'Full Body Máxima Intensidad';
      focus = 'Entrenamiento integral de hipertrofia y potencia';
      categorySlots = ['push', 'pull', 'legs', 'core', 'push', 'legs', 'core'];
    }
  }

  const selectedExercises: RoutineExerciseItem[] = [];
  const usedExerciseIds: string[] = [];

  categorySlots.forEach((cat) => {
    const exercise = pickExerciseForSlot(
      cat,
      profile.level,
      profile.adaptationScore,
      usedExerciseIds
    );
    usedExerciseIds.push(exercise.id);

    const { sets, repsOrSeconds, restSeconds } = calculateSetsAndReps(
      exercise,
      profile.duration,
      profile.adaptationScore
    );

    selectedExercises.push({
      exercise,
      sets,
      repsOrSeconds,
      restSeconds,
    });
  });

  return {
    id: `routine-${day}`,
    dayName: DAYS_MAP.find((d) => d.id === day)?.name || day,
    title: routineTitle,
    focus,
    level: profile.level,
    estimatedMinutes: profile.duration,
    exercises: selectedExercises,
    isRestDay: false,
  };
}

/**
 * Genera el plan semanal completo para el usuario
 */
export function generateWeeklyPlan(profile: UserProfile): DailyRoutine[] {
  return DAYS_MAP.map((dayItem, index) => {
    return generateRoutineForDay(dayItem.id, index, profile);
  });
}

/**
 * Obtiene la rutina de hoy
 */
export function getTodayRoutine(profile: UserProfile): DailyRoutine {
  const currentDay = getCurrentDayOfWeek();
  const index = DAYS_MAP.findIndex((d) => d.id === currentDay);
  return generateRoutineForDay(currentDay, index >= 0 ? index : 0, profile);
}
