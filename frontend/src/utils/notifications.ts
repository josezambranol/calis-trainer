import { notificationApi } from '../services/api';
import type { DayOfWeek } from '../types';
import { getCurrentDayOfWeek } from './routineGenerator';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeToWebPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error('Tu navegador no soporta notificaciones Web Push.');
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Debes aceptar el permiso de notificaciones en tu navegador.');
  }

  const { enabled, publicKey } = await notificationApi.getVapidPublicKey();
  if (!enabled || !publicKey) {
    throw new Error('El servidor no tiene Web Push habilitado en este momento.');
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('La suscripción Push del navegador no devolvió claves válidas.');
  }

  await notificationApi.subscribe({
    endpoint: json.endpoint,
    keys: { p256dh, auth },
  });

  return subscription;
}

export async function unsubscribeFromWebPush(): Promise<boolean> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) {
    return false;
  }

  try {
    await notificationApi.unsubscribe(subscription.endpoint);
  } catch {
    // Continuar con desuscripción local aunque el endpoint ya hubiera expirado en backend
  }

  return subscription.unsubscribe();
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones de sistema.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    return await Notification.requestPermission();
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
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          ...options,
        });
      });
      return true;
    }

    new Notification(title, {
      icon: '/favicon.svg',
      ...options,
    });
    return true;
  } catch (err) {
    console.error('Error al emitir notificación:', err);
    return false;
  }
}

export function sendTestNotification(): boolean {
  return sendLocalNotification('🔥 ¡CalisHome: Hora de Entrenar!', {
    body: '¡Tu rutina de hoy está lista! Cero material, 100% disciplina. Haz clic para comenzar.',
    tag: 'calishome-test',
  });
}

class ReminderWatcher {
  private timer: number | null = null;
  private lastAlertDateKey: string | null = null;

  public start(
    scheduledDays: DayOfWeek[],
    reminderTime: string,
    enabled: boolean,
    onTrigger?: () => void,
    skipWhenPushActive = false
  ) {
    this.stop();
    if (!enabled || !reminderTime || skipWhenPushActive) return;

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
    }, 30000);
  }

  public stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const reminderWatcher = new ReminderWatcher();
