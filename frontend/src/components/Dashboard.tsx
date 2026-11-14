import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Calendar,
  Clock,
  Flame,
  Award,
  Bell,
  BellRing,
  Search,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Sliders,
  Dumbbell,
  Crown,
  Lock,
  CloudOff,
  BedDouble,
  CalendarCheck,
  GitBranch,
  Utensils,
  Eye,
  X,
} from 'lucide-react';
import type {
  DailyRoutine,
  DayOfWeek,
  Exercise,
  ExerciseCategory,
  Goal,
  UserProfile,
  WorkoutLog,
} from '../types';
import { DAYS_MAP } from '../utils/routineGenerator';
import { notificationApi, workoutApi } from '../services/api';
import { ApiError } from '../services/apiClient';
import type { PendingWorkoutRecord } from '../services/offlineSync';
import { useI18n } from '../i18n/useI18n';
import { ExerciseVisualizer } from './ExerciseVisualizer';
import { CoachingPrecisionPanel } from './CoachingPrecisionPanel';
import { ScheduleCalendarPanel } from './ScheduleCalendarPanel';
import { DevelopmentPlanPanel } from './DevelopmentPlanPanel';
import { NutritionTrackerPanel } from './NutritionTrackerPanel';
import {
  getExistingPushSubscription,
  isPushSupported,
  requestNotificationPermission,
  sendTestNotification,
  subscribeToWebPush,
  unsubscribeFromWebPush,
} from '../utils/notifications';

const GOAL_LABELS_ES: Record<Goal, string> = {
  fuerza_hipertrofia: 'Fuerza e Hipertrofia',
  resistencia_quemagrasa: 'Resistencia y Quema',
  movilidad_salud: 'Movilidad y Postura',
};

const GOAL_LABELS_EN: Record<Goal, string> = {
  fuerza_hipertrofia: 'Strength & Hypertrophy',
  resistencia_quemagrasa: 'Endurance & Conditioning',
  movilidad_salud: 'Mobility & Posture',
};

const ADAPTATION_STEPS = [-3, -2, -1, 0, 1, 2, 3];

