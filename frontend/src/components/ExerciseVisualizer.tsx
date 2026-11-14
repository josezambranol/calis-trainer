import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Gauge } from 'lucide-react';
import { resolveExerciseMotion } from './exerciseKeyframes';
import type { BodyPose, Point2D } from './exerciseKeyframes';

interface ExerciseVisualizerProps {
  exerciseId: string;
  exerciseTitle: string;
  compact?: boolean;
  externalPaused?: boolean;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpPoint = (p1: Point2D, p2: Point2D, t: number): Point2D => ({
  x: lerp(p1.x, p2.x, t),
  y: lerp(p1.y, p2.y, t),
});

function interpolatePose(a: BodyPose, b: BodyPose, t: number): BodyPose {
  const pose: BodyPose = {
    head: lerpPoint(a.head, b.head, t),
    neck: lerpPoint(a.neck, b.neck, t),
    shoulder: lerpPoint(a.shoulder, b.shoulder, t),
    elbow: lerpPoint(a.elbow, b.elbow, t),
    wrist: lerpPoint(a.wrist, b.wrist, t),
    hip: lerpPoint(a.hip, b.hip, t),
    knee: lerpPoint(a.knee, b.knee, t),
    ankle: lerpPoint(a.ankle, b.ankle, t),
  };

  if (a.elbow2 && b.elbow2) pose.elbow2 = lerpPoint(a.elbow2, b.elbow2, t);
  if (a.wrist2 && b.wrist2) pose.wrist2 = lerpPoint(a.wrist2, b.wrist2, t);
  if (a.knee2 && b.knee2) pose.knee2 = lerpPoint(a.knee2, b.knee2, t);
  if (a.ankle2 && b.ankle2) pose.ankle2 = lerpPoint(a.ankle2, b.ankle2, t);
  return pose;
}

export const ExerciseVisualizer: React.FC<ExerciseVisualizerProps> = ({
  exerciseId,
  exerciseTitle,
  compact = false,
  externalPaused = false,
}) => {
  const spec = resolveExerciseMotion(exerciseId);
  const [phase, setPhase] = useState(0); // 0..1 cíclico: 0..0.5 ida, 0.5..1 vuelta
  const [userPaused, setUserPaused] = useState(false);
  const [slowMode, setSlowMode] = useState(false);
  const lastFrameRef = useRef<number | null>(null);
  const cycleAccumulatorRef = useRef(0);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isRunning = !externalPaused && !userPaused && !prefersReducedMotion;

  useEffect(() => {
    lastFrameRef.current = null;
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
        setPhase(cycleAccumulatorRef.current / spec.cycleMs);
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

  // Easing senoidal suave 0 -> 1 -> 0
  const easedT = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  const pose = interpolatePose(spec.startPose, spec.peakPose, easedT);

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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#c8f135]/15 text-[#c8f135] border border-[#c8f135]/30">
              <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-[#c8f135] animate-pulse' : 'bg-zinc-500'}`} />
              {phaseBadge}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
              {spec.tempoLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
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
              {userPaused ? <Play className="w-3.5 h-3.5" aria-hidden="true" /> : <Pause className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      )}

      <div className="relative rounded-xl bg-gradient-to-b from-[#141923] to-[#07090d] border border-white/10 overflow-hidden">
        <svg
          viewBox="0 0 320 190"
          className={`w-full ${compact ? 'h-28' : 'h-40 sm:h-48'} select-none`}
          role="img"
          aria-label={`Demostración biomecánica animada de ${exerciseTitle}`}
        >
          <defs>
            <radialGradient id={`volt-glow-${exerciseId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c8f135" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#c8f135" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`body-grad-${exerciseId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          {/* Cuadrícula técnica sutil */}
          <g stroke="#1e293b" strokeWidth="0.6" opacity="0.45">
            <line x1="0" y1="50" x2="320" y2="50" strokeDasharray="3 4" />
            <line x1="0" y1="110" x2="320" y2="110" strokeDasharray="3 4" />
            <line x1="80" y1="0" x2="80" y2="190" strokeDasharray="3 4" />
            <line x1="160" y1="0" x2="160" y2="190" strokeDasharray="3 4" />
            <line x1="240" y1="0" x2="240" y2="190" strokeDasharray="3 4" />
          </g>

          {/* Superficie de apoyo (suelo / pared / bloque elevado) */}
          <line x1="20" y1="170" x2="300" y2="170" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
          {spec.environment === 'wall-right' && (
            <rect x="256" y="20" width="12" height="150" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          )}
          {spec.environment === 'wall-left' && (
            <rect x="68" y="20" width="12" height="150" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          )}
          {spec.environment === 'elevated-feet' && (
            <rect x="34" y="130" width="54" height="40" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          )}

          {/* Vector de fuerza / trayectoria */}
          {spec.arrow && (
            <g opacity="0.55">
              <line
                x1={spec.arrow.from.x}
                y1={spec.arrow.from.y}
                x2={spec.arrow.to.x}
                y2={spec.arrow.to.y}
                stroke="#c8f135"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              <circle cx={spec.arrow.to.x} cy={spec.arrow.to.y} r="3.5" fill="#c8f135" />
            </g>
          )}

          {/* Auras Kinetic Volt sobre las articulaciones primarias */}
          {spec.highlightJoints.map((jointKey) => {
            const pt = pose[jointKey];
            if (!pt) return null;
            return (
              <circle
                key={jointKey}
                cx={pt.x}
                cy={pt.y}
                r={compact ? 14 : 18}
                fill={`url(#volt-glow-${exerciseId})`}
              />
            );
          })}

          {/* Extremidades secundarias (detrás del plano principal) */}
          {(pose.knee2 && pose.ankle2) && (
            <g stroke="#64748b" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <polyline points={`${pose.hip.x},${pose.hip.y} ${pose.knee2.x},${pose.knee2.y} ${pose.ankle2.x},${pose.ankle2.y}`} />
            </g>
          )}
          {(pose.elbow2 && pose.wrist2) && (
            <g stroke="#64748b" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <polyline points={`${pose.shoulder.x},${pose.shoulder.y} ${pose.elbow2.x},${pose.elbow2.y} ${pose.wrist2.x},${pose.wrist2.y}`} />
            </g>
          )}

          {/* Cadena principal (pierna + torso + brazo) */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Pierna */}
            <polyline
              points={`${pose.hip.x},${pose.hip.y} ${pose.knee.x},${pose.knee.y} ${pose.ankle.x},${pose.ankle.y}`}
              stroke={`url(#body-grad-${exerciseId})`}
              strokeWidth="9"
            />
            {/* Torso */}
            <line
              x1={pose.hip.x}
              y1={pose.hip.y}
              x2={pose.shoulder.x}
              y2={pose.shoulder.y}
              stroke="#e2e8f0"
              strokeWidth="12"
            />
            {/* Cuello */}
            <line
              x1={pose.shoulder.x}
              y1={pose.shoulder.y}
              x2={pose.neck.x}
              y2={pose.neck.y}
              stroke="#cbd5e1"
              strokeWidth="6"
            />
            {/* Brazo principal */}
            <polyline
              points={`${pose.shoulder.x},${pose.shoulder.y} ${pose.elbow.x},${pose.elbow.y} ${pose.wrist.x},${pose.wrist.y}`}
              stroke="#f8fafc"
              strokeWidth="7.5"
            />
          </g>

          {/* Cabeza */}
          <circle
            cx={pose.head.x}
            cy={pose.head.y}
            r="11"
            fill="#0f172a"
            stroke="#c8f135"
            strokeWidth="2.5"
          />

          {/* Articulaciones clave */}
          {(['shoulder', 'elbow', 'hip', 'knee', 'ankle'] as Array<keyof BodyPose>).map((key) => {
            const pt = pose[key];
            if (!pt) return null;
            const highlighted = spec.highlightJoints.includes(key);
            return (
              <circle
                key={key}
                cx={pt.x}
                cy={pt.y}
                r={highlighted ? 4.2 : 3}
                fill={highlighted ? '#c8f135' : '#94a3b8'}
                stroke="#07090d"
                strokeWidth="1.2"
              />
            );
          })}
        </svg>

        {!compact && (
          <div className="px-3.5 py-2.5 bg-[#07090d]/95 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <p className="text-xs text-zinc-200 font-medium">{phaseCue}</p>
            <span className="text-[11px] font-semibold text-[#c8f135] shrink-0">
              {spec.primaryMuscles}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
