import type {
  BillingOverview,
  BillingPlansResponse,
  CheckoutSessionResponse,
  DailyRoutine,
  DayOfWeek,
  Exercise,
  Goal,
  SessionDuration,
  UserLevel,
  UserProfile,
  WebhookAckResponse,
  WeeklyPlanResponse,
  WorkoutAnalytics,
  WorkoutFeedback,
  WorkoutLog,
} from '../types';
import { apiRequest, logoutSession, refreshAccessToken, setAccessToken } from './apiClient';
import { detectBrowserTimezone } from './storage';

export interface BackendUserDto {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
  role: string;
  planTier: string;
  level: UserLevel;
  goal: Goal;
  durationMinutes: SessionDuration;
  scheduledDays: DayOfWeek[];
  reminderTime: string;
  timezone: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  voiceCoachEnabled: boolean;
  streak: number;
  lastCompletedLocalDate: string | null;
  totalWorkoutsCompleted: number;
  adaptationScore: number;
}

export interface AuthResponseDto {
  accessToken: string;
  expiresInSeconds: number;
  user: BackendUserDto;
}

export interface MessageResponseDto {
  message: string;
}

export interface BackendWorkoutLogDto {
  id: string;
  completedAt: string;
  localDate: string;
  routineTitle: string;
  durationSeconds: number;
  exercisesCompleted: number;
  feedback: WorkoutFeedback;
  adaptationScoreAfter: number;
}

export function mapBackendUser(dto: BackendUserDto): UserProfile {
  return {
    id: dto.id,
    name: dto.fullName,
    email: dto.email,
    emailVerified: dto.emailVerified,
    role: dto.role,
    planTier: dto.planTier,
    level: dto.level,
    goal: dto.goal,
    duration: dto.durationMinutes,
    scheduledDays: dto.scheduledDays,
    reminderTime: dto.reminderTime,
    timezone: dto.timezone || detectBrowserTimezone(),
    notificationsEnabled: dto.notificationsEnabled,
    soundEnabled: dto.soundEnabled,
    voiceCoachEnabled: dto.voiceCoachEnabled,
    streak: dto.streak,
    lastCompletedDate: dto.lastCompletedLocalDate,
    totalWorkoutsCompleted: dto.totalWorkoutsCompleted,
    adaptationScore: dto.adaptationScore,
  };
}

export function mapBackendWorkoutLog(dto: BackendWorkoutLogDto): WorkoutLog {
  return {
    id: dto.id,
    date: dto.completedAt,
    localDate: dto.localDate,
    routineTitle: dto.routineTitle,
    durationSeconds: dto.durationSeconds,
    exercisesCompleted: dto.exercisesCompleted,
    feedback: dto.feedback,
    adaptationScoreAfter: dto.adaptationScoreAfter,
  };
}

