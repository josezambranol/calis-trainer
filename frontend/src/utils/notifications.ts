import type { DayOfWeek } from '../types';
import { getCurrentDayOfWeek } from './routineGenerator';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones de sistema.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error('Error al pedir permiso de notificaciones:', e);
    return 'denied';
  }
}

export function sendLocalNotification(title: string, options?: NotificationOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    // Si tenemos Service Worker activo, usar showNotification
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });
      });
      return true;
    }

    // Notificación estándar de navegador
    new Notification(title, {
      icon: '/favicon.ico',
      ...options,
    });
    return true;
  } catch (err) {
    console.error('Error al emitir notificación:', err);
    return false;
  }
}

/**
 * Dispara una notificación de prueba instantánea
 */
export function sendTestNotification(): boolean {
  return sendLocalNotification('🔥 ¡CalisHome: Hora de Entrenar!', {
    body: '¡Tu rutina de hoy está lista! Cero material, 100% disciplina. Haz clic para comenzar.',
    tag: 'calishome-test',
  });
}

/**
 * Monitor en segundo plano en la pestaña
 */
class ReminderWatcher {
  private timer: number | null = null;
  private lastAlertDateKey: string | null = null;

  public start(
    scheduledDays: DayOfWeek[],
    reminderTime: string,
    enabled: boolean,
    onTrigger?: () => void
  ) {
    this.stop();
    if (!enabled || !reminderTime) return;

    this.timer = window.setInterval(() => {
      const now = new Date();
      const currentDay = getCurrentDayOfWeek();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;
      const todayKey = `${now.toDateString()}-${currentTimeStr}`;

      if (
        scheduledDays.includes(currentDay) &&
        currentTimeStr === reminderTime &&
        this.lastAlertDateKey !== todayKey
      ) {
        this.lastAlertDateKey = todayKey;
        sendLocalNotification('⏰ ¡Recordatorio de CalisHome!', {
          body: `Son las ${reminderTime}. Es hora de tu sesión de calistenia en casa. ¡A por ello!`,
          tag: 'calishome-reminder',
        });
        if (onTrigger) onTrigger();
      }
    }, 30000); // Chequea cada 30 segundos
  }

  public stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const reminderWatcher = new ReminderWatcher();
