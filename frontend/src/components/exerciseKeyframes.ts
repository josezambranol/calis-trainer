export interface Point2D {
  x: number;
  y: number;
}

export interface BodyPose {
  head: Point2D;
  neck: Point2D;
  shoulder: Point2D;
  elbow: Point2D;
  wrist: Point2D;
  hip: Point2D;
  knee: Point2D;
  ankle: Point2D;
  /** Extremidades secundarias opcionales para ejercicios alternos/unilaterales */
  elbow2?: Point2D;
  wrist2?: Point2D;
  knee2?: Point2D;
  ankle2?: Point2D;
}

export interface ExerciseMotionSpec {
  id: string;
  environment: 'floor' | 'wall-right' | 'wall-left' | 'elevated-feet';
  tempoLabel: string;
  eccentricCue: string;
  concentricCue: string;
  isometricCue?: string;
  primaryMuscles: string;
  cycleMs: number;
  isIsometric: boolean;
  highlightJoints: Array<keyof BodyPose>;
  startPose: BodyPose;
  peakPose: BodyPose;
  arrow?: {
    from: Point2D;
    to: Point2D;
  };
}

const CLASSIC_PUSHUP_UP: BodyPose = {
  head: { x: 236, y: 82 },
  neck: { x: 218, y: 92 },
  shoulder: { x: 210, y: 96 },
  elbow: { x: 214, y: 132 },
  wrist: { x: 218, y: 168 },
  hip: { x: 145, y: 120 },
  knee: { x: 96, y: 144 },
  ankle: { x: 48, y: 168 },
};

const CLASSIC_PUSHUP_DOWN: BodyPose = {
  head: { x: 240, y: 132 },
  neck: { x: 220, y: 140 },
  shoulder: { x: 212, y: 144 },
  elbow: { x: 184, y: 136 },
  wrist: { x: 218, y: 168 },
  hip: { x: 144, y: 152 },
  knee: { x: 96, y: 160 },
  ankle: { x: 48, y: 168 },
};

const KNEE_PUSHUP_UP: BodyPose = {
  head: { x: 232, y: 84 },
  neck: { x: 214, y: 94 },
  shoulder: { x: 206, y: 98 },
  elbow: { x: 210, y: 134 },
  wrist: { x: 214, y: 168 },
  hip: { x: 144, y: 126 },
  knee: { x: 88, y: 166 },
  ankle: { x: 64, y: 138 },
};

const KNEE_PUSHUP_DOWN: BodyPose = {
  head: { x: 236, y: 130 },
  neck: { x: 216, y: 138 },
  shoulder: { x: 208, y: 142 },
  elbow: { x: 182, y: 136 },
  wrist: { x: 214, y: 168 },
  hip: { x: 144, y: 150 },
  knee: { x: 88, y: 166 },
  ankle: { x: 64, y: 140 },
};

const WALL_PUSHUP_START: BodyPose = {
  head: { x: 178, y: 42 },
  neck: { x: 172, y: 58 },
  shoulder: { x: 170, y: 66 },
  elbow: { x: 210, y: 74 },
  wrist: { x: 254, y: 74 },
  hip: { x: 148, y: 110 },
  knee: { x: 132, y: 142 },
  ankle: { x: 116, y: 168 },
};

const WALL_PUSHUP_PEAK: BodyPose = {
  head: { x: 222, y: 54 },
  neck: { x: 212, y: 68 },
  shoulder: { x: 208, y: 74 },
  elbow: { x: 222, y: 94 },
  wrist: { x: 254, y: 74 },
  hip: { x: 166, y: 116 },
  knee: { x: 140, y: 144 },
  ankle: { x: 116, y: 168 },
};

const FLOOR_DIPS_UP: BodyPose = {
  head: { x: 126, y: 72 },
  neck: { x: 120, y: 88 },
  shoulder: { x: 118, y: 96 },
  elbow: { x: 96, y: 132 },
  wrist: { x: 92, y: 168 },
  hip: { x: 156, y: 132 },
  knee: { x: 198, y: 122 },
  ankle: { x: 238, y: 168 },
};

const FLOOR_DIPS_DOWN: BodyPose = {
  head: { x: 124, y: 98 },
  neck: { x: 118, y: 114 },
  shoulder: { x: 116, y: 122 },
  elbow: { x: 84, y: 136 },
  wrist: { x: 92, y: 168 },
  hip: { x: 156, y: 158 },
  knee: { x: 198, y: 132 },
  ankle: { x: 238, y: 168 },
};

const PIKE_UP: BodyPose = {
  head: { x: 202, y: 94 },
  neck: { x: 194, y: 84 },
  shoulder: { x: 192, y: 88 },
  elbow: { x: 204, y: 128 },
  wrist: { x: 214, y: 168 },
  hip: { x: 148, y: 42 },
  knee: { x: 108, y: 106 },
  ankle: { x: 74, y: 168 },
};