export const authApi = {
  register(payload: { fullName: string; email: string; password: string }) {
    return apiRequest<MessageResponseDto>('/api/v1/auth/register', {
      method: 'POST',
      auth: false,
      body: JSON.stringify(payload),
    });
  },

  verifyEmail(token: string) {
    return apiRequest<MessageResponseDto>('/api/v1/auth/verify-email', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ token }),
    });
  },

  resendVerification(email: string) {
    return apiRequest<MessageResponseDto>('/api/v1/auth/resend-verification', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email }),
    });
  },

  async login(payload: { email: string; password: string }): Promise<UserProfile> {
    const res = await apiRequest<AuthResponseDto>('/api/v1/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify(payload),
    });
    setAccessToken(res.accessToken);
    return mapBackendUser(res.user);
  },

  async loginWithGoogle(idToken: string): Promise<UserProfile> {
    const res = await apiRequest<AuthResponseDto>('/api/v1/auth/google', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ idToken }),
    });
    setAccessToken(res.accessToken);
    return mapBackendUser(res.user);
  },

  async tryRestoreSession(): Promise<UserProfile | null> {
    const token = await refreshAccessToken();
    if (!token) return null;
    try {
      const dto = await apiRequest<BackendUserDto>('/api/v1/users/me');
      return mapBackendUser(dto);
    } catch {
      setAccessToken(null);
      return null;
    }
  },

  logout() {
    return logoutSession();
  },

  forgotPassword(email: string) {
    return apiRequest<MessageResponseDto>('/api/v1/auth/forgot-password', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(payload: { token: string; newPassword: string }) {
    return apiRequest<MessageResponseDto>('/api/v1/auth/reset-password', {
      method: 'POST',
      auth: false,
      body: JSON.stringify(payload),
    });
  },
};

export const userApi = {
  async getMe(): Promise<UserProfile> {
    const dto = await apiRequest<BackendUserDto>('/api/v1/users/me');
    return mapBackendUser(dto);
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const payload = {
      level: updates.level,
      goal: updates.goal,
      durationMinutes: updates.duration,
      scheduledDays: updates.scheduledDays,
      reminderTime: updates.reminderTime,
      timezone: updates.timezone,
      notificationsEnabled: updates.notificationsEnabled,
      soundEnabled: updates.soundEnabled,
      voiceCoachEnabled: updates.voiceCoachEnabled,
    };
    const dto = await apiRequest<BackendUserDto>('/api/v1/users/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return mapBackendUser(dto);
  },

  async importLocalProgress(payload: {
    profile?: {
      level?: UserLevel;
      goal?: Goal;
      durationMinutes?: SessionDuration;
      scheduledDays?: DayOfWeek[];
      reminderTime?: string;
      timezone?: string;
      notificationsEnabled?: boolean;
      soundEnabled?: boolean;
      voiceCoachEnabled?: boolean;
      adaptationScore?: number;
    };
    logs?: {
      date: string;
      routineTitle: string;
      durationSeconds: number;
      exercisesCompleted: number;
      feedback: WorkoutFeedback;
    }[];
  }): Promise<{ user: UserProfile; importedLogsCount: number }> {
    const res = await apiRequest<{ user: BackendUserDto; importedLogsCount: number }>(
      '/api/v1/users/me/import',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return {
      user: mapBackendUser(res.user),
      importedLogsCount: res.importedLogsCount,
    };
  },
};

export const exerciseApi = {
  list(params?: { category?: string; difficulty?: string; q?: string }) {
    const search = new URLSearchParams();
    if (params?.category && params.category !== 'all') search.set('category', params.category);
    if (params?.difficulty && params.difficulty !== 'all') search.set('difficulty', params.difficulty);
    if (params?.q) search.set('q', params.q);
    const qs = search.toString();
    return apiRequest<Exercise[]>(`/api/v1/exercises${qs ? `?${qs}` : ''}`, { auth: false });
  },
};

export const routineApi = {
  getToday(): Promise<DailyRoutine> {
    return apiRequest<DailyRoutine>('/api/v1/routines/today');
  },

  getWeekly(): Promise<WeeklyPlanResponse> {
    return apiRequest<WeeklyPlanResponse>('/api/v1/routines/weekly');
  },

  preview(payload: {
    level: UserLevel;
    goal: Goal;
    durationMinutes: SessionDuration;
    scheduledDays: DayOfWeek[];
    timezone: string;
    adaptationScore?: number;
  }): Promise<WeeklyPlanResponse> {
    return apiRequest<WeeklyPlanResponse>('/api/v1/routines/preview', {
      method: 'POST',
      auth: false,
      body: JSON.stringify(payload),
    });
  },
};

export const workoutApi = {
  async list(limit = 30): Promise<WorkoutLog[]> {
    const dtos = await apiRequest<BackendWorkoutLogDto[]>(`/api/v1/workouts?limit=${limit}`);
    return dtos.map(mapBackendWorkoutLog);
  },

  getAnalytics(): Promise<WorkoutAnalytics> {
    return apiRequest<WorkoutAnalytics>('/api/v1/workouts/analytics');
  },

  async complete(payload: {
    routineTitle: string;
    durationSeconds: number;
    exercisesCompleted: number;
    feedback: WorkoutFeedback;
  }): Promise<{ log: WorkoutLog; user: UserProfile }> {
    const res = await apiRequest<{ log: BackendWorkoutLogDto; user: BackendUserDto }>(
      '/api/v1/workouts',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return {
      log: mapBackendWorkoutLog(res.log),
      user: mapBackendUser(res.user),
    };
  },
};

export interface VapidKeyResponse {
  enabled: boolean;
  publicKey: string;
}

export interface NotificationStatusResponse {
  pushEnabled: boolean;
  activeDevicesCount: number;
}

export interface PushTestResponse {
  sentCount: number;
  removedExpiredCount: number;
  message: string;
}

export const notificationApi = {
  getVapidPublicKey(): Promise<VapidKeyResponse> {
    return apiRequest<VapidKeyResponse>('/api/v1/notifications/vapid-public-key', {
      auth: false,
    });
  },

  getStatus(): Promise<NotificationStatusResponse> {
    return apiRequest<NotificationStatusResponse>('/api/v1/notifications/status');
  },

  subscribe(payload: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }): Promise<NotificationStatusResponse> {
    return apiRequest<NotificationStatusResponse>('/api/v1/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  unsubscribe(endpoint: string): Promise<void> {
    return apiRequest<void>('/api/v1/notifications/unsubscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    });
  },

  sendTest(): Promise<PushTestResponse> {
    return apiRequest<PushTestResponse>('/api/v1/notifications/test', {
      method: 'POST',
    });
  },
};

export const billingApi = {
  getPlans(): Promise<BillingPlansResponse> {
    return apiRequest<BillingPlansResponse>('/api/v1/billing/plans', {
      auth: false,
    });
  },

  getOverview(): Promise<BillingOverview> {
    return apiRequest<BillingOverview>('/api/v1/billing/subscription');
  },

  createCheckout(planCode: 'pro_monthly' | 'pro_yearly'): Promise<CheckoutSessionResponse> {
    return apiRequest<CheckoutSessionResponse>('/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ planCode }),
    });
  },

  cancelSubscription(): Promise<BillingOverview> {
    return apiRequest<BillingOverview>('/api/v1/billing/subscription/cancel', {
      method: 'POST',
    });
  },

  completeSandbox(payload: {
    externalReference: string;
    transactionStatus: 'APPROVED' | 'DECLINED' | 'VOIDED';
  }): Promise<WebhookAckResponse> {
    return apiRequest<WebhookAckResponse>('/api/v1/billing/sandbox/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
