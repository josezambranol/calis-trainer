import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { scheduleApi } from '../services/api';
import type {
  ScheduleOverviewResponse,
  ScheduledWorkoutItem,
  ScheduledWorkoutStatus,
} from '../types';

interface ScheduleCalendarPanelProps {
  isAuthenticated: boolean;
  onDataChanged: () => void;
  onRequireAuth: () => void;
}

const STATUS_BADGE: Record<ScheduledWorkoutStatus, { label: string; cls: string }> = {
  COMPLETED: {
    label: 'Completada',
    cls: 'bg-[#c8f135]/15 text-[#c8f135] border-[#c8f135]/35',
  },
  SCHEDULED: {
    label: 'Programada',
    cls: 'bg-sky-400/15 text-sky-300 border-sky-400/35',
  },
  MISSED: {
    label: 'Saltada (Sin registro)',
    cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  RESCHEDULED: {
    label: 'Reprogramada',
    cls: 'bg-amber-400/15 text-amber-300 border-amber-400/35',
  },
  SKIPPED: {
    label: 'Pausada',
    cls: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/35',
  },
};

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export const ScheduleCalendarPanel: React.FC<ScheduleCalendarPanelProps> = ({
  isAuthenticated,
  onDataChanged,
  onRequireAuth,
}) => {
  const [overview, setOverview] = useState<ScheduleOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newTitle, setNewTitle] = useState('Empuje, Tracción y Core');
  const [newDuration, setNewDuration] = useState(30);
  const [rescheduleDates, setRescheduleDates] = useState<Record<string, string>>({});
  const [rescheduleReasons, setRescheduleReasons] = useState<Record<string, string>>({});

  const fetchOverview = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await scheduleApi.getOverview();
      setOverview(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando calendario.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await scheduleApi.getOverview();
        if (active) setOverview(res);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Error cargando calendario.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const handleAutoPopulate = async () => {
    setBusyId('auto');
    setError(null);
    try {
      await scheduleApi.autoPopulate(2);
      await fetchOverview();
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo autopoblar calendario.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusyId('create');
    setError(null);
    try {
      await scheduleApi.upsertSession({
        scheduledDate: newDate,
        routineTitle: newTitle.trim(),
        durationMinutes: newDuration,
        focus: 'Sesión programada por objetivo en agenda real',
      });
      await fetchOverview();
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo programar la sesión.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReschedule = async (session: ScheduledWorkoutItem, targetDate: string) => {
    setBusyId(session.id);
    setError(null);
    try {
      const reason = rescheduleReasons[session.id]?.trim() || 'Reprogramada por verificación de agenda';
      await scheduleApi.rescheduleSession(session.id, { targetDate, reason });
      await fetchOverview();
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reprogramar la sesión.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (sessionId: string) => {
    setBusyId(sessionId);
    setError(null);
    try {
      await scheduleApi.deleteSession(sessionId);
      await fetchOverview();
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la sesión.');
    } finally {
      setBusyId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="ch-panel rounded-2xl p-6 text-center space-y-3">
        <CalendarCheck className="w-8 h-8 text-[#c8f135] mx-auto" aria-hidden="true" />
        <h3 className="text-lg font-black text-white">Agenda Real y Verificación de Faltas</h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
          Programa fechas específicas de entrenamiento. CalisHome audita cada día automáticamente frente a tus sesiones completadas, marca faltas y te permite reprogramar sin perder el ritmo.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="px-5 py-2.5 rounded-xl bg-[#c8f135] text-[#05070a] text-xs font-black cursor-pointer"
        >
          Iniciar Sesión para Programar
        </button>
      </div>
    );
  }

  const missedSessions =
    overview?.sessions.filter((s) => s.status === 'MISSED') ?? [];

  return (
    <div data-testid="schedule-calendar-panel" className="space-y-5">
      <div className="ch-panel rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[#c8f135]" aria-hidden="true" />
            <span>Calendario y Verificación de Asistencia</span>
          </h2>
          {overview && (
            <p className="text-xs text-zinc-400 ch-tabular">
              Últimos 14 días: <strong className="text-white">{overview.adherence.completedCount14d}</strong> completadas ·{' '}
              <strong className="text-rose-300">{overview.adherence.missedCount14d}</strong> saltadas ·{' '}
              <strong className="text-amber-300">{overview.adherence.rescheduledCount14d}</strong> reprogramadas ·{' '}
              Adherencia real: <strong className="text-[#c8f135]">{overview.adherence.adherencePercent14d}%</strong>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleAutoPopulate}
          disabled={busyId === 'auto'}
          data-testid="auto-populate-schedule-btn"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] text-xs font-black transition-colors disabled:opacity-60 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span>{busyId === 'auto' ? 'Generando...' : 'Autopoblar Próximas 2 Semanas'}</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {missedSessions.length > 0 && overview && (
        <div
          data-testid="missed-sessions-alert"
          className="rounded-2xl border border-rose-500/45 bg-rose-500/[0.08] p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-rose-300 font-black text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>
              Verificación Automática: {missedSessions.length} sesión(es) programada(s) sin registro de ejecución
            </span>
          </div>

          <div className="space-y-3">
            {missedSessions.map((session) => {
              const tomorrow = addDaysIso(overview.today, 1);
              const selectedTarget = rescheduleDates[session.id] ?? overview.today;
              return (
                <div
                  key={session.id}
                  data-testid={`missed-session-card-${session.scheduledDate}`}
                  className="rounded-xl bg-[#07090d]/80 border border-rose-500/30 p-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-rose-300 ch-tabular">{session.scheduledDate}</div>
                    <div className="text-sm font-black text-white">{session.routineTitle}</div>
                    <div className="text-xs text-zinc-400">{session.focus}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Motivo de sesión saltada"
                      value={rescheduleReasons[session.id] ?? ''}
                      onChange={(e) =>
                        setRescheduleReasons((prev) => ({ ...prev, [session.id]: e.target.value }))
                      }
                      className="rounded-lg bg-[#0d1118] border border-white/15 px-2.5 py-1.5 text-xs text-zinc-200"
                    >
                      <option value="">Motivo de falta (opcional)</option>
                      <option value="Falta de tiempo laboral">Falta de tiempo</option>
                      <option value="Fatiga o dolor muscular">Fatiga / recuperación</option>
                      <option value="Viaje o imprevisto">Viaje / imprevisto</option>
                    </select>

                    <input
                      type="date"
                      min={overview.today}
                      value={selectedTarget}
                      onChange={(e) =>
                        setRescheduleDates((prev) => ({ ...prev, [session.id]: e.target.value }))
                      }
                      aria-label="Nueva fecha para reprogramar"
                      className="rounded-lg bg-[#0d1118] border border-white/15 px-2.5 py-1.5 text-xs text-zinc-100 ch-tabular"
                    />

                    <button
                      type="button"
                      disabled={busyId === session.id}
                      onClick={() => handleReschedule(session, selectedTarget)}
                      className="px-3 py-1.5 rounded-lg bg-[#c8f135] text-[#05070a] text-xs font-black hover:bg-[#d9fc5a] transition-colors cursor-pointer"
                    >
                      Reprogramar
                    </button>

                    <button
                      type="button"
                      disabled={busyId === session.id}
                      onClick={() => handleReschedule(session, tomorrow)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/15 text-zinc-200 text-xs font-bold hover:border-white/30 transition-colors cursor-pointer"
                    >
                      Mover a Mañana
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Programar nueva sesión manual */}
      <form
        onSubmit={handleCreateSession}
        className="ch-panel rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-3 space-y-1">
          <label htmlFor="schedule-date-input" className="text-[11px] font-bold uppercase text-zinc-400">
            Fecha
          </label>
          <input
            id="schedule-date-input"
            type="date"
            required
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full rounded-xl bg-[#07090d] border border-white/15 px-3 py-2 text-xs text-white ch-tabular"
          />
        </div>
        <div className="sm:col-span-5 space-y-1">
          <label htmlFor="schedule-title-input" className="text-[11px] font-bold uppercase text-zinc-400">
            Enfoque / Sesión
          </label>
          <input
            id="schedule-title-input"
            type="text"
            required
            maxLength={140}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded-xl bg-[#07090d] border border-white/15 px-3 py-2 text-xs text-white"
            placeholder="Ej: Empuje Torso & Hollow Body"
          />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <label htmlFor="schedule-duration-input" className="text-[11px] font-bold uppercase text-zinc-400">
            Minutos
          </label>
          <select
            id="schedule-duration-input"
            value={newDuration}
            onChange={(e) => setNewDuration(Number(e.target.value))}
            className="w-full rounded-xl bg-[#07090d] border border-white/15 px-3 py-2 text-xs text-white"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busyId === 'create'}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white text-xs font-black py-2 px-3 transition-colors cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4 text-[#c8f135]" aria-hidden="true" />
            <span>Agendar</span>
          </button>
        </div>
      </form>

      {/* Listado de agenda */}
      <div className="ch-panel rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Sesiones Programadas (±14 días)
          </h3>
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-[#c8f135]" aria-hidden="true" />}
        </div>

        {overview && overview.sessions.length === 0 && (
          <p className="text-xs text-zinc-400 py-4 text-center">
            No tienes fechas bloqueadas aún. Usa “Autopoblar Próximas 2 Semanas” o agenda una fecha arriba.
          </p>
        )}

        <div className="divide-y divide-white/[0.07]">
          {overview?.sessions.map((item) => {
            const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.SCHEDULED;
            return (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-200 ch-tabular">
                      {item.scheduledDate}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {item.rescheduledTo && (
                      <span className="text-[11px] text-amber-300 ch-tabular">
                        → Movida al {item.rescheduledTo}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">{item.routineTitle}</p>
                  <p className="text-xs text-zinc-400 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {item.durationMinutes} min
                    </span>
                    <span>· {item.focus}</span>
                    {item.missedReason && <span className="text-rose-300">· Motivo: {item.missedReason}</span>}
                  </p>
                </div>

                {item.status !== 'COMPLETED' ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={busyId === item.id}
                    aria-label={`Eliminar sesión del ${item.scheduledDate}`}
                    className="self-end sm:self-center p-2 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#c8f135]">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    Verificada
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