const PIKE_DOWN: BodyPose = {
  head: { x: 226, y: 142 },
  neck: { x: 208, y: 120 },
  shoulder: { x: 202, y: 122 },
  elbow: { x: 184, y: 144 },
  wrist: { x: 214, y: 168 },
  hip: { x: 148, y: 54 },
  knee: { x: 108, y: 112 },
  ankle: { x: 74, y: 168 },
};

const DECLINE_UP: BodyPose = {
  head: { x: 238, y: 104 },
  neck: { x: 220, y: 112 },
  shoulder: { x: 212, y: 116 },
  elbow: { x: 214, y: 142 },
  wrist: { x: 216, y: 168 },
  hip: { x: 148, y: 114 },
  knee: { x: 98, y: 122 },
  ankle: { x: 54, y: 130 },
};

const DECLINE_DOWN: BodyPose = {
  head: { x: 242, y: 142 },
  neck: { x: 222, y: 148 },
  shoulder: { x: 214, y: 150 },
  elbow: { x: 188, y: 142 },
  wrist: { x: 216, y: 168 },
  hip: { x: 148, y: 134 },
  knee: { x: 98, y: 132 },
  ankle: { x: 54, y: 130 },
};

const SUPERMAN_REST: BodyPose = {
  head: { x: 238, y: 144 },
  neck: { x: 218, y: 150 },
  shoulder: { x: 210, y: 154 },
  elbow: { x: 244, y: 148 },
  wrist: { x: 274, y: 146 },
  hip: { x: 136, y: 160 },
  knee: { x: 90, y: 158 },
  ankle: { x: 46, y: 154 },
};

const SUPERMAN_ARCH: BodyPose = {
  head: { x: 238, y: 116 },
  neck: { x: 218, y: 128 },
  shoulder: { x: 208, y: 134 },
  elbow: { x: 244, y: 118 },
  wrist: { x: 278, y: 108 },
  hip: { x: 136, y: 162 },
  knee: { x: 90, y: 146 },
  ankle: { x: 46, y: 124 },
};

const SCAPULAR_PULL_START: BodyPose = {
  head: { x: 232, y: 148 },
  neck: { x: 212, y: 154 },
  shoulder: { x: 202, y: 156 },
  elbow: { x: 238, y: 152 },
  wrist: { x: 274, y: 150 },
  hip: { x: 134, y: 162 },
  knee: { x: 88, y: 164 },
  ankle: { x: 44, y: 166 },
};

const SCAPULAR_PULL_PEAK: BodyPose = {
  head: { x: 232, y: 128 },
  neck: { x: 212, y: 136 },
  shoulder: { x: 202, y: 140 },
  elbow: { x: 170, y: 124 },
  wrist: { x: 192, y: 130 },
  hip: { x: 134, y: 162 },
  knee: { x: 88, y: 164 },
  ankle: { x: 44, y: 166 },
};

const SWIMMERS_A: BodyPose = {
  head: { x: 228, y: 130 },
  neck: { x: 208, y: 138 },
  shoulder: { x: 198, y: 142 },
  elbow: { x: 236, y: 124 },
  wrist: { x: 272, y: 116 },
  elbow2: { x: 168, y: 136 },
  wrist2: { x: 136, y: 142 },
  hip: { x: 132, y: 160 },
  knee: { x: 88, y: 146 },
  ankle: { x: 46, y: 132 },
  knee2: { x: 88, y: 158 },
  ankle2: { x: 46, y: 158 },
};

const SWIMMERS_B: BodyPose = {
  head: { x: 228, y: 130 },
  neck: { x: 208, y: 138 },
  shoulder: { x: 198, y: 142 },
  elbow: { x: 168, y: 136 },
  wrist: { x: 136, y: 142 },
  elbow2: { x: 236, y: 124 },
  wrist2: { x: 272, y: 116 },
  hip: { x: 132, y: 160 },
  knee: { x: 88, y: 158 },
  ankle: { x: 46, y: 158 },
  knee2: { x: 88, y: 146 },
  ankle2: { x: 46, y: 132 },
};

const ELBOW_PRESS_DOWN: BodyPose = {
  head: { x: 102, y: 148 },
  neck: { x: 122, y: 156 },
  shoulder: { x: 134, y: 160 },
  elbow: { x: 138, y: 166 },
  wrist: { x: 138, y: 138 },
  hip: { x: 190, y: 162 },
  knee: { x: 226, y: 122 },
  ankle: { x: 256, y: 168 },
};

const ELBOW_PRESS_UP: BodyPose = {
  head: { x: 104, y: 116 },
  neck: { x: 124, y: 124 },
  shoulder: { x: 136, y: 128 },
  elbow: { x: 138, y: 166 },
  wrist: { x: 138, y: 136 },
  hip: { x: 190, y: 156 },
  knee: { x: 226, y: 122 },
  ankle: { x: 256, y: 168 },
};

