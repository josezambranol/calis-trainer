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
import type { DailyRoutine, UserProfile, WorkoutLog } from '../types';
import { coach } from '../utils/soundCoach';

interface WorkoutPlayerProps {
  routine: DailyRoutine;
  userProfile: UserProfile;
  onFinishWorkout: (log: WorkoutLog, newAdaptationScore: number) => void;
  onExit: () => void;
}

type WorkoutPhase = 'ready' | 'work' | 'rest' | 'finished';

export const WorkoutPlayer: React.FC<WorkoutPlayerProps> = ({
  routine,
  userProfile,
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
    let scoreAdjustment = 0;
    if (selectedFeedback === 'too_easy') scoreAdjustment = 1;
    if (selectedFeedback === 'too_hard') scoreAdjustment = -1;

    const newScore = Math.max(-3, Math.min(3, userProfile.adaptationScore + scoreAdjustment));

    const log: WorkoutLog = {
      id: 'log_' + Date.now(),
      date: new Date().toISOString(),
      routineTitle: routine.title,
      durationSeconds: elapsedTotalSeconds,
      exercisesCompleted: routine.exercises.length,
      feedback: selectedFeedback,
    };

    onFinishWorkout(log, newScore);
  };

  // Format MM:SS helper
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- FINISHED VIEW ---
  if (phase === 'finished') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 mb-4 shadow-xl shadow-orange-500/20 animate-bounce">
            <Award className="w-10 h-10 stroke-[2.5]" />
          </div>

          <h2 className="text-3xl font-black text-white">¡Misión Cumplida!</h2>
          <p className="text-sm text-slate-400 mt-1">Has superado la rutina con tu propio cuerpo</p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 my-6">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Tiempo Entrenado</span>
              <span className="text-2xl font-black text-emerald-400">{formatTime(elapsedTotalSeconds)}</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4">
              <span className="text-xs text-slate-400 block mb-1">Ejercicios Realizados</span>
              <span className="text-2xl font-black text-white">{routine.exercises.length}</span>
            </div>
          </div>

          {/* Adaptation Survey */}
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-4 text-left mb-6">
            <h4 className="font-bold text-white text-sm mb-1">¿Cómo sentiste la intensidad hoy?</h4>
            <p className="text-xs text-slate-400 mb-3">
              Usaremos tu respuesta para ajustar automáticamente las series y repeticiones de tu próxima sesión.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'too_easy' as const, label: 'Muy Fácil', icon: '🟢', sub: 'Subir nivel' },
                { id: 'just_right' as const, label: 'Perfecto', icon: '⚡', sub: 'Progresión ideal' },
                { id: 'too_hard' as const, label: 'Agotador', icon: '🔴', sub: 'Bajar carga' },
              ].map((fb) => (
                <button
                  key={fb.id}
                  type="button"
                  onClick={() => setSelectedFeedback(fb.id)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedFeedback === fb.id
                      ? 'bg-emerald-500/20 border-emerald-500 shadow-md'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span className="text-lg block mb-0.5">{fb.icon}</span>
                  <span className="text-xs font-bold text-white block">{fb.label}</span>
                  <span className="text-[10px] text-slate-400 block">{fb.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleFinalSave}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-3.5 px-6 rounded-2xl text-base transition-all shadow-xl shadow-emerald-500/25"
          >
            <span>Guardar y Ver Mi Dashboard</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // --- WORKOUT IN PROGRESS VIEW ---
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* Top Header */}
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={onExit}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Salir del entrenamiento"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Exercise Progress Indicator */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Ejercicio {exerciseIndex + 1} de {routine.exercises.length}
          </span>
          <span className="text-xs text-slate-400 font-mono mt-0.5">
            Tiempo: {formatTime(elapsedTotalSeconds)}
          </span>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSoundOn(!soundOn)}
            className={`p-2 rounded-xl border transition-colors ${
              soundOn
                ? 'bg-slate-900 border-slate-800 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Efectos de sonido"
          >
            {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setVoiceOn(!voiceOn)}
            className={`p-2 rounded-xl border transition-colors ${
              voiceOn
                ? 'bg-slate-900 border-slate-800 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Entrenador por voz en español"
          >
            {voiceOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="max-w-3xl w-full mx-auto grid grid-cols-5 sm:grid-cols-7 gap-1.5 my-2">
        {routine.exercises.map((item, idx) => {
          let stateClass = 'bg-slate-800';
          if (idx < exerciseIndex) stateClass = 'bg-emerald-500';
          if (idx === exerciseIndex) stateClass = 'bg-emerald-400 ring-2 ring-emerald-500/50 animate-pulse';
          return (
            <div
              key={item.exercise.id}
              className={`h-1.5 rounded-full transition-all ${stateClass}`}
            />
          );
        })}
      </div>

      {/* CENTER STAGE */}
      <div className="max-w-xl w-full mx-auto my-auto flex flex-col items-center text-center">
        {/* Phase: READY */}
        {phase === 'ready' && currentItem && (
          <div className="space-y-4 animate-scale-up">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              ¡Prepárate para empezar!
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">{currentItem.exercise.name}</h2>
            <p className="text-slate-400 text-sm max-w-md">{currentItem.exercise.targetMuscle}</p>

            <div className="w-32 h-32 rounded-full border-4 border-emerald-500 flex items-center justify-center text-5xl font-black text-white my-4 shadow-xl shadow-emerald-500/20">
              {secondsRemaining}
            </div>

            <button
              onClick={startWorkPhase}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all"
            >
              Comenzar Ahora
            </button>
          </div>
        )}

        {/* Phase: REST */}
        {phase === 'rest' && currentItem && (
          <div className="space-y-4 w-full animate-fade-in">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-xs uppercase tracking-wider">
              Recuperación y Descanso
            </span>

            {/* Big Countdown Circle */}
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center my-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="88"
                  cy="88"
                  r="78"
                  className="stroke-slate-800 fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="88"
                  cy="88"
                  r="78"
                  className="stroke-blue-400 fill-none transition-all duration-1000 ease-linear"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 78}
                  strokeDashoffset={
                    2 * Math.PI * 78 * (1 - secondsRemaining / (currentItem.restSeconds || 30))
                  }
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-white font-mono">{secondsRemaining}</span>
                <span className="text-xs uppercase font-bold text-slate-400">segundos</span>
              </div>
            </div>

            {/* Rest Action Buttons */}
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => addRestTime(15)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs border border-slate-700 transition-colors"
              >
                +15 Segundos
              </button>
              <button
                onClick={skipRest}
                className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition-colors flex items-center space-x-1"
              >
                <span>Saltar Descanso</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Next Up Preview */}
            <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 max-w-md mx-auto text-left flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">A Continuación:</span>
                <h4 className="text-sm font-bold text-white">
                  {currentSet === 1 ? currentItem.exercise.name : nextItem?.exercise.name || currentItem.exercise.name}
                </h4>
                <p className="text-xs text-slate-400">
                  {currentSet === 1 ? `Serie ${currentSet} de ${currentItem.sets}` : `Siguiente serie o ejercicio`}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        {/* Phase: WORK */}
        {phase === 'work' && currentItem && (
          <div className="w-full space-y-4">
            {/* Badges */}
            <div className="flex items-center justify-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                Serie {currentSet} de {currentItem.sets}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs">
                {currentItem.exercise.equipment}
              </span>
            </div>

            {/* Exercise Title */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">{currentItem.exercise.name}</h2>
              <p className="text-sm text-emerald-400 font-medium mt-1 flex items-center justify-center space-x-1.5">
                <Flame className="w-4 h-4" />
                <span>{currentItem.exercise.targetMuscle}</span>
              </p>
            </div>

            {/* Main Action Display: Reps or Time */}
            {currentItem.exercise.type === 'reps' ? (
              <div className="my-6">
                <div className="text-7xl sm:text-8xl font-black text-white tracking-tight">
                  {currentItem.repsOrSeconds}
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-slate-400">
                  Repeticiones Controladas
                </span>
              </div>
            ) : (
              <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="84"
                    className="stroke-slate-800 fill-none"
                    strokeWidth="10"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="84"
                    className="stroke-emerald-400 fill-none transition-all duration-1000 ease-linear"
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 84}
                    strokeDashoffset={
                      2 * Math.PI * 84 * (1 - secondsRemaining / currentItem.repsOrSeconds)
                    }
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-black text-white font-mono">{secondsRemaining}</span>
                  <span className="text-xs uppercase font-bold text-slate-400">segundos</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {currentItem.exercise.type === 'reps' ? (
                <button
                  onClick={completeCurrentSet}
                  className="w-full sm:w-auto min-w-[240px] flex items-center justify-center space-x-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 px-8 rounded-2xl text-lg transition-all shadow-xl shadow-emerald-500/25 active:scale-95"
                >
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  <span>¡Serie Completada!</span>
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
                  >
                    {isTimerRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>
                  <button
                    onClick={completeCurrentSet}
                    className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 px-6 rounded-2xl text-base transition-all"
                  >
                    <span>Completar Serie</span>
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Info / Technique Button */}
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl transition-colors"
              >
                <Info className="w-4 h-4 text-emerald-400" />
                <span>Ver Técnica</span>
              </button>
            </div>

            {/* Technique Popover */}
            {showInfo && (
              <div className="bg-slate-900/95 border border-slate-700 rounded-2xl p-4 text-left max-w-md mx-auto mt-4 text-xs space-y-2 animate-fade-in shadow-xl">
                <div className="flex items-center justify-between font-bold text-white text-sm">
                  <span>Puntos Clave de Técnica</span>
                  <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {currentItem.exercise.instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <span className="font-bold">Tip de Oro: </span>
                  {currentItem.exercise.tips}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer Note */}
      <div className="max-w-3xl w-full mx-auto text-center text-xs text-slate-500 py-1">
        <span>Sin pesas ni máquinas • Respira profundo en cada repetición</span>
      </div>
    </div>
  );
};
