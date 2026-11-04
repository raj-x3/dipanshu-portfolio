import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { laptopState } from './progress';
import { createTerminal } from './terminal';
import { easeInOutCubic, smoothstep } from '../lib/motion';

/*
 * Procedural laptop: every part is a rounded, bevelled extrusion (not a box), the
 * keys are one InstancedMesh, and the lid pivots on a real hinge axis.
 * Swap buildLaptopParts() for a licensed GLB later without touching the rig.
 *
 * Units: 1 = ~1 cm × 10. Base lies on y = 0 (top surface at TB/2).
 */

const W = 3.2; // base width
const D = 2.2; // base depth
const TB = 0.14; // base thickness
const LID_W = 3.2;
const LID_H = 2.12;
const LID_T = 0.1;
const SCREEN_W = 3.0;
const SCREEN_H = 1.88;
const HINGE = new THREE.Vector3(0, TB / 2, -D / 2);

const CLOSED_ANGLE = Math.PI / 2; // lid lies flat over the keyboard
const OPEN_ANGLE = -0.36; // ≈110° between lid and base

const CAM_START = new THREE.Vector3(3.1, 2.4, 4.4); // three-quarter product shot
const LAPTOP_CENTER = new THREE.Vector3(0, 0.5, 0);
const FRONT_DIST = 4.8; // straight-on view of the display
const ENTER_DIST = 2.2; // camera passes into the display; terminal fills the frame

const KEY_ROWS = [14, 14, 13, 13, 7];
const KEY_PITCH_X = 0.19;
const KEY_PITCH_Z = 0.16;
const KEY_COUNT = KEY_ROWS.reduce((a, b) => a + b, 0);

/** Rounded-rectangle slab centred on the origin; x∈[-w/2,w/2], y∈[-h/2,h/2], z∈[-t/2,t/2]. */
function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function slabGeometry(w: number, h: number, t: number, r: number): THREE.ExtrudeGeometry {
  const bevel = Math.min(0.02, t * 0.3);
  const geo = new THREE.ExtrudeGeometry(
    roundedRectShape(w - 2 * bevel, h - 2 * bevel, Math.max(0.01, r - bevel)),
    {
      depth: Math.max(0.001, t - 2 * bevel),
      bevelEnabled: true,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 4,
      curveSegments: 10,
    },
  );
  geo.center();
  return geo;
}

type Assets = {
  alu: THREE.MeshPhysicalMaterial;
  dark: THREE.MeshStandardMaterial;
  deckMat: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  bezel: THREE.MeshStandardMaterial;
  base: THREE.BufferGeometry;
  lid: THREE.BufferGeometry;
  deck: THREE.BufferGeometry;
  track: THREE.BufferGeometry;
  hinge: THREE.BufferGeometry;
  screen: THREE.BufferGeometry;
  bezelPlane: THREE.BufferGeometry;
  keys: THREE.InstancedMesh;
  dispose: () => void;
};