const SQUAT_UP: BodyPose = {
  head: { x: 162, y: 34 },
  neck: { x: 160, y: 50 },
  shoulder: { x: 158, y: 58 },
  elbow: { x: 186, y: 74 },
  wrist: { x: 204, y: 66 },
  hip: { x: 154, y: 102 },
  knee: { x: 162, y: 136 },
  ankle: { x: 156, y: 168 },
};

const SQUAT_DOWN: BodyPose = {
  head: { x: 176, y: 72 },
  neck: { x: 166, y: 86 },
  shoulder: { x: 162, y: 92 },
  elbow: { x: 202, y: 92 },
  wrist: { x: 232, y: 90 },
  hip: { x: 128, y: 132 },
  knee: { x: 178, y: 134 },
  ankle: { x: 156, y: 168 },
};

const GLUTE_BRIDGE_DOWN: BodyPose = {
  head: { x: 84, y: 150 },
  neck: { x: 102, y: 158 },
  shoulder: { x: 114, y: 162 },
  elbow: { x: 140, y: 166 },
  wrist: { x: 168, y: 166 },
  hip: { x: 168, y: 162 },
  knee: { x: 210, y: 120 },
  ankle: { x: 238, y: 168 },
};

const GLUTE_BRIDGE_UP: BodyPose = {
  head: { x: 84, y: 150 },
  neck: { x: 102, y: 156 },
  shoulder: { x: 114, y: 158 },
  elbow: { x: 140, y: 166 },
  wrist: { x: 168, y: 166 },
  hip: { x: 166, y: 118 },
  knee: { x: 210, y: 110 },
  ankle: { x: 238, y: 168 },
};

const WALL_SIT_A: BodyPose = {
  head: { x: 102, y: 54 },
  neck: { x: 96, y: 70 },
  shoulder: { x: 94, y: 78 },
  elbow: { x: 124, y: 98 },
  wrist: { x: 152, y: 110 },
  hip: { x: 96, y: 120 },
  knee: { x: 156, y: 120 },
  ankle: { x: 156, y: 168 },
};

const WALL_SIT_B: BodyPose = {
  head: { x: 102, y: 56 },
  neck: { x: 96, y: 72 },
  shoulder: { x: 94, y: 80 },
  elbow: { x: 124, y: 98 },
  wrist: { x: 152, y: 112 },
  hip: { x: 96, y: 122 },
  knee: { x: 156, y: 122 },
  ankle: { x: 156, y: 168 },
};

const LUNGES_UP: BodyPose = {
  head: { x: 160, y: 34 },
  neck: { x: 158, y: 50 },
  shoulder: { x: 156, y: 58 },
  elbow: { x: 146, y: 86 },
  wrist: { x: 160, y: 98 },
  hip: { x: 156, y: 100 },
  knee: { x: 186, y: 132 },
  ankle: { x: 194, y: 168 },
  knee2: { x: 134, y: 134 },
  ankle2: { x: 114, y: 168 },
};

const LUNGES_DOWN: BodyPose = {
  head: { x: 162, y: 60 },
  neck: { x: 160, y: 76 },
  shoulder: { x: 158, y: 84 },
  elbow: { x: 146, y: 108 },
  wrist: { x: 162, y: 118 },
  hip: { x: 158, y: 124 },
  knee: { x: 204, y: 124 },
  ankle: { x: 206, y: 168 },
  knee2: { x: 132, y: 158 },
  ankle2: { x: 94, y: 164 },
};

const CALF_RAISES_DOWN: BodyPose = {
  head: { x: 160, y: 38 },
  neck: { x: 158, y: 54 },
  shoulder: { x: 156, y: 62 },
  elbow: { x: 144, y: 92 },
  wrist: { x: 152, y: 114 },
  hip: { x: 156, y: 106 },
  knee: { x: 158, y: 138 },
  ankle: { x: 156, y: 168 },
};

const CALF_RAISES_UP: BodyPose = {
  head: { x: 160, y: 26 },
  neck: { x: 158, y: 42 },
  shoulder: { x: 156, y: 50 },
  elbow: { x: 144, y: 80 },
  wrist: { x: 152, y: 102 },
  hip: { x: 156, y: 94 },
  knee: { x: 158, y: 126 },
  ankle: { x: 158, y: 156 },
};

const BULGARIAN_UP: BodyPose = {
  head: { x: 170, y: 36 },
  neck: { x: 166, y: 52 },
  shoulder: { x: 164, y: 60 },
  elbow: { x: 152, y: 86 },
  wrist: { x: 168, y: 98 },
  hip: { x: 162, y: 102 },
  knee: { x: 194, y: 134 },
  ankle: { x: 204, y: 168 },
  knee2: { x: 120, y: 124 },
  ankle2: { x: 84, y: 128 },
};

const BULGARIAN_DOWN: BodyPose = {
  head: { x: 174, y: 64 },
  neck: { x: 168, y: 80 },
  shoulder: { x: 166, y: 88 },
  elbow: { x: 152, y: 110 },
  wrist: { x: 168, y: 118 },
  hip: { x: 160, y: 128 },
  knee: { x: 206, y: 126 },
  ankle: { x: 204, y: 168 },
  knee2: { x: 122, y: 150 },
  ankle2: { x: 84, y: 128 },
};