interface DashboardProps {
  user: UserProfile;
  isAuthenticated: boolean;
  todayRoutine: DailyRoutine;
  weeklyPlan: DailyRoutine[];
  exercises: Exercise[];
  isExercisesLoading?: boolean;
  workoutLogs: WorkoutLog[];
  pendingWorkouts?: PendingWorkoutRecord[];
  onStartWorkout: (routine: DailyRoutine) => void;
  onOpenSettings: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  isAuthenticated,
  todayRoutine,
  weeklyPlan,
  exercises,
  isExercisesLoading = false,
  workoutLogs,
  pendingWorkouts = [],
  onStartWorkout,
  onOpenSettings,
  onOpenAuth,
  onUpdateProfile,
}) => {
  const { locale, t } = useI18n();
  const goalLabels = locale === 'en' ? GOAL_LABELS_EN : GOAL_LABELS_ES;
  const currentDay = todayRoutine.dayId;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    'training' | 'schedule' | 'roadmap' | 'nutrition'
  >('training');
  const [telemetryRefreshKey, setTelemetryRefreshKey] = useState(0);
  const [inspectedExercise, setInspectedExercise] = useState<{ id: string; title: string } | null>(
    null
  );

  useEffect(() => {
    if (!inspectedExercise) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspectedExercise(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectedExercise]);

  const queryClient = useQueryClient();
  const [notificationMsg, setNotificationMsg] = useState('');
  const [localPushSubscribed, setLocalPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const pushSupported = isPushSupported();

  const notificationStatusQuery = useQuery({
    queryKey: ['notificationStatus'],
    queryFn: () => notificationApi.getStatus(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const analyticsQuery = useQuery({
    queryKey: ['workoutAnalytics'],
    queryFn: () => workoutApi.getAnalytics(),
    enabled: isAuthenticated && user.planTier === 'PREMIUM',
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    let cancelled = false;
    void getExistingPushSubscription().then((sub) => {
      if (!cancelled) {
        setLocalPushSubscribed(Boolean(sub));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleToggleWebPush = async () => {
    setPushBusy(true);
    try {
      if (localPushSubscribed) {
        await unsubscribeFromWebPush();
        setLocalPushSubscribed(false);
        setNotificationMsg('Web Push desactivado en este dispositivo.');
      } else {
        await subscribeToWebPush();
        setLocalPushSubscribed(true);
        setNotificationMsg('Web Push activado en segundo plano.');
      }
      await queryClient.invalidateQueries({ queryKey: ['notificationStatus'] });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setNotificationMsg(err.detail);
      } else {
        setNotificationMsg(
          err instanceof Error ? err.message : 'No se pudo actualizar Web Push.'
        );
      }
    } finally {
      setPushBusy(false);
      setTimeout(() => setNotificationMsg(''), 4500);
    }
  };

  const handleTestNotification = async () => {
    if (isAuthenticated && localPushSubscribed) {
      try {
        const res = await notificationApi.sendTest();
        setNotificationMsg(res.message);
        await queryClient.invalidateQueries({ queryKey: ['notificationStatus'] });
        setTimeout(() => setNotificationMsg(''), 4500);
        return;
      } catch (err) {
        setNotificationMsg(
          err instanceof Error ? err.message : 'Falló el envío Push del servidor.'
        );
        setTimeout(() => setNotificationMsg(''), 4500);
        return;
      }
    }

    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      sendTestNotification();
      setNotificationMsg('Notificación local enviada al dispositivo.');
    } else {
      setNotificationMsg('Permiso denegado por el navegador.');
    }
    setTimeout(() => setNotificationMsg(''), 4000);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateProfile({ reminderTime: e.target.value });
  };

  const toggleDayScheduled = (dayId: DayOfWeek) => {
    let updated: DayOfWeek[];
    if (user.scheduledDays.includes(dayId)) {
      if (user.scheduledDays.length <= 1) return;
      updated = user.scheduledDays.filter((d) => d !== dayId);
    } else {
      updated = [...user.scheduledDays, dayId];
    }
    onUpdateProfile({ scheduledDays: updated });
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.targetMuscle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const analytics = analyticsQuery.data;
  const totalFeedbackSamples = analytics
    ? Math.max(1, analytics.tooEasyCount + analytics.justRightCount + analytics.tooHardCount)
    : 1;
  const effectiveRefreshSignal = telemetryRefreshKey + workoutLogs.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* GUEST EDITORIAL VALUE PROP BANNER */}
      {!isAuthenticated && (
        <section className="ch-panel rounded-2xl overflow-hidden border-t-2 border-t-[#c8f135]">
          <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-block text-[11px] font-black uppercase tracking-[0.14em] text-[#c8f135]">
                {t.guestKicker}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-[-0.03em] text-white leading-tight">
                {t.guestTitle}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {t.guestSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenSettings}
                className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-xs font-bold text-zinc-100 transition-colors"
              >
                {t.guestCustomize}
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="px-5 py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] text-xs font-black tracking-tight transition-colors"
              >
                {t.guestCreateAccount}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* NAVEGACIÓN DE WORKSPACE DE ALTO IMPACTO */}
      <nav
        aria-label="Módulos de entrenamiento, agenda, desarrollo y dieta"
        className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#0d1118] border border-white/10"
      >
        {[
          { id: 'training' as const, label: 'Entrenamiento & Codex', Icon: Dumbbell },
          { id: 'schedule' as const, label: 'Calendario & Faltas', Icon: CalendarCheck },
          { id: 'roadmap' as const, label: 'Plan & Habilidades', Icon: GitBranch },
          { id: 'nutrition' as const, label: 'Dieta & Macros', Icon: Utensils },
        ].map(({ id, label, Icon }) => {
          const active = activeWorkspaceTab === id;
          return (
            <button
              key={id}
              type="button"
              data-testid={`workspace-tab-${id}`}
              onClick={() => setActiveWorkspaceTab(id)}
              className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                active
                  ? 'bg-[#c8f135] text-[#05070a] shadow-[0_4px_18px_rgba(200,241,53,0.2)]'
                  : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* COACH CUANTITATIVO SIN MENSAJES PREPROGRAMADOS */}
      <CoachingPrecisionPanel
        isAuthenticated={isAuthenticated}
        refreshSignal={effectiveRefreshSignal}
        onNavigateTab={(tab) => setActiveWorkspaceTab(tab)}
        onRequireAuth={() => onOpenAuth('login')}
      />

      {activeWorkspaceTab === 'schedule' && (
        <ScheduleCalendarPanel
          isAuthenticated={isAuthenticated}
          onDataChanged={() => setTelemetryRefreshKey((k) => k + 1)}
          onRequireAuth={() => onOpenAuth('login')}
        />
      )}

      {activeWorkspaceTab === 'roadmap' && (
        <DevelopmentPlanPanel
          isAuthenticated={isAuthenticated}
          refreshSignal={effectiveRefreshSignal}
          onInspectExercise={(id, title) => setInspectedExercise({ id, title })}
          onRequireAuth={() => onOpenAuth('login')}
        />
      )}

      {activeWorkspaceTab === 'nutrition' && (
        <NutritionTrackerPanel
          isAuthenticated={isAuthenticated}
          onDataChanged={() => setTelemetryRefreshKey((k) => k + 1)}
          onRequireAuth={() => onOpenAuth('login')}
        />
      )}

      {activeWorkspaceTab === 'training' && (
        <>

      {/* 1. HERO HUD: SESIÓN DEL DÍA + CIRCUITO TÁCTICO */}
      <section
        aria-label={todayRoutine.title}
        className="ch-panel rounded-2xl p-6 sm:p-8 lg:p-10 relative overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Session Command */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/10 text-zinc-200 font-bold text-[11px] uppercase tracking-wider">
                {t.heroTodayTag} {todayRoutine.dayName}
              </span>

              {todayRoutine.isRestDay ? (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-400/30 text-sky-300 font-bold text-[11px] uppercase tracking-wider">
                  <BedDouble className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.heroRestBadge}</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#c8f135] text-[#05070a] font-black text-[11px] uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>{t.heroTrainBadge}</span>
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-[-0.035em] leading-[1.06]">
                {todayRoutine.title}
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
                {todayRoutine.focus}
              </p>
            </div>

            {/* Tactical Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 ch-tabular">
              <div className="ch-panel-elevated rounded-xl px-3.5 py-2.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">
                  Duración
                </span>
                <span className="text-sm font-black text-white flex items-center space-x-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#c8f135]" aria-hidden="true" />
                  <span>{todayRoutine.isRestDay ? '0 min' : `${todayRoutine.estimatedMinutes} min`}</span>
                </span>
              </div>

              <div className="ch-panel-elevated rounded-xl px-3.5 py-2.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">
                  Bloque
                </span>
                <span className="text-sm font-black text-white flex items-center space-x-1.5 mt-0.5">
                  <Dumbbell className="w-3.5 h-3.5 text-[#c8f135]" aria-hidden="true" />
                  <span>
                    {todayRoutine.isRestDay
                      ? 'Active Rest'
                      : `${todayRoutine.exercises.length} · ${t.heroZeroEquipment}`}
                  </span>
                </span>
              </div>

              <div className="ch-panel-elevated rounded-xl px-3.5 py-2.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">
                  {t.navLevel}
                </span>
                <span className="text-sm font-black text-white capitalize flex items-center space-x-1.5 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#c8f135]" aria-hidden="true" />
                  <span>{user.level}</span>
                </span>
              </div>

              <div className="ch-panel-elevated rounded-xl px-3.5 py-2.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">
                  Enfoque
                </span>
                <span className="text-xs font-extrabold text-[#c8f135] block mt-1 truncate">
                  {goalLabels[user.goal]}
                </span>
              </div>
            </div>

            {/* Primary CTA */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {!todayRoutine.isRestDay ? (
                <button
                  type="button"
                  onClick={() => onStartWorkout(todayRoutine)}
                  className="inline-flex items-center justify-center space-x-2.5 bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] font-black py-4 px-7 rounded-xl text-sm sm:text-base tracking-tight transition-all shadow-[0_8px_30px_rgba(200,241,53,0.18)] active:scale-[0.99]"
                >
                  <Play className="w-5 h-5 fill-current" aria-hidden="true" />
                  <span>{t.heroStartWorkout}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const expressRoutine = {
                      ...todayRoutine,
                      isRestDay: false,
                      title: 'Sesión Libre Opcional',
                      estimatedMinutes: 20,
                      exercises: weeklyPlan.find((p) => !p.isRestDay)?.exercises || [],
                    };
                    onStartWorkout(expressRoutine);
                  }}
                  className="inline-flex items-center justify-center space-x-2 bg-white/[0.06] hover:bg-[#c8f135] hover:text-[#05070a] text-[#c8f135] border border-[#c8f135]/40 font-black py-3.5 px-6 rounded-xl text-sm transition-colors"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>{t.heroTrainAnyway}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center justify-center space-x-2 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-200 font-bold py-4 px-5 rounded-xl text-sm transition-colors"
              >
                <Sliders className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                <span>{t.heroAdjustPlan}</span>
              </button>
            </div>
          </div>

          {/* Right: Session Blueprint */}
          <div className="lg:col-span-5 bg-[#090c11] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h2 className="font-black text-white text-xs uppercase tracking-[0.12em]">
                {t.heroCircuitTitle}
              </h2>
              <span className="text-xs text-[#c8f135] font-mono ch-tabular">
                {todayRoutine.exercises.length} {t.heroMovesUnit}
              </span>
            </div>

            {todayRoutine.exercises.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs space-y-1.5">
                <p className="font-semibold text-zinc-200">{t.heroRestDesc1}</p>
                <p className="text-zinc-500">{t.heroRestDesc2}</p>
              </div>
            ) : (
              <ol className="divide-y divide-white/[0.06] max-h-[300px] overflow-y-auto">
                {todayRoutine.exercises.map((item, idx) => (
                  <li
                    key={item.exercise.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors text-xs"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="font-mono text-[11px] font-black text-zinc-500 w-6 shrink-0 ch-tabular">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">{item.exercise.name}</span>
                        <span className="text-zinc-400 text-[11px] block truncate">{item.exercise.targetMuscle}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3 ch-tabular flex items-center gap-2.5">
                      <div>
                        <span className="font-black text-[#c8f135] font-mono">
                          {item.sets}×{item.repsOrSeconds} {item.exercise.type === 'reps' ? 'reps' : 's'}
                        </span>
                        <span className="block text-[10px] text-zinc-500">{item.exercise.equipment}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setInspectedExercise({ id: item.exercise.id, title: item.exercise.name })
                        }
                        aria-label={`Ver animación técnica de ${item.exercise.name}`}
                        className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-[#c8f135]/20 text-zinc-300 hover:text-[#c8f135] transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* 2. BENTO TELEMETRY: ALERTAS + SOBRECARGA ADAPTATIVA */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reminders & Web Push */}
        <div className="ch-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#c8f135]/10 text-[#c8f135] border border-[#c8f135]/30 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base tracking-tight">{t.remindersTitle}</h2>
                <p className="text-xs text-zinc-400">{t.remindersSub}</p>
              </div>
            </div>

            <div className="ch-panel-elevated rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
              <div>
                <label htmlFor="reminder-time-input" className="text-xs text-zinc-200 font-bold block">
                  {t.remindersTimeLabel}
                </label>
                <span className="text-[11px] text-zinc-400">{t.remindersTimeSub}</span>
              </div>
              <input
                id="reminder-time-input"
                type="time"
                value={user.reminderTime}
                onChange={handleTimeChange}
                className="bg-[#07090d] border border-white/15 focus:border-[#c8f135] text-white font-mono font-bold px-3 py-1.5 rounded-lg text-sm outline-none ch-tabular"
              />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider block mb-2">
                {t.remindersDaysLabel}
              </span>
              <div className="grid grid-cols-7 gap-1.5" role="group" aria-label={t.remindersDaysLabel}>
                {DAYS_MAP.map((d) => {
                  const active = user.scheduledDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={active}
                      aria-label={d.name}
                      onClick={() => toggleDayScheduled(d.id)}
                      className={`py-2 rounded-lg text-center font-black text-xs transition-colors border ${
                        active
                          ? 'bg-[#c8f135] text-[#05070a] border-[#c8f135]'
                          : 'bg-white/[0.03] text-zinc-400 border-white/10 hover:text-white hover:bg-white/[0.07]'
                      }`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 space-y-3">
            {isAuthenticated ? (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#090c11] border border-white/10 rounded-xl px-3.5 py-2.5">
                <div className="text-xs">
                  <span className="font-bold text-zinc-200 block">
                    {t.pushBgTitle}{' '}
                    {notificationStatusQuery.data?.activeDevicesCount
                      ? `(${notificationStatusQuery.data.activeDevicesCount})`
                      : ''}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {!pushSupported
                      ? t.pushUnsupported
                      : localPushSubscribed
                      ? t.pushActiveSub
                      : t.pushInactiveSub}
                  </span>
                </div>
                {pushSupported && (
                  <button
                    type="button"
                    disabled={pushBusy}
                    aria-pressed={localPushSubscribed}
                    onClick={() => void handleToggleWebPush()}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors flex items-center space-x-1.5 ${
                      localPushSubscribed
                        ? 'bg-white/[0.08] text-zinc-200 border border-white/15 hover:bg-white/[0.15]'
                        : 'bg-[#c8f135] text-[#05070a] hover:bg-[#d9fc5a]'
                    } disabled:opacity-50`}
                  >
                    <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {pushBusy
                        ? t.pushProcessing
                        : localPushSubscribed
                        ? t.pushDisable
                        : t.pushEnable}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400">{t.pushGuestHint}</p>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => void handleTestNotification()}
                className="text-xs font-bold text-[#c8f135] hover:underline flex items-center space-x-1.5"
              >
                <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {isAuthenticated && localPushSubscribed ? t.pushSendTest : t.pushTestLocal}
                </span>
              </button>
              <div role="status" aria-live="polite" className="text-xs font-semibold text-zinc-200 text-right">
                {notificationMsg}
              </div>
            </div>
          </div>
        </div>

        {/* Adaptive Progressive Overload Segmented Gauge */}
        <div className="ch-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base tracking-tight">{t.overloadTitle}</h2>
                <p className="text-xs text-zinc-400">{t.overloadSub}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-5">{t.overloadDesc}</p>

            <div className="ch-panel-elevated rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs ch-tabular">
                <span className="text-zinc-400 font-semibold">{t.overloadCurrent}:</span>
                <span className="font-black text-[#c8f135]">
                  {user.adaptationScore > 0
                    ? `+${user.adaptationScore * 10}%`
                    : user.adaptationScore < 0
                    ? `${user.adaptationScore * 10}%`
                    : t.overloadOptimal}
                </span>
              </div>

              {/* 7-step discrete meter */}
              <div
                className="grid grid-cols-7 gap-1.5"
                role="meter"
                aria-label={t.overloadTitle}
                aria-valuemin={-3}
                aria-valuemax={3}
                aria-valuenow={user.adaptationScore}
              >
                {ADAPTATION_STEPS.map((level) => {
                  const isCurrent = level === user.adaptationScore;
                  const isActive = level <= user.adaptationScore;
                  return (
                    <div key={level} className="space-y-1 text-center">
                      <div
                        className={`h-3 rounded-sm transition-colors border ${
                          isCurrent
                            ? 'bg-[#c8f135] border-[#c8f135] shadow-[0_0_12px_rgba(200,241,53,0.35)]'
                            : isActive
                            ? 'bg-[#c8f135]/40 border-[#c8f135]/30'
                            : 'bg-[#07090d] border-white/10'
                        }`}
                      />
                      <span
                        className={`block text-[10px] font-mono ch-tabular ${
                          isCurrent ? 'text-[#c8f135] font-black' : 'text-zinc-500'
                        }`}
                      >
                        {level > 0 ? `+${level}` : level}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-[10px] text-zinc-500 font-semibold uppercase tracking-wider pt-1">
                <span>{t.overloadSofter}</span>
                <span>{t.overloadBase}</span>
                <span>{t.overloadHarder}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400 ch-tabular">
            <span>
              {t.overloadLogged} <strong className="text-white">{workoutLogs.length}</strong>
            </span>
            <span className="text-[#c8f135] font-bold uppercase tracking-wider text-[11px]">
              {t.overloadBadge}
            </span>
          </div>
        </div>
      </section>

      {/* 3. TELEMETRÍA Y ANALÍTICAS PRO */}
      <section className="ch-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-white flex items-center space-x-2 tracking-tight">
              <Crown className="w-5 h-5 text-amber-300" aria-hidden="true" />
              <span>{t.analyticsTitle}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">{t.analyticsSub}</p>
          </div>
          <Link
            to="/plans"
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-[#c8f135] hover:text-[#05070a] border border-white/15 text-xs font-extrabold text-zinc-100 transition-colors shrink-0"
          >
            <Crown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{user.planTier === 'PREMIUM' ? t.analyticsManage : t.analyticsUpgrade}</span>
          </Link>
        </div>

        {isAuthenticated && user.planTier === 'PREMIUM' ? (
          analytics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 ch-tabular">
                <div className="ch-panel-elevated rounded-xl p-4">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">
                    {t.analyticsVolume}
                  </span>
                  <p className="text-3xl font-black text-white mt-1">
                    {analytics.totalMinutes}{' '}
                    <span className="text-xs font-bold text-[#c8f135]">min</span>
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {analytics.totalWorkouts} {t.analyticsSessionsUnit}
                  </p>
                </div>

                <div className="ch-panel-elevated rounded-xl p-4">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">
                    {t.analyticsRecent}
                  </span>
                  <p className="text-3xl font-black text-[#c8f135] mt-1">
                    {analytics.workoutsLast7Days}{' '}
                    <span className="text-base text-zinc-500 font-bold">
                      / {analytics.workoutsLast30Days}
                    </span>
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{t.analyticsWeeklySub}</p>
                </div>

                <div className="ch-panel-elevated rounded-xl p-4">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">
                    {t.analyticsStreakAdapt}
                  </span>
                  <p className="text-3xl font-black text-amber-300 mt-1">
                    {analytics.currentStreak}d{' '}
                    <span className="text-base text-zinc-400 font-bold">
                      · {analytics.adaptationScore >= 0 ? `+${analytics.adaptationScore}` : analytics.adaptationScore}
                    </span>
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{t.analyticsOverloadSub}</p>
                </div>
              </div>

              {/* Effort breakdown bar */}
              <div className="ch-panel-elevated rounded-xl p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-zinc-200">{t.analyticsFeedbackTitle}</span>
                  <div className="flex items-center gap-4 font-mono text-[11px] ch-tabular">
                    <span className="text-[#c8f135]">● {t.analyticsTooEasy}: {analytics.tooEasyCount}</span>
                    <span className="text-sky-300">◆ {t.analyticsJustRight}: {analytics.justRightCount}</span>
                    <span className="text-amber-300">▲ {t.analyticsTooHard}: {analytics.tooHardCount}</span>
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full overflow-hidden bg-[#07090d] flex">
                  <div
                    className="bg-[#c8f135] transition-all"
                    style={{ width: `${(analytics.tooEasyCount / totalFeedbackSamples) * 100}%` }}
                  />
                  <div
                    className="bg-sky-400 transition-all"
                    style={{ width: `${(analytics.justRightCount / totalFeedbackSamples) * 100}%` }}
                  />
                  <div
                    className="bg-amber-400 transition-all"
                    style={{ width: `${(analytics.tooHardCount / totalFeedbackSamples) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">{t.analyticsLoading}</p>
          )
        ) : (
          <div className="rounded-xl bg-[#090c11] border border-white/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-white">{t.analyticsLockedTitle}</p>
                <p className="text-zinc-400">{t.analyticsLockedDesc}</p>
              </div>
            </div>
            <Link
              to="/plans"
              className="shrink-0 px-4 py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] text-xs font-black transition-colors text-center"
            >
              {t.analyticsUnlockBtn}
            </Link>
          </div>
        )}
      </section>

      {/* 4. ESTRUCTURA SEMANAL */}
      <section className="ch-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-black text-white flex items-center space-x-2 tracking-tight">
              <Calendar className="w-5 h-5 text-[#c8f135]" aria-hidden="true" />
              <span>{t.weeklyTitle}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">{t.weeklySub}</p>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <span className="inline-flex items-center space-x-1.5 text-zinc-200 font-semibold">
              <Flame className="w-3.5 h-3.5 text-[#c8f135]" aria-hidden="true" />
              <span>{t.weeklyWorkLegend}</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 text-zinc-400 font-semibold">
              <BedDouble className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
              <span>{t.weeklyRestLegend}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {weeklyPlan.map((dayRoutine) => {
            const isToday = dayRoutine.dayId === currentDay;
            return (
              <div
                key={dayRoutine.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isToday
                    ? 'bg-[#c8f135]/[0.08] border-[#c8f135] shadow-[0_0_24px_rgba(200,241,53,0.08)]'
                    : 'bg-[#090c11] border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-white text-sm tracking-tight">{dayRoutine.dayName}</span>
                    {isToday && (
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-[#c8f135] text-[#05070a]">
                        {t.weeklyToday}
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider mb-2 px-2 py-0.5 rounded ${
                      dayRoutine.isRestDay
                        ? 'bg-white/[0.05] text-zinc-400'
                        : 'bg-[#c8f135]/15 text-[#c8f135] border border-[#c8f135]/30'
                    }`}
                  >
                    {dayRoutine.isRestDay ? (
                      <BedDouble className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <Flame className="w-3 h-3" aria-hidden="true" />
                    )}
                    <span>{dayRoutine.isRestDay ? t.weeklyRest : t.weeklyTrain}</span>
                  </span>

                  <h3 className="font-semibold text-xs text-zinc-200 line-clamp-2 leading-snug">
                    {dayRoutine.title}
                  </h3>
                </div>

                {!dayRoutine.isRestDay && (
                  <button
                    type="button"
                    onClick={() => onStartWorkout(dayRoutine)}
                    className="mt-4 w-full flex items-center justify-center space-x-1.5 bg-white/[0.06] hover:bg-[#c8f135] hover:text-[#05070a] text-zinc-100 font-black py-2 px-3 rounded-lg text-xs transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                    <span>{t.weeklyTrainCta}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. CÓDICE DE EJERCICIOS CERO MATERIAL */}
      <section className="ch-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-white flex items-center space-x-2 tracking-tight">
              <Dumbbell className="w-5 h-5 text-[#c8f135]" aria-hidden="true" />
              <span>{t.libraryTitle}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">{t.librarySub}</p>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" aria-hidden="true" />
            <input
              type="search"
              aria-label={t.librarySearchPlaceholder}
              placeholder={t.librarySearchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#090c11] border border-white/15 focus:border-[#c8f135] text-white pl-9 pr-3 py-2 rounded-xl text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6" role="group" aria-label="Categorías de ejercicios">
          {[
            { id: 'all', label: t.libraryCatAll },
            { id: 'push', label: t.libraryCatPush },
            { id: 'pull', label: t.libraryCatPull },
            { id: 'legs', label: t.libraryCatLegs },
            { id: 'core', label: t.libraryCatCore },
          ].map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedCategory(cat.id as ExerciseCategory | 'all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors border ${
                  active
                    ? 'bg-[#c8f135] text-[#05070a] border-[#c8f135]'
                    : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:bg-white/[0.09]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {isExercisesLoading ? (
          <div className="py-10 text-center text-xs text-zinc-400">{t.libraryLoading}</div>
        ) : filteredExercises.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-400 border border-dashed border-white/10 rounded-xl">
            {t.libraryEmpty}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((exercise) => (
              <article
                key={exercise.id}
                className="bg-[#090c11] border border-white/10 rounded-xl p-4 hover:border-white/25 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-white text-sm">{exercise.name}</h3>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-white/[0.06] text-[#c8f135] border border-white/10 shrink-0">
                      {exercise.difficulty}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 mb-3">
                    <strong className="text-zinc-200">{t.libraryMuscle}</strong> {exercise.targetMuscle}
                  </p>

                  <div className="flex items-center space-x-2 text-[11px] text-zinc-400 ch-tabular">
                    <span className="bg-white/[0.05] px-2 py-0.5 rounded text-zinc-300">
                      {exercise.equipment}
                    </span>
                    <span>
                      {exercise.defaultAmount} {exercise.type === 'reps' ? 'reps' : 'seg'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    data-testid={`open-technique-${exercise.id}`}
                    onClick={() =>
                      setInspectedExercise({ id: exercise.id, title: exercise.name })
                    }
                    className="w-full inline-flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-[#c8f135]/15 border border-white/10 hover:border-[#c8f135]/40 text-xs font-bold text-zinc-200 hover:text-[#c8f135] transition-colors cursor-pointer"
                  >
                    <span>{t.libraryShowTech}</span>
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 6. HISTORIAL + COLA OFFLINE */}
      {(workoutLogs.length > 0 || pendingWorkouts.length > 0) && (
        <section className="ch-panel rounded-2xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-black text-white flex items-center space-x-2 tracking-tight">
              <Award className="w-5 h-5 text-[#c8f135]" aria-hidden="true" />
              <span>{t.historyTitle}</span>
            </h2>
            {user.planTier !== 'PREMIUM' && workoutLogs.length >= 5 && (
              <Link
                to="/plans"
                className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2"
              >
                {t.historyFreeCapLink}
              </Link>
            )}
          </div>

          <div className="space-y-2">
            {pendingWorkouts.map((pending) => (
              <div
                key={pending.clientId}
                className="flex items-center justify-between p-3.5 rounded-xl bg-amber-400/[0.07] border border-amber-400/30 text-xs"
              >
                <div className="flex items-center space-x-3">
                  <CloudOff className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-bold text-white block">{pending.routineTitle}</span>
                    <span className="text-amber-200/80 text-[11px]">
                      {new Date(pending.queuedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-amber-400/20 text-amber-200 font-bold text-[10px] uppercase">
                  {t.historyPendingBadge}
                </span>
              </div>
            ))}

            {workoutLogs.map((log) => {
              const dateStr = new Date(log.date).toLocaleDateString(
                locale === 'en' ? 'en-US' : 'es-CO',
                {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );
              const mins = Math.floor(log.durationSeconds / 60);
              const secs = log.durationSeconds % 60;
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#090c11] border border-white/10 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-4 h-4 text-[#c8f135] shrink-0" aria-hidden="true" />
                    <div>
                      <span className="font-bold text-white block">{log.routineTitle}</span>
                      <span className="text-zinc-400 text-[11px]">{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 ch-tabular">
                    <span className="font-mono text-zinc-300">
                      {mins}m {secs}s
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-zinc-200 uppercase font-bold text-[10px]">
                      {log.feedback === 'too_easy'
                        ? `● ${t.analyticsTooEasy}`
                        : log.feedback === 'too_hard'
                        ? `▲ ${t.analyticsTooHard}`
                        : `◆ ${t.analyticsJustRight}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
        </>
      )}

      {/* VENTANA MODAL DE TÉCNICA ANATÓMICA + DESCRIPCIÓN COMPLETA */}
      {inspectedExercise && (() => {
        const details = exercises.find((ex) => ex.id === inspectedExercise.id);
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Técnica y ejecución de ${details?.name ?? inspectedExercise.title}`}
            data-testid="technique-modal"
            onClick={() => setInspectedExercise(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="ch-panel-elevated rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 my-auto border border-white/15 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      Atlas Anatómico & Técnica
                    </span>
                    {details && (
                      <>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-white/[0.06] text-[#c8f135] border border-white/10">
                          {details.difficulty}
                        </span>
                        <span className="text-[11px] text-zinc-400 ch-tabular">
                          {details.equipment} · {details.defaultAmount}{' '}
                          {details.type === 'reps' ? 'reps' : 'seg'}
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white">
                    {details?.name ?? inspectedExercise.title}
                  </h3>
                  {details && (
                    <p className="text-xs text-zinc-300">
                      <strong className="text-white">{t.libraryMuscle}</strong> {details.targetMuscle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedExercise(null)}
                  aria-label="Cerrar ventana de técnica"
                  className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <ExerciseVisualizer
                exerciseId={inspectedExercise.id}
                exerciseTitle={details?.name ?? inspectedExercise.title}
              />

              {details && (
                <div className="rounded-xl bg-[#090c11] border border-white/10 p-4 space-y-3 text-xs sm:text-sm text-zinc-200">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                    Ejecución Paso a Paso
                  </h4>
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                    {details.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  <div className="p-3 rounded-lg bg-[#c8f135]/10 border border-[#c8f135]/25 text-[#d9fc5a] text-xs">
                    <span className="font-black">{t.libraryTip} </span>
                    {details.tips}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
