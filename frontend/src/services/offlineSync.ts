import type { WorkoutFeedback } from '../types';

export interface PendingWorkoutRecord {
  clientId: string;
  routineTitle: string;
  durationSeconds: number;
  exercisesCompleted: number;
  feedback: WorkoutFeedback;
  queuedAt: string;
}

const DB_NAME = 'calishome-offline-db';
const DB_VERSION = 1;
const SNAPSHOT_STORE = 'snapshots';
const QUEUE_STORE = 'pending_workouts';
const FALLBACK_QUEUE_KEY = 'calishome_offline_workout_queue';
const FALLBACK_SNAPSHOT_PREFIX = 'calishome_offline_snapshot_';

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE);
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'clientId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineSnapshot<T>(key: string, value: T): Promise<void> {
  try {
    if (!hasIndexedDb()) {
      localStorage.setItem(FALLBACK_SNAPSHOT_PREFIX + key, JSON.stringify(value));
      return;
    }
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
      tx.objectStore(SNAPSHOT_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // El almacenamiento offline nunca debe bloquear el flujo principal
  }
}

export async function loadOfflineSnapshot<T>(key: string): Promise<T | null> {
  try {
    if (!hasIndexedDb()) {
      const raw = localStorage.getItem(FALLBACK_SNAPSHOT_PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const db = await openOfflineDb();
    const result = await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
      const req = tx.objectStore(SNAPSHOT_STORE).get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function getPendingWorkouts(): Promise<PendingWorkoutRecord[]> {
  try {
    if (!hasIndexedDb()) {
      const raw = localStorage.getItem(FALLBACK_QUEUE_KEY);
      return raw ? (JSON.parse(raw) as PendingWorkoutRecord[]) : [];
    }
    const db = await openOfflineDb();
    const items = await new Promise<PendingWorkoutRecord[]>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const req = tx.objectStore(QUEUE_STORE).getAll();
      req.onsuccess = () => resolve((req.result as PendingWorkoutRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return items.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  } catch {
    return [];
  }
}

export async function enqueuePendingWorkout(
  payload: Omit<PendingWorkoutRecord, 'clientId' | 'queuedAt'>
): Promise<PendingWorkoutRecord> {
  const record: PendingWorkoutRecord = {
    ...payload,
    clientId: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
  };

  if (!hasIndexedDb()) {
    const existing = await getPendingWorkouts();
    localStorage.setItem(FALLBACK_QUEUE_KEY, JSON.stringify([...existing, record]));
    return record;
  }

  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return record;
}

export async function removePendingWorkout(clientId: string): Promise<void> {
  if (!hasIndexedDb()) {
    const existing = await getPendingWorkouts();
    localStorage.setItem(
      FALLBACK_QUEUE_KEY,
      JSON.stringify(existing.filter((item) => item.clientId !== clientId))
    );
    return;
  }

  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).delete(clientId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function flushPendingWorkouts(
  submitter: (record: PendingWorkoutRecord) => Promise<void>
): Promise<number> {
  const queue = await getPendingWorkouts();
  let synced = 0;
  for (const item of queue) {
    try {
      await submitter(item);
      await removePendingWorkout(item.clientId);
      synced++;
    } catch {
      // Detener al primer fallo de red para reintentar en orden al reconectar
      break;
    }
  }
  return synced;
}

export function isLikelyNetworkOfflineError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  return error instanceof TypeError;
}