const SINGLE_BRIDGE_DOWN: BodyPose = {
  head: { x: 84, y: 150 },
  neck: { x: 102, y: 158 },
  shoulder: { x: 114, y: 162 },
  elbow: { x: 140, y: 166 },
  wrist: { x: 168, y: 166 },
  hip: { x: 168, y: 162 },
  knee: { x: 210, y: 120 },
  ankle: { x: 238, y: 168 },
  knee2: { x: 214, y: 132 },
  ankle2: { x: 266, y: 104 },
};

const SINGLE_BRIDGE_UP: BodyPose = {
  head: { x: 84, y: 150 },
  neck: { x: 102, y: 156 },
  shoulder: { x: 114, y: 158 },
  elbow: { x: 140, y: 166 },
  wrist: { x: 168, y: 166 },
  hip: { x: 166, y: 118 },
  knee: { x: 210, y: 110 },
  ankle: { x: 238, y: 168 },
  knee2: { x: 214, y: 84 },
  ankle2: { x: 266, y: 52 },
};

const ELBOW_PLANK_A: BodyPose = {
  head: { x: 240, y: 114 },
  neck: { x: 222, y: 120 },
  shoulder: { x: 212, y: 124 },
  elbow: { x: 214, y: 166 },
  wrist: { x: 244, y: 166 },
  hip: { x: 146, y: 136 },
  knee: { x: 96, y: 150 },
  ankle: { x: 48, y: 166 },
};

const ELBOW_PLANK_B: BodyPose = {
  head: { x: 240, y: 112 },
  neck: { x: 222, y: 118 },
  shoulder: { x: 212, y: 122 },
  elbow: { x: 214, y: 166 },
  wrist: { x: 244, y: 166 },
  hip: { x: 146, y: 133 },
  knee: { x: 96, y: 149 },
  ankle: { x: 48, y: 166 },
};

const DEADBUG_A: BodyPose = {
  head: { x: 86, y: 146 },
  neck: { x: 104, y: 154 },
  shoulder: { x: 116, y: 158 },
  elbow: { x: 116, y: 124 },
  wrist: { x: 116, y: 94 },
  elbow2: { x: 80, y: 140 },
  wrist2: { x: 48, y: 144 },
  hip: { x: 184, y: 160 },
  knee: { x: 184, y: 114 },
  ankle: { x: 224, y: 114 },
  knee2: { x: 228, y: 142 },
  ankle2: { x: 274, y: 146 },
};

const DEADBUG_B: BodyPose = {
  head: { x: 86, y: 146 },
  neck: { x: 104, y: 154 },
  shoulder: { x: 116, y: 158 },
  elbow: { x: 80, y: 140 },
  wrist: { x: 48, y: 144 },
  elbow2: { x: 116, y: 124 },
  wrist2: { x: 116, y: 94 },
  hip: { x: 184, y: 160 },
  knee: { x: 228, y: 142 },
  ankle: { x: 274, y: 146 },
  knee2: { x: 184, y: 114 },
  ankle2: { x: 224, y: 114 },
};

const MOUNTAIN_A: BodyPose = {
  head: { x: 238, y: 84 },
  neck: { x: 220, y: 94 },
  shoulder: { x: 212, y: 98 },
  elbow: { x: 214, y: 132 },
  wrist: { x: 216, y: 168 },
  hip: { x: 144, y: 116 },
  knee: { x: 184, y: 126 },
  ankle: { x: 176, y: 154 },
  knee2: { x: 96, y: 142 },
  ankle2: { x: 48, y: 168 },
};

const MOUNTAIN_B: BodyPose = {
  head: { x: 238, y: 84 },
  neck: { x: 220, y: 94 },
  shoulder: { x: 212, y: 98 },
  elbow: { x: 214, y: 132 },
  wrist: { x: 216, y: 168 },
  hip: { x: 144, y: 116 },
  knee: { x: 96, y: 142 },
  ankle: { x: 48, y: 168 },
  knee2: { x: 184, y: 126 },
  ankle2: { x: 176, y: 154 },
};

const SIDE_PLANK_DOWN: BodyPose = {
  head: { x: 234, y: 124 },
  neck: { x: 218, y: 134 },
  shoulder: { x: 210, y: 138 },
  elbow: { x: 212, y: 166 },
  wrist: { x: 238, y: 166 },
  hip: { x: 144, y: 160 },
  knee: { x: 96, y: 164 },
  ankle: { x: 48, y: 166 },
};

const SIDE_PLANK_UP: BodyPose = {
  head: { x: 234, y: 102 },
  neck: { x: 218, y: 112 },
  shoulder: { x: 210, y: 118 },
  elbow: { x: 212, y: 166 },
  wrist: { x: 238, y: 166 },
  hip: { x: 144, y: 132 },
  knee: { x: 96, y: 148 },
  ankle: { x: 48, y: 166 },
};

