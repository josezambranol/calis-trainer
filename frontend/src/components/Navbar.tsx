import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, Bell, User, LogOut, Crown, Zap, Languages, ShieldCheck } from 'lucide-react';
import type { UserProfile } from '../types';
import { useI18n } from '../i18n/useI18n';
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
  const { locale, setLocale, t } = useI18n();
  const [notificationStatus, setNotificationStatus] = React.useState<string>('');

  const handleTestNotification = async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      const sent = sendTestNotification();
      setNotificationStatus(sent ? 'Alerta enviada al dispositivo' : 'Notificación emitida');
    } else {
      setNotificationStatus('Permiso de notificaciones bloqueado en este navegador');
    }
    setTimeout(() => setNotificationStatus(''), 4000);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#07090d]/92 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center space-x-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] rounded-lg pr-2"
        >
          <div className="w-9 h-9 rounded-lg bg-[#c8f135] text-[#05070a] flex items-center justify-center shadow-[0_0_24px_rgba(200,241,53,0.22)] transition-transform group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 17L10 7l4 6 5-8" />
              <circle cx="19" cy="5" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-lg tracking-[-0.03em] text-white uppercase">
                Calis<span className="text-[#c8f135]">Home</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 border border-white/10">
                {t.brandTag}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden lg:block">{t.brandSub}</p>
          </div>
        </Link>

        {/* Center Telemetry Strip */}
        {user && (
          <div className="hidden md:flex items-center space-x-3 text-xs ch-tabular">
            <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/10 px-3 py-1.5 rounded-lg">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" aria-hidden="true" />
              <span className="text-zinc-400">{t.navStreak}:</span>
              <span className="font-black text-white">
                {user.streak} {user.streak === 1 ? t.navDaySingular : t.navDayPlural}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 bg-white/[0.04] border border-white/10 px-3 py-1.5 rounded-lg">
              <Zap className="w-3.5 h-3.5 text-[#c8f135]" aria-hidden="true" />
              <span className="text-zinc-400">{t.navLevel}:</span>
              <span className="font-bold text-[#c8f135] capitalize">{user.level}</span>
            </div>
          </div>
        )}

        {/* Right Controls */}
        <nav aria-label="Navegación principal" className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
            aria-label={locale === 'es' ? 'Switch language to English' : 'Cambiar idioma a Español'}
            aria-pressed={locale === 'en'}
            className="flex items-center space-x-1 text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.09] text-zinc-200 border border-white/10 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Languages className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
            <span>{locale.toUpperCase()}</span>
          </button>

          <Link
            to="/plans"
            className={`flex items-center space-x-1.5 text-xs font-extrabold px-3 py-1.5 rounded-lg border transition-colors ${
              user?.planTier === 'PREMIUM'
                ? 'bg-[#c8f135]/15 border-[#c8f135]/50 text-[#c8f135] hover:bg-[#c8f135]/25'
                : 'bg-amber-400/10 border-amber-400/35 text-amber-300 hover:bg-amber-400/20'
            }`}
          >
            <Crown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{user?.planTier === 'PREMIUM' ? t.navPro : t.navPlans}</span>
          </Link>

          <button
            type="button"
            onClick={() => void handleTestNotification()}
            title={t.navTestAlert}
            aria-label={t.navTestAlert}
            className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.09] text-zinc-200 border border-white/10 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-[#c8f135]" aria-hidden="true" />
            <span className="hidden lg:inline">{t.navTestAlert}</span>
          </button>

          {user ? (
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Personalizar rutina y preferencias"
                className="flex items-center space-x-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#c8f135]" aria-hidden="true" />
                <span className="max-w-[96px] truncate">{user.name}</span>
              </button>

              <Link
                to="/account"
                title={t.footerAccount}
                aria-label={t.navAccountAria}
                className="p-2 rounded-lg text-zinc-300 hover:text-[#c8f135] bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              </Link>

              <button
                type="button"
                onClick={onLogout}
                title={t.navSignOut}
                aria-label={t.navSignOut}
                className="p-2 rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="bg-[#c8f135] hover:bg-[#d9fc5a] text-[#05070a] font-black px-3.5 py-1.5 rounded-lg text-xs tracking-tight transition-colors"
            >
              {t.navSignIn}
            </button>
          )}
        </nav>
      </div>

      {notificationStatus && (
        <div
          role="status"
          aria-live="polite"
          className="bg-[#c8f135] text-[#05070a] text-xs font-bold text-center py-1.5 px-4"
        >
          {notificationStatus}
        </div>
      )}
    </header>
  );
};
