import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { MuscleGroupId } from './exerciseKeyframes';
import { interpolatePose3D, resolveExercise3D } from './exercise3DPose';
import type { CameraPreset, Pose3D } from './exercise3DPose';

interface ThreeAnatomyCanvasProps {
  exerciseId: string;
  exerciseTitle: string;
  phase: number;
  cameraPreset: CameraPreset;
  compact?: boolean;
}

const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  studio: { pos: [1.75, 1.05, 1.85], target: [0, 0.56, 0] },
  side: { pos: [2.45, 0.72, 0.05], target: [0, 0.54, -0.05] },
  front: { pos: [0.08, 0.85, 2.45], target: [0, 0.62, 0] },
};

/**
 * Genera proceduralmente una textura de estriaciones musculares en memoria
 * (sin peticiones externas ni riesgo de licencia, 100% compatible con CSP 'self').
 */
function createMuscleFiberBumpTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < size; i += 4) {
      ctx.fillStyle = i % 8 === 0 ? '#a8a8a8' : '#646464';
      ctx.fillRect(0, i, size, 2);
    }
    // Fibras oblicuas sutiles para sensación anatómica 3D
    ctx.strokeStyle = 'rgba(220,220,220,0.22)';
    ctx.lineWidth = 1;
    for (let x = -size; x < size * 2; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + size * 0.35, size);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 3);
  return texture;
}

/** Construye geometría torneada orgánica entre dos juntas (de y = 0 hasta y = -length) */
function createLimbLatheGeometry(
  length: number,
  radii: Array<[number, number]>,
  segments = 20,
): THREE.LatheGeometry {
  const pts = radii.map(([t, r]) => new THREE.Vector2(Math.max(0.002, r), -t * length));
  const geom = new THREE.LatheGeometry(pts, segments);
  geom.computeVertexNormals();
  return geom;
}

interface RigRefs {
  root: THREE.Group;
  pelvis: THREE.Group;
  spine: THREE.Group;
  head: THREE.Group;
  leftShoulder: THREE.Group;
  rightShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  rightHip: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftAnkle: THREE.Group;
  rightAnkle: THREE.Group;
  muscleMeshes: Record<MuscleGroupId, THREE.Mesh[]>;
  groundCheckAnchors: THREE.Object3D[];
  props: {
    wallFront: THREE.Group;
    wallBack: THREE.Group;
    bench: THREE.Group;
  };
}

interface SharedMaterials {
  baseMuscle: THREE.MeshStandardMaterial;
  activeMuscle: THREE.MeshStandardMaterial;
  shorts: THREE.MeshStandardMaterial;
  tendon: THREE.MeshStandardMaterial;
  sneakerUpper: THREE.MeshStandardMaterial;
  sneakerSole: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  benchPad: THREE.MeshStandardMaterial;
  bumpMap: THREE.CanvasTexture;
}

