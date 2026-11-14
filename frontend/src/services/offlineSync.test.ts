import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enqueuePendingWorkout,
  flushPendingWorkouts,
  getPendingWorkouts,
  loadOfflineSnapshot,
  saveOfflineSnapshot,
} from './offlineSync';

describe('Phase 7 offline snapshot and workout queue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and restores routine snapshots in fallback storage when IndexedDB is absent', async () => {
    await saveOfflineSnapshot('weekly_plan_guest', { localDate: '2026-11-13', items: 7 });
    const restored = await loadOfflineSnapshot<{ localDate: string; items: number }>(
      'weekly_plan_guest'
    );
    expect(restored).toEqual({ localDate: '2026-11-13', items: 7 });
  });

  it('enqueues offline workouts and flushes them in order when online', async () => {
    await enqueuePendingWorkout({
      routineTitle: 'Empuje y Core',
      durationSeconds: 900,
      exercisesCompleted: 4,
      feedback: 'just_right',
    });
    await enqueuePendingWorkout({
      routineTitle: 'Pierna Explosiva',
      durationSeconds: 1100,
      exercisesCompleted: 5,
      feedback: 'too_easy',
    });

    const queued = await getPendingWorkouts();
    expect(queued).toHaveLength(2);

    const submitter = vi.fn().mockResolvedValue(undefined);
    const synced = await flushPendingWorkouts(submitter);
    expect(synced).toBe(2);
    expect(submitter).toHaveBeenCalledTimes(2);
    expect(await getPendingWorkouts()).toHaveLength(0);
  });

  it('keeps remaining queued items if network fails mid-flush', async () => {
    await enqueuePendingWorkout({
      routineTitle: 'Sesión 1',
      durationSeconds: 600,
      exercisesCompleted: 3,
      feedback: 'just_right',
    });
    await enqueuePendingWorkout({
      routineTitle: 'Sesión 2',
      durationSeconds: 700,
      exercisesCompleted: 3,
      feedback: 'too_hard',
    });

    const submitter = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const synced = await flushPendingWorkouts(submitter);
    expect(synced).toBe(1);
    const remaining = await getPendingWorkouts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].routineTitle).toBe('Sesión 2');
  });
});
