import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, AlertCircle, Lock, ArrowLeft, Dumbbell } from 'lucide-react';
import { authApi } from '../services/api';
import { ApiError } from '../services/apiClient';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../schemas/authSchemas';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(
    token ? 'Verificando tu correo electrónico...' : 'Falta el token de verificación en el enlace.'
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    authApi
      .verifyEmail(token)
      .then((res) => {
        if (!active) return;
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err) => {
        if (!active) return;
        setStatus('error');
        setMessage(
          err instanceof ApiError
            ? err.detail
            : 'El enlace de verificación es inválido o ha expirado.'
        );
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          {status === 'error' ? (
            <AlertCircle className="w-7 h-7 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          )}
        </div>

        <h1 className="text-2xl font-black text-white">Verificación de Correo</h1>
        <p className={`text-sm ${status === 'error' ? 'text-rose-400' : 'text-slate-300'}`}>
          {message}
        </p>

        <Link
          to="/login"
          className="inline-flex items-center justify-center w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-5 rounded-xl text-sm transition-colors"
        >
          Ir a Iniciar Sesión
        </Link>
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!token) {
      setServerError('El enlace no contiene un token válido.');
      return;
    }
    setServerError('');
    try {
      const res = await authApi.resetPassword({ token, newPassword: values.password });
      setSuccessMsg(res.message);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.detail : 'No pudimos actualizar tu contraseña.'
      );
    }
  });

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Nueva Contraseña</h1>
            <p className="text-xs text-slate-400">Elige una contraseña segura para CalisHome</p>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            {successMsg}
          </div>
        )}

        {serverError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {serverError}
          </div>
        )}

        {!token ? (
          <p className="text-xs text-rose-400">
            Falta el token de recuperación en la URL. Solicita un nuevo enlace.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nueva contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres, letras y números"
                  {...form.register('password')}
                  className="w-full bg-slate-800/80 border border-slate-700 focus:border-emerald-500 text-white pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-rose-400 mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Confirmar contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="Repite tu nueva contraseña"
                  {...form.register('confirmPassword')}
                  className="w-full bg-slate-800/80 border border-slate-700 focus:border-emerald-500 text-white pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
                />
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-rose-400 mt-1">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {form.formState.isSubmitting ? 'Guardando...' : 'Actualizar Contraseña'}
            </button>
          </form>
        )}

        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-emerald-400"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a CalisHome</span>
        </Link>
      </div>
    </div>
  );
};