function buildRig(materials: SharedMaterials): RigRefs {
  const root = new THREE.Group();
  const pelvis = new THREE.Group();
  root.add(pelvis);

  const muscleMeshes: Record<MuscleGroupId, THREE.Mesh[]> = {
    chest: [],
    shoulders: [],
    triceps: [],
    lats: [],
    abs: [],
    glutes: [],
    quads: [],
    hamstrings: [],
    calves: [],
  };

  const registerMesh = (
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    group?: MuscleGroupId,
    pos: [number, number, number] = [0, 0, 0],
    rot: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (group) {
      muscleMeshes[group].push(mesh);
    }
    return mesh;
  };

  // ── Pelvis & Short deportivo negro mate + Glúteos esculpidos ─────────────
  const pelvisGeom = new THREE.SphereGeometry(0.145, 24, 18);
  registerMesh(pelvis, pelvisGeom, materials.shorts, undefined, [0, -0.01, 0], [0, 0, 0], [1.15, 0.85, 0.88]);

  // Cresta/banda anatómica glútea para resaltar glutes sin perder el look del short negro
  const gluteGeom = new THREE.SphereGeometry(0.088, 18, 14);
  registerMesh(pelvis, gluteGeom, materials.baseMuscle, 'glutes', [0.068, -0.03, -0.055], [0, 0, 0], [1.0, 1.05, 0.92]);
  registerMesh(pelvis, gluteGeom, materials.baseMuscle, 'glutes', [-0.068, -0.03, -0.055], [0, 0, 0], [1.0, 1.05, 0.92]);

  // ── Columna & Torso anatómico (Abdomen + Pectoral + Dorsales) ────────────
  const spine = new THREE.Group();
  spine.position.set(0, 0.06, 0);
  pelvis.add(spine);

  // Núcleo esculpido torso (de y=0 cintura hasta y=+0.48 hombros)
  const torsoPts = [
    new THREE.Vector2(0.118, 0.0),
    new THREE.Vector2(0.114, 0.11),
    new THREE.Vector2(0.132, 0.24),
    new THREE.Vector2(0.156, 0.36),
    new THREE.Vector2(0.145, 0.44),
    new THREE.Vector2(0.058, 0.49),
  ];
  const torsoCoreGeom = new THREE.LatheGeometry(torsoPts, 24);
  torsoCoreGeom.computeVertexNormals();
  registerMesh(spine, torsoCoreGeom, materials.baseMuscle, 'abs', [0, 0, 0], [0, 0, 0], [1.14, 1, 0.78]);

  // Bloques de recto abdominal (six-pack esculpido)
  const abBlockGeom = new THREE.SphereGeometry(0.036, 12, 10);
  for (let row = 0; row < 3; row++) {
    const y = 0.09 + row * 0.065;
    registerMesh(spine, abBlockGeom, materials.baseMuscle, 'abs', [0.035, y, 0.092], [0, 0, 0], [1.0, 1.15, 0.65]);
    registerMesh(spine, abBlockGeom, materials.baseMuscle, 'abs', [-0.035, y, 0.092], [0, 0, 0], [1.0, 1.15, 0.65]);
  }

  // Pectoral mayor bilateral esculpido
  const pecGeom = new THREE.SphereGeometry(0.088, 18, 14);
  registerMesh(spine, pecGeom, materials.baseMuscle, 'chest', [0.078, 0.355, 0.075], [0.1, -0.18, 0], [1.12, 0.85, 0.75]);
  registerMesh(spine, pecGeom, materials.baseMuscle, 'chest', [-0.078, 0.355, 0.075], [0.1, 0.18, 0], [1.12, 0.85, 0.75]);

  // Dorsales / Espalda alta en V-taper
  const latGeom = new THREE.SphereGeometry(0.092, 18, 14);
  registerMesh(spine, latGeom, materials.baseMuscle, 'lats', [0.095, 0.295, -0.052], [0, 0, -0.25], [1.0, 1.38, 0.72]);
  registerMesh(spine, latGeom, materials.baseMuscle, 'lats', [-0.095, 0.295, -0.052], [0, 0, 0.25], [1.0, 1.38, 0.72]);

  // Cuello y Cabeza anatómica
  const neckGeom = new THREE.CylinderGeometry(0.048, 0.058, 0.11, 16);
  registerMesh(spine, neckGeom, materials.tendon, undefined, [0, 0.525, 0]);

  const head = new THREE.Group();
  head.position.set(0, 0.59, 0.01);
  spine.add(head);

  const craniumGeom = new THREE.SphereGeometry(0.092, 20, 16);
  registerMesh(head, craniumGeom, materials.baseMuscle, undefined, [0, 0.08, -0.008], [0, 0, 0], [0.88, 1.08, 1.02]);
  const jawGeom = new THREE.CylinderGeometry(0.062, 0.044, 0.085, 14);
  registerMesh(head, jawGeom, materials.baseMuscle, undefined, [0, 0.02, 0.025], [0.22, 0, 0], [0.92, 1, 1.05]);
  const noseGeom = new THREE.ConeGeometry(0.016, 0.042, 8);
  registerMesh(head, noseGeom, materials.tendon, undefined, [0, 0.055, 0.095], [1.28, 0, 0]);

  // ── Brazos simétricos (Hombro/Deltoides -> Tríceps/Bíceps -> Antebrazo -> Mano) ──
  const buildArm = (side: 1 | -1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.205, 0.425, 0);
    spine.add(shoulder);

    // Deltoides redondeado en 3 cabezas
    const deltGeom = new THREE.SphereGeometry(0.072, 18, 14);
    registerMesh(shoulder, deltGeom, materials.baseMuscle, 'shoulders', [side * 0.008, -0.01, 0], [0, 0, 0], [1.05, 1.18, 1.02]);

    // Brazo superior (Tríceps / Bíceps) length = 0.28
    const upperArmGeom = createLimbLatheGeometry(0.28, [
      [0, 0.048],
      [0.25, 0.054],
      [0.58, 0.05],
      [0.85, 0.04],
      [1, 0.036],
    ]);
    registerMesh(shoulder, upperArmGeom, materials.baseMuscle, 'triceps', [0, 0, 0], [0, 0, 0], [0.95, 1, 1.08]);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.28, 0);
    shoulder.add(elbow);

    registerMesh(elbow, new THREE.SphereGeometry(0.037, 12, 10), materials.tendon);

    // Antebrazo length = 0.25
    const forearmGeom = createLimbLatheGeometry(0.25, [
      [0, 0.036],
      [0.25, 0.043],
      [0.65, 0.034],
      [1, 0.025],
    ]);
    registerMesh(elbow, forearmGeom, materials.baseMuscle, undefined);

    // Mano / palma anatómica
    const handGeom = new THREE.BoxGeometry(0.046, 0.095, 0.068);
    const palmAnchor = new THREE.Object3D();
    palmAnchor.position.set(0, -0.32, 0.01);
    elbow.add(palmAnchor);
    registerMesh(elbow, handGeom, materials.tendon, undefined, [0, -0.28, 0.01]);

    return { shoulder, elbow, palmAnchor };
  };

  const leftArm = buildArm(1);
  const rightArm = buildArm(-1);

  // ── Piernas simétricas (Muslo/Cuádriceps+Isquios -> Rodilla -> Gemelos -> Zapatilla) ──
  const buildLeg = (side: 1 | -1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.102, -0.02, 0);
    pelvis.add(hip);

    // Manga del short negro mate cubriendo primer tercio del muslo
    const shortsLegGeom = createLimbLatheGeometry(0.175, [
      [0, 0.088],
      [0.55, 0.082],
      [1, 0.076],
    ]);
    registerMesh(hip, shortsLegGeom, materials.shorts, undefined, [0, 0.01, 0], [0, 0, 0], [1.0, 1, 1.05]);

    // Muslo muscular (Cuádriceps anterior + Isquiotibiales posterior) length = 0.42
    const thighGeom = createLimbLatheGeometry(0.42, [
      [0, 0.072],
      [0.32, 0.084],
      [0.65, 0.072],
      [0.9, 0.056],
      [1, 0.05],
    ]);
    registerMesh(hip, thighGeom, materials.baseMuscle, 'quads', [0, 0, 0], [0, 0, 0], [0.98, 1, 1.08]);

    // Vientre isquiotibial posterior separado para resaltar solo hamstrings cuando toque
    const hamGeom = new THREE.SphereGeometry(0.064, 16, 12);
    registerMesh(hip, hamGeom, materials.baseMuscle, 'hamstrings', [0, -0.21, -0.032], [0, 0, 0], [0.95, 2.2, 0.85]);

    const knee = new THREE.Group();
    knee.position.set(0, -0.42, 0);
    hip.add(knee);

    registerMesh(knee, new THREE.SphereGeometry(0.052, 14, 12), materials.tendon);

    // Pantorrilla / Gemelo esculpido length = 0.40
    const calfGeom = createLimbLatheGeometry(0.40, [
      [0, 0.048],
      [0.24, 0.064],
      [0.44, 0.058],
      [0.78, 0.036],
      [1, 0.031],
    ]);
    registerMesh(knee, calfGeom, materials.baseMuscle, 'calves', [0, 0, 0], [0, 0, 0], [0.96, 1, 1.05]);

    const ankle = new THREE.Group();
    ankle.position.set(0, -0.40, 0);
    knee.add(ankle);

    // Zapatilla deportiva bimaterial idéntica al atlas (cuerpo gris grafito + suela blanca)
    const upperShoeGeom = new THREE.BoxGeometry(0.086, 0.054, 0.205);
    registerMesh(ankle, upperShoeGeom, materials.sneakerUpper, undefined, [0, -0.032, 0.055]);
    const toeCapGeom = new THREE.SphereGeometry(0.044, 12, 10);
    registerMesh(ankle, toeCapGeom, materials.sneakerUpper, undefined, [0, -0.042, 0.145], [0, 0, 0], [0.96, 0.65, 1.15]);
    const soleGeom = new THREE.BoxGeometry(0.092, 0.024, 0.225);
    registerMesh(ankle, soleGeom, materials.sneakerSole, undefined, [0, -0.068, 0.058]);

    const heelAnchor = new THREE.Object3D();
    heelAnchor.position.set(0, -0.08, -0.04);
    ankle.add(heelAnchor);

    const toeAnchor = new THREE.Object3D();
    toeAnchor.position.set(0, -0.08, 0.17);
    ankle.add(toeAnchor);

    return { hip, knee, ankle, heelAnchor, toeAnchor };
  };

  const leftLeg = buildLeg(1);
  const rightLeg = buildLeg(-1);

  const spineBackAnchor = new THREE.Object3D();
  spineBackAnchor.position.set(0, 0.28, -0.105);
  spine.add(spineBackAnchor);

  // ── Elementos auxiliares de escenario (Paredes / Banco plano de estudio) ──
  const wallFront = new THREE.Group();
  const wallGeom = new THREE.BoxGeometry(1.4, 2.1, 0.12);
  registerMesh(wallFront, wallGeom, materials.wall, undefined, [0, 1.05, 0.62]);
  wallFront.visible = false;
  root.add(wallFront);

  const wallBack = new THREE.Group();
  registerMesh(wallBack, wallGeom, materials.wall, undefined, [0, 1.05, -0.72]);
  wallBack.visible = false;
  root.add(wallBack);

  const bench = new THREE.Group();
  registerMesh(bench, new THREE.BoxGeometry(0.56, 0.065, 0.42), materials.benchPad, undefined, [0, 0.34, -0.84]);
  registerMesh(bench, new THREE.BoxGeometry(0.055, 0.31, 0.055), materials.metal, undefined, [0, 0.16, -0.84]);
  registerMesh(bench, new THREE.BoxGeometry(0.46, 0.032, 0.34), materials.metal, undefined, [0, 0.016, -0.84]);
  bench.visible = false;
  root.add(bench);

  return {
    root,
    pelvis,
    spine,
    head,
    leftShoulder: leftArm.shoulder,
    rightShoulder: rightArm.shoulder,
    leftElbow: leftArm.elbow,
    rightElbow: rightArm.elbow,
    leftHip: leftLeg.hip,
    rightHip: rightLeg.hip,
    leftKnee: leftLeg.knee,
    rightKnee: rightLeg.knee,
    leftAnkle: leftLeg.ankle,
    rightAnkle: rightLeg.ankle,
    muscleMeshes,
    groundCheckAnchors: [
      leftLeg.heelAnchor,
      leftLeg.toeAnchor,
      rightLeg.heelAnchor,
      rightLeg.toeAnchor,
      leftArm.palmAnchor,
      rightArm.palmAnchor,
      spineBackAnchor,
    ],
    props: { wallFront, wallBack, bench },
  };
}

