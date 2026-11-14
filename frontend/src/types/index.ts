export type UserLevel = 'principiante' | 'intermedio' | 'avanzado';

export type Goal = 'fuerza_hipertrofia' | 'resistencia_quemagrasa' | 'movilidad_salud';

export type SessionDuration = 15 | 30 | 45;

export type DayOfWeek = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  level: UserLevel;
  goal: Goal;
  duration: SessionDuration;
  scheduledDays: DayOfWeek[];
  reminderTime: string; // formato "HH:MM" e.g. "19:00"
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  voiceCoachEnabled: boolean;
  streak: number;
  lastCompletedDate: string | null;
  totalWorkoutsCompleted: number;
  adaptationScore: number; // 0 normal, positivo = más difícil, negativo = más suave
  createdAt: string;
}

export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core';

export interface Exercise {
  id: string;
  name: string;
  targetMuscle: string;
  category: ExerciseCategory;
  difficulty: UserLevel;
  type: 'reps' | 'time';
  defaultAmount: number; // repeticiones o segundos
  restSeconds: number;
  instructions: string[];
  tips: string;
  equipment: 'Solo suelo' | 'Suelo y pared' | 'Pared';
  badgeColor?: string;
}

export interface RoutineExerciseItem {
  exercise: Exercise;
  sets: number;
  repsOrSeconds: number;
  restSeconds: number;
}

export interface DailyRoutine {
  id: string;
  dayName: string;
  title: string;
  focus: string;
  level: UserLevel;
  estimatedMinutes: number;
  exercises: RoutineExerciseItem[];
  isRestDay?: boolean;
}

export interface WorkoutLog {
  id: string;
  date: string; // ISO date string
  routineTitle: string;
  durationSeconds: number;
  exercisesCompleted: number;
  feedback: 'too_easy' | 'just_right' | 'too_hard';
}
