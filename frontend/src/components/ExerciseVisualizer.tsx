import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Box, Gauge, Pause, Play } from 'lucide-react';
import { resolveExerciseMotion } from './exerciseKeyframes';
import type { CameraPreset } from './exercise3DPose';
import { resolveExercise3D } from './exercise3DPose';

const ThreeAnatomyCanvas = lazy(() =>
  import('./ThreeAnatomyCanvas').then((m) => ({ default: m.ThreeAnatomyCanvas })),
);

interface ExerciseVisualizerProps {
  exerciseId: string;
  exerciseTitle: string;
  compact?: boolean;
  externalPaused?: boolean;
}

const CAMERA_OPTIONS: Array<{ id: CameraPreset; label: string }> = [
  { id: 'studio', label: '3/4 3D' },
  { id: 'side', label: 'Lateral' },
  { id: 'front', label: 'Frontal' },
];

export const ExerciseVisualizer: React.FC<ExerciseVisualizerProps> = ({
  exerciseId,
  exerciseTitle,
  compact = false,
  externalPaused = false,
}) => {
  const spec = resolveExerciseMotion(exerciseId);
  const spec3D = resolveExercise3D(exerciseId);

  const [phaseState, setPhaseState] = useState<{ id: string; value: number }>({
    id: exerciseId,
    value: 0,
  });
  const [userPaused, setUserPaused] = useState(false);
  const [slowMode, setSlowMode] = useState(false);
  const [cameraOverride, setCameraOverride] = useState<{ id: string; preset: CameraPreset } | null>(
    null,
  );
  const lastFrameRef = useRef<number | null>(null);
  const cycleAccumulatorRef = useRef(0);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isRunning = !externalPaused && !userPaused && !prefersReducedMotion;
  const phase = phaseState.id === exerciseId ? phaseState.value : 0;
  const cameraPreset =
    cameraOverride?.id === exerciseId ? cameraOverride.preset : spec3D.defaultCamera;

  useEffect(() => {
    lastFrameRef.current = null;
    cycleAccumulatorRef.current = 0;
    if (!isRunning) {
      return;
    }

    let rafId = 0;
    const speedMultiplier = slowMode ? 0.5 : 1.0;

    const tick = (now: number) => {
      if (lastFrameRef.current !== null) {
        const deltaMs = Math.min(100, now - lastFrameRef.current);
        cycleAccumulatorRef.current =
          (cycleAccumulatorRef.current + deltaMs * speedMultiplier) % spec.cycleMs;
        setPhaseState({
          id: exerciseId,
          value: cycleAccumulatorRef.current / spec.cycleMs,
        });
      }
      lastFrameRef.current = now;
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      lastFrameRef.current = null;
    };
  }, [isRunning, slowMode, spec.cycleMs, exerciseId]);

  const phaseCue = spec.isIsometric
    ? spec.isometricCue ?? spec.concentricCue
    : phase < 0.5
      ? spec.eccentricCue
      : spec.concentricCue;

  const phaseBadge = spec.isIsometric
    ? 'ISOMETRÍA ACTIVA'
    : phase < 0.45
      ? 'FASE EXCÉNTRICA'
      : phase < 0.55
        ? 'PAUSA TÉCNICA'
        : 'FASE CONCÉNTRICA';

  return (
    <div
      data-testid={`exercise-visualizer-${exerciseId}`}
      className={`rounded-2xl border border-white/10 bg-[#0d1118] overflow-hidden text-left ${
        compact ? 'p-2.5' : 'p-3.5 sm:p-4'
      }`}
    >
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRunning ? 'bg-rose-400 animate-pulse' : 'bg-zinc-500'
                }`}
              />
              {phaseBadge}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
              {spec.tempoLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex items-center rounded-lg bg-white/[0.04] border border-white/10 p-0.5">
              <Box className="w-3 h-3 text-zinc-400 ml-1.5 mr-1" aria-hidden="true" />
              {CAMERA_OPTIONS.map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setCameraOverride({ id: exerciseId, preset: cam.id })}
                  aria-label={`Vista 3D ${cam.label}`}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                    cameraPreset === cam.id
                      ? 'bg-white text-slate-900'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSlowMode((prev) => !prev)}
              aria-label={slowMode ? 'Cambiar a velocidad normal' : 'Cambiar a cámara lenta técnica'}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition inline-flex items-center gap-1 cursor-pointer ${
                slowMode
                  ? 'bg-[#c8f135]/15 border-[#c8f135]/40 text-[#c8f135]'
                  : 'bg-white/[0.04] border-white/10 text-zinc-300 hover:border-white/25'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
              {slowMode ? '0.5× Técnica' : '1× Tempo'}
            </button>

            <button
              type="button"
              onClick={() => setUserPaused((prev) => !prev)}
              aria-label={userPaused ? 'Reanudar animación técnica' : 'Pausar animación técnica'}
              className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-300 hover:text-white hover:border-white/25 transition cursor-pointer"
            >
              {userPaused ? (
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Pause className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Escenario anatómico 3D interactivo de estudio luminoso */}
      <div className="relative rounded-xl bg-[#eef2f6] border border-white/20 overflow-hidden shadow-inner">
        <Suspense
          fallback={
            <div
              className={`w-full ${
                compact ? 'h-32' : 'h-56 sm:h-64'
              } flex items-center justify-center bg-[#eef2f6] text-xs font-medium text-slate-500`}
            >
              Cargando estudio anatómico 3D...
            </div>
          }
        >
          <ThreeAnatomyCanvas
            exerciseId={exerciseId}
            exerciseTitle={exerciseTitle}
            phase={phase}
            cameraPreset={cameraPreset}
            compact={compact}
            activeMuscles={spec.activeMuscles}
          />
        </Suspense>

        {!compact && (
          <div className="px-3.5 py-2.5 bg-[#07090d]/95 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <p className="text-xs text-zinc-200 font-medium">{phaseCue}</p>
            <span className="text-[11px] font-bold text-rose-300 shrink-0">
              {spec.primaryMuscles}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
