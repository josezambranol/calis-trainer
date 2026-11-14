import { describe, expect, it } from 'vitest';
import { mapBackendUser, mapBackendWorkoutLog } from './api';
import { registerSchema, resetPasswordSchema } from '../schemas/authSchemas';

describe('Phase 3 frontend contracts & schemas', () => {
  it('maps backend user DTO to frontend UserProfile preserving timezone and stats', () => {
    const mapped = mapBackendUser({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'atleta@calishome.app',
      fullName: 'Atleta CalisHome',
      emailVerified: true,
      role: 'USER',
      planTier: 'FREE',
      level: 'intermedio',
      goal: 'resistencia_quemagrasa',
      durationMinutes: 30,
      scheduledDays: ['lunes', 'miercoles', 'viernes'],
      reminderTime: '19:00',
      timezone: 'America/Bogota',
      notificationsEnabled: true,
      soundEnabled: true,
      voiceCoachEnabled: true,
      streak: 4,
      lastCompletedLocalDate: '2026-11-13',
      totalWorkoutsCompleted: 8,
      adaptationScore: 1,
    });

    expect(mapped.name).toBe('Atleta CalisHome');
    expect(mapped.duration).toBe(30);
    expect(mapped.goal).toBe('resistencia_quemagrasa');
    expect(mapped.streak).toBe(4);
    expect(mapped.lastCompletedDate).toBe('2026-11-13');
  });

  it('maps backend workout log DTO cleanly', () => {
    const log = mapBackendWorkoutLog({
      id: 'log-1',
      completedAt: '2026-11-13T18:00:00Z',
      localDate: '2026-11-13',
      routineTitle: 'Full Body Balance Calisténico',
      durationSeconds: 1200,
      exercisesCompleted: 5,
      feedback: 'too_easy',
      adaptationScoreAfter: 1,
    });

    expect(log.date).toBe('2026-11-13T18:00:00Z');
    expect(log.feedback).toBe('too_easy');
    expect(log.adaptationScoreAfter).toBe(1);
  });

  it('validates registration and password reset rules via Zod', () => {
    const weakPassword = registerSchema.safeParse({
      fullName: 'Ana',
      email: 'ana@calishome.app',
      password: 'password',
    });
    expect(weakPassword.success).toBe(false);

    const strongPassword = registerSchema.safeParse({
      fullName: 'Ana',
      email: 'ana@calishome.app',
      password: 'Password123',
    });
    expect(strongPassword.success).toBe(true);

    const mismatch = resetPasswordSchema.safeParse({
      password: 'Password123',
      confirmPassword: 'Password456',
    });
    expect(mismatch.success).toBe(false);
  });
});
