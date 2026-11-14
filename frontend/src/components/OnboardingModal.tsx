import React, { useState } from 'react';
import { Sparkles, Clock, Calendar, Check, ArrowRight, ArrowLeft, Trophy, Zap, Shield, Flame, X } from 'lucide-react';
import type { DayOfWeek, Goal, SessionDuration, UserLevel, UserProfile } from '../types';
import { DAYS_MAP } from '../utils/routineGenerator';
import { requestNotificationPermission } from '../utils/notifications';
import { detectBrowserTimezone } from '../services/storage';

interface OnboardingModalProps {
  isOpen: boolean;
  initialProfile?: UserProfile | null;
  onSave: (data: Partial<UserProfile>) => Promise<void> | void;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  initialProfile,
  onSave,
  onClose,
}) => {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form states (el componente se monta fresco cada vez que se abre)
  const [level, setLevel] = useState<UserLevel>(initialProfile?.level || 'intermedio');
  const [goal, setGoal] = useState<Goal>(initialProfile?.goal || 'fuerza_hipertrofia');
  const [duration, setDuration] = useState<SessionDuration>(initialProfile?.duration || 30);
  const [scheduledDays, setScheduledDays] = useState<DayOfWeek[]>(
    initialProfile?.scheduledDays || ['lunes', 'miercoles', 'viernes']
  );
  const [reminderTime, setReminderTime] = useState<string>(
    initialProfile?.reminderTime || '19:00'
  );

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleDay = (dayId: DayOfWeek) => {
    if (scheduledDays.includes(dayId)) {
      if (scheduledDays.length > 1) {
        setScheduledDays(scheduledDays.filter((d) => d !== dayId));
      }
    } else {
      setScheduledDays([...scheduledDays, dayId]);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await requestNotificationPermission();
      await onSave({
        level,
        goal,
        duration,
        scheduledDays,
        reminderTime,
        timezone: detectBrowserTimezone(),
        notificationsEnabled: true,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Diagnóstico y configuración de rutina"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
    >
      <div className="relative w-full max-w-xl bg-[#0d1118] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar diagnóstico"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress Bar Header */}
        <div className="mb-6 pr-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
            <span>PASO {step} DE 4</span>
            <span className="text-emerald-400 font-bold">{Math.round((step / 4) * 100)}% COMPLETADO</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: NIVEL DE ENTRENAMIENTO */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center sm:text-left mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-white">¿Cuál es tu nivel actual?</h3>
              <p className="text-sm text-slate-400 mt-1">
                Adaptaremos las variantes de ejercicios (solo suelo y pared) para que entrenes sin frustrarte ni lesionarte.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'principiante' as UserLevel,
                  title: 'Principiante',
                  desc: 'Hago entre 0 y 5 flexiones. Quiero aprender técnica básica, flexiones en pared y sentadillas.',
                  icon: Shield,
                  badge: 'Inicio seguro',
                },
                {
                  id: 'intermedio' as UserLevel,
                  title: 'Intermedio',
                  desc: 'Hago entre 6 y 15 flexiones completas seguidas. Busco ganar músculo y fuerza consistente.',
                  icon: Zap,
                  badge: 'Más popular',
                },
                {
                  id: 'avanzado' as UserLevel,
                  title: 'Avanzado',
                  desc: 'Hago +15 flexiones con facilidad, flexiones diamante, pica push-ups y busco alta intensidad.',
                  icon: Trophy,
                  badge: 'Alta exigencia',
                },
              ].map((item) => {
                const isSelected = level === item.id;
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => setLevel(item.id)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start space-x-4 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl ${
                        isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-base">{item.title}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 ${
                        isSelected ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: OBJETIVO Y METAS */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center sm:text-left mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-white">¿Cuál es tu objetivo principal?</h3>
              <p className="text-sm text-slate-400 mt-1">
                Estructuraremos el volumen de series y repeticiones enfocado en tu meta.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'fuerza_hipertrofia' as Goal,
                  title: 'Ganar Fuerza y Tono Muscular',
                  desc: 'Pectoral, espalda, hombros, piernas y core firmes con calistenia pura progresiva.',
                  icon: Flame,
                },
                {
                  id: 'resistencia_quemagrasa' as Goal,
                  title: 'Quema de Grasa y Condición Física',
                  desc: 'Circuitos más continuos con descansos cortos para acelerar el metabolismo en casa.',
                  icon: Zap,
                },
                {
                  id: 'movilidad_salud' as Goal,
                  title: 'Movilidad, Postura y Salud Articular',
                  desc: 'Aliviar tensión de espalda baja, cuello y mejorar postura con control corporal.',
                  icon: Sparkles,
                },
              ].map((item) => {
                const isSelected = goal === item.id;
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => setGoal(item.id)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start space-x-4 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl ${
                        isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-white text-base block">{item.title}</span>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 ${
                        isSelected ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: DURACIÓN POR SESIÓN */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center sm:text-left mb-4">
              <h3 className="text-xl sm:text-2xl font-bold text-white">¿Cuánto tiempo tienes para entrenar?</h3>
              <p className="text-sm text-slate-400 mt-1">
                Sin excusas: ajustamos el número de ejercicios para que encaje perfecto en tu día.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { min: 15 as SessionDuration, label: 'Express', desc: '3-4 ejercicios a 2 series. Rápido y efectivo.' },
                { min: 30 as SessionDuration, label: 'Estándar', desc: '5 ejercicios a 3 series. El punto óptimo.', recommended: true },
                { min: 45 as SessionDuration, label: 'Intenso', desc: '6-7 ejercicios a 4 series. Máximo estímulo.' },
              ].map((item) => {
                const isSelected = duration === item.min;
                return (
                  <div
                    key={item.min}
                    onClick={() => setDuration(item.min)}
                    className={`cursor-pointer p-4 rounded-2xl border text-center transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      {item.recommended && (
                        <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 mb-2 border border-emerald-500/30">
                          Recomendado
                        </span>
                      )}
                      <div className="flex items-center justify-center space-x-1.5 text-2xl font-black text-white">
                        <Clock className="w-5 h-5 text-emerald-400" />
                        <span>{item.min}m</span>
                      </div>
                      <span className="block font-bold text-slate-200 text-sm mt-1">{item.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: DÍAS Y RECORDATORIOS */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="text-center sm:text-left mb-2">
              <h3 className="text-xl sm:text-2xl font-bold text-white">Plan semanal y Recordatorios</h3>
              <p className="text-sm text-slate-400 mt-1">
                Elige qué días entrenarás y a qué hora quieres recibir tu recordatorio para no perder la racha.
              </p>
            </div>

            {/* Días de la semana */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Días de entrenamiento ({scheduledDays.length} seleccionados)
              </label>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {DAYS_MAP.map((d) => {
                  const active = scheduledDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(d.id)}
                      className={`py-3 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center ${
                        active
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 scale-[1.02]'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700/80'
                      }`}
                    >
                      <span>{d.short}</span>
                      <span className="text-[10px] mt-1 font-normal opacity-80">
                        {active ? 'Entreno' : 'Libre'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hora del recordatorio */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3 text-left">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Hora de la Alerta Diaria</h4>
                  <p className="text-xs text-slate-400">Recibirás una notificación en tu pantalla</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-sm outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
            >
              <span>Siguiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-6 py-2.5 rounded-xl text-sm transition-all shadow-xl shadow-emerald-500/25 disabled:opacity-60"
            >
              <span>{saving ? 'Calculando plan...' : '¡Generar Mi Plan de Rutinas!'}</span>
              <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
