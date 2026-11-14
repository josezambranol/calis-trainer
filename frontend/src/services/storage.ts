import type { DayOfWeek, Goal, SessionDuration, UserLevel, UserProfile, WorkoutLog } from '../types';

const LEGACY_PROFILE_KEY = 'calishome_user_profile';
const LEGACY_LOGS_KEY = 'calishome_workout_logs';
const GUEST_DRAFT_KEY = 'calishome_guest_onboarding_draft';

export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
  } catch {
    return 'America/Bogota';
  }
}

export const DEFAULT_PROFILE: UserProfile = {
  id: 'preview-athlete',
  name: 'Atleta CalisHome',
  email: 'atleta@calishome.app',
  emailVerified: false,
  role: 'USER',
  planTier: 'FREE',
  level: 'intermedio',
  goal: 'fuerza_hipertrofia',
  duration: 30,
  scheduledDays: ['lunes', 'miercoles', 'viernes'],
  reminderTime: '19:00',
  timezone: detectBrowserTimezone(),
  notificationsEnabled: true,
  soundEnabled: true,
  voiceCoachEnabled: true,
  streak: 0,
  lastCompletedDate: null,
  totalWorkoutsCompleted: 0,
  adaptationScore: 0,
};

export interface GuestOnboardingDraft {
  level: UserLevel;
  goal: Goal;
  duration: SessionDuration;
  scheduledDays: DayOfWeek[];
  reminderTime: string;
  timezone: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  voiceCoachEnabled: boolean;
}

export function loadGuestOnboardingDraft(): GuestOnboardingDraft | null {
  try {
    const raw = localStorage.getItem(GUEST_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuestOnboardingDraft;
  } catch {
    return null;
  }
}

export function saveGuestOnboardingDraft(draft: GuestOnboardingDraft): void {
  try {
    localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearGuestOnboardingDraft(): void {
  try {
    localStorage.removeItem(GUEST_DRAFT_KEY);
  } catch {
    // Ignore
  }
}

export interface LegacyLocalProgress {
  profile: Partial<UserProfile> | null;
  logs: WorkoutLog[];
}

export function loadLegacyLocalProgress(): LegacyLocalProgress | null {
  try {
    const rawProfile = localStorage.getItem(LEGACY_PROFILE_KEY);
    const rawLogs = localStorage.getItem(LEGACY_LOGS_KEY);
    if (!rawProfile && !rawLogs) return null;

    const parsedProfile = rawProfile ? (JSON.parse(rawProfile) as Partial<UserProfile>) : null;
    const parsedLogs = rawLogs ? (JSON.parse(rawLogs) as WorkoutLog[]) : [];
    return {
      profile: parsedProfile,
      logs: Array.isArray(parsedLogs) ? parsedLogs : [],
    };
  } catch {
    return null;
  }
}

export function clearLegacyLocalProgress(): void {
  try {
    localStorage.removeItem(LEGACY_PROFILE_KEY);
    localStorage.removeItem(LEGACY_LOGS_KEY);
  } catch {
    // Ignore
  }
}
