import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Download,
  Flame,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { userApi, type AccountDataExportDto } from '../services/api';

export const AccountPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [exportedSummary, setExportedSummary] = useState<AccountDataExportDto | null>(null);
  const [confirmWord, setConfirmWord] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const exportMutation = useMutation({
    mutationFn: () => userApi.exportMyData(),
    onSuccess: (data) => {
      setErrorMessage('');
      setExportedSummary(data);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `calishome-datos-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatusMessage('Archivo JSON descargado correctamente.');
    },
    onError: (err) => {
      setErrorMessage(
        err instanceof Error ? err.message : 'No pudimos exportar tus datos en este momento.'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => userApi.deleteMyAccount(),
    onSuccess: async () => {
      queryClient.clear();
      await logout();
      navigate('/', { replace: true });
    },
    onError: (err) => {
      setErrorMessage(
        err instanceof Error ? err.message : 'No pudimos eliminar tu cuenta en este momento.'
      );
    },
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#07090d] ch-backdrop-grid text-zinc-100 flex items-center justify-center p-4">
        <div className="ch-panel-elevated rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <ShieldCheck className="w-10 h-10 text-[#c8f135] mx-auto" aria-hidden="true" />
          <h1 className="text-2xl font-black text-white">Inicia sesión para gestionar tu cuenta</h1>
          <p className="text-xs text-zinc-400">
            Desde aquí puedes descargar una copia portátil de tus datos o solicitar la eliminación permanente de tu cuenta.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <Link
              to="/login"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] font-black text-xs transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-200 font-bold text-xs transition-colors"
            >
              Volver al Panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canConfirmDelete = confirmWord.trim().toUpperCase() === 'ELIMINAR';

  return (
    <div className="min-h-screen bg-[#07090d] ch-backdrop-grid text-zinc-100 flex flex-col">
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-xs font-bold text-zinc-400 hover:text-white bg-white/[0.04] border border-white/10 px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Volver al Panel</span>
          </Link>

          <Link
            to="/plans"
            className="inline-flex items-center space-x-1.5 text-xs font-extrabold px-3 py-2 rounded-lg bg-[#c8f135]/15 border border-[#c8f135]/40 text-[#c8f135] hover:bg-[#c8f135]/25 transition-colors"
          >
            <Crown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{user.planTier === 'PREMIUM' ? 'CALISHOME PRO' : 'Planes'}</span>
          </Link>
        </div>

        <header className="space-y-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#c8f135]">
            Control de Cuenta y Privacidad
          </p>
          <h1 className="text-3xl font-black text-white tracking-[-0.03em]">{user.name}</h1>
          <p className="text-xs text-zinc-400">
            {user.email} · {user.emailVerified ? 'Correo verificado' : 'Verificación pendiente'}
          </p>
        </header>

        {statusMessage && (
          <div
            role="status"
            className="rounded-xl bg-[#c8f135]/10 border border-[#c8f135]/40 p-3.5 flex items-center space-x-2 text-xs text-[#d9fc5a]"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl bg-rose-500/10 border border-rose-500/35 p-3.5 text-xs text-rose-300"
          >
            {errorMessage}
          </div>
        )}

        {/* Snapshot cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 ch-tabular">
          <div className="ch-panel rounded-xl p-4">
            <span className="text-[11px] text-zinc-400 font-semibold flex items-center space-x-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Racha Actual</span>
            </span>
            <p className="text-2xl font-black text-white mt-1">{user.streak} días</p>
          </div>
          <div className="ch-panel rounded-xl p-4">
            <span className="text-[11px] text-zinc-400 font-semibold flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-[#c8f135]" aria-hidden="true" />
              <span>Sesiones Totales</span>
            </span>
            <p className="text-2xl font-black text-white mt-1">{user.totalWorkoutsCompleted}</p>
          </div>
          <div className="ch-panel rounded-xl p-4">
            <span className="text-[11px] text-zinc-400 font-semibold flex items-center space-x-1.5">
              <Crown className="w-3.5 h-3.5 text-[#c8f135]" aria-hidden="true" />
              <span>Nivel / Plan</span>
            </span>
            <p className="text-2xl font-black text-white mt-1 capitalize">
              {user.level} · {user.planTier === 'PREMIUM' ? 'Pro' : 'Gratis'}
            </p>
          </div>
        </section>

        {/* Export JSON Data (ARCO / Ley 1581 / GDPR) */}
        <section className="ch-panel-elevated rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-black text-white flex items-center space-x-2">
                <Download className="w-4 h-4 text-[#c8f135]" aria-hidden="true" />
                <span>Portabilidad: Exportar mis datos (JSON)</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Descarga tu perfil completo, historial de entrenamientos, suscripciones y conteo de dispositivos push según Ley 1581 y GDPR.
              </p>
            </div>
            <button
              type="button"
              disabled={exportMutation.isPending}
              onClick={() => exportMutation.mutate()}
              className="shrink-0 inline-flex items-center justify-center space-x-2 bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] font-black px-5 py-2.5 rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{exportMutation.isPending ? 'Generando JSON...' : 'Exportar Datos JSON'}</span>
            </button>
          </div>

          {exportedSummary && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5 text-xs text-zinc-300 space-y-1 ch-tabular">
              <p className="font-bold text-white">Última exportación verificada ({exportedSummary.privacyFramework})</p>
              <p>
                Entrenamientos exportados: <strong className="text-[#c8f135]">{exportedSummary.workoutLogs.length}</strong> · Suscripciones:{' '}
                <strong>{exportedSummary.subscriptions.length}</strong> · Dispositivos Push:{' '}
                <strong>{exportedSummary.activePushDevicesCount}</strong>
              </p>
            </div>
          )}
        </section>

        {/* Danger Zone: Delete Account */}
        <section className="rounded-2xl bg-rose-950/20 border border-rose-500/35 p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-black text-rose-300 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" aria-hidden="true" />
              <span>Eliminar Cuenta Permanentemente</span>
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Esta acción revoca todas tus sesiones activas, elimina tus dispositivos de notificaciones Push y anonimiza tu correo y
              nombre de forma irreversible. Para confirmar, escribe <strong className="text-white">ELIMINAR</strong> debajo.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              aria-label="Confirmación para eliminar cuenta"
              placeholder="Escribe ELIMINAR para confirmar"
              className="flex-1 bg-[#07090d] border border-rose-500/35 focus:border-rose-400 text-white px-3.5 py-2.5 rounded-xl text-xs outline-none"
            />
            <button
              type="button"
              disabled={!canConfirmDelete || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>{deleteMutation.isPending ? 'Eliminando...' : 'Eliminar Cuenta'}</span>
            </button>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-zinc-400">
          <span className="flex items-center space-x-1.5">
            <Mail className="w-3.5 h-3.5 text-[#c8f135]" aria-hidden="true" />
            <span>
              Soporte:{' '}
              <a href="mailto:soporte@calishome.app" className="text-[#c8f135] hover:underline">
                soporte@calishome.app
              </a>
            </span>
          </span>
          <div className="flex items-center space-x-4">
            <Link to="/privacy" className="hover:text-white underline">
              Política de Privacidad
            </Link>
            <Link to="/terms" className="hover:text-white underline">
              Términos y Aviso Médico
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
};