const LEG_RAISES_DOWN: BodyPose = {
  head: { x: 84, y: 150 },
  neck: { x: 102, y: 158 },
  shoulder: { x: 114, y: 162 },
  elbow: { x: 142, y: 166 },
  wrist: { x: 170, y: 166 },
  hip: { x: 178, y: 162 },
  knee: { x: 228, y: 154 },
  ankle: { x: 276, y: 146 },
};

const LEG_RAISES_UP: BodyPose = {
  head: { x: 84, y: 150 },
  neck: { x: 102, y: 158 },
  shoulder: { x: 114, y: 162 },
  elbow: { x: 142, y: 166 },
  wrist: { x: 170, y: 166 },
  hip: { x: 178, y: 162 },
  knee: { x: 184, y: 110 },
  ankle: { x: 186, y: 58 },
};

const HOLLOW_A: BodyPose = {
  head: { x: 106, y: 120 },
  neck: { x: 122, y: 132 },
  shoulder: { x: 132, y: 140 },
  elbow: { x: 94, y: 124 },
  wrist: { x: 56, y: 110 },
  hip: { x: 178, y: 162 },
  knee: { x: 226, y: 148 },
  ankle: { x: 274, y: 132 },
};

const HOLLOW_B: BodyPose = {
  head: { x: 108, y: 116 },
  neck: { x: 124, y: 130 },
  shoulder: { x: 134, y: 138 },
  elbow: { x: 96, y: 120 },
  wrist: { x: 58, y: 104 },
  hip: { x: 178, y: 162 },
  knee: { x: 226, y: 144 },
  ankle: { x: 274, y: 126 },
};

