import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  CheckCircle2,
  ChevronRight,
  Flame,
  Award,
  ArrowRight,
  X,
  Info
} from 'lucide-react';
import type { DailyRoutine, UserProfile, WorkoutFeedback } from '../types';
import { coach } from '../utils/soundCoach';

export interface CompletedWorkoutPayload {
  routineTitle: string;
  durationSeconds: number;
  exercisesCompleted: number;
  feedback: WorkoutFeedback;
}

interface WorkoutPlayerProps {
  routine: DailyRoutine;
  userProfile: UserProfile;
  isSaving?: boolean;
  onFinishWorkout: (payload: CompletedWorkoutPayload) => Promise<void> | void;
  onExit: () => void;
}

type WorkoutPhase = 'ready' | 'work' | 'rest' | 'finished';

export const WorkoutPlayer: React.FC<WorkoutPlayerProps> = ({
  routine,
  userProfile,
  isSaving = false,
  onFinishWorkout,
  onExit,
}) => {
  // Navigation & session state
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<WorkoutPhase>('ready');

  // Timers & intervals
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [elapsedTotalSeconds, setElapsedTotalSeconds] = useState(0);

  // Audio & coach controls
  const [soundOn, setSoundOn] = useState(userProfile.soundEnabled);
  const [voiceOn, setVoiceOn] = useState(userProfile.voiceCoachEnabled);
  const [showInfo, setShowInfo] = useState(false);

  // Adaptation survey on finish
  const [selectedFeedback, setSelectedFeedback] = useState<'too_easy' | 'just_right' | 'too_hard'>('just_right');

  const timerRef = useRef<number | null>(null);
  const currentItem = routine.exercises[exerciseIndex];
  const nextItem =
    exerciseIndex < routine.exercises.length - 1
      ? routine.exercises[exerciseIndex + 1]
      : null;

  // Sync audio preferences
  useEffect(() => {
    coach.setPreferences(soundOn, voiceOn);
  }, [soundOn, voiceOn]);

  // Master workout timer (total time elapsed)
  useEffect(() => {
    const totalTimer = setInterval(() => {
      if (phase !== 'finished') {
        setElapsedTotalSeconds((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(totalTimer);
  }, [phase]);

  const triggerWorkoutCompletion = useCallback(() => {
    setPhase('finished');
    setIsTimerRunning(false);
    coach.playVictorySignal();
    coach.speak('¡Entrenamiento completado! Extraordinario esfuerzo con cero material.');

    // Launch confetti!
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  const startWorkPhase = useCallback(() => {
    setPhase('work');
    coach.playStartSignal();

    if (currentItem?.exercise.type === 'time') {
      setSecondsRemaining(currentItem.repsOrSeconds);
      setIsTimerRunning(true);
      coach.speak(`Comenzamos. ${currentItem.repsOrSeconds} segundos de ${currentItem.exercise.name}`);
    } else if (currentItem) {
      setIsTimerRunning(false);
      coach.speak(`Serie ${currentSet} de ${currentItem.sets}. Haz ${currentItem.repsOrSeconds} repeticiones`);
    }
  }, [currentItem, currentSet]);

  const completeCurrentSet = useCallback(() => {
    coach.playRestSignal();

    // Check if this was the last set of this exercise
    if (currentItem && currentSet < currentItem.sets) {
      setCurrentSet((s) => s + 1);
      setPhase('rest');
      setSecondsRemaining(currentItem.restSeconds);
      setIsTimerRunning(true);
      coach.speak(`Buen trabajo. Descanso de ${currentItem.restSeconds} segundos`);
    } else {
      // Last set of exercise: check if last exercise of routine
      if (exerciseIndex < routine.exercises.length - 1) {
        const next = routine.exercises[exerciseIndex + 1];
        setExerciseIndex((i) => i + 1);
        setCurrentSet(1);
        setPhase('rest');
        setSecondsRemaining(currentItem?.restSeconds || 30);
        setIsTimerRunning(true);
        coach.speak(`Ejercicio completado. Siguiente: ${next.exercise.name}`);
      } else {
        // Workout Finished!
        triggerWorkoutCompletion();
      }
    }
  }, [currentItem, currentSet, exerciseIndex, routine.exercises, triggerWorkoutCompletion]);

  // Countdown timer for 'ready', 'rest', or timed exercises in 'work'
  useEffect(() => {
    if (!isTimerRunning) return;

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (phase === 'ready' || phase === 'rest') {
            startWorkPhase();
          } else if (phase === 'work' && currentItem?.exercise.type === 'time') {
            completeCurrentSet();
          }
          return 0;
        }
        if (prev <= 4 && prev > 1) {
          coach.playCountdownTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, phase, currentItem, startWorkPhase, completeCurrentSet]);

  // Welcome announcement on initial mount
  const initialAnnouncedRef = useRef(false);
  useEffect(() => {
    if (currentItem && !initialAnnouncedRef.current) {
      initialAnnouncedRef.current = true;
      coach.speak(`Prepárate. Primer ejercicio: ${currentItem.exercise.name}`);
    }
  }, [currentItem]);

  const addRestTime = (seconds: number) => {
    setSecondsRemaining((prev) => prev + seconds);
  };

  const skipRest = () => {
    startWorkPhase();
  };

  const handleFinalSave = () => {
    void onFinishWorkout({
      routineTitle: routine.title,
      durationSeconds: Math.max(1, elapsedTotalSeconds),
      exercisesCompleted: routine.exercises.length,
      feedback: selectedFeedback,
    });
  };

  // Format MM:SS helper
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Escape key accessibility for Player
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  // --- FINISHED VIEW ---
  if (phase === 'finished') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Entrenamiento completado"
        className="fixed inset-0 z-50 bg-[#07090d] ch-backdrop-grid flex items-center justify-center p-4"
      >
        <div className="w-full max-w-lg ch-panel rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#c8f135] flex items-center justify-center text-[#05070a] mb-4 shadow-[0_0_28px_rgba(200,241,53,0.25)]">
            <Award className="w-9 h-9 stroke-[2.5]" aria-hidden="true" />
          </div>

          <h2 className="text-3xl font-black text-white tracking-[-0.03em]">¡Misión Cumplida!</h2>
          <p className="text-sm text-zinc-400 mt-1">Has completado tu bloque de calistenia sin material</p>

          <div className="grid grid-cols-2 gap-3 my-6 ch-tabular">
            <div className="ch-panel-elevated rounded-xl p-4">
              <span className="text-xs text-zinc-400 block mb-1">Tiempo Entrenado</span>
              <span className="text-2xl font-black text-[#c8f135] font-mono">{formatTime(elapsedTotalSeconds)}</span>
            </div>
            <div className="ch-panel-elevated rounded-xl p-4">
              <span className="text-xs text-zinc-400 block mb-1">Ejercicios Realizados</span>
              <span className="text-2xl font-black text-white font-mono">{routine.exercises.length}</span>
            </div>
          </div>

          <div className="ch-panel-elevated rounded-xl p-4 text-left mb-6">
            <h3 className="font-bold text-white text-sm mb-1">¿Cómo sentiste la intensidad hoy?</h3>
            <p className="text-xs text-zinc-400 mb-3">
              Usaremos tu respuesta para calibrar series, repeticiones y variantes de tu próxima sesión.
            </p>

            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Intensidad de la sesión">
              {[
                { id: 'too_easy' as const, label: 'Muy Fácil', icon: '●', sub: 'Subir carga' },
                { id: 'just_right' as const, label: 'Perfecto', icon: '◆', sub: 'Progresión ideal' },
                { id: 'too_hard' as const, label: 'Agotador', icon: '▲', sub: 'Bajar carga' },
              ].map((fb) => (
                <button
                  key={fb.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedFeedback === fb.id}
                  onClick={() => setSelectedFeedback(fb.id)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedFeedback === fb.id
                      ? 'bg-[#c8f135]/15 border-[#c8f135] text-white'
                      : 'bg-[#090c11] border-white/10 text-zinc-300 hover:border-white/25'
                  }`}
                >
                  <span className="text-base block mb-0.5 text-[#c8f135]" aria-hidden="true">{fb.icon}</span>
                  <span className="text-xs font-bold text-white block">{fb.label}</span>
                  <span className="text-[10px] text-zinc-400 block">{fb.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinalSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center space-x-2 bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] font-black py-3.5 px-6 rounded-xl text-base transition-colors disabled:opacity-60"
          >
            <span>{isSaving ? 'Guardando progreso...' : 'Guardar y Volver al Panel'}</span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  // --- WORKOUT IN PROGRESS VIEW ---
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Reproductor de entrenamiento: ${routine.title}`}
      className="fixed inset-0 z-50 bg-[#07090d] ch-backdrop-grid flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none"
    >
      {/* Top Header */}
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={onExit}
          aria-label="Salir del entrenamiento"
          className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.1] transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex flex-col items-center ch-tabular">
          <span className="text-xs font-black text-[#c8f135] uppercase tracking-[0.15em]">
            Ejercicio {exerciseIndex + 1} de {routine.exercises.length}
          </span>
          <span className="text-xs text-zinc-400 font-mono mt-0.5">
            Tiempo: {formatTime(elapsedTotalSeconds)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            aria-pressed={soundOn}
            aria-label="Activar o desactivar efectos de sonido"
            onClick={() => setSoundOn(!soundOn)}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundOn
                ? 'bg-[#c8f135]/15 border-[#c8f135]/40 text-[#c8f135]'
                : 'bg-white/[0.04] border-white/10 text-zinc-500'
            }`}
          >
            {soundOn ? <Volume2 className="w-5 h-5" aria-hidden="true" /> : <VolumeX className="w-5 h-5" aria-hidden="true" />}
          </button>

          <button
            type="button"
            aria-pressed={voiceOn}
            aria-label="Activar o desactivar guía por voz"
            onClick={() => setVoiceOn(!voiceOn)}
            className={`p-2.5 rounded-xl border transition-colors ${
              voiceOn
                ? 'bg-[#c8f135]/15 border-[#c8f135]/40 text-[#c8f135]'
                : 'bg-white/[0.04] border-white/10 text-zinc-500'
            }`}
          >
            {voiceOn ? <Mic className="w-5 h-5" aria-hidden="true" /> : <MicOff className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="max-w-3xl w-full mx-auto grid grid-cols-5 sm:grid-cols-7 gap-1.5 my-2">
        {routine.exercises.map((item, idx) => {
          let stateClass = 'bg-white/10';
          if (idx < exerciseIndex) stateClass = 'bg-[#c8f135]/60';
          if (idx === exerciseIndex) stateClass = 'bg-[#c8f135] shadow-[0_0_12px_rgba(200,241,53,0.5)]';
          return (
            <div
              key={item.exercise.id}
              className={`h-1.5 rounded-full transition-all ${stateClass}`}
            />
          );
        })}
      </div>

      {/* CENTER STAGE */}
      <div aria-live="polite" className="max-w-xl w-full mx-auto my-auto flex flex-col items-center text-center">
        {phase === 'ready' && currentItem && (
          <div className="space-y-4">
            <span className="inline-block px-3 py-1 rounded-md bg-[#c8f135]/15 border border-[#c8f135]/35 text-[#c8f135] font-black text-xs uppercase tracking-wider">
              Prepárate para iniciar
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-[-0.03em]">{currentItem.exercise.name}</h2>
            <p className="text-zinc-400 text-sm max-w-md">{currentItem.exercise.targetMuscle}</p>

            <div className="w-32 h-32 mx-auto rounded-full border-4 border-[#c8f135] flex items-center justify-center text-5xl font-black text-white my-4 font-mono ch-tabular shadow-[0_0_32px_rgba(200,241,53,0.18)]">
              {secondsRemaining}
            </div>

            <button
              type="button"
              onClick={startWorkPhase}
              className="bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] font-black px-7 py-3 rounded-xl text-sm transition-colors"
            >
              Comenzar Ahora
            </button>
          </div>
        )}

        {phase === 'rest' && currentItem && (
          <div className="space-y-4 w-full">
            <span className="inline-block px-3 py-1 rounded-md bg-sky-500/15 border border-sky-400/35 text-sky-300 font-black text-xs uppercase tracking-wider">
              Recuperación Activa
            </span>

            <div className="relative w-44 h-44 mx-auto flex items-center justify-center my-4">
              <svg className="w-full h-full transform -rotate-90" aria-hidden="true">
                <circle cx="88" cy="88" r="78" className="stroke-white/10 fill-none" strokeWidth="8" />
                <circle
                  cx="88"
                  cy="88"
                  r="78"
                  className="stroke-sky-400 fill-none transition-all duration-1000 ease-linear"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 78}
                  strokeDashoffset={
                    2 * Math.PI * 78 * (1 - secondsRemaining / (currentItem.restSeconds || 30))
                  }
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center ch-tabular">
                <span className="text-5xl font-black text-white font-mono">{secondsRemaining}</span>
                <span className="text-xs uppercase font-bold text-zinc-400">segundos</span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => addRestTime(15)}
                className="bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 font-bold px-4 py-2 rounded-xl text-xs border border-white/15 transition-colors"
              >
                +15 Segundos
              </button>
              <button
                type="button"
                onClick={skipRest}
                className="bg-sky-400 hover:bg-sky-300 text-[#05070a] font-black px-5 py-2 rounded-xl text-xs transition-colors flex items-center space-x-1"
              >
                <span>Saltar Descanso</span>
                <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 ch-panel rounded-xl p-3.5 max-w-md mx-auto text-left flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">A Continuación:</span>
                <h3 className="text-sm font-bold text-white">
                  {currentSet === 1 ? currentItem.exercise.name : nextItem?.exercise.name || currentItem.exercise.name}
                </h3>
                <p className="text-xs text-zinc-400">
                  {currentSet === 1 ? `Serie ${currentSet} de ${currentItem.sets}` : 'Siguiente serie o movimiento'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.05] text-zinc-400">
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
          </div>
        )}

        {phase === 'work' && currentItem && (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <span className="px-3 py-1 rounded-md bg-[#c8f135]/15 border border-[#c8f135]/35 text-[#c8f135] font-black text-xs uppercase tracking-wider">
                Serie {currentSet} de {currentItem.sets}
              </span>
              <span className="px-3 py-1 rounded-md bg-white/[0.05] border border-white/10 text-zinc-300 font-bold text-xs">
                {currentItem.exercise.equipment}
              </span>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-[-0.03em]">{currentItem.exercise.name}</h2>
              <p className="text-sm text-[#c8f135] font-semibold mt-1 flex items-center justify-center space-x-1.5">
                <Flame className="w-4 h-4" aria-hidden="true" />
                <span>{currentItem.exercise.targetMuscle}</span>
              </p>
            </div>

            {currentItem.exercise.type === 'reps' ? (
              <div className="my-6 ch-tabular">
                <div className="text-7xl sm:text-8xl font-black text-white tracking-tight font-mono">
                  {currentItem.repsOrSeconds}
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                  Repeticiones Controladas
                </span>
              </div>
            ) : (
              <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-4">
                <svg className="w-full h-full transform -rotate-90" aria-hidden="true">
                  <circle cx="96" cy="96" r="84" className="stroke-white/10 fill-none" strokeWidth="10" />
                  <circle
                    cx="96"
                    cy="96"
                    r="84"
                    className="stroke-[#c8f135] fill-none transition-all duration-1000 ease-linear"
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 84}
                    strokeDashoffset={
                      2 * Math.PI * 84 * (1 - secondsRemaining / currentItem.repsOrSeconds)
                    }
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center ch-tabular">
                  <span className="text-6xl font-black text-white font-mono">{secondsRemaining}</span>
                  <span className="text-xs uppercase font-bold text-zinc-400">segundos</span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {currentItem.exercise.type === 'reps' ? (
                <button
                  type="button"
                  onClick={completeCurrentSet}
                  className="w-full sm:w-auto min-w-[240px] flex items-center justify-center space-x-2.5 bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] font-black py-4 px-8 rounded-xl text-base transition-colors active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
                  <span>Serie Completada</span>
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    aria-label={isTimerRunning ? 'Pausar temporizador' : 'Reanudar temporizador'}
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="p-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/15 transition-colors"
                  >
                    {isTimerRunning ? <Pause className="w-6 h-6" aria-hidden="true" /> : <Play className="w-6 h-6" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={completeCurrentSet}
                    className="flex items-center space-x-2 bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] font-black py-4 px-6 rounded-xl text-base transition-colors"
                  >
                    <span>Completar Serie</span>
                    <SkipForward className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              )}

              <button
                type="button"
                aria-expanded={showInfo}
                onClick={() => setShowInfo(!showInfo)}
                className="flex items-center space-x-1.5 text-xs font-bold text-zinc-300 hover:text-white bg-white/[0.05] border border-white/10 px-4 py-3.5 rounded-xl transition-colors"
              >
                <Info className="w-4 h-4 text-[#c8f135]" aria-hidden="true" />
                <span>Ver Técnica</span>
              </button>
            </div>

            {showInfo && (
              <div className="ch-panel rounded-xl p-4 text-left max-w-md mx-auto mt-4 text-xs space-y-2 shadow-xl">
                <div className="flex items-center justify-between font-bold text-white text-sm">
                  <span>Puntos Clave de Técnica</span>
                  <button
                    type="button"
                    aria-label="Cerrar técnica"
                    onClick={() => setShowInfo(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <ul className="list-disc list-inside text-zinc-300 space-y-1">
                  {currentItem.exercise.instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
                <div className="p-2.5 rounded-lg bg-[#c8f135]/10 border border-[#c8f135]/25 text-[#d9fc5a]">
                  <span className="font-bold">Tip clave: </span>
                  {currentItem.exercise.tips}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="max-w-3xl w-full mx-auto text-center text-xs text-zinc-500 py-1">
        <span>Sin pesas ni máquinas · Respira profundo en cada repetición · Esc para salir</span>
      </div>
    </div>
  );
};
