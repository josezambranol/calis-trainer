import React, { useEffect, useState } from 'react';
import {
  BatteryCharging,
  CheckCircle2,
  GitBranch,
  Lock,
  PlayCircle,
  RefreshCw,
  Target,
} from 'lucide-react';
import { nutritionApi } from '../services/api';
import type { DevelopmentRoadmapResponse } from '../types';

interface DevelopmentPlanPanelProps {
  isAuthenticated: boolean;
  refreshSignal: number;
  onInspectExercise: (exerciseId: string, title: string) => void;
  onRequireAuth: () => void;
}

export const DevelopmentPlanPanel: React.FC<DevelopmentPlanPanelProps> = ({
  isAuthenticated,
  refreshSignal,
  onInspectExercise,
  onRequireAuth,
}) => {
  const [roadmap, setRoadmap] = useState<DevelopmentRoadmapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await nutritionApi.getRoadmap();
        if (active) setRoadmap(res);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error cargando plan de desarrollo.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [isAuthenticated, refreshSignal]);

  if (!isAuthenticated) {
    return (
      <div className="ch-panel rounded-2xl p-6 text-center space-y-3">
        <GitBranch className="w-8 h-8 text-[#c8f135] mx-auto" aria-hidden="true" />
        <h3 className="text-lg font-black text-white">Plan por Objetivo, Habilidades y Recuperación</h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
          A diferencia de un video suelto en redes, CalisHome construye tu ruta progresiva de 12 semanas, desbloquea peldaños de calistenia según tus sesiones reales y mide recuperación muscular por grupo.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="px-5 py-2.5 rounded-xl bg-[#c8f135] text-[#05070a] text-xs font-black cursor-pointer"
        >
          Ver Mi Mapa de Desarrollo
        </button>
      </div>
    );
  }

  return (
    <div data-testid="development-plan-panel" className="space-y-5">
      {loading && !roadmap && (
        <div className="ch-panel rounded-2xl p-5 flex items-center gap-2 text-xs text-zinc-400">
          <RefreshCw className="w-4 h-4 animate-spin text-[#c8f135]" aria-hidden="true" />
          Calculando periodización por objetivo y matriz muscular...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {roadmap && (
        <>
          {/* Cabecera Estratégica por Objetivo */}
          <section className="ch-panel rounded-2xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-7 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#c8f135]">
                <Target className="w-3.5 h-3.5" aria-hidden="true" />
                Plan Maestro de 12 Semanas · {roadmap.goalLabel}
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {roadmap.targets.strategyLabel}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {roadmap.targets.rationale}
              </p>
            </div>

            <div className="lg:col-span-5 grid grid-cols-3 gap-2.5 text-center ch-tabular">
              <div className="rounded-xl bg-[#07090d] border border-white/10 p-3">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Meta Diaria</div>
                <div className="text-lg font-black text-[#c8f135]">{roadmap.targets.targetCalories} kcal</div>
              </div>
              <div className="rounded-xl bg-[#07090d] border border-white/10 p-3">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Proteína</div>
                <div className="text-lg font-black text-white">{roadmap.targets.proteinGrams}g</div>
              </div>
              <div className="rounded-xl bg-[#07090d] border border-white/10 p-3">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Sesiones</div>
                <div className="text-lg font-black text-white">{roadmap.totalWorkoutsCompleted}</div>
              </div>
            </div>
          </section>

          {/* Matriz de Recuperación Muscular 48h */}
          <section className="ch-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <BatteryCharging className="w-4 h-4 text-[#c8f135]" aria-hidden="true" />
                <span>Matriz de Recuperación Tisular 48h</span>
              </h3>
              <span className="text-[11px] text-zinc-400">Ventaja adaptativa sobre rutinas aleatorias</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {roadmap.muscleRecovery.map((item) => (
                <div
                  key={item.muscleGroup}
                  className="rounded-xl bg-[#07090d] border border-white/10 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{item.muscleGroup}</span>
                    <span className="text-xs font-black text-[#c8f135] ch-tabular">
                      {item.readinessPercent}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#c8f135] transition-all"
                      style={{ width: `${item.readinessPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 ch-tabular">
                    {item.statusLabel} · {item.hoursSinceLastStimulus >= 99 ? 'Descansado' : `Hace ${item.hoursSinceLastStimulus}h`}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Fases del Mesociclo */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {roadmap.phases.map((phase) => (
              <article
                key={phase.phaseNumber}
                className={`rounded-2xl border p-4 space-y-2.5 ${
                  phase.isCurrent
                    ? 'bg-[#c8f135]/[0.07] border-[#c8f135]/45'
                    : 'bg-[#0d1118] border-white/10 opacity-85'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    {phase.weeksRange}
                  </span>
                  {phase.isCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-[#c8f135] text-[#05070a] text-[10px] font-black uppercase">
                      Fase Actual
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-white">{phase.title}</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">{phase.objective}</p>
                <div className="pt-2 border-t border-white/10 space-y-1.5 text-xs">
                  <p className="text-zinc-200">
                    <strong className="text-[#c8f135]">Entreno:</strong> {phase.trainingFocus}
                  </p>
                  <p className="text-zinc-300">
                    <strong className="text-sky-300">Nutrición:</strong> {phase.nutritionRule}
                  </p>
                </div>
              </article>
            ))}
          </section>

          {/* Árbol de Progresión Técnica de Calistenia */}
          <section className="ch-panel rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#c8f135]" aria-hidden="true" />
                <span>Árboles de Progresión Calisténica</span>
              </h3>
              <span className="text-xs text-zinc-400">Pulsa cualquier movimiento para ver su animación técnica</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadmap.skillLadders.map((ladder) => (
                <div
                  key={ladder.category}
                  className="rounded-xl bg-[#07090d] border border-white/10 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-white">{ladder.ladderName}</h4>
                      <p className="text-[11px] text-zinc-400">
                        Nivel actual: <strong className="text-[#c8f135]">{ladder.currentStepTitle}</strong>
                      </p>
                    </div>
                    <span className="text-xs font-black text-[#c8f135] ch-tabular">
                      {ladder.progressPercent}%
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {ladder.steps.map((step) => (
                      <button
                        key={step.exerciseId}
                        type="button"
                        onClick={() => onInspectExercise(step.exerciseId, step.title)}
                        className={`w-full text-left px-3 py-2 rounded-lg border flex items-center justify-between gap-2 transition cursor-pointer ${
                          step.unlocked
                            ? 'bg-white/[0.04] border-white/10 hover:border-[#c8f135]/40 text-white'
                            : 'bg-transparent border-white/[0.05] text-zinc-500 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {step.unlocked ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#c8f135] shrink-0" aria-hidden="true" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-zinc-600 shrink-0" aria-hidden="true" />
                          )}
                          <span className="text-xs font-bold truncate">
                            {step.order}. {step.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-zinc-400 ch-tabular">{step.targetMetric}</span>
                          <PlayCircle className="w-3.5 h-3.5 text-[#c8f135]" aria-hidden="true" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
