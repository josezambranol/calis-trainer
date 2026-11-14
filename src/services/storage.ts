import type { UserProfile, WorkoutLog } from '../types';

const PROFILE_KEY = 'calishome_user_profile';
const LOGS_KEY = 'calishome_workout_logs';

export const DEFAULT_PROFILE: UserProfile = {
  id: 'local-user-1',
  name: 'Atleta CalisHome',
  email: 'atleta@calishome.app',
  level: 'intermedio',
  goal: 'fuerza_hipertrofia',
  duration: 30,
  scheduledDays: ['lunes', 'miercoles', 'viernes'],
  reminderTime: '19:00',
  notificationsEnabled: true,
  soundEnabled: true,
  voiceCoachEnabled: true,
  streak: 1,
  lastCompletedDate: null,
  totalWorkoutsCompleted: 0,
  adaptationScore: 0,
  createdAt: new Date().toISOString(),
};

export function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading profile:', e);
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving profile:', e);
  }
}

export function loadWorkoutLogs(): WorkoutLog[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading workout logs:', e);
    return [];
  }
}

export function saveWorkoutLog(log: WorkoutLog): WorkoutLog[] {
  try {
    const existing = loadWorkoutLogs();
    const updated = [log, ...existing];
    localStorage.setItem(LOGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving workout log:', e);
    return [];
  }
}

export function clearAllData(): void {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(LOGS_KEY);
}
