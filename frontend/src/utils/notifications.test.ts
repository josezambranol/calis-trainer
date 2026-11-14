import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  isPushSupported,
  reminderWatcher,
  urlBase64ToUint8Array,
} from './notifications';

describe('notifications Web Push helpers', () => {
  afterEach(() => {
    reminderWatcher.stop();
    vi.restoreAllMocks();
  });

  it('decodes base64url VAPID public keys into Uint8Array bytes', () => {
    // 4 bytes: [1, 2, 3, 255] -> AQID_w
    const decoded = urlBase64ToUint8Array('AQID_w');
    expect(Array.from(decoded)).toEqual([1, 2, 3, 255]);
    expect(decoded.buffer).toBeInstanceOf(ArrayBuffer);
  });

  it('reports unsupported push safely in jsdom without PushManager', () => {
    expect(isPushSupported()).toBe(false);
  });

  it('skips client-side reminder interval when Web Push is active', () => {
    const spy = vi.spyOn(window, 'setInterval');
    reminderWatcher.start(['lunes', 'miercoles'], '18:30', true, undefined, true);
    expect(spy).not.toHaveBeenCalled();

    reminderWatcher.start(['lunes', 'miercoles'], '18:30', true, undefined, false);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