function applyPoseToRig(rig: RigRefs, pose: Pose3D, env: string) {
  rig.pelvis.position.set(...pose.pelvisPos);
  rig.pelvis.rotation.set(...pose.pelvisRot);
  rig.spine.rotation.set(...pose.spineRot);
  rig.head.rotation.set(...pose.headRot);

  rig.leftShoulder.rotation.set(...pose.leftShoulder);
  rig.rightShoulder.rotation.set(...pose.rightShoulder);
  rig.leftElbow.rotation.set(pose.leftElbow, 0, 0);
  rig.rightElbow.rotation.set(pose.rightElbow, 0, 0);

  rig.leftHip.rotation.set(...pose.leftHip);
  rig.rightHip.rotation.set(...pose.rightHip);
  rig.leftKnee.rotation.set(pose.leftKnee, 0, 0);
  rig.rightKnee.rotation.set(pose.rightKnee, 0, 0);
  rig.leftAnkle.rotation.set(pose.leftAnkle, 0, 0);
  rig.rightAnkle.rotation.set(pose.rightAnkle, 0, 0);

  rig.props.wallFront.visible = env === 'wall-front';
  rig.props.wallBack.visible = env === 'wall-back';
  rig.props.bench.visible = env === 'elevated-bench';

  // Evita que pies, manos o espalda atraviesen el plano del suelo y = 0
  rig.root.updateMatrixWorld(true);
  const tmp = new THREE.Vector3();
  let minY = Infinity;
  for (const anchor of rig.groundCheckAnchors) {
    anchor.getWorldPosition(tmp);
    if (tmp.y < minY) minY = tmp.y;
  }
  if (minY < 0.002) {
    rig.pelvis.position.y += 0.002 - minY;
    rig.root.updateMatrixWorld(true);
  }
}

