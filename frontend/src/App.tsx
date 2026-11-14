import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CloudOff, Download, WifiOff } from 'lucide-react';
import type { DailyRoutine, Exercise, UserProfile, WeeklyPlanResponse } from './types';
import { useAuth } from './context/useAuth';
import { useI18n } from './i18n/useI18n';
import { exerciseApi, routineApi, userApi, workoutApi } from './services/api';
import {
  DEFAULT_PROFILE,
  loadGuestOnboardingDraft,
  saveGuestOnboardingDraft,
} from './services/storage';
import {
  enqueuePendingWorkout,
  flushPendingWorkouts,
  getPendingWorkouts,
  isLikelyNetworkOfflineError,
  loadOfflineSnapshot,
  saveOfflineSnapshot,
  type PendingWorkoutRecord,
} from './services/offlineSync';
import { getExistingPushSubscription, reminderWatcher } from './utils/notifications';
import { getCurrentDayOfWeek } from './utils/routineGenerator';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import type { CompletedWorkoutPayload } from './components/WorkoutPlayer';
import type { AuthModalMode } from './components/AuthModal';

const WorkoutPlayer = lazy(() =>
  import('./components/WorkoutPlayer').then((m) => ({ default: m.WorkoutPlayer }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const OnboardingModal = lazy(() =>
  import('./components/OnboardingModal').then((m) => ({ default: m.OnboardingModal }))
);
const VerifyEmailPage = lazy(() =>
  import('./pages/AuthActionPages').then((m) => ({ default: m.VerifyEmailPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./pages/AuthActionPages').then((m) => ({ default: m.ResetPasswordPage }))
);
const PlansPage = lazy(() =>
  import('./pages/PlansPage').then((m) => ({ default: m.PlansPage }))
);
const SandboxCheckoutPage = lazy(() =>
  import('./pages/SandboxCheckoutPage').then((m) => ({ default: m.SandboxCheckoutPage }))
);
const AccountPage = lazy(() =>
  import('./pages/AccountPage').then((m) => ({ default: m.AccountPage }))
);
const PrivacyPage = lazy(() =>
  import('./pages/LegalPages').then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = lazy(() =>
  import('./pages/LegalPages').then((m) => ({ default: m.TermsPage }))
);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function SuspenseFallback() {
  return (
    <div className="min-h-[200px] flex items-center justify-center text-xs text-slate-400">
      Cargando módulo de CalisHome...
    </div>
  );
}

function buildFallbackTodayRoutine(profile: UserProfile): DailyRoutine {
  const dayId = getCurrentDayOfWeek();
  return {
    id: `loading-${dayId}`,
    dayId,
    dayName: dayId,
    title: 'Cargando tu rutina personalizada...',
    focus: 'Sincronizando con el motor de CalisHome',
    level: profile.level,
    goal: profile.goal,
    estimatedMinutes: profile.duration,
    exercises: [],
    isRestDay: false,
  };
}

function HomeWorkspace({
  initialAuthModalMode = null,
}: {
  initialAuthModalMode?: AuthModalMode | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { user, isAuthenticated, isRestoring, updateCachedUser, logout } = useAuth();

  const [guestProfile, setGuestProfile] = useState<UserProfile>(() => {
    const draft = loadGuestOnboardingDraft();
    return draft ? { ...DEFAULT_PROFILE, ...draft } : DEFAULT_PROFILE;
  });

  const [activeWorkoutRoutine, setActiveWorkoutRoutine] = useState<DailyRoutine | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(initialAuthModalMode !== null);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>(initialAuthModalMode || 'login');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [cachedExercises, setCachedExercises] = useState<Exercise[]>([]);
  const [cachedWeeklyPlan, setCachedWeeklyPlan] = useState<WeeklyPlanResponse | null>(null);
  const [pendingWorkouts, setPendingWorkouts] = useState<PendingWorkoutRecord[]>([]);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);

  const effectiveProfile = useMemo(() => user || guestProfile, [user, guestProfile]);

  const planSnapshotKey = isAuthenticated && user?.id ? `weekly_plan_${user.id}` : 'weekly_plan_guest';

  const syncOfflineQueue = useCallback(async () => {
    if (!isAuthenticated || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return;
    }
    const existing = await getPendingWorkouts();
    if (existing.length === 0) return;

    setIsSyncingQueue(true);
    try {
      const syncedCount = await flushPendingWorkouts(async (item) => {
        const res = await workoutApi.complete({
          routineTitle: item.routineTitle,
          durationSeconds: item.durationSeconds,
          exercisesCompleted: item.exercisesCompleted,
          feedback: item.feedback,
        });
        updateCachedUser(res.user);
      });
      if (syncedCount > 0) {
        await queryClient.invalidateQueries({ queryKey: ['workouts'] });
        await queryClient.invalidateQueries({ queryKey: ['weeklyPlan'] });
        await queryClient.invalidateQueries({ queryKey: ['workoutAnalytics'] });
      }
      setPendingWorkouts(await getPendingWorkouts());
    } finally {
      setIsSyncingQueue(false);
    }
  }, [isAuthenticated, queryClient, updateCachedUser]);

  useEffect(() => {
    let active = true;
    void loadOfflineSnapshot<Exercise[]>('exercises_catalog').then((data) => {
      if (active && data) setCachedExercises(data);
    });
    void loadOfflineSnapshot<WeeklyPlanResponse>(planSnapshotKey).then((data) => {
      if (active && data) setCachedWeeklyPlan(data);
    });
    void getPendingWorkouts().then((items) => {
      if (active) {
        setPendingWorkouts(items);
        if (items.length > 0 && isAuthenticated && !isOffline) {
          void syncOfflineQueue();
        }
      }
    });
    return () => {
      active = false;
    };
  }, [planSnapshotKey, isAuthenticated, isOffline, syncOfflineQueue]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      void syncOfflineQueue();
    };
    const handleOffline = () => setIsOffline(true);
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => setInstallPrompt(null);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [syncOfflineQueue]);

  useEffect(() => {
    let cancelled = false;
    if (user) {
      void getExistingPushSubscription().then((sub) => {
        if (!cancelled) {
          reminderWatcher.start(
            user.scheduledDays,
            user.reminderTime,
            user.notificationsEnabled,
            undefined,
            Boolean(sub)
          );
        }
      });
    } else {
      reminderWatcher.stop();
    }
    return () => {
      cancelled = true;
      reminderWatcher.stop();
    };
  }, [user]);

  const exercisesQuery = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const data = await exerciseApi.list();
      setCachedExercises(data);
      void saveOfflineSnapshot('exercises_catalog', data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const weeklyPlanQuery = useQuery({
    queryKey: isAuthenticated
      ? [
          'weeklyPlan',
          'auth',
          user?.id,
          user?.level,
          user?.goal,
          user?.duration,
          user?.scheduledDays,
          user?.adaptationScore,
          user?.timezone,
        ]
      : [
          'weeklyPlan',
          'preview',
          guestProfile.level,
          guestProfile.goal,
          guestProfile.duration,
          guestProfile.scheduledDays,
          guestProfile.timezone,
        ],
    queryFn: async () => {
      const data = isAuthenticated
        ? await routineApi.getWeekly()
        : await routineApi.preview({
            level: guestProfile.level,
            goal: guestProfile.goal,
            durationMinutes: guestProfile.duration,
            scheduledDays: guestProfile.scheduledDays,
            timezone: guestProfile.timezone,
            adaptationScore: 0,
          });
      setCachedWeeklyPlan(data);
      void saveOfflineSnapshot(planSnapshotKey, data);
      return data;
    },
    enabled: !isRestoring,
  });

  const workoutsQuery = useQuery({
    queryKey: ['workouts', user?.id],
    queryFn: () => workoutApi.list(30),
    enabled: isAuthenticated && !isRestoring,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (updates: Partial<UserProfile>) => userApi.updateProfile(updates),
    onSuccess: (updatedUser) => {
      updateCachedUser(updatedUser);
      void queryClient.invalidateQueries({ queryKey: ['weeklyPlan'] });
    },
  });

  const completeWorkoutMutation = useMutation({
    mutationFn: (payload: CompletedWorkoutPayload) => workoutApi.complete(payload),
    onSuccess: (result) => {
      updateCachedUser(result.user);
      void queryClient.invalidateQueries({ queryKey: ['workouts'] });
      void queryClient.invalidateQueries({ queryKey: ['weeklyPlan'] });
      setActiveWorkoutRoutine(null);
    },
  });

  const handleOpenAuth = (mode: AuthModalMode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthModalOpen(false);
    if (initialAuthModalMode) {
      navigate('/', { replace: true });
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (isAuthenticated) {
      await updateProfileMutation.mutateAsync(updates);
    } else {
      const next = { ...guestProfile, ...updates };
      setGuestProfile(next);
      saveGuestOnboardingDraft({
        level: next.level,
        goal: next.goal,
        duration: next.duration,
        scheduledDays: next.scheduledDays,
        reminderTime: next.reminderTime,
        timezone: next.timezone,
        notificationsEnabled: next.notificationsEnabled,
        soundEnabled: next.soundEnabled,
        voiceCoachEnabled: next.voiceCoachEnabled,
      });
    }
  };

  const handleFinishWorkout = async (payload: CompletedWorkoutPayload) => {
    if (isAuthenticated) {
      if (isOffline) {
        await enqueuePendingWorkout(payload);
        setPendingWorkouts(await getPendingWorkouts());
        setActiveWorkoutRoutine(null);
        return;
      }
      try {
        await completeWorkoutMutation.mutateAsync(payload);
        return;
      } catch (err) {
        if (isLikelyNetworkOfflineError(err)) {
          await enqueuePendingWorkout(payload);
          setPendingWorkouts(await getPendingWorkouts());
          setActiveWorkoutRoutine(null);
          return;
        }
        throw err;
      }
    }

    // Guardar sesión de vista previa en localStorage para importarla automáticamente al crear cuenta/iniciar sesión
    try {
      const existingRaw = localStorage.getItem('calishome_workout_logs');
      const existing = existingRaw ? (JSON.parse(existingRaw) as unknown[]) : [];
      const newEntry = {
        id: 'preview_' + Date.now(),
        date: new Date().toISOString(),
        ...payload,
      };
      localStorage.setItem('calishome_workout_logs', JSON.stringify([newEntry, ...existing]));
    } catch {
      // Ignore storage error
    }
    setActiveWorkoutRoutine(null);
    handleOpenAuth('register');
  };

  const handleLogout = async () => {
    await logout();
    handleOpenAuth('login');
  };

  const handleInstallPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const resolvedWeeklyPlan = weeklyPlanQuery.data || cachedWeeklyPlan;
  const resolvedExercises = exercisesQuery.data || cachedExercises;
  const todayRoutine =
    resolvedWeeklyPlan?.today || buildFallbackTodayRoutine(effectiveProfile);
  const weeklyPlan = resolvedWeeklyPlan?.days || [];

  return (
    <div className="min-h-screen bg-[#07090d] ch-backdrop-grid text-zinc-100 flex flex-col font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#c8f135] focus:text-[#05070a] focus:font-black focus:text-xs"
      >
        {t.skipToContent}
      </a>

      {activeWorkoutRoutine ? (
        <Suspense fallback={<SuspenseFallback />}>
          <WorkoutPlayer
            routine={activeWorkoutRoutine}
            userProfile={effectiveProfile}
            isSaving={completeWorkoutMutation.isPending}
            onFinishWorkout={handleFinishWorkout}
            onExit={() => setActiveWorkoutRoutine(null)}
          />
        </Suspense>
      ) : (
        <>
          <Navbar
            user={user}
            onOpenAuth={() => handleOpenAuth('login')}
            onOpenSettings={() => setIsOnboardingOpen(true)}
            onLogout={handleLogout}
          />

          <main id="main-content" tabIndex={-1} className="flex-1">
            {isOffline && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                <div role="status" className="rounded-xl bg-amber-400/10 border border-amber-400/35 px-4 py-2.5 flex items-center space-x-2 text-xs text-amber-200">
                  <WifiOff className="w-4 h-4 shrink-0 text-amber-300" aria-hidden="true" />
                  <span>{t.offlineBanner}</span>
                </div>
              </div>
            )}

            {(pendingWorkouts.length > 0 || isSyncingQueue) && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
                <div role="status" className="rounded-xl bg-[#c8f135]/10 border border-[#c8f135]/35 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-[#d9fc5a]">
                  <div className="flex items-center space-x-2">
                    <CloudOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {isSyncingQueue
                        ? t.offlineSyncingNow
                        : `${pendingWorkouts.length} ${t.offlinePendingQueue}`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {installPrompt && !isOffline && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                <div className="rounded-xl bg-[#c8f135]/10 border border-[#c8f135]/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-zinc-200">
                  <span>{t.installPromptText}</span>
                  <button
                    type="button"
                    onClick={() => void handleInstallPwa()}
                    className="shrink-0 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] font-black"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.installBtn}</span>
                  </button>
                </div>
              </div>
            )}

            {weeklyPlanQuery.isError && !resolvedWeeklyPlan && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div role="alert" className="rounded-xl bg-rose-500/10 border border-rose-500/35 p-4 flex items-center justify-between text-xs text-rose-300">
                  <span>{t.serverError}</span>
                  <button
                    type="button"
                    onClick={() => void weeklyPlanQuery.refetch()}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-bold text-white"
                  >
                    {t.retryBtn}
                  </button>
                </div>
              </div>
            )}

            <Dashboard
              user={effectiveProfile}
              isAuthenticated={isAuthenticated}
              todayRoutine={todayRoutine}
              weeklyPlan={weeklyPlan}
              exercises={resolvedExercises}
              isExercisesLoading={exercisesQuery.isLoading && resolvedExercises.length === 0}
              workoutLogs={workoutsQuery.data || []}
              pendingWorkouts={pendingWorkouts}
              onStartWorkout={(routine) => setActiveWorkoutRoutine(routine)}
              onOpenSettings={() => setIsOnboardingOpen(true)}
              onOpenAuth={(mode) => handleOpenAuth(mode || 'login')}
              onUpdateProfile={handleUpdateProfile}
            />
          </main>

          <footer className="border-t border-white/10 py-6 text-xs text-zinc-400 bg-[#07090d]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p>{t.footerTagline}</p>
              <nav aria-label="Enlaces legales y de cuenta" className="flex flex-wrap items-center justify-center gap-4">
                <Link to="/plans" className="hover:text-white transition-colors">
                  {t.navPlans}
                </Link>
                <Link to="/account" className="hover:text-white transition-colors">
                  {t.footerAccount}
                </Link>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  {t.footerPrivacy}
                </Link>
                <Link to="/terms" className="hover:text-white transition-colors">
                  {t.footerTerms}
                </Link>
              </nav>
            </div>
          </footer>
        </>
      )}

      {authModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={authModalOpen}
            initialMode={authModalMode}
            onClose={handleCloseAuth}
            onAuthenticated={() => {
              setAuthModalOpen(false);
              if (initialAuthModalMode) {
                navigate('/', { replace: true });
              }
            }}
          />
        </Suspense>
      )}

      {isOnboardingOpen && (
        <Suspense fallback={null}>
          <OnboardingModal
            isOpen={isOnboardingOpen}
            initialProfile={effectiveProfile}
            onSave={handleUpdateProfile}
            onClose={() => setIsOnboardingOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/" element={<HomeWorkspace key="home" />} />
        <Route path="/login" element={<HomeWorkspace key="login" initialAuthModalMode="login" />} />
        <Route path="/register" element={<HomeWorkspace key="register" initialAuthModalMode="register" />} />
        <Route path="/forgot-password" element={<HomeWorkspace key="forgot" initialAuthModalMode="forgot" />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/billing/sandbox-checkout" element={<SandboxCheckoutPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<HomeWorkspace key="fallback" />} />
      </Routes>
    </Suspense>
  );
}

export default App;
