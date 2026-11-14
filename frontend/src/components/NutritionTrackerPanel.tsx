import React, { useCallback, useEffect, useState } from 'react';
import {
  Droplets,
  Flame,
  Plus,
  RefreshCw,
  Scale,
  Trash2,
  Utensils,
} from 'lucide-react';
import { nutritionApi } from '../services/api';
import type {
  ActivityLevel,
  BiologicalSex,
  MealType,
  NutritionDayOverviewResponse,
} from '../types';

interface NutritionTrackerPanelProps {
  isAuthenticated: boolean;
  onDataChanged: () => void;
  onRequireAuth: () => void;
}

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Desayuno',
  LUNCH: 'Almuerzo',
  DINNER: 'Cena',
  SNACK: 'Snack',
  HYDRATION: 'Hidratación',
};

const QUICK_PRESETS: Array<{
  mealType: MealType;
  foodName: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterMl: number;
}> = [
  {
    mealType: 'BREAKFAST',
    foodName: '3 Huevos + Arepa Integral + Aguacate',
    calories: 520,
    proteinGrams: 27,
    carbsGrams: 40,
    fatsGrams: 26,
    waterMl: 350,
  },
  {
    mealType: 'LUNCH',
    foodName: '180g Pechuga Plancha + Arroz + Ensalada',
    calories: 640,
    proteinGrams: 52,
    carbsGrams: 68,
    fatsGrams: 14,
    waterMl: 500,
  },
  {
    mealType: 'DINNER',
    foodName: '160g Atún / Salmón + Papa Cocida + Vegetales',
    calories: 510,
    proteinGrams: 41,
    carbsGrams: 48,
    fatsGrams: 15,
    waterMl: 400,
  },
  {
    mealType: 'SNACK',
    foodName: 'Yogur Griego + Avena 40g + Banano',
    calories: 360,
    proteinGrams: 21,
    carbsGrams: 54,
    fatsGrams: 6,
    waterMl: 300,
  },
  {
    mealType: 'HYDRATION',
    foodName: 'Vaso Grande de Agua / Electrolitos',
    calories: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatsGrams: 0,
    waterMl: 500,
  },
];

