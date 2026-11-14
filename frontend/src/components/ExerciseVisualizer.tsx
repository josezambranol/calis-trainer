import React, { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, Gauge } from 'lucide-react';
import { resolveExerciseMotion } from './exerciseKeyframes';
import type { BodyPose, MuscleGroupId, Point2D } from './exerciseKeyframes';

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

/**
 * Construye el contorno anatómico asimétrico de un segmento muscular entre A y B
 * y genera líneas internas sutiles de estriación muscular.
 */
function buildAnatomicalSegment(
  a: Point2D,
  b: Point2D,
  rStart: number,
  rMidSideA: number,
  rMidSideB: number,
  rEnd: number,
  midFraction = 0.42
): { outline: string; striations: string[] } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  const pt = (along: number, normalOffset: number): Point2D => ({
    x: a.x + ux * (len * along) + nx * normalOffset,
    y: a.y + uy * (len * along) + ny * normalOffset,
  });

  const s1 = pt(0.02, rStart);
  const c1 = pt(midFraction * 0.65, rMidSideA * 1.06);
  const c2 = pt(Math.min(0.92, midFraction + 0.25), rMidSideA * 0.88);
  const e1 = pt(0.98, rEnd);

  const e2 = pt(0.98, -rEnd);
  const d1 = pt(Math.min(0.92, midFraction + 0.25), -rMidSideB * 0.88);
  const d2 = pt(midFraction * 0.65, -rMidSideB * 1.06);
  const s2 = pt(0.02, -rStart);

  const tipCap = pt(1.03, 0);
  const baseCap = pt(-0.03, 0);

  const outline = [
    `M ${s1.x.toFixed(1)},${s1.y.toFixed(1)}`,
    `C ${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${e1.x.toFixed(1)},${e1.y.toFixed(1)}`,
    `Q ${tipCap.x.toFixed(1)},${tipCap.y.toFixed(1)} ${e2.x.toFixed(1)},${e2.y.toFixed(1)}`,
    `C ${d1.x.toFixed(1)},${d1.y.toFixed(1)} ${d2.x.toFixed(1)},${d2.y.toFixed(1)} ${s2.x.toFixed(1)},${s2.y.toFixed(1)}`,
    `Q ${baseCap.x.toFixed(1)},${baseCap.y.toFixed(1)} ${s1.x.toFixed(1)},${s1.y.toFixed(1)} Z`,
  ].join(' ');

  const fiberOffsets = [-0.36, 0, 0.36];
  const striations = fiberOffsets.map((f) => {
    const fStart = pt(0.16, f * Math.min(rStart, rMidSideA) * 0.72);
    const fMid = pt(midFraction, f * (f >= 0 ? rMidSideA : rMidSideB) * 0.78);
    const fEnd = pt(0.84, f * Math.min(rEnd + 1.5, rMidSideA) * 0.62);
    return `M ${fStart.x.toFixed(1)},${fStart.y.toFixed(1)} Q ${fMid.x.toFixed(1)},${fMid.y.toFixed(1)} ${fEnd.x.toFixed(1)},${fEnd.y.toFixed(1)}`;
  });

  return { outline, striations };
}

function buildShortsPath(hip: Point2D, knee: Point2D): string {
  const dx = knee.x - hip.x;
  const dy = knee.y - hip.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  const p = (along: number, off: number) =>
    `${(hip.x + ux * len * along + nx * off).toFixed(1)},${(hip.y + uy * len * along + ny * off).toFixed(1)}`;

  return `M ${p(-0.14, 13.5)} L ${p(0.42, 13.8)} Q ${p(0.46, 0)} ${p(0.42, -13.2)} L ${p(-0.14, -12.8)} Q ${p(-0.19, 0)} ${p(-0.14, 13.5)} Z`;
}

