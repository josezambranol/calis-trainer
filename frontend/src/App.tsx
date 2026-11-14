import { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DailyRoutine, UserProfile } from './types';
import { useAuth } from './context/useAuth';
import { exerciseApi, routineApi, userApi, workoutApi } from './services/api';
import {
  DEFAULT_PROFILE,
  loadGuestOnboardingDraft,
  saveGuestOnboardingDraft,
} from './services/storage';
import { reminderWatcher } from './utils/notifications';
import { getCurrentDayOfWeek } from './utils/routineGenerator';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { WorkoutPlayer, type CompletedWorkoutPayload } from './components/WorkoutPlayer';
import { AuthModal, type AuthModalMode } from './components/AuthModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ResetPasswordPage, VerifyEmailPage } from './pages/AuthActionPages';

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

  const effectiveProfile = useMemo(() => user || guestProfile, [user, guestProfile]);

  useEffect(() => {
    if (user) {
      reminderWatcher.start(
        user.scheduledDays,
        user.reminderTime,
        user.notificationsEnabled
      );
    } else {
      reminderWatcher.stop();
    }
    return () => reminderWatcher.stop();
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

  const todayRoutine =
    weeklyPlanQuery.data?.today || buildFallbackTodayRoutine(effectiveProfile);
  const weeklyPlan = weeklyPlanQuery.data?.days || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {activeWorkoutRoutine ? (
        <WorkoutPlayer
          routine={activeWorkoutRoutine}
          userProfile={effectiveProfile}
          isSaving={completeWorkoutMutation.isPending}
          onFinishWorkout={handleFinishWorkout}
          onExit={() => setActiveWorkoutRoutine(null)}
        />
      ) : (
        <>
          <Navbar
            user={user}
            onOpenAuth={() => handleOpenAuth('login')}
            onOpenSettings={() => setIsOnboardingOpen(true)}
            onLogout={handleLogout}
          />

          <main className="flex-1">
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
      )}

      {isOnboardingOpen && (
        <OnboardingModal
          isOpen={isOnboardingOpen}
          initialProfile={effectiveProfile}
          onSave={handleUpdateProfile}
          onClose={() => setIsOnboardingOpen(false)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeWorkspace key="home" />} />
      <Route path="/login" element={<HomeWorkspace key="login" initialAuthModalMode="login" />} />
      <Route path="/register" element={<HomeWorkspace key="register" initialAuthModalMode="register" />} />
      <Route path="/forgot-password" element={<HomeWorkspace key="forgot" initialAuthModalMode="forgot" />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<HomeWorkspace key="fallback" />} />
    </Routes>
  );
}

export default App;
