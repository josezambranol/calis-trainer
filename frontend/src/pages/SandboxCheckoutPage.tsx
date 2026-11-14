import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { billingApi, userApi } from '../services/api';

export const SandboxCheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateCachedUser } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  const externalReference = searchParams.get('ref') || '';
  const planCode = searchParams.get('plan') || 'pro_monthly';

  const completeMutation = useMutation({
    mutationFn: (transactionStatus: 'APPROVED' | 'DECLINED' | 'VOIDED') =>
      billingApi.completeSandbox({
        externalReference,
        transactionStatus,
      }),
    onSuccess: async (ack) => {
      setErrorMsg('');
      try {
        const freshUser = await userApi.getMe();
        updateCachedUser(freshUser);
      } catch {
        // El usuario se sincronizará en /plans
      }
      await queryClient.invalidateQueries({ queryKey: ['billingOverview'] });
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      await queryClient.invalidateQueries({ queryKey: ['workoutAnalytics'] });
      navigate(`/plans?ref=${encodeURIComponent(ack.externalReference)}`, { replace: true });
    },
    onError: (err) => {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No fue posible procesar el evento sandbox.'
      );
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/plans"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Planes</span>
          </Link>
          <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Sandbox Wompi $0
          </span>
        </div>

        <div className="space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-black text-white">Pasarela Simulada CalisHome</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Entorno gratuito de demostración. Cada botón firma un webhook SHA-256 idéntico al de Wompi producción para validar activación Pro, período de gracia y recibo de pago.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Plan:</span>
            <span className="font-bold text-white">
              {planCode === 'pro_yearly' ? 'CalisHome Pro Anual' : 'CalisHome Pro Mensual'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Referencia:</span>
            <span className="font-mono text-emerald-400">{externalReference || 'N/D'}</span>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={!externalReference || completeMutation.isPending}
            onClick={() => completeMutation.mutate('APPROVED')}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all disabled:opacity-50"
          >
            {completeMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Simular Pago Aprobado (Activar Pro)</span>
          </button>

          <button
            type="button"
            disabled={!externalReference || completeMutation.isPending}
            onClick={() => completeMutation.mutate('DECLINED')}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all disabled:opacity-50"
          >
            <span>Simular Pago Rechazado (PAST_DUE / IN_GRACE)</span>
          </button>

          <button
            type="button"
            disabled={!externalReference || completeMutation.isPending}
            onClick={() => completeMutation.mutate('VOIDED')}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs transition-all disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            <span>Simular Transacción Anulada (VOIDED)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