function buildAssets(): Assets {
  const alu = new THREE.MeshPhysicalMaterial({
    color: '#c4c6cd',
    metalness: 1,
    roughness: 0.28,
    clearcoat: 0.4,
    clearcoatRoughness: 0.25,
  });
  const dark = new THREE.MeshStandardMaterial({ color: '#16161b', roughness: 0.55, metalness: 0.2 });
  const deckMat = new THREE.MeshPhysicalMaterial({ color: '#1d1d23', roughness: 0.42, metalness: 0.6 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#22222a',
    roughness: 0.18,
    metalness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  const bezel = new THREE.MeshStandardMaterial({ color: '#050506', roughness: 0.9 });

  const base = slabGeometry(W, D, TB, 0.06).rotateX(-Math.PI / 2);
  const lid = slabGeometry(LID_W, LID_H, LID_T, 0.07).translate(0, LID_H / 2, -LID_T / 2);
  const deck = slabGeometry(W - 0.36, 1.0, 0.01, 0.03).rotateX(-Math.PI / 2);
  const track = slabGeometry(1.05, 0.6, 0.012, 0.04).rotateX(-Math.PI / 2);
  const keyGeo = slabGeometry(0.15, 0.14, 0.03, 0.025).rotateX(-Math.PI / 2);
  const hinge = new THREE.CylinderGeometry(0.03, 0.03, LID_W * 0.92, 24).rotateZ(Math.PI / 2);
  const screen = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H);
  const bezelPlane = new THREE.PlaneGeometry(LID_W - 0.04, LID_H - 0.04);

  const keys = new THREE.InstancedMesh(keyGeo, dark, KEY_COUNT);
  const m = new THREE.Matrix4();
  let idx = 0;
  KEY_ROWS.forEach((count, row) => {
    const z = -0.86 + row * KEY_PITCH_Z;
    for (let c = 0; c < count; c++) {
      const x = (c - (count - 1) / 2) * KEY_PITCH_X;
      m.makeTranslation(x, TB / 2 + 0.025, z);
      keys.setMatrixAt(idx++, m);
    }
  });
  keys.instanceMatrix.needsUpdate = true;

  return {
    alu,
    dark,
    deckMat,
    glass,
    bezel,
    base,
    lid,
    deck,
    track,
    hinge,
    screen,
    bezelPlane,
    keys,
    dispose() {
      [alu, dark, deckMat, glass, bezel].forEach((mat) => mat.dispose());
      [base, lid, deck, track, hinge, screen, bezelPlane, keyGeo].forEach((g) => g.dispose());
      keys.dispose();
    },
  };
}

function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(139,140,255,0.32)');
    g.addColorStop(1, 'rgba(139,140,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Experience({ particleCount }: { particleCount: number }) {
  const { gl, scene, camera } = useThree();

  const lidRef = useRef<THREE.Group>(null!);
  const anchorRef = useRef<THREE.Object3D>(null!);
  const pointsRef = useRef<THREE.Points>(null!);

  const terminal = useMemo(() => createTerminal(), []);
  const assets = useMemo(() => buildAssets(), []);
  const screenMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: terminal.texture, toneMapped: false, color: new THREE.Color(0, 0, 0) }),
    [terminal],
  );
  const glowTex = useMemo(() => createGlowTexture(), []);
  const glowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.8 }),
    [glowTex],
  );
  const particleGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 1] = Math.random() * 5 - 1.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return geo;
  }, [particleCount]);
  const envMap = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return tex;
  }, [gl]);

  useEffect(() => {
    scene.environment = envMap;
    return () => {
      scene.environment = null;
      envMap.dispose();
    };
  }, [scene, envMap]);

  useEffect(() => {
    return () => {
      terminal.dispose();
      assets.dispose();
      screenMat.dispose();
      glowTex.dispose();
      glowMat.dispose();
      particleGeo.dispose();
    };
  }, [terminal, assets, screenMat, glowTex, glowMat, particleGeo]);

  // Scratch objects reused every frame so the loop allocates nothing.
  const scratch = useMemo(
    () => ({
      screen: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      front: new THREE.Vector3(),
      camPos: new THREE.Vector3(),
      camTarget: new THREE.Vector3(),
    }),
    [],
  );
  const state = useRef({ open: 0, zoom: 0, typed: 0 });

  useFrame((frame, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const p = laptopState.p;
    const s = state.current;

    // Damped values: every move starts from the current value, so reversing mid-scroll
    // never jumps (interruptible, as in Apple's fluid-interface model).
    s.open = THREE.MathUtils.damp(s.open, smoothstep(0.06, 0.42, p), 4.5, dt);
    s.zoom = THREE.MathUtils.damp(s.zoom, smoothstep(0.6, 0.98, p), 4, dt);
    s.typed = THREE.MathUtils.damp(s.typed, smoothstep(0.44, 0.7, p), 5, dt);

    const eo = easeInOutCubic(s.open);
    const lid = lidRef.current;
    lid.rotation.x = THREE.MathUtils.lerp(CLOSED_ANGLE, OPEN_ANGLE, eo);
    lid.updateMatrixWorld(true);

    anchorRef.current.getWorldPosition(scratch.screen);
    anchorRef.current.getWorldQuaternion(scratch.quat);
    scratch.normal.set(0, 0, 1).applyQuaternion(scratch.quat);

    // Camera: 3/4 product shot → straight-on to the display → into it.
    const dist = THREE.MathUtils.lerp(FRONT_DIST, ENTER_DIST, easeInOutCubic(s.zoom));
    scratch.front.copy(scratch.screen).addScaledVector(scratch.normal, dist);
    scratch.camPos.lerpVectors(CAM_START, scratch.front, eo);
    scratch.camTarget.lerpVectors(LAPTOP_CENTER, scratch.screen, eo);
    camera.position.copy(scratch.camPos);
    camera.lookAt(scratch.camTarget);

    // The display gradually illuminates as the lid opens.
    screenMat.color.setScalar(smoothstep(0.2, 0.7, s.open));

    terminal.update(s.typed, Math.floor(frame.clock.elapsedTime * 1.8) % 2 === 0);

    pointsRef.current.rotation.y += dt * 0.012;
  });

  return (
    <>
      <color attach="background" args={['#0b0b0e']} />
      <ambientLight intensity={0.12} />
      <hemisphereLight args={['#dfe3ff', '#06060a', 0.25]} />
      <spotLight
        position={[2.5, 6, 3.5]}
        angle={0.42}
        penumbra={0.9}
        intensity={60}
        decay={2}
        color="#f4efe6"
      />
      <directionalLight position={[-5, 3, -4]} intensity={0.8} color="#8b8cff" />

      {/* Soft pool of light beneath the laptop */}
      <mesh position={[0, -0.078, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glowMat}>
        <planeGeometry args={[7, 7]} />
      </mesh>

      {/* Base */}
      <group>
        <mesh geometry={assets.base} material={assets.alu} />
        <mesh geometry={assets.deck} material={assets.deckMat} position={[0, TB / 2 + 0.005, -0.5]} />
        <primitive object={assets.keys} />
        <mesh geometry={assets.track} material={assets.glass} position={[0, TB / 2 + 0.006, 0.55]} />
        <mesh geometry={assets.hinge} material={assets.alu} position={HINGE} />
      </group>

      {/* Lid, pivoting on the hinge axis */}
      <group ref={lidRef} position={HINGE} rotation={[CLOSED_ANGLE, 0, 0]}>
        <mesh geometry={assets.lid} material={assets.alu} />
        <mesh geometry={assets.bezelPlane} material={assets.bezel} position={[0, LID_H / 2, 0.001]} />
        <mesh
          geometry={assets.screen}
          material={screenMat}
          position={[0, LID_H / 2 + 0.02, 0.002]}
        />
        <object3D ref={anchorRef} position={[0, LID_H / 2 + 0.02, 0.003]} />
      </group>

      <points ref={pointsRef} geometry={particleGeo}>
        <pointsMaterial color="#d8d8e4" size={0.018} transparent opacity={0.45} depthWrite={false} sizeAttenuation />
      </points>
    </>
  );
}

export function LaptopScene({ frameloop }: { frameloop: 'always' | 'never' }) {
  const particleCount = typeof window !== 'undefined' && window.innerWidth < 760 ? 60 : 180;
  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, 1.75]}
      camera={{ fov: 35, near: 0.1, far: 60, position: [3.1, 2.4, 4.4] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <Experience particleCount={particleCount} />
    </Canvas>
  );
}