export const NutritionTrackerPanel: React.FC<NutritionTrackerPanelProps> = ({
  isAuthenticated,
  onDataChanged,
  onRequireAuth,
}) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [overview, setOverview] = useState<NutritionDayOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showBiometricsForm, setShowBiometricsForm] = useState(false);
  const [weightKg, setWeightKg] = useState('74.5');
  const [heightCm, setHeightCm] = useState('176');
  const [age, setAge] = useState('28');
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>('M');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('MODERATE');
  const [dailyWaterGoalMl, setDailyWaterGoalMl] = useState('2800');

  const [mealType, setMealType] = useState<MealType>('LUNCH');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [proteinGrams, setProteinGrams] = useState('');
  const [carbsGrams, setCarbsGrams] = useState('');
  const [fatsGrams, setFatsGrams] = useState('');
  const [waterMl, setWaterMl] = useState('250');

  const applyOverview = (res: NutritionDayOverviewResponse) => {
    setOverview(res);
    setWeightKg(String(res.biometrics.weightKg));
    setHeightCm(String(res.biometrics.heightCm));
    setAge(String(res.biometrics.age));
    setBiologicalSex(res.biometrics.biologicalSex);
    setActivityLevel(res.biometrics.activityLevel);
    setDailyWaterGoalMl(String(res.biometrics.dailyWaterGoalMl));
  };

  const fetchDay = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await nutritionApi.getDay(selectedDate);
      applyOverview(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la nutrición.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedDate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await nutritionApi.getDay(selectedDate);
        if (active) applyOverview(res);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar la nutrición.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [isAuthenticated, selectedDate]);

  const handleSaveBiometrics = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await nutritionApi.updateBiometrics({
        weightKg: Number(weightKg),
        heightCm: Number(heightCm),
        age: Number(age),
        biologicalSex,
        activityLevel,
        dailyWaterGoalMl: Number(dailyWaterGoalMl),
      });
      setShowBiometricsForm(false);
      await fetchDay();
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando biometría.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickLog = async (preset: (typeof QUICK_PRESETS)[number]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await nutritionApi.logIntake({
        localDate: selectedDate,
        ...preset,
      });
      setOverview(res);
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la comida.');
    } finally {
      setSaving(false);
    }
  };

  const handleCustomLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await nutritionApi.logIntake({
        localDate: selectedDate,
        mealType,
        foodName: foodName.trim(),
        calories: Math.max(0, Number(calories || 0)),
        proteinGrams: Math.max(0, Number(proteinGrams || 0)),
        carbsGrams: Math.max(0, Number(carbsGrams || 0)),
        fatsGrams: Math.max(0, Number(fatsGrams || 0)),
        waterMl: Math.max(0, Number(waterMl || 0)),
      });
      setOverview(res);
      setFoodName('');
      setCalories('');
      setProteinGrams('');
      setCarbsGrams('');
      setFatsGrams('');
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el registro nutricional.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await nutritionApi.deleteLog(id);
      setOverview(res);
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el registro.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="ch-panel rounded-2xl p-6 text-center space-y-3">
        <Utensils className="w-8 h-8 text-[#c8f135] mx-auto" aria-hidden="true" />
        <h3 className="text-lg font-black text-white">Monitoreo Nutricional y Metas Mifflin-St Jeor</h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
          Calcula tus calorías exactas, proteína en g/kg e hidratación según tu peso y objetivo de entrenamiento, y audita en tiempo real tu déficit o superávit semanal.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="px-5 py-2.5 rounded-xl bg-[#c8f135] text-[#05070a] text-xs font-black cursor-pointer"
        >
          Activar Seguimiento de Dieta
        </button>
      </div>
    );
  }

  const pct = (val: number, goal: number) =>
    Math.min(100, Math.round((val / Math.max(1, goal)) * 100));

  return (
    <div data-testid="nutrition-tracker-panel" className="space-y-5">
      {/* Header + Fecha + Botón Biometría */}
      <div className="ch-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[#c8f135]" aria-hidden="true" />
            <span>Dieta, Macros e Hidratación</span>
          </h2>
          {overview && (
            <p className="text-xs text-zinc-400">
              {overview.targets.strategyLabel} · Promedio 7d:{' '}
              <strong className="text-white ch-tabular">{Math.round(overview.rolling7dAvgCalories)} kcal</strong> /{' '}
              <strong className="text-[#c8f135] ch-tabular">{overview.rolling7dAvgProteinGrams.toFixed(0)}g prot</strong>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            aria-label="Fecha de registro nutricional"
            className="rounded-xl bg-[#07090d] border border-white/15 px-3 py-2 text-xs text-white ch-tabular"
          />
          <button
            type="button"
            onClick={() => setShowBiometricsForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-bold text-white cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-[#c8f135]" aria-hidden="true" />
            <span>Biometría ({weightKg} kg)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* Drawer Biometría */}
      {showBiometricsForm && (
        <form
          onSubmit={handleSaveBiometrics}
          className="ch-panel-elevated rounded-2xl p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-6 gap-3 items-end"
        >
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-zinc-400">Peso (kg)</label>
            <input
              type="number"
              step="0.5"
              min={30}
              max={250}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full rounded-xl bg-[#07090d] border border-white/15 px-3 py-2 text-xs text-white ch-tabular"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-zinc-400">Altura (cm)</label>
            <input
              type="number"
              min={120}
              max={230}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full rounded-xl bg-[#07090d] border border-white/15 px-3 py-2 text-xs text-white ch-tabular"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-zinc-400">Edad</label>
            <input
              type="number"
              min={14}
              max={95}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-xl bg-[#07090d] border border-white/15 px-3 py-2 text-xs text-white ch-tabular"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-zinc-400">Sexo</label>
            <select
              value={biologicalSex}
              onChange={(e) => setBiologicalSex(e.target.value as BiologicalSex)}
              className="w-full rounded-xl bg-[#07090d] border border-white/15 px-3 py-2 text-xs text-white"
            >
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-zinc-400">Actividad</label>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
              className="w-full rounded-xl bg-[#07090d] border border-white/15 px-3 py-2 text-xs text-white"
            >
              <option value="SEDENTARY">Sedentario</option>
              <option value="LIGHT">Ligero</option>
              <option value="MODERATE">Moderado</option>
              <option value="ACTIVE">Alto</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] text-xs font-black py-2 px-3 cursor-pointer"
          >
            Recalcular
          </button>
        </form>
      )}

      {/* Tarjetas de Progreso Diario */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 ch-tabular">
          <div className="ch-panel rounded-xl p-3.5 space-y-2 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-bold uppercase inline-flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                Calorías
              </span>
              <span className="text-zinc-300 font-bold">
                {pct(overview.totals.calories, overview.targets.targetCalories)}%
              </span>
            </div>
            <div className="text-lg font-black text-white">
              {overview.totals.calories}{' '}
              <span className="text-xs font-semibold text-zinc-400">/ {overview.targets.targetCalories} kcal</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#c8f135]"
                style={{ width: `${pct(overview.totals.calories, overview.targets.targetCalories)}%` }}
              />
            </div>
          </div>

          <div className="ch-panel rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-bold uppercase">Proteína</span>
              <span className="text-[#c8f135] font-bold">
                {pct(overview.totals.proteinGrams, overview.targets.proteinGrams)}%
              </span>
            </div>
            <div className="text-lg font-black text-white">
              {overview.totals.proteinGrams.toFixed(0)}g{' '}
              <span className="text-xs font-semibold text-zinc-400">/ {overview.targets.proteinGrams}g</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#c8f135]"
                style={{ width: `${pct(overview.totals.proteinGrams, overview.targets.proteinGrams)}%` }}
              />
            </div>
          </div>

          <div className="ch-panel rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-bold uppercase">Carbs</span>
              <span className="text-sky-300 font-bold">
                {pct(overview.totals.carbsGrams, overview.targets.carbsGrams)}%
              </span>
            </div>
            <div className="text-lg font-black text-white">
              {overview.totals.carbsGrams.toFixed(0)}g{' '}
              <span className="text-xs font-semibold text-zinc-400">/ {overview.targets.carbsGrams}g</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-sky-400"
                style={{ width: `${pct(overview.totals.carbsGrams, overview.targets.carbsGrams)}%` }}
              />
            </div>
          </div>

          <div className="ch-panel rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-bold uppercase">Grasas</span>
              <span className="text-amber-300 font-bold">
                {pct(overview.totals.fatsGrams, overview.targets.fatsGrams)}%
              </span>
            </div>
            <div className="text-lg font-black text-white">
              {overview.totals.fatsGrams.toFixed(0)}g{' '}
              <span className="text-xs font-semibold text-zinc-400">/ {overview.targets.fatsGrams}g</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-amber-300"
                style={{ width: `${pct(overview.totals.fatsGrams, overview.targets.fatsGrams)}%` }}
              />
            </div>
          </div>

          <div className="ch-panel rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-bold uppercase inline-flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                Agua
              </span>
              <span className="text-sky-300 font-bold">
                {pct(overview.totals.waterMl, overview.targets.waterGoalMl)}%
              </span>
            </div>
            <div className="text-lg font-black text-white">
              {overview.totals.waterMl}{' '}
              <span className="text-xs font-semibold text-zinc-400">/ {overview.targets.waterGoalMl} ml</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-sky-400"
                style={{ width: `${pct(overview.totals.waterMl, overview.targets.waterGoalMl)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Botones de Carga Rápida */}
      <div className="ch-panel rounded-2xl p-4 space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          Registro en 1 Clic (Plantillas Calisthenics & LATAM)
        </span>
        <div className="flex flex-wrap gap-2">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.foodName}
              type="button"
              disabled={saving}
              onClick={() => handleQuickLog(preset)}
              className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-[#c8f135]/15 border border-white/10 hover:border-[#c8f135]/40 text-left transition cursor-pointer"
            >
              <div className="text-xs font-bold text-white">+ {preset.foodName}</div>
              <div className="text-[10px] text-zinc-400 ch-tabular">
                {preset.calories} kcal · {preset.proteinGrams}g prot · {preset.waterMl} ml agua
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Formulario Manual */}
      <form
        onSubmit={handleCustomLog}
        className="ch-panel rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-end"
      >
        <div className="col-span-2 sm:col-span-2 space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Toma</label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
            className="w-full rounded-xl bg-[#07090d] border border-white/15 px-2.5 py-2 text-xs text-white"
          >
            {(Object.keys(MEAL_LABELS) as MealType[]).map((m) => (
              <option key={m} value={m}>
                {MEAL_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-4 space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Alimento / Porción</label>
          <input
            type="text"
            required
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            placeholder="Ej: 150g carne magra + ensalada"
            className="w-full rounded-xl bg-[#07090d] border border-white/15 px-3 py-2 text-xs text-white"
          />
        </div>
        <div className="space-y-1 sm:col-span-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Kcal (0=auto)</label>
          <input
            type="number"
            min={0}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl bg-[#07090d] border border-white/15 px-2.5 py-2 text-xs text-white ch-tabular"
          />
        </div>
        <div className="space-y-1 sm:col-span-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Prot (g)</label>
          <input
            type="number"
            step="0.5"
            min={0}
            value={proteinGrams}
            onChange={(e) => setProteinGrams(e.target.value)}
            placeholder="35"
            className="w-full rounded-xl bg-[#07090d] border border-white/15 px-2.5 py-2 text-xs text-white ch-tabular"
          />
        </div>
        <div className="space-y-1 sm:col-span-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Carb (g)</label>
          <input
            type="number"
            step="0.5"
            min={0}
            value={carbsGrams}
            onChange={(e) => setCarbsGrams(e.target.value)}
            placeholder="45"
            className="w-full rounded-xl bg-[#07090d] border border-white/15 px-2.5 py-2 text-xs text-white ch-tabular"
          />
        </div>
        <div className="space-y-1 sm:col-span-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Grasa (g)</label>
          <input
            type="number"
            step="0.5"
            min={0}
            value={fatsGrams}
            onChange={(e) => setFatsGrams(e.target.value)}
            placeholder="12"
            className="w-full rounded-xl bg-[#07090d] border border-white/15 px-2.5 py-2 text-xs text-white ch-tabular"
          />
        </div>
        <div className="space-y-1 sm:col-span-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Agua ml</label>
          <input
            type="number"
            min={0}
            value={waterMl}
            onChange={(e) => setWaterMl(e.target.value)}
            className="w-full rounded-xl bg-[#07090d] border border-white/15 px-2.5 py-2 text-xs text-white ch-tabular"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <button
            type="submit"
            disabled={saving}
            aria-label="Registrar alimento"
            className="w-full inline-flex items-center justify-center rounded-xl bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] font-black py-2 px-3 text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </form>

      {/* Historial del día */}
      <div className="ch-panel rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Registros de {selectedDate}
          </h3>
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-[#c8f135]" aria-hidden="true" />}
        </div>

        {overview && overview.logs.length === 0 && (
          <p className="text-xs text-zinc-400 py-4 text-center">
            Sin comidas registradas en esta fecha. Usa una plantilla rápida arriba para empezar en 2 segundos.
          </p>
        )}

        <div className="divide-y divide-white/[0.07]">
          {overview?.logs.map((entry) => (
            <div
              key={entry.id}
              className="py-2.5 flex items-center justify-between gap-3"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[10px] font-bold text-[#c8f135]">
                    {MEAL_LABELS[entry.mealType]}
                  </span>
                  <span className="text-sm font-bold text-white truncate">{entry.foodName}</span>
                </div>
                <p className="text-xs text-zinc-400 ch-tabular">
                  {entry.calories} kcal · P: {entry.proteinGrams}g · C: {entry.carbsGrams}g · G: {entry.fatsGrams}g · Agua: {entry.waterMl}ml
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleDeleteLog(entry.id)}
                aria-label={`Eliminar ${entry.foodName}`}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/10 transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
