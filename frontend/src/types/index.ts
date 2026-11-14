export type UserLevel = 'principiante' | 'intermedio' | 'avanzado';

export type Goal = 'fuerza_hipertrofia' | 'resistencia_quemagrasa' | 'movilidad_salud';

export type SessionDuration = 15 | 30 | 45;

export type DayOfWeek =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  planTier: 'FREE' | 'PREMIUM' | string;
  level: UserLevel;
  goal: Goal;
  duration: SessionDuration;
  scheduledDays: DayOfWeek[];
  reminderTime: string; // formato "HH:MM"
  timezone: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  voiceCoachEnabled: boolean;
  streak: number;
  lastCompletedDate: string | null;
  totalWorkoutsCompleted: number;
  adaptationScore: number; // -3 a +3
}

export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core';

export interface Exercise {
  id: string;
  name: string;
  targetMuscle: string;
  category: ExerciseCategory;
  difficulty: UserLevel;
  type: 'reps' | 'time';
  defaultAmount: number;
  restSeconds: number;
  instructions: string[];
  tips: string;
  equipment: 'Solo suelo' | 'Suelo y pared' | 'Pared' | string;
}

export interface RoutineExerciseItem {
  exercise: Exercise;
  sets: number;
  repsOrSeconds: number;
  restSeconds: number;
}

export interface DailyRoutine {
  id: string;
  dayId: DayOfWeek;
  dayName: string;
  title: string;
  focus: string;
  level: UserLevel;
  goal: Goal;
  estimatedMinutes: number;
  exercises: RoutineExerciseItem[];
  isRestDay: boolean;
}

export interface WeeklyPlanResponse {
  localDate: string;
  timezone: string;
  today: DailyRoutine;
  days: DailyRoutine[];
}

export type WorkoutFeedback = 'too_easy' | 'just_right' | 'too_hard';

export interface WorkoutLog {
  id: string;
  date: string; // ISO-8601 completedAt
  localDate?: string;
  routineTitle: string;
  durationSeconds: number;
  exercisesCompleted: number;
  feedback: WorkoutFeedback;
  adaptationScoreAfter?: number;
}

export interface WorkoutAnalytics {
  totalWorkouts: number;
  totalMinutes: number;
  currentStreak: number;
  adaptationScore: number;
  workoutsLast7Days: number;
  workoutsLast30Days: number;
  tooEasyCount: number;
  justRightCount: number;
  tooHardCount: number;
}

export interface BillingPlan {
  code: string;
  name: string;
  billingCycle: string;
  amountCents: number;
  currency: string;
  formattedPrice: string;
  recommended: boolean;
  features: string[];
}

export interface BillingPlansResponse {
  provider: string;
  sandboxMode: boolean;
  plans: BillingPlan[];
}

export interface SubscriptionDetails {
  id: string;
  provider: string;
  planCode: string;
  status: 'PENDING' | 'ACTIVE' | 'IN_GRACE' | 'PAST_DUE' | 'CANCELED' | string;
  externalReference: string;
  amountCents: number;
  currency: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  graceUntil: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
}

export interface BillingOverview {
  effectivePlanTier: 'FREE' | 'PREMIUM' | string;
  hasAnalyticsAccess: boolean;
  maxWorkoutHistoryVisible: number;
  maxPushDevices: number;
  provider: string;
  sandboxMode: boolean;
  subscription: SubscriptionDetails | null;
}

export interface CheckoutSessionResponse {
  provider: string;
  sandboxMode: boolean;
  planCode: string;
  externalReference: string;
  amountCents: number;
  currency: string;
  checkoutUrl: string;
}

export interface WebhookAckResponse {
  outcome: string;
  externalReference: string;
  subscriptionStatus: string;
}
