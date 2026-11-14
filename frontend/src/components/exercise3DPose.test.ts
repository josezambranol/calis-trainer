import { describe, expect, it } from 'vitest';
import { EXERCISE_MOTIONS } from './exerciseKeyframes';
import { EXERCISE_3D_SPECS, interpolatePose3D, resolveExercise3D } from './exercise3DPose';

describe('exercise3DPose coverage & interpolation', () => {
  it('provides a dedicated 3D kinematic spec for all 24 catalog exercises', () => {
    const motionIds = Object.keys(EXERCISE_MOTIONS);
    expect(motionIds).toHaveLength(24);
    for (const id of motionIds) {
      expect(EXERCISE_3D_SPECS[id]).toBeDefined();
      expect(resolveExercise3D(id).id).toBe(id);
    }
  });

  it('interpolates 3D joint positions and Euler angles with finite values', () => {
    for (const spec of Object.values(EXERCISE_3D_SPECS)) {
      const mid = interpolatePose3D(spec.startPose, spec.peakPose, 0.5);
      expect(mid.pelvisPos.every((v) => Number.isFinite(v))).toBe(true);
      expect(mid.pelvisRot.every((v) => Number.isFinite(v))).toBe(true);
      expect(Number.isFinite(mid.leftElbow)).toBe(true);
      expect(Number.isFinite(mid.rightKnee)).toBe(true);
    }
  });
});
