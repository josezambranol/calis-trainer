import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, WifiOff } from 'lucide-react';
import type { DailyRoutine, UserProfile } from './types';
import { useAuth } from './context/useAuth';
import { exerciseApi, routineApi, userApi, workoutApi } from './services/api';
import {
  DEFAULT_PROFILE,
  loadGuestOnboardingDraft,
  saveGuestOnboardingDraft,
} from './services/storage';
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

  const effectiveProfile = useMemo(() => user || guestProfile, [user, guestProfile]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
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
  }, []);

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
    queryFn: () => exerciseApi.list(),
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
    queryFn: () =>
      isAuthenticated
        ? routineApi.getWeekly()
        : routineApi.preview({
            level: guestProfile.level,
            goal: guestProfile.goal,
            durationMinutes: guestProfile.duration,
            scheduledDays: guestProfile.scheduledDays,
            timezone: guestProfile.timezone,
            adaptationScore: 0,
          }),
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
      await completeWorkoutMutation.mutateAsync(payload);
      return;
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

  const todayRoutine =
    weeklyPlanQuery.data?.today || buildFallbackTodayRoutine(effectiveProfile);
  const weeklyPlan = weeklyPlanQuery.data?.days || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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

          <main className="flex-1">
            {isOffline && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 flex items-center space-x-2 text-xs text-amber-200">
                  <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Modo sin conexión: puedes consultar el catálogo cacheado; al recuperar conexión sincronizaremos tus cambios.
                  </span>
                </div>
              </div>
            )}

            {installPrompt && !isOffline && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-emerald-200">
                  <span>Instala CalisHome en tu dispositivo para acceso instantáneo y mejor entrega de recordatorios.</span>
                  <button
                    type="button"
                    onClick={() => void handleInstallPwa()}
                    className="shrink-0 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Instalar App</span>
                  </button>
                </div>
              </div>
            )}

            {weeklyPlanQuery.isError && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 flex items-center justify-between text-xs text-rose-300">
                  <span>No pudimos conectar con el servidor de CalisHome para generar tu plan.</span>
                  <button
                    onClick={() => void weeklyPlanQuery.refetch()}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-bold text-white"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            <Dashboard
              user={effectiveProfile}
              isAuthenticated={isAuthenticated}
              todayRoutine={todayRoutine}
              weeklyPlan={weeklyPlan}
              exercises={exercisesQuery.data || []}
              isExercisesLoading={exercisesQuery.isLoading}
              workoutLogs={workoutsQuery.data || []}
              onStartWorkout={(routine) => setActiveWorkoutRoutine(routine)}
              onOpenSettings={() => setIsOnboardingOpen(true)}
              onOpenAuth={(mode) => handleOpenAuth(mode || 'login')}
              onUpdateProfile={handleUpdateProfile}
            />
          </main>

          <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 bg-slate-950">
            <p>
              <strong>CalisHome</strong> — Diseñado para entrenar en casa con cero equipamiento y constancia garantizada.
            </p>
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
        <Route path="*" element={<HomeWorkspace key="fallback" />} />
      </Routes>
    </Suspense>
  );
}

export default App;
