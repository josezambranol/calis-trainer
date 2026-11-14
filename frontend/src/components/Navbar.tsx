import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, Bell, User, LogOut, Dumbbell, Sparkles, Crown } from 'lucide-react';
import type { UserProfile } from '../types';
import { sendTestNotification, requestNotificationPermission } from '../utils/notifications';

interface NavbarProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onOpenSettings,
  onLogout,
}) => {
  const [notificationStatus, setNotificationStatus] = React.useState<string>('');

  const handleTestNotification = async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      const sent = sendTestNotification();
      if (sent) {
        setNotificationStatus('¡Notificación enviada!');
      } else {
        setNotificationStatus('Notificación emitida');
      }
    } else {
      setNotificationStatus('Permiso denegado en el navegador');
    }
    setTimeout(() => setNotificationStatus(''), 4000);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
            <Dumbbell className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white">Calis<span className="text-emerald-400">Home</span></span>
              <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">Cero Material</span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Entrenamiento con peso corporal y recordatorios</p>
          </div>
        </div>

        {/* Center / Stats */}
        {user && (
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-1.5 bg-slate-800/70 border border-slate-700/60 px-3 py-1.5 rounded-full">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
              <span className="text-slate-300 font-medium">Racha:</span>
              <span className="font-bold text-orange-400">{user.streak} {user.streak === 1 ? 'día' : 'días'}</span>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-800/70 border border-slate-700/60 px-3 py-1.5 rounded-full">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-medium">Nivel:</span>
              <span className="font-bold text-emerald-400 capitalize">{user.level}</span>
            </div>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link
            to="/plans"
            className={`flex items-center space-x-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-lg border transition-all ${
              user?.planTier === 'PREMIUM'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{user?.planTier === 'PREMIUM' ? 'PRO' : 'Planes'}</span>
          </Link>

          {/* Quick Notification Test Button */}
          <button
            onClick={handleTestNotification}
            title="Probar notificación en este dispositivo"
            className="flex items-center space-x-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/50 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all"
          >
            <Bell className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Probar Alerta</span>
          </button>

          {user ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenSettings}
                className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span className="max-w-[110px] truncate">{user.name}</span>
              </button>

              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition-all shadow-md shadow-emerald-500/20"
            >
              Iniciar Sesión
            </button>
          )}
        </div>
      </div>

      {notificationStatus && (
        <div className="bg-emerald-500 text-slate-950 text-xs font-semibold text-center py-1">
          {notificationStatus}
        </div>
      )}
    </header>
  );
};
