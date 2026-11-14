import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Droplets,
  Flame,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { coachingApi } from '../services/api';
import type { CoachingInsight, InsightSeverity, PrecisionCoachingResponse } from '../types';

interface CoachingPrecisionPanelProps {
  isAuthenticated: boolean;
  refreshSignal: number;
  onNavigateTab: (tab: 'training' | 'schedule' | 'roadmap' | 'nutrition') => void;
  onRequireAuth: () => void;
}

const SEVERITY_STYLES: Record<
  InsightSeverity,
  { border: string; badge: string; label: string }
> = {
  CRITICAL: {
    border: 'border-rose-500/45 bg-rose-500/[0.06]',
    badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
    label: 'Acción Prioritaria',
  },
  WARNING: {
    border: 'border-amber-400/40 bg-amber-400/[0.05]',
    badge: 'bg-amber-400/15 text-amber-300 border border-amber-400/35',
    label: 'Desviación Detectada',
  },
  POSITIVE: {
    border: 'border-[#c8f135]/40 bg-[#c8f135]/[0.05]',
    badge: 'bg-[#c8f135]/15 text-[#c8f135] border border-[#c8f135]/35',
    label: 'En Zona Óptima',
  },
  INFO: {
    border: 'border-sky-400/35 bg-sky-400/[0.05]',
    badge: 'bg-sky-400/15 text-sky-300 border border-sky-400/35',
    label: 'Telemetría Activa',
  },
};

function renderSeverityIcon(severity: InsightSeverity) {
  switch (severity) {
    case 'CRITICAL':
      return <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />;
    case 'WARNING':
      return <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />;
    case 'POSITIVE':
      return <CheckCircle2 className="w-4 h-4 text-[#c8f135] shrink-0" aria-hidden="true" />;
    default:
      return <Activity className="w-4 h-4 text-sky-300 shrink-0" aria-hidden="true" />;
  }
}

export const CoachingPrecisionPanel: React.FC<CoachingPrecisionPanelProps> = ({
  isAuthenticated,
  refreshSignal,
  onNavigateTab,
  onRequireAuth,
}) => {
  const [data, setData] = useState<PrecisionCoachingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await coachingApi.getInsights();
        if (active) setData(res);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el diagnóstico.');
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
      <section className="ch-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c8f135]">
            <Cpu className="w-4 h-4" aria-hidden="true" />
            Motor de Precisión Activo
          </div>
          <h2 className="text-base sm:text-lg font-black text-white">
            Diagnóstico cuantitativo sin mensajes genéricos
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
            Inicia sesión o prueba el acceso Demo Pro para auditar en vivo tus sesiones saltadas, déficit/superávit calórico real, proteína en g/kg y fatiga por RPE.
          </p>
        </div>
        <button
          type="button"
          onClick={onRequireAuth}
          className="px-4 py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] text-xs font-black transition-colors shrink-0 cursor-pointer"
        >
          Activar Diagnóstico en Vivo
        </button>
      </section>
    );
  }

  const normalizeTab = (tab: string): 'training' | 'schedule' | 'roadmap' | 'nutrition' => {
    if (tab === 'schedule' || tab === 'roadmap' || tab === 'nutrition') return tab;
    return 'training';
  };

  return (
    <section data-testid="precision-coaching-panel" className="ch-panel rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#c8f135]">
            <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
            Coach Cuantitativo en Tiempo Real
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">
            Auditoría de Agenda, Dieta y Carga
          </h2>
        </div>

        {data && (
          <div className="flex flex-wrap items-center gap-2 text-xs ch-tabular">
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-200 font-semibold">
              Adherencia 14d: <strong className="text-[#c8f135]">{data.adherencePercent14d}%</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-200 font-semibold inline-flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              {Math.round(data.avgCalories7d)} / {data.macroTargets.targetCalories} kcal
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-200 font-semibold">
              Prot: <strong>{data.avgProtein7d.toFixed(0)}g</strong> / {data.macroTargets.proteinGrams}g
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-200 font-semibold inline-flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              {Math.round(data.avgWaterMl7d)} ml
            </span>
          </div>
        )}
      </div>

      {loading && !data && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 py-3">
          <RefreshCw className="w-4 h-4 animate-spin text-[#c8f135]" aria-hidden="true" />
          Analizando telemetría histórica de sesiones y nutrición...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.insights.map((insight: CoachingInsight) => {
            const theme = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.INFO;
            return (
              <article
                key={insight.id}
                data-testid={`coaching-insight-${insight.id}`}
                className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${theme.border}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {insight.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${theme.badge}`}>
                      {theme.label}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    {renderSeverityIcon(insight.severity)}
                    <h3 className="text-sm font-black text-white leading-snug">{insight.title}</h3>
                  </div>
                  <p className="text-xs text-zinc-300 bg-[#07090d]/70 rounded-lg px-2.5 py-2 border border-white/[0.06] ch-tabular">
                    <strong className="text-zinc-100">Evidencia:</strong> {insight.telemetryEvidence}
                  </p>
                  <p className="text-xs text-zinc-200 leading-relaxed">{insight.recommendation}</p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onNavigateTab(normalizeTab(insight.actionTab))}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c8f135] hover:text-[#d9fc5a] transition-colors cursor-pointer"
                  >
                    <span>{insight.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