function buildSneakerPath(ankle: Point2D, knee: Point2D, facingRight: boolean): { body: string; sole: string } {
  const dx = ankle.x - knee.x;
  const dy = ankle.y - knee.y;
  const dir = facingRight ? 1 : -1;
  // Base horizontal cuando el pie apoya abajo; sigue inclinación suave si la pierna está elevada
  const isNearFloor = ankle.y >= 158;
  const tx = isNearFloor ? dir : Math.sign(dx || dir) * 0.85;
  const ty = isNearFloor ? 0 : Math.min(0.35, Math.max(-0.35, dy / 90));

  const p = (f: number, up: number) =>
    `${(ankle.x + tx * f - ty * up).toFixed(1)},${(ankle.y + ty * f - up).toFixed(1)}`;

  const body = `M ${p(-6, 5)} L ${p(5, 6)} Q ${p(16, 2)} ${p(19, -2)} L ${p(18, -5)} L ${p(-7, -5)} Z`;
  const sole = `M ${p(-7.5, -3.5)} L ${p(18.5, -3.5)} L ${p(18.5, -5.8)} L ${p(-7.5, -5.8)} Z`;
  return { body, sole };
}

function buildHeadPath(head: Point2D, neck: Point2D, facingRight: boolean): string {
  const dx = head.x - neck.x;
  const dy = head.y - neck.y;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const sx = facingRight ? 1 : -1;
  // Perfil craneal anatómico rotado ligeramente según la línea cuello-cabeza
  const rot = Math.max(-35, Math.min(35, angleDeg + 90));
  return `translate(${head.x.toFixed(1)} ${head.y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${sx} 1)`;
}

