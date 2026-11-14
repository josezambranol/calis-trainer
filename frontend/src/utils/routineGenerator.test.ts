import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE } from '../services/storage';
import { generateRoutineForDay, generateWeeklyPlan } from './routineGenerator';

describe('routineGenerator', () => {
  it('generates rest days for days not in scheduledDays', () => {
    const routine = generateRoutineForDay('domingo', 6, {
      ...DEFAULT_PROFILE,
      scheduledDays: ['lunes', 'miercoles', 'viernes'],
    });

    expect(routine.isRestDay).toBe(true);
    expect(routine.exercises).toHaveLength(0);
    expect(routine.estimatedMinutes).toBe(0);
  });

  it('scales exercise count and sets by session duration (15, 30, 45)', () => {
    const r15 = generateRoutineForDay('lunes', 0, { ...DEFAULT_PROFILE, duration: 15 });
    const r30 = generateRoutineForDay('lunes', 0, { ...DEFAULT_PROFILE, duration: 30 });
    const r45 = generateRoutineForDay('lunes', 0, { ...DEFAULT_PROFILE, duration: 45 });

    expect(r15.exercises).toHaveLength(3);
    expect(r15.exercises[0].sets).toBe(2);

    expect(r30.exercises).toHaveLength(5);
    expect(r30.exercises[0].sets).toBe(3);

    expect(r45.exercises).toHaveLength(7);
    expect(r45.exercises[0].sets).toBe(4);
  });

  it('builds a 7-day weekly plan with split workouts when training 4+ days', () => {
    const plan = generateWeeklyPlan({
      ...DEFAULT_PROFILE,
      scheduledDays: ['lunes', 'martes', 'jueves', 'viernes'],
      duration: 30,
    });

    expect(plan).toHaveLength(7);
    const activeDays = plan.filter((d) => !d.isRestDay);
    expect(activeDays).toHaveLength(4);
    expect(activeDays[0].title).toContain('Torso');
    expect(activeDays[1].title).toContain('Pierna');
  });
});
