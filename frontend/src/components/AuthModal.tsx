import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Mail, Lock, User, ArrowRight, ShieldCheck, CheckCircle2, MailCheck, Sparkles } from 'lucide-react';
import { authApi, billingApi } from '../services/api';
import { ApiError } from '../services/apiClient';
import { useAuth } from '../context/useAuth';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  type ForgotPasswordFormValues,
  type LoginFormValues,
  type RegisterFormValues,
} from '../schemas/authSchemas';

export type AuthModalMode = 'login' | 'register' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthModalMode;
  onClose: () => void;
  onAuthenticated: () => void;
}

interface GoogleAccountsApi {
  accounts: {
    id: {
      initialize: (cfg: { client_id: string; callback: (res: { credential?: string }) => void }) => void;
      renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onAuthenticated,
}) => {
  const { completeLogin } = useAuth();
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [serverError, setServerError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const plansQuery = useQuery({
    queryKey: ['billingPlans'],
    queryFn: () => billingApi.getPlans(),
    enabled: isOpen && mode === 'login',
    staleTime: 60 * 1000,
    retry: false,
  });

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!isOpen || !googleClientId || mode === 'forgot') return;

    const handleCredential = async (credential?: string) => {
      if (!credential) return;
      setServerError('');
      setGoogleLoading(true);
      try {
        const loggedUser = await authApi.loginWithGoogle(credential);
        await completeLogin(loggedUser);
        onAuthenticated();
        onClose();
      } catch (err) {
        setServerError(err instanceof ApiError ? err.detail : 'No pudimos validar tu cuenta de Google.');
      } finally {
        setGoogleLoading(false);
      }
    };

    const renderGsiButton = () => {
      const g = (window as unknown as { google?: GoogleAccountsApi }).google;
      if (!g || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = '';
      g.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          void handleCredential(response.credential);
        },
      });
      g.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'continue_with',
        locale: 'es',
      });
    };

    const existingScript = document.querySelector('script[data-calishome-gsi="true"]');
    if ((window as unknown as { google?: GoogleAccountsApi }).google) {
      renderGsiButton();
      return;
    }

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.calishomeGsi = 'true';
      script.onload = renderGsiButton;
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener('load', renderGsiButton, { once: true });
    }
  }, [isOpen, googleClientId, mode, completeLogin, onAuthenticated, onClose]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const forgotForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const switchMode = (nextMode: AuthModalMode) => {
    setMode(nextMode);
    setServerError('');
    setInfoMessage('');
    setUnverifiedEmail(null);
  };

  const handleLoginSubmit = loginForm.handleSubmit(async (values) => {
    setServerError('');
    setInfoMessage('');
    setUnverifiedEmail(null);
    try {
      const loggedUser = await authApi.login(values);
      await completeLogin(loggedUser);
      onAuthenticated();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.detail);
        if (err.status === 403 && err.detail.toLowerCase().includes('verific')) {
          setUnverifiedEmail(values.email);
        }
      } else {
        setServerError('No pudimos conectar con el servidor. Verifica que la API esté activa.');
      }
    }
  });

  const handleDemoLogin = async () => {
    setServerError('');
    setInfoMessage('');
    setUnverifiedEmail(null);
    setDemoLoading(true);
    try {
      const loggedUser = await authApi.login({
        email: 'demo@calishome.app',
        password: 'DemoCalis2026!',
      });
      await completeLogin(loggedUser);
      onAuthenticated();
      onClose();
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.detail
          : 'No pudimos iniciar la cuenta Demo en este entorno.'
      );
    } finally {
      setDemoLoading(false);
    }
  };

  const handleRegisterSubmit = registerForm.handleSubmit(async (values) => {
    setServerError('');
    setInfoMessage('');
    try {
      const res = await authApi.register(values);
      setInfoMessage(res.message);
      setUnverifiedEmail(values.email);
      loginForm.setValue('email', values.email);
      setMode('login');
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.detail);
      } else {
        setServerError('No pudimos crear la cuenta en este momento.');
      }
    }
  });

  const handleForgotSubmit = forgotForm.handleSubmit(async (values) => {
    setServerError('');
    setInfoMessage('');
    try {
      const res = await authApi.forgotPassword(values.email);
      setInfoMessage(res.message);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.detail : 'Error al procesar la solicitud.');
    }
  });

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResendingVerification(true);
    setServerError('');
    try {
      const res = await authApi.resendVerification(unverifiedEmail);
      setInfoMessage(res.message);
      setUnverifiedEmail(null);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.detail : 'No pudimos reenviar el correo.');
    } finally {
      setResendingVerification(false);
    }
  };

  const title =
    mode === 'register'
      ? 'Crea tu Cuenta CalisHome'
      : mode === 'forgot'
        ? 'Recuperar Contraseña'
        : 'Bienvenido de Nuevo';

  const subtitle =
    mode === 'register'
      ? 'Guarda tus rutinas adaptadas, racha y progreso en la nube'
      : mode === 'forgot'
        ? 'Te enviaremos un enlace seguro para restablecer tu clave'
        : 'Accede a tu plan personalizado con cero material';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md bg-[#0d1118] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#c8f135]/10 border border-[#c8f135]/35 text-[#c8f135] mb-3">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 id="auth-modal-title" className="text-2xl font-black text-white tracking-tight">{title}</h2>
          <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
        </div>

        {infoMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start space-x-2">
            <MailCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{infoMessage}</span>
          </div>
        )}

        {serverError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium space-y-2">
            <p>{serverError}</p>
            {unverifiedEmail && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingVerification}
                className="underline font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
              >
                {resendingVerification
                  ? 'Reenviando enlace...'
                  : 'Reenviar correo de verificación'}
              </button>
            )}
          </div>
        )}

        {mode !== 'forgot' && (
          <>
            {googleClientId ? (
              <div className="mb-4 flex flex-col items-center">
                <div ref={googleButtonRef} className="min-h-[42px] flex items-center justify-center" />
                {googleLoading && (
                  <span className="text-xs text-slate-400 mt-2">Verificando sesión con Google...</span>
                )}
              </div>
            ) : (
              <div className="mb-4 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-800 text-[11px] text-slate-400 text-center">
                Acceso con Google disponible al configurar <code className="text-slate-300">VITE_GOOGLE_CLIENT_ID</code>.
              </div>
            )}

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-slate-800" />
              <span className="px-3 text-xs text-slate-500 font-medium">o con tu correo</span>
              <div className="flex-1 border-t border-slate-800" />
            </div>
          </>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5" noValidate>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  {...loginForm.register('email')}
                  className="w-full bg-slate-800/80 border border-slate-700 focus:border-emerald-500 text-white pl-9 pr-3 py-2 rounded-xl text-sm outline-none transition-all"
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-xs text-rose-400 mt-1">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">Contraseña</label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="••••••••"
                  {...loginForm.register('password')}
                  className="w-full bg-slate-800/80 border border-slate-700 focus:border-emerald-500 text-white pl-9 pr-3 py-2 rounded-xl text-sm outline-none transition-all"
                />
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs text-rose-400 mt-1">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting || demoLoading}
              className="w-full mt-2 flex items-center justify-center space-x-2 bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] font-black py-2.5 px-4 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              <span>{loginForm.formState.isSubmitting ? 'Entrando...' : 'Entrar a CalisHome'}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>

            {plansQuery.data?.sandboxMode && (
              <button
                type="button"
                disabled={loginForm.formState.isSubmitting || demoLoading}
                onClick={() => void handleDemoLogin()}
                className="w-full flex items-center justify-center space-x-2 bg-white/[0.05] hover:bg-white/[0.1] border border-[#c8f135]/35 text-[#c8f135] font-bold py-2.5 px-4 rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{demoLoading ? 'Cargando Atleta Demo...' : 'Entrar como Atleta Demo (Pro)'}</span>
              </button>
            )}
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tu Nombre</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Ej: José"
                  {...registerForm.register('fullName')}
                  className="w-full bg-slate-800/80 border border-slate-700 focus:border-emerald-500 text-white pl-9 pr-3 py-2 rounded-xl text-sm outline-none transition-all"
                />
              </div>
              {registerForm.formState.errors.fullName && (
                <p className="text-xs text-rose-400 mt-1">{registerForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  {...registerForm.register('email')}
                  className="w-full bg-slate-800/80 border border-slate-700 focus:border-emerald-500 text-white pl-9 pr-3 py-2 rounded-xl text-sm outline-none transition-all"
                />
              </div>
              {registerForm.formState.errors.email && (
                <p className="text-xs text-rose-400 mt-1">{registerForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres, letras y números"
                  {...registerForm.register('password')}
                  className="w-full bg-slate-800/80 border border-slate-700 focus:border-emerald-500 text-white pl-9 pr-3 py-2 rounded-xl text-sm outline-none transition-all"
                />
              </div>
              {registerForm.formState.errors.password && (
                <p className="text-xs text-rose-400 mt-1">{registerForm.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={registerForm.formState.isSubmitting}
              className="w-full mt-2 flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <span>
                {registerForm.formState.isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta Gratis'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-3.5" noValidate>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  {...forgotForm.register('email')}
                  className="w-full bg-slate-800/80 border border-slate-700 focus:border-emerald-500 text-white pl-9 pr-3 py-2 rounded-xl text-sm outline-none transition-all"
                />
              </div>
              {forgotForm.formState.errors.email && (
                <p className="text-xs text-rose-400 mt-1">{forgotForm.formState.errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={forgotForm.formState.isSubmitting}
              className="w-full mt-2 flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <span>
                {forgotForm.formState.isSubmitting ? 'Enviando enlace...' : 'Enviar Enlace de Recuperación'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="mt-5 text-center space-y-2">
          {mode === 'forgot' ? (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
            >
              Volver a iniciar sesión
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
            >
              {mode === 'register'
                ? '¿Ya tienes cuenta? Inicia sesión aquí'
                : '¿No tienes cuenta aún? Regístrate gratis'}
            </button>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Cero Equipamiento • Progreso sincronizado en la nube</span>
        </div>
      </div>
    </div>
  );
};