export const ExerciseVisualizer: React.FC<ExerciseVisualizerProps> = ({
  exerciseId,
  exerciseTitle,
  compact = false,
  externalPaused = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const spec = resolveExerciseMotion(exerciseId);
  const [phase, setPhase] = useState(0);
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

  const easedT = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  const pose = interpolatePose(spec.startPose, spec.peakPose, easedT);

  const isActive = (...groups: MuscleGroupId[]) =>
    groups.some((g) => spec.activeMuscles.includes(g));

  const baseFill = `url(#ecorche-grey-${uid})`;
  const activeFill = `url(#ecorche-coral-${uid})`;
  const backFill = `url(#ecorche-shadow-${uid})`;

  const facingRight = pose.head.x >= pose.hip.x - 10;

  // Segmentos anatómicos principales
  const torsoSeg = buildAnatomicalSegment(pose.hip, pose.shoulder, 11.5, 14.5, 13.5, 13.2, 0.65);
  const upperArm1 = buildAnatomicalSegment(pose.shoulder, pose.elbow, 8.8, 7.8, 7.2, 5.2, 0.45);
  const forearm1 = buildAnatomicalSegment(pose.elbow, pose.wrist, 5.2, 5.8, 4.8, 3.3, 0.34);
  const thigh1 = buildAnatomicalSegment(pose.hip, pose.knee, 12.2, 13.8, 12.6, 7.6, 0.42);
  const calf1 = buildAnatomicalSegment(pose.knee, pose.ankle, 7.2, 8.8, 7.4, 3.8, 0.36);
  const sneaker1 = buildSneakerPath(pose.ankle, pose.knee, facingRight);
  const shortsPath = buildShortsPath(pose.hip, pose.knee);

  const upperArm2 =
    pose.elbow2 && pose.wrist2
      ? buildAnatomicalSegment(pose.shoulder, pose.elbow2, 8.2, 7.2, 6.8, 4.8, 0.45)
      : null;
  const forearm2 =
    pose.elbow2 && pose.wrist2
      ? buildAnatomicalSegment(pose.elbow2, pose.wrist2, 4.8, 5.2, 4.4, 3.1, 0.34)
      : null;
  const thigh2 =
    pose.knee2 && pose.ankle2
      ? buildAnatomicalSegment(pose.hip, pose.knee2, 11.2, 12.6, 11.5, 7.0, 0.42)
      : null;
  const calf2 =
    pose.knee2 && pose.ankle2
      ? buildAnatomicalSegment(pose.knee2, pose.ankle2, 6.6, 8.0, 6.8, 3.6, 0.36)
      : null;
  const sneaker2 =
    pose.knee2 && pose.ankle2 ? buildSneakerPath(pose.ankle2, pose.knee2, facingRight) : null;

  // Punto medio para sombra proyectada en el suelo
  const shadowCx = ((pose.hip.x + pose.ankle.x + pose.shoulder.x) / 3).toFixed(1);
  const torsoActive = isActive('chest', 'lats', 'abs');
  const armActive = isActive('shoulders', 'triceps');
  const thighActive = isActive('quads', 'hamstrings', 'glutes');
  const calfActive = isActive('calves');

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
              <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-rose-400 animate-pulse' : 'bg-zinc-500'}`} />
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

      {/* Escenario anatómico de estudio luminoso con sombreado 3D */}
      <div className="relative rounded-xl bg-gradient-to-b from-[#fafbfc] via-[#f1f4f8] to-[#e4e9f0] border border-white/20 overflow-hidden shadow-inner">
        <svg
          viewBox="0 0 320 190"
          className={`w-full ${compact ? 'h-32' : 'h-48 sm:h-56'} select-none`}
          role="img"
          aria-label={`Animación anatómica de ${exerciseTitle}`}
        >
          <defs>
            {/* Sombreado anatómico alabastro/grafito 3D */}
            <linearGradient id={`ecorche-grey-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d8dde4" />
              <stop offset="48%" stopColor="#a7b0bc" />
              <stop offset="100%" stopColor="#6b7482" />
            </linearGradient>

            {/* Plano posterior más profundo para dar volumen 3D */}
            <linearGradient id={`ecorche-shadow-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#aeb6c2" />
              <stop offset="100%" stopColor="#525b68" />
            </linearGradient>

            {/* Resaltado muscular coral-carmesí estriado idéntico a atlas deportivo */}
            <linearGradient id={`ecorche-coral-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f27a6e" />
              <stop offset="45%" stopColor="#d94e43" />
              <stop offset="100%" stopColor="#9e2a22" />
            </linearGradient>

            <radialGradient id={`floor-shadow-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.24" />
              <stop offset="70%" stopColor="#0f172a" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Suelo / pared / soporte de estudio */}
          <ellipse cx={shadowCx} cy="172" rx="88" ry="8" fill={`url(#floor-shadow-${uid})`} />
          <line x1="22" y1="171" x2="298" y2="171" stroke="#cbd5e1" strokeWidth="1.5" />

          {spec.environment === 'wall-right' && (
            <g>
              <rect x="256" y="18" width="16" height="153" rx="2" fill="#cfd6df" stroke="#94a3b8" strokeWidth="1.2" />
              <line x1="256" y1="18" x2="256" y2="171" stroke="#64748b" strokeWidth="1.5" />
            </g>
          )}
          {spec.environment === 'wall-left' && (
            <g>
              <rect x="64" y="18" width="16" height="153" rx="2" fill="#cfd6df" stroke="#94a3b8" strokeWidth="1.2" />
              <line x1="80" y1="18" x2="80" y2="171" stroke="#64748b" strokeWidth="1.5" />
            </g>
          )}
          {spec.environment === 'elevated-feet' && (
            <g>
              <rect x="30" y="128" width="60" height="10" rx="2.5" fill="#334155" />
              <rect x="44" y="138" width="8" height="33" fill="#94a3b8" />
              <rect x="32" y="168" width="32" height="3.5" rx="1" fill="#64748b" />
            </g>
          )}

          {/* Plano secundario (extremidades posteriores en perspectiva) */}
          {thigh2 && calf2 && sneaker2 && (
            <g opacity="0.88">
              <path d={calf2.outline} fill={backFill} stroke="#475569" strokeWidth="0.7" />
              <path d={thigh2.outline} fill={backFill} stroke="#475569" strokeWidth="0.7" />
              <path d={sneaker2.body} fill="#64748b" />
              <path d={sneaker2.sole} fill="#e2e8f0" />
            </g>
          )}

          {upperArm2 && forearm2 && (
            <g opacity="0.88">
              <path d={forearm2.outline} fill={backFill} stroke="#475569" strokeWidth="0.7" />
              <path d={upperArm2.outline} fill={backFill} stroke="#475569" strokeWidth="0.7" />
            </g>
          )}

          {/* Pantorrilla / Gemelo */}
          <g>
            <path
              d={calf1.outline}
              fill={calfActive ? activeFill : baseFill}
              stroke={calfActive ? '#7f1d1d' : '#475569'}
              strokeWidth="0.85"
            />
            {calf1.striations.map((d, i) => (
              <path
                key={`calf-str-${i}`}
                d={d}
                fill="none"
                stroke={calfActive ? '#fecaca' : '#e2e8f0'}
                strokeWidth="0.75"
                strokeOpacity="0.65"
              />
            ))}
          </g>

          {/* Muslo / Cuádriceps e Isquiotibiales */}
          <g>
            <path
              d={thigh1.outline}
              fill={thighActive ? activeFill : baseFill}
              stroke={thighActive ? '#7f1d1d' : '#475569'}
              strokeWidth="0.9"
            />
            {thigh1.striations.map((d, i) => (
              <path
                key={`thigh-str-${i}`}
                d={d}
                fill="none"
                stroke={thighActive ? '#fee2e2' : '#f1f5f9'}
                strokeWidth="0.9"
                strokeOpacity="0.72"
              />
            ))}
          </g>

          {/* Torso anatómico (Pectoral / Dorsal / Abdomen) */}
          <g>
            <path
              d={torsoSeg.outline}
              fill={torsoActive ? activeFill : baseFill}
              stroke={torsoActive ? '#7f1d1d' : '#475569'}
              strokeWidth="0.95"
            />
            {torsoSeg.striations.map((d, i) => (
              <path
                key={`torso-str-${i}`}
                d={d}
                fill="none"
                stroke={torsoActive ? '#fee2e2' : '#e2e8f0'}
                strokeWidth="0.85"
                strokeOpacity="0.68"
              />
            ))}
          </g>

          {/* Short deportivo negro mate */}
          <path d={shortsPath} fill="#11151d" stroke="#05070a" strokeWidth="0.8" />

          {/* Cuello y perfil anatómico de cabeza */}
          <line
            x1={pose.shoulder.x}
            y1={pose.shoulder.y}
            x2={pose.neck.x}
            y2={pose.neck.y}
            stroke="#8e97a4"
            strokeWidth="8.5"
            strokeLinecap="round"
          />
          <g transform={buildHeadPath(pose.head, pose.neck, facingRight)}>
            <path
              d="M -9,-11 C -2,-14 8,-12 10,-4 C 11,1 9,4 11,6 C 9,7 8,10 6,11 C 1,12 -6,11 -9,6 C -11,1 -11,-6 -9,-11 Z"
              fill={baseFill}
              stroke="#475569"
              strokeWidth="0.9"
            />
            <path
              d="M -3,-8 C 2,-8 6,-5 7,-1"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="0.8"
              strokeOpacity="0.6"
            />
          </g>

          {/* Brazo principal (Deltoides + Tríceps + Antebrazo) */}
          <g>
            <path
              d={forearm1.outline}
              fill={baseFill}
              stroke="#475569"
              strokeWidth="0.8"
            />
            <circle cx={pose.wrist.x} cy={pose.wrist.y} r="3.4" fill="#9ea7b4" stroke="#475569" strokeWidth="0.7" />
            <path
              d={upperArm1.outline}
              fill={armActive ? activeFill : baseFill}
              stroke={armActive ? '#7f1d1d' : '#475569'}
              strokeWidth="0.85"
            />
            {upperArm1.striations.map((d, i) => (
              <path
                key={`arm-str-${i}`}
                d={d}
                fill="none"
                stroke={armActive ? '#fee2e2' : '#f1f5f9'}
                strokeWidth="0.75"
                strokeOpacity="0.65"
              />
            ))}
            {/* Deltoide redondeado */}
            <circle
              cx={pose.shoulder.x}
              cy={pose.shoulder.y}
              r="7.8"
              fill={isActive('shoulders') ? activeFill : baseFill}
              stroke={isActive('shoulders') ? '#7f1d1d' : '#475569'}
              strokeWidth="0.85"
            />
          </g>

          {/* Zapatilla deportiva bimaterial */}
          <g>
            <path d={sneaker1.body} fill="#475569" stroke="#1e293b" strokeWidth="0.7" />
            <path d={sneaker1.sole} fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.6" />
          </g>

          {/* Flecha sutil de dirección biomecánica */}
          {spec.arrow && !compact && (
            <g opacity="0.7">
              <line
                x1={spec.arrow.from.x}
                y1={spec.arrow.from.y}
                x2={spec.arrow.to.x}
                y2={spec.arrow.to.y}
                stroke="#d94e43"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              <circle cx={spec.arrow.to.x} cy={spec.arrow.to.y} r="3.2" fill="#d94e43" />
            </g>
          )}
        </svg>

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