function applyMuscleHighlights(
  rig: RigRefs,
  activeMuscles: MuscleGroupId[],
  materials: SharedMaterials,
) {
  const activeSet = new Set<MuscleGroupId>(activeMuscles);
  (Object.keys(rig.muscleMeshes) as MuscleGroupId[]).forEach((groupId) => {
    const isActive = activeSet.has(groupId);
    const mat = isActive ? materials.activeMuscle : materials.baseMuscle;
    for (const mesh of rig.muscleMeshes[groupId]) {
      if (mesh.material !== mat) {
        mesh.material = mat;
      }
    }
  });
}

export const ThreeAnatomyCanvas: React.FC<ThreeAnatomyCanvasProps & { activeMuscles: MuscleGroupId[] }> = ({
  exerciseId,
  exerciseTitle,
  phase,
  cameraPreset,
  compact = false,
  activeMuscles,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  const stateRef = useRef({
    exerciseId,
    phase,
    activeMuscles,
    cameraPreset,
  });

  useEffect(() => {
    stateRef.current = { exerciseId, phase, activeMuscles, cameraPreset };
  }, [exerciseId, phase, activeMuscles, cameraPreset]);

  const rigSceneRef = useRef<{
    rig: RigRefs;
    materials: SharedMaterials;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    targetCamPos: THREE.Vector3;
    targetLookAt: THREE.Vector3;
    lerpCamera: boolean;
  } | null>(null);

  // Inicializar escena WebGL una sola vez por montaje (sin fugas de contexto WebGL)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      const id = window.requestAnimationFrame(() => setWebglError(true));
      return () => window.cancelAnimationFrame(id);
    }

    const width = Math.max(container.clientWidth || 320, 200);
    const height = Math.max(container.clientHeight || 210, 140);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.setAttribute('aria-label', `Modelo anatómico 3D interactivo de ${stateRef.current.exerciseId}`);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eef2f6');
    scene.fog = new THREE.Fog('#eef2f6', 4.6, 8.8);

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 25);
    const initPreset = CAMERA_PRESETS[stateRef.current.cameraPreset];
    camera.position.set(...initPreset.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.35;
    controls.maxDistance = 4.2;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minPolarAngle = 0.18;
    controls.target.set(...initPreset.target);
    controls.update();

    // Iluminación de estudio limpia (idéntica a ciclorama anatómico)
    const hemiLight = new THREE.HemisphereLight('#ffffff', '#cbd5e1', 1.15);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fffdf9', 1.65);
    keyLight.position.set(2.4, 4.1, 2.7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 10;
    const d = 1.7;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#dbeafe', 0.72);
    rimLight.position.set(-2.5, 2.2, -2.4);
    scene.add(rimLight);

    // Suelo ciclorama de estudio receptor de sombra suave
    const floorGeom = new THREE.CircleGeometry(4.5, 48);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#e6ebf1',
      roughness: 0.92,
      metalness: 0.02,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.receiveShadow = true;
    scene.add(floor);

    const bumpMap = createMuscleFiberBumpTexture();
    const materials: SharedMaterials = {
      baseMuscle: new THREE.MeshStandardMaterial({
        color: '#a3adb9',
        roughness: 0.44,
        metalness: 0.08,
        bumpMap,
        bumpScale: 0.012,
      }),
      activeMuscle: new THREE.MeshStandardMaterial({
        color: '#d9483b',
        emissive: '#6e1610',
        emissiveIntensity: 0.28,
        roughness: 0.36,
        metalness: 0.08,
        bumpMap,
        bumpScale: 0.016,
      }),
      shorts: new THREE.MeshStandardMaterial({
        color: '#11151c',
        roughness: 0.78,
        metalness: 0.05,
      }),
      tendon: new THREE.MeshStandardMaterial({
        color: '#c9d1dc',
        roughness: 0.5,
        metalness: 0.05,
      }),
      sneakerUpper: new THREE.MeshStandardMaterial({
        color: '#4e5866',
        roughness: 0.65,
        metalness: 0.06,
      }),
      sneakerSole: new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.55,
        metalness: 0.04,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.32,
        metalness: 0.68,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: '#d5dde7',
        roughness: 0.85,
        metalness: 0.02,
      }),
      benchPad: new THREE.MeshStandardMaterial({
        color: '#293241',
        roughness: 0.62,
        metalness: 0.08,
      }),
      bumpMap,
    };

    const rig = buildRig(materials);
    scene.add(rig.root);

    rigSceneRef.current = {
      rig,
      materials,
      camera,
      controls,
      renderer,
      scene,
      targetCamPos: new THREE.Vector3(...initPreset.pos),
      targetLookAt: new THREE.Vector3(...initPreset.target),
      lerpCamera: false,
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            for (const entry of entries) {
              const w = Math.max(entry.contentRect.width, 180);
              const h = Math.max(entry.contentRect.height, 120);
              camera.aspect = w / h;
              camera.updateProjectionMatrix();
              renderer.setSize(w, h, false);
            }
          })
        : null;
    resizeObserver?.observe(container);

    const stopCamLerpOnUserDrag = () => {
      if (rigSceneRef.current) {
        rigSceneRef.current.lerpCamera = false;
      }
    };
    controls.addEventListener('start', stopCamLerpOnUserDrag);

    let rafId = 0;
    const renderLoop = () => {
      const ctx = rigSceneRef.current;
      if (!ctx) return;

      const { exerciseId: curId, phase: curPhase, activeMuscles: curMuscles } = stateRef.current;
      const spec3D = resolveExercise3D(curId);
      const easedT = 0.5 - 0.5 * Math.cos(curPhase * Math.PI * 2);
      const curPose = interpolatePose3D(spec3D.startPose, spec3D.peakPose, easedT);

      applyPoseToRig(ctx.rig, curPose, spec3D.environment);
      applyMuscleHighlights(ctx.rig, curMuscles, ctx.materials);

      // Pulso sutil en músculo activo para destacar contracción
      ctx.materials.activeMuscle.emissiveIntensity = 0.22 + 0.14 * easedT;

      if (ctx.lerpCamera) {
        ctx.camera.position.lerp(ctx.targetCamPos, 0.14);
        ctx.controls.target.lerp(ctx.targetLookAt, 0.14);
        if (ctx.camera.position.distanceTo(ctx.targetCamPos) < 0.015) {
          ctx.lerpCamera = false;
        }
      }

      ctx.controls.update();
      ctx.renderer.render(ctx.scene, ctx.camera);
      rafId = window.requestAnimationFrame(renderLoop);
    };
    rafId = window.requestAnimationFrame(renderLoop);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      controls.removeEventListener('start', stopCamLerpOnUserDrag);
      controls.dispose();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
      Object.values(materials).forEach((m) => {
        if (m instanceof THREE.Material || m instanceof THREE.Texture) {
          m.dispose();
        }
      });
      floorMat.dispose();
      floorGeom.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      rigSceneRef.current = null;
    };
  }, []);

  // Transición suave cuando cambia el preset de cámara o el ejercicio seleccionado
  useEffect(() => {
    const ctx = rigSceneRef.current;
    if (!ctx) return;
    ctx.renderer.domElement.setAttribute('aria-label', `Modelo anatómico 3D interactivo de ${exerciseTitle}`);
    const preset = CAMERA_PRESETS[cameraPreset];
    ctx.targetCamPos.set(...preset.pos);
    ctx.targetLookAt.set(...preset.target);
    ctx.lerpCamera = true;
  }, [cameraPreset, exerciseId, exerciseTitle]);

  if (webglError) {
    return (
      <div
        className={`w-full ${
          compact ? 'h-32' : 'h-56 sm:h-64'
        } flex flex-col items-center justify-center px-4 text-center bg-[#eef2f6] text-slate-700`}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
          Motor 3D interactivo
        </p>
        <p className="text-xs text-slate-600">
          Tu navegador no tiene aceleración WebGL disponible para renderizar el modelo 3D de {exerciseTitle}.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid={`three-anatomy-${exerciseId}`}
      className={`w-full ${
        compact ? 'h-32' : 'h-56 sm:h-64'
      } relative select-none cursor-grab active:cursor-grabbing`}
    >
      {!compact && (
        <span className="pointer-events-none absolute bottom-2 left-2.5 px-2 py-0.5 rounded-md bg-slate-900/70 text-[10px] font-medium text-white backdrop-blur-sm">
          Arrastra para rotar 360° · Rueda para zoom
        </span>
      )}
    </div>
  );
};