export const EXERCISE_MOTIONS: Record<string, ExerciseMotionSpec> = {
  'push-wall-pushups': {
    id: 'push-wall-pushups',
    environment: 'wall-right',
    tempoLabel: '2s acercar · 1s pausa · 1s empuje',
    eccentricCue: 'Acerca el pecho controlando codos a 45°',
    concentricCue: 'Empuja fuerte la pared hasta extender codos',
    primaryMuscles: 'Pectoral mayor · Deltoides anterior · Tríceps',
    cycleMs: 3200,
    isIsometric: false,
    highlightJoints: ['shoulder', 'elbow'],
    startPose: WALL_PUSHUP_START,
    peakPose: WALL_PUSHUP_PEAK,
    arrow: { from: { x: 190, y: 40 }, to: { x: 234, y: 50 } },
  },
  'push-knee-pushups': {
    id: 'push-knee-pushups',
    environment: 'floor',
    tempoLabel: '2s bajada · 1s pausa · 1s subida',
    eccentricCue: 'Cadera alineada, baja el pecho hacia el suelo',
    concentricCue: 'Extiende empujando el suelo sin hundir lumbar',
    primaryMuscles: 'Pectoral · Tríceps · Estabilización de core',
    cycleMs: 3200,
    isIsometric: false,
    highlightJoints: ['shoulder', 'elbow'],
    startPose: KNEE_PUSHUP_UP,
    peakPose: KNEE_PUSHUP_DOWN,
    arrow: { from: { x: 212, y: 92 }, to: { x: 212, y: 134 } },
  },
  'push-classic-pushups': {
    id: 'push-classic-pushups',
    environment: 'floor',
    tempoLabel: '2s descenso · 1s abajo · 1s explosivo',
    eccentricCue: 'Bloque rígido de tobillo a cabeza mientras bajas',
    concentricCue: 'Protrae escápulas arriba sin bloquear hiperextensión',
    primaryMuscles: 'Pectoral · Hombro anterior · Tríceps · Core',
    cycleMs: 3200,
    isIsometric: false,
    highlightJoints: ['shoulder', 'elbow', 'hip'],
    startPose: CLASSIC_PUSHUP_UP,
    peakPose: CLASSIC_PUSHUP_DOWN,
    arrow: { from: { x: 210, y: 94 }, to: { x: 210, y: 138 } },
  },
  'push-floor-dips': {
    id: 'push-floor-dips',
    environment: 'floor',
    tempoLabel: '2s flexión · 1s empuje',
    eccentricCue: 'Flexiona codos hacia atrás sin encoger hombros',
    concentricCue: 'Empuja el suelo extendiendo tríceps por completo',
    primaryMuscles: 'Tríceps braquial · Deltoides posterior',
    cycleMs: 2800,
    isIsometric: false,
    highlightJoints: ['elbow', 'shoulder'],
    startPose: FLOOR_DIPS_UP,
    peakPose: FLOOR_DIPS_DOWN,
    arrow: { from: { x: 118, y: 92 }, to: { x: 118, y: 120 } },
  },
  'push-pike-pushups': {
    id: 'push-pike-pushups',
    environment: 'floor',
    tempoLabel: '3s bajada diagonal · 1s empuje',
    eccentricCue: 'Adelanta la coronilla formando triángulo delante de manos',
    concentricCue: 'Empuja hacia atrás abriendo hombros en V',
    primaryMuscles: 'Deltoides anterior y medio · Tríceps',
    cycleMs: 3400,
    isIsometric: false,
    highlightJoints: ['shoulder', 'elbow'],
    startPose: PIKE_UP,
    peakPose: PIKE_DOWN,
    arrow: { from: { x: 196, y: 86 }, to: { x: 222, y: 134 } },
  },
  'push-diamond-pushups': {
    id: 'push-diamond-pushups',
    environment: 'floor',
    tempoLabel: '3s bajada · 1s pausa · 1s subida',
    eccentricCue: 'Codos rozan las costillas hacia el centro del pecho',
    concentricCue: 'Aprieta tríceps e interior de pectoral al subir',
    primaryMuscles: 'Tríceps · Pectoral interno · Core',
    cycleMs: 3200,
    isIsometric: false,
    highlightJoints: ['elbow', 'shoulder'],
    startPose: CLASSIC_PUSHUP_UP,
    peakPose: CLASSIC_PUSHUP_DOWN,
    arrow: { from: { x: 210, y: 94 }, to: { x: 210, y: 138 } },
  },
  'push-decline-pushups': {
    id: 'push-decline-pushups',
    environment: 'elevated-feet',
    tempoLabel: '3s bajada · 1s pausa · 1s empuje',
    eccentricCue: 'Controla mayor carga sobre pecho superior y hombros',
    concentricCue: 'Mantén glúteos apretados para no arquear lumbar',
    primaryMuscles: 'Pectoral clavicular · Deltoides · Core',
    cycleMs: 3400,
    isIsometric: false,
    highlightJoints: ['shoulder', 'elbow'],
    startPose: DECLINE_UP,
    peakPose: DECLINE_DOWN,
    arrow: { from: { x: 212, y: 110 }, to: { x: 212, y: 146 } },
  },
  'pull-superman-hold': {
    id: 'pull-superman-hold',
    environment: 'floor',
    tempoLabel: 'Mantén tensión continua · respiración lenta',
    eccentricCue: 'Eleva pecho y muslos simultáneamente mirando al suelo',
    concentricCue: 'Sostén dorsales y glúteos contraídos sin encoger cuello',
    isometricCue: 'Arco posterior activo: pecho y rodillas despegados',
    primaryMuscles: 'Erectores espinales · Dorsales · Glúteos',
    cycleMs: 3600,
    isIsometric: true,
    highlightJoints: ['shoulder', 'hip'],
    startPose: SUPERMAN_REST,
    peakPose: SUPERMAN_ARCH,
  },
  'pull-floor-scapular-pull': {
    id: 'pull-floor-scapular-pull',
    environment: 'floor',
    tempoLabel: '2s jalón atrás · 2s contracción · 1s extensión',
    eccentricCue: 'Extiende brazos al frente en Y manteniendo pecho flotando',
    concentricCue: 'Jala codos hacia las caderas juntando omóplatos fuerte',
    primaryMuscles: 'Dorsal ancho · Trapecio medio/inferior · Romboides',
    cycleMs: 3400,
    isIsometric: false,
    highlightJoints: ['shoulder', 'elbow'],
    startPose: SCAPULAR_PULL_START,
    peakPose: SCAPULAR_PULL_PEAK,
    arrow: { from: { x: 248, y: 138 }, to: { x: 178, y: 122 } },
  },
  'pull-swimmers': {
    id: 'pull-swimmers',
    environment: 'floor',
    tempoLabel: 'Alternancia continua · cadencia controlada',
    eccentricCue: 'Despega brazo y pierna opuestos alargando al máximo',
    concentricCue: 'Barre el brazo en arco manteniendo abdomen activo',
    primaryMuscles: 'Dorsales · Hombro posterior · Lumbar · Glúteos',
    cycleMs: 2200,
    isIsometric: false,
    highlightJoints: ['shoulder', 'hip'],
    startPose: SWIMMERS_A,
    peakPose: SWIMMERS_B,
  },
  'pull-elbow-press': {
    id: 'pull-elbow-press',
    environment: 'floor',
    tempoLabel: '2s empuje dorsal · 1s pausa arriba · 2s baja',
    eccentricCue: 'Desciende escápulas controlando el contacto con el suelo',
    concentricCue: 'Clava codos contra el suelo para despegar torso alto',
    primaryMuscles: 'Romboides · Trapecio medio · Deltoides posterior',
    cycleMs: 3200,
    isIsometric: false,
    highlightJoints: ['shoulder', 'elbow'],
    startPose: ELBOW_PRESS_DOWN,
    peakPose: ELBOW_PRESS_UP,
    arrow: { from: { x: 134, y: 158 }, to: { x: 134, y: 124 } },
  },
  'legs-air-squats': {
    id: 'legs-air-squats',
    environment: 'floor',
    tempoLabel: '2s bajada · 1s paralelo · 1s empuje',
    eccentricCue: 'Cadera atrás y abajo, rodillas siguen línea del pie',
    concentricCue: 'Empuja el suelo desde talón y mediopié al subir',
    primaryMuscles: 'Cuádriceps · Glúteo mayor · Erectores',
    cycleMs: 3000,
    isIsometric: false,
    highlightJoints: ['hip', 'knee'],
    startPose: SQUAT_UP,
    peakPose: SQUAT_DOWN,
    arrow: { from: { x: 154, y: 92 }, to: { x: 128, y: 126 } },
  },
  'legs-glute-bridge': {
    id: 'legs-glute-bridge',
    environment: 'floor',
    tempoLabel: '1s subida · 2s squeeze arriba · 2s bajada',
    eccentricCue: 'Desciende vértebra por vértebra sin perder retroversión',
    concentricCue: 'Empuja por talones hasta alinear hombro-cadera-rodilla',
    primaryMuscles: 'Glúteo mayor · Isquiotibiales · Lumbar baja',
    cycleMs: 3200,
    isIsometric: false,
    highlightJoints: ['hip', 'knee'],
    startPose: GLUTE_BRIDGE_DOWN,
    peakPose: GLUTE_BRIDGE_UP,
    arrow: { from: { x: 168, y: 158 }, to: { x: 168, y: 118 } },
  },
  'legs-wall-sit': {
    id: 'legs-wall-sit',
    environment: 'wall-left',
    tempoLabel: 'Isometría 90° · espalda pegada a la pared',
    eccentricCue: 'Mantén ángulo de 90° en rodillas y cadera sin apoyarte con manos',
    concentricCue: 'Distribuye peso uniforme en talones y respira fluido',
    isometricCue: 'Resistencia isométrica pura a 90° contra pared',
    primaryMuscles: 'Cuádriceps · Glúteos · Estabilidad tibial',
    cycleMs: 2800,
    isIsometric: true,
    highlightJoints: ['knee', 'hip'],
    startPose: WALL_SIT_A,
    peakPose: WALL_SIT_B,
  },
  'legs-walking-lunges': {
    id: 'legs-walking-lunges',
    environment: 'floor',
    tempoLabel: '2s descenso vertical · 1s empuje',
    eccentricCue: 'Baja la rodilla trasera verticalmente casi rozando el suelo',
    concentricCue: 'Empuja desde la pierna delantera con torso erguido',
    primaryMuscles: 'Cuádriceps · Glúteo medio y mayor · Estabilidad pélvica',
    cycleMs: 3000,
    isIsometric: false,
    highlightJoints: ['knee', 'hip'],
    startPose: LUNGES_UP,
    peakPose: LUNGES_DOWN,
    arrow: { from: { x: 158, y: 92 }, to: { x: 158, y: 122 } },
  },
  'legs-calf-raises': {
    id: 'legs-calf-raises',
    environment: 'floor',
    tempoLabel: '1s subida máxima · 1s pausa arriba · 2s bajada',
    eccentricCue: 'Baja lento sin rebotar el tendón de Aquiles',
    concentricCue: 'Sube todo lo posible sobre la base del primer metatarsiano',
    primaryMuscles: 'Gastrocnemio · Sóleo · Estabilidad de tobillo',
    cycleMs: 2600,
    isIsometric: false,
    highlightJoints: ['ankle', 'knee'],
    startPose: CALF_RAISES_DOWN,
    peakPose: CALF_RAISES_UP,
    arrow: { from: { x: 174, y: 152 }, to: { x: 174, y: 130 } },
  },
  'legs-bulgarian-wall': {
    id: 'legs-bulgarian-wall',
    environment: 'elevated-feet',
    tempoLabel: '3s descenso unilateral · 1s pausa · 1s empuje',
    eccentricCue: 'Desciende profundo concentrando carga en pierna delantera',
    concentricCue: 'Sube empujando el suelo con pie completo sin colapsar rodilla',
    primaryMuscles: 'Cuádriceps unilateral · Glúteo mayor · Equilibrio',
    cycleMs: 3400,
    isIsometric: false,
    highlightJoints: ['knee', 'hip'],
    startPose: BULGARIAN_UP,
    peakPose: BULGARIAN_DOWN,
    arrow: { from: { x: 164, y: 94 }, to: { x: 164, y: 124 } },
  },
  'legs-single-leg-bridge': {
    id: 'legs-single-leg-bridge',
    environment: 'floor',
    tempoLabel: '1s empuje unilateral · 2s arriba · 2s bajada',
    eccentricCue: 'Evita que caiga un lado de la pelvis al descender',
    concentricCue: 'Aprieta glúteo de la pierna de apoyo manteniendo la otra firme',
    primaryMuscles: 'Glúteo unilateral · Isquiotibiales · Antirrotación pélvica',
    cycleMs: 3200,
    isIsometric: false,
    highlightJoints: ['hip', 'knee'],
    startPose: SINGLE_BRIDGE_DOWN,
    peakPose: SINGLE_BRIDGE_UP,
    arrow: { from: { x: 168, y: 158 }, to: { x: 168, y: 118 } },
  },
  'core-elbow-plank': {
    id: 'core-elbow-plank',
    environment: 'floor',
    tempoLabel: 'Tensión isométrica · retroversión pélvica',
    eccentricCue: 'Empuja antebrazos contra el suelo separando escápulas',
    concentricCue: 'Aprieta glúteos y abdomen para evitar caída lumbar',
    isometricCue: 'Línea recta continua: oreja · hombro · cadera · tobillo',
    primaryMuscles: 'Transverso abdominal · Recto abdominal · Serrato',
    cycleMs: 2800,
    isIsometric: true,
    highlightJoints: ['hip', 'shoulder'],
    startPose: ELBOW_PLANK_A,
    peakPose: ELBOW_PLANK_B,
  },
  'core-deadbug': {
    id: 'core-deadbug',
    environment: 'floor',
    tempoLabel: '2s extensión lenta · 1s retorno · alternar lados',
    eccentricCue: 'Alarga brazo y pierna contraria sin despegar lumbar del piso',
    concentricCue: 'Exhala suave al extender y regresa a 90° con control',
    primaryMuscles: 'Core profundo · Antirrotación · Control lumbar',
    cycleMs: 2600,
    isIsometric: false,
    highlightJoints: ['hip', 'shoulder'],
    startPose: DEADBUG_A,
    peakPose: DEADBUG_B,
  },
  'core-mountain-climbers': {
    id: 'core-mountain-climbers',
    environment: 'floor',
    tempoLabel: 'Cadencia rápida sin elevar cadera',
    eccentricCue: 'Regresa el pie atrás apoyando metatarso firme',
    concentricCue: 'Lleva rodilla hacia el pecho compactando abdomen',
    primaryMuscles: 'Core dinámico · Flexores de cadera · Gasto cardiovascular',
    cycleMs: 1400,
    isIsometric: false,
    highlightJoints: ['knee', 'hip', 'shoulder'],
    startPose: MOUNTAIN_A,
    peakPose: MOUNTAIN_B,
  },
  'core-side-plank': {
    id: 'core-side-plank',
    environment: 'floor',
    tempoLabel: 'Elevación lateral · sostener oblicuos activos',
    eccentricCue: 'Alinea codo justo debajo del hombro',
    concentricCue: 'Eleva cadera manteniendo torso y piernas en un solo plano',
    isometricCue: 'Empuje lateral firme de hombro y oblicuo inferior',
    primaryMuscles: 'Oblicuos · Cuadrado lumbar · Glúteo medio',
    cycleMs: 2800,
    isIsometric: true,
    highlightJoints: ['hip', 'shoulder'],
    startPose: SIDE_PLANK_DOWN,
    peakPose: SIDE_PLANK_UP,
    arrow: { from: { x: 144, y: 158 }, to: { x: 144, y: 130 } },
  },
  'core-leg-raises': {
    id: 'core-leg-raises',
    environment: 'floor',
    tempoLabel: '1s subida · 3s descenso sin tocar el suelo',
    eccentricCue: 'Baja piernas muy despacio aplastando lumbar al suelo',
    concentricCue: 'Eleva piernas rectas hasta 85° controlando impulso',
    primaryMuscles: 'Abdomen inferior · Flexores de cadera · Control pélvico',
    cycleMs: 3600,
    isIsometric: false,
    highlightJoints: ['hip', 'knee'],
    startPose: LEG_RAISES_DOWN,
    peakPose: LEG_RAISES_UP,
    arrow: { from: { x: 256, y: 142 }, to: { x: 190, y: 66 } },
  },
  'core-hollow-body': {
    id: 'core-hollow-body',
    environment: 'floor',
    tempoLabel: 'Isometría en media luna · lumbar pegada',
    eccentricCue: 'Eleva hombros y escápulas mirando hacia las puntas',
    concentricCue: 'Baja piernas solo hasta donde la lumbar siga pegada al piso',
    isometricCue: 'Forma de banana estable con máxima compresión abdominal',
    primaryMuscles: 'Recto abdominal completo · Psoas · Estabilidad dorsal',
    cycleMs: 2800,
    isIsometric: true,
    highlightJoints: ['hip', 'shoulder'],
    startPose: HOLLOW_A,
    peakPose: HOLLOW_B,
  },
};

export function resolveExerciseMotion(exerciseId: string): ExerciseMotionSpec {
  if (EXERCISE_MOTIONS[exerciseId]) {
    return EXERCISE_MOTIONS[exerciseId];
  }
  if (exerciseId.startsWith('pull')) {
    return EXERCISE_MOTIONS['pull-superman-hold'];
  }
  if (exerciseId.startsWith('legs')) {
    return EXERCISE_MOTIONS['legs-air-squats'];
  }
  if (exerciseId.startsWith('core')) {
    return EXERCISE_MOTIONS['core-elbow-plank'];
  }
  return EXERCISE_MOTIONS['push-classic-pushups'];
}
