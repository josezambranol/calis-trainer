import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Crown,
  Loader2,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { billingApi, userApi } from '../services/api';
import { Navbar } from '../components/Navbar';

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  ACTIVE: {
    label: 'Activa',
    style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  IN_GRACE: {
    label: 'En período de gracia',
    style: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  PAST_DUE: {
    label: 'Pago vencido',
    style: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  CANCELED: {
    label: 'Cancelada',
    style: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  PENDING: {
    label: 'Pendiente de confirmación',
    style: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
};

export const PlansPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, updateCachedUser, logout } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const refFromUrl = searchParams.get('ref');

  const plansQuery = useQuery({
    queryKey: ['billingPlans'],
    queryFn: () => billingApi.getPlans(),
    staleTime: 60 * 1000,
  });

  const overviewQuery = useQuery({
    queryKey: ['billingOverview'],
    queryFn: () => billingApi.getOverview(),
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
  });

  const checkoutMutation = useMutation({
    mutationFn: (planCode: 'pro_monthly' | 'pro_yearly') => billingApi.createCheckout(planCode),
    onSuccess: (session) => {
      setErrorMsg('');
      try {
        const parsed = new URL(session.checkoutUrl, window.location.origin);
        if (parsed.origin === window.location.origin) {
          navigate(`${parsed.pathname}${parsed.search}`);
          return;
        }
      } catch {
        // Redirección externa estándar
      }
      window.location.assign(session.checkoutUrl);
    },
    onError: (err) => {
      setErrorMsg(err instanceof Error ? err.message : 'No pudimos iniciar el checkout.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => billingApi.cancelSubscription(),
    onSuccess: async (overview) => {
      setErrorMsg('');
      setInfoMsg(
        'Suscripción cancelada. Conservarás los beneficios Pro hasta el fin del período facturado.'
      );
      queryClient.setQueryData(['billingOverview'], overview);
      const freshUser = await userApi.getMe();
      updateCachedUser(freshUser);
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
    onError: (err) => {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo cancelar la suscripción.');
    },
  });

  const handleSelectPlan = (planCode: string) => {
    setErrorMsg('');
    if (planCode === 'free') {
      navigate('/');
      return;
    }
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (planCode !== 'pro_monthly' && planCode !== 'pro_yearly') return;
    checkoutMutation.mutate(planCode);
  };

  const overview = overviewQuery.data;
  const effectiveTier = overview?.effectivePlanTier || user?.planTier || 'FREE';
  const activeSub = overview?.subscription;
  const statusMeta = activeSub ? STATUS_LABELS[activeSub.status] || STATUS_LABELS.PENDING : null;
  const canCancel =
    activeSub && (activeSub.status === 'ACTIVE' || activeSub.status === 'IN_GRACE');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar
        user={user}
        onOpenAuth={() => navigate('/login')}
        onOpenSettings={() => navigate('/')}
        onLogout={() => void logout()}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Dashboard</span>
          </Link>

          {plansQuery.data?.sandboxMode && (
            <span className="inline-flex items-center space-x-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Modo Demo Sandbox ($0 — sin cobro real)</span>
            </span>
          )}
        </div>

        <section className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <Crown className="w-3.5 h-3.5" />
            <span>CalisHome Freemium & Pro</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Entrena gratis para siempre. Acelera con <span className="text-emerald-400">Pro</span>.
          </h1>
          <p className="text-sm text-slate-400">
            Checkout hospedado compatible con Wompi Colombia sin almacenar datos de tarjeta en nuestros servidores.
          </p>
        </section>

        {refFromUrl && (
          <div className="rounded-2xl bg-sky-500/10 border border-sky-500/30 p-4 text-xs text-sky-200 flex items-center justify-between gap-3">
            <span>
              Referencia de operación recibida: <strong className="font-mono">{refFromUrl}</strong>.
            </span>
            <button
              type="button"
              onClick={() => void overviewQuery.refetch()}
              className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 font-bold text-white shrink-0"
            >
              Actualizar estado
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-300 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-xs text-emerald-300">
            {infoMsg}
          </div>
        )}

        {isAuthenticated && overview && (
          <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                  Tu Plan Actual:
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    effectiveTier === 'PREMIUM'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  {effectiveTier === 'PREMIUM' ? 'CALISHOME PRO' : 'PLAN GRATIS'}
                </span>
                {statusMeta && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.style}`}
                  >
                    {statusMeta.label}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Historial visible: <strong className="text-white">{overview.maxWorkoutHistoryVisible} sesiones</strong>
                {' · '}
                Dispositivos Push: <strong className="text-white">{overview.maxPushDevices}</strong>
                {' · '}
                Analíticas Pro:{' '}
                <strong className="text-white">{overview.hasAnalyticsAccess ? 'Incluidas' : 'Bloqueadas'}</strong>
              </p>

              {activeSub?.currentPeriodEnd && (
                <p className="text-[11px] text-slate-500">
                  Referencia <span className="font-mono">{activeSub.externalReference}</span>
                  {' · '}
                  Vigente hasta{' '}
                  {new Date(activeSub.currentPeriodEnd).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {activeSub.cancelAtPeriodEnd ? ' (no se renovará)' : ''}
                </p>
              )}
            </div>

            {canCancel && (
              <button
                type="button"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors disabled:opacity-50"
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>Cancelar suscripción</span>
              </button>
            )}
          </section>
        )}

        {plansQuery.isLoading ? (
          <div className="py-12 flex justify-center text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
            <span>Cargando planes disponibles...</span>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(plansQuery.data?.plans || []).map((plan) => {
              const isCurrentFree = plan.code === 'free' && effectiveTier === 'FREE';
              const isCurrentPaid =
                effectiveTier === 'PREMIUM' && activeSub?.planCode === plan.code;

              return (
                <div
                  key={plan.code}
                  className={`rounded-3xl border p-6 flex flex-col justify-between transition-all ${
                    plan.recommended
                      ? 'bg-gradient-to-b from-slate-900 to-emerald-950/30 border-emerald-500 shadow-xl shadow-emerald-500/10'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h2 className="text-lg font-extrabold text-white">{plan.name}</h2>
                      {plan.recommended && (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                          Recomendado
                        </span>
                      )}
                    </div>

                    <div className="mb-5">
                      <p className="text-2xl font-black text-white">{plan.formattedPrice}</p>
                      <p className="text-[11px] text-slate-400 capitalize">
                        Ciclo: {plan.billingCycle === 'forever' ? 'Sin límite de tiempo' : plan.billingCycle}
                      </p>
                    </div>

                    <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={checkoutMutation.isPending || isCurrentPaid}
                    onClick={() => handleSelectPlan(plan.code)}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-black transition-all ${
                      isCurrentPaid || isCurrentFree
                        ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                        : plan.recommended
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white'
                    }`}
                  >
                    {isCurrentPaid
                      ? 'Plan Activo Actual'
                      : isCurrentFree
                      ? 'Tu Plan Actual'
                      : plan.code === 'free'
                      ? 'Entrenar Gratis'
                      : isAuthenticated
                      ? 'Pasar a CalisHome Pro'
                      : 'Inicia sesión para activar'}
                  </button>
                </div>
              );
            })}
          </section>
        )}

        <footer className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 flex items-center justify-center space-x-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Pagos procesados mediante checkout externo con verificación criptográfica SHA-256 e idempotencia ante reintentos.
          </span>
        </footer>
      </main>
    </div>
  );
};
