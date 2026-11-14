import React, { useState } from 'react';
import {
  Play,
  Calendar,
  Clock,
  Flame,
  Award,
  Bell,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Sliders,
  Dumbbell
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
import { sendTestNotification, requestNotificationPermission } from '../utils/notifications';

const GOAL_LABELS: Record<Goal, string> = {
  fuerza_hipertrofia: 'Fuerza e Hipertrofia',
  resistencia_quemagrasa: 'Resistencia y Quema',
  movilidad_salud: 'Movilidad y Postura',
};

interface DashboardProps {
  user: UserProfile;
  isAuthenticated: boolean;
  todayRoutine: DailyRoutine;
  weeklyPlan: DailyRoutine[];
  exercises: Exercise[];
  isExercisesLoading?: boolean;
  workoutLogs: WorkoutLog[];
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
  onStartWorkout,
  onOpenSettings,
  onOpenAuth,
  onUpdateProfile,
}) => {
  const currentDay = todayRoutine.dayId;

  // Exercise library state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  // Notification testing state
  const [notificationMsg, setNotificationMsg] = useState('');

  const handleTestNotification = async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      sendTestNotification();
      setNotificationMsg('✅ ¡Notificación enviada a tu dispositivo!');
    } else {
      setNotificationMsg('⚠️ Permiso denegado por el navegador.');
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

  // Filter exercises
  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.targetMuscle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {!isAuthenticated && (
        <section className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              Diagnóstico previo al registro
            </span>
            <p className="text-xs sm:text-sm text-slate-200">
              Personaliza tu plan y pruébalo al instante. Crea tu cuenta gratis para guardar tu racha, adaptación progresiva e historial en la nube.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenSettings}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500/50 text-xs font-semibold text-slate-200 transition-colors"
            >
              Personalizar Plan
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-colors shadow-lg shadow-emerald-500/20"
            >
              Crear Cuenta Gratis
            </button>
          </div>
        </section>
      )}
      {/* 1. HERO CARD: ENTRENAMIENTO DE HOY */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-6 sm:p-10 shadow-2xl">
        {/* Glow orb */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                Hoy es {todayRoutine.dayName}
              </span>

              {todayRoutine.isRestDay ? (
                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-bold text-xs">
                  Día de Descanso Programado
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center space-x-1">
                  <Flame className="w-3.5 h-3.5 fill-slate-950" />
                  <span>DÍA DE ENTRENO</span>
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {todayRoutine.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl">
              {todayRoutine.focus}
            </p>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center space-x-2 text-slate-300 text-xs sm:text-sm bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{todayRoutine.isRestDay ? '0 min' : `${todayRoutine.estimatedMinutes} minutos`}</span>
              </div>

              <div className="flex items-center space-x-2 text-slate-300 text-xs sm:text-sm bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <span>{todayRoutine.isRestDay ? 'Descanso activo' : `${todayRoutine.exercises.length} ejercicios (100% sin equipo)`}</span>
              </div>

              <div className="flex items-center space-x-2 text-slate-300 text-xs sm:text-sm bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="capitalize">Nivel {user.level}</span>
              </div>

              <div className="flex items-center space-x-2 text-emerald-300 text-xs sm:text-sm bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/30">
                <span>{GOAL_LABELS[user.goal]}</span>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {!todayRoutine.isRestDay ? (
                <button
                  onClick={() => onStartWorkout(todayRoutine)}
                  className="flex items-center justify-center space-x-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-4 px-8 rounded-2xl text-base transition-all shadow-xl shadow-emerald-500/25 active:scale-95"
                >
                  <Play className="w-5 h-5 fill-slate-950" />
                  <span>¡Iniciar Entrenamiento Guiado!</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Generar rutina express para hoy si el usuario decide entrenar en día libre
                    const expressRoutine = {
                      ...todayRoutine,
                      isRestDay: false,
                      title: 'Sesión Libre Opcional',
                      estimatedMinutes: 20,
                      exercises: weeklyPlan.find((p) => !p.isRestDay)?.exercises || [],
                    };
                    onStartWorkout(expressRoutine);
                  }}
                  className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold py-3.5 px-6 rounded-2xl text-sm transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>¿Quieres entrenar hoy de todos modos? Entrena Libre</span>
                </button>
              )}

              <button
                onClick={onOpenSettings}
                className="flex items-center justify-center space-x-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold py-3.5 px-5 rounded-2xl text-sm transition-colors"
              >
                <Sliders className="w-4 h-4" />
                <span>Ajustar Plan</span>
              </button>
            </div>
          </div>

          {/* Right Preview: Exercises for today */}
          <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Circuito de Hoy</span>
              <span className="text-xs text-emerald-400 font-mono">
                {todayRoutine.exercises.length} movimientos
              </span>
            </h3>

            {todayRoutine.exercises.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <p>Hoy tus fibras musculares se regeneran y crecen.</p>
                <p className="mt-1 text-slate-500">Mantente hidratado y descansa bien.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {todayRoutine.exercises.map((item, idx) => (
                  <div
                    key={item.exercise.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-400 font-black flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-white block">{item.exercise.name}</span>
                        <span className="text-slate-400 text-[11px]">{item.exercise.targetMuscle}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-400 font-mono">
                        {item.sets} x {item.repsOrSeconds} {item.exercise.type === 'reps' ? 'reps' : 'seg'}
                      </span>
                      <span className="block text-[10px] text-slate-500">{item.exercise.equipment}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. RECORDATORIOS Y NOTIFICACIONES + ADAPTACIÓN INTELIGENTE */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Notificaciones & Horario */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Recordatorios de Notificación</h3>
                  <p className="text-xs text-slate-400">Te avisa en tu navegador o móvil a la hora exacta</p>
                </div>
              </div>
            </div>

            {/* Time Selector */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-300 font-semibold block">Hora fijada del recordatorio</span>
                <span className="text-xs text-slate-500">Recibirás la alerta los días de entrenamiento</span>
              </div>
              <input
                type="time"
                value={user.reminderTime}
                onChange={handleTimeChange}
                className="bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-sm outline-none"
              />
            </div>

            {/* Quick Days Selector */}
            <div>
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider block mb-2">
                Días de Alerta Activos
              </span>
              <div className="grid grid-cols-7 gap-1">
                {DAYS_MAP.map((d) => {
                  const active = user.scheduledDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => toggleDayScheduled(d.id)}
                      className={`py-2 rounded-lg text-center font-bold text-xs transition-colors ${
                        active
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={handleTestNotification}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1.5"
            >
              <Bell className="w-4 h-4" />
              <span>🔔 Probar Notificación Ahora</span>
            </button>
            {notificationMsg && (
              <span className="text-xs font-semibold text-emerald-400">{notificationMsg}</span>
            )}
          </div>
        </div>

        {/* Card: Sobrecarga Progresiva Adaptativa */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/30">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Sobrecarga Progresiva Inteligente</h3>
                <p className="text-xs text-slate-400">Adaptación automática según tu feedback post-entreno</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Al no usar pesas, la dificultad se ajusta aumentando repeticiones, tiempos bajo tensión, descansos más cortos o variantes más desafiantes (como flexiones diamante o pike).
            </p>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Factor de Adaptación Actual:</span>
                <span className="font-bold text-emerald-400">
                  {user.adaptationScore > 0 ? `+${user.adaptationScore * 10}% Intensidad` : user.adaptationScore < 0 ? `${user.adaptationScore * 10}% Intensidad` : 'Calibración Óptima'}
                </span>
              </div>

              {/* Progress visual */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-300 ${
                    user.adaptationScore >= 0 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, ((user.adaptationScore + 3) / 6) * 100))}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>Más Suave (-3)</span>
                <span>Base (0)</span>
                <span>Máxima Dificultad (+3)</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Sesiones registradas: <strong className="text-white">{workoutLogs.length}</strong></span>
            <span className="text-emerald-400 font-semibold">100% Cero Equipo</span>
          </div>
        </div>
      </section>

      {/* 3. PLAN SEMANAL COMPLETO */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>Tu Semana de Calistenia</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Haz clic en cualquier día para ver la rutina o entrenarla
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300 mr-2">Entreno</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700" />
            <span className="text-slate-400">Descanso</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {weeklyPlan.map((dayRoutine) => {
            const isToday = dayRoutine.dayId === currentDay;
            return (
              <div
                key={dayRoutine.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isToday
                    ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-sm">{dayRoutine.dayName}</span>
                    {isToday && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950">
                        Hoy
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider mb-2 px-2 py-0.5 rounded ${
                      dayRoutine.isRestDay
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {dayRoutine.isRestDay ? 'Descanso' : 'Entrenamiento'}
                  </span>

                  <h4 className="font-semibold text-xs text-slate-200 line-clamp-2 leading-tight">
                    {dayRoutine.title}
                  </h4>
                </div>

                {!dayRoutine.isRestDay && (
                  <button
                    onClick={() => onStartWorkout(dayRoutine)}
                    className="mt-4 w-full flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-bold py-2 px-3 rounded-xl text-xs transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Entrenar</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. BIBLIOTECA DE EJERCICIOS CERO MATERIAL */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <Dumbbell className="w-5 h-5 text-emerald-400" />
              <span>Biblioteca de Ejercicios Cero Material</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Catálogo completo con biomecánica, músculos y técnica paso a paso para hacer en tu sala o habitación
            </p>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar ejercicio o músculo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 focus:border-emerald-500 text-white pl-9 pr-3 py-2 rounded-xl text-xs outline-none"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {[
            { id: 'all', label: 'Todos los Ejercicios' },
            { id: 'push', label: 'Empuje (Pecho/Tríceps)' },
            { id: 'pull', label: 'Tracción en Suelo (Espalda)' },
            { id: 'legs', label: 'Piernas y Glúteos' },
            { id: 'core', label: 'Core y Abdomen' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as ExerciseCategory | 'all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Exercises Grid */}
        {isExercisesLoading ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Cargando catálogo de ejercicios desde el servidor...
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map((exercise) => {
            const isExpanded = expandedExerciseId === exercise.id;
            return (
              <div
                key={exercise.id}
                className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 hover:border-slate-600 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-white text-sm">{exercise.name}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                      {exercise.difficulty}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-2">
                    <strong className="text-slate-300">Enfoque:</strong> {exercise.targetMuscle}
                  </p>

                  <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {exercise.equipment}
                    </span>
                    <span>
                      {exercise.defaultAmount} {exercise.type === 'reps' ? 'repeticiones' : 'segundos'}
                    </span>
                  </div>
                </div>

                {/* Expand / Collapse Details */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setExpandedExerciseId(isExpanded ? null : exercise.id)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <span>{isExpanded ? 'Ocultar técnica' : 'Ver técnica paso a paso'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 text-xs space-y-2 text-slate-300 animate-fade-in">
                      <ol className="list-decimal list-inside space-y-1 text-slate-300">
                        {exercise.instructions.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]">
                        <span className="font-bold">Tip: </span>
                        {exercise.tips}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* 5. HISTORIAL DE ENTRENAMIENTOS */}
      {workoutLogs.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <span>Tus Entrenamientos Completados</span>
          </h3>

          <div className="space-y-2">
            {workoutLogs.map((log) => {
              const dateStr = new Date(log.date).toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              const mins = Math.floor(log.durationSeconds / 60);
              const secs = log.durationSeconds % 60;
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold text-white block">{log.routineTitle}</span>
                      <span className="text-slate-400 text-[11px]">{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="font-mono text-slate-300">
                      {mins}m {secs}s
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-bold text-[10px]">
                      {log.feedback === 'too_easy' ? '🟢 Ligero' : log.feedback === 'too_hard' ? '🔴 Exigente' : '⚡ Óptimo'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
