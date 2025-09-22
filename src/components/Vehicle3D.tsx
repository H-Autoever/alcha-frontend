import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  useGLTF,
  Environment,
  Line,
  Bounds,
} from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

function VehicleModel({ rotationY }: { rotationY: number }) {
  const { scene } = useGLTF('/scene.gltf');

  return (
    <primitive
      object={scene}
      scale={[100, 100, 100]}
      position={[0, 0, 0.5]}
      rotation={[0, rotationY, 0]}
    />
  );
}

function LoadingFallback() {
  return (
    <div className='flex items-center justify-center h-64'>
      <div className='text-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-h-blue mx-auto mb-2'></div>
        <p className='text-sm text-gray-500'>차량 모델 로딩 중...🚗</p>
      </div>
    </div>
  );
}

type VehicleMode = 'driving' | 'parked';

function Road({
  visible,
  rotationY,
  speed,
}: {
  visible: boolean;
  rotationY: number;
  speed: number;
}) {
  const smoothed = useRef(0);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    const dashHeight = 32;
    const dashWidth = 6;
    const gap = 32;
    for (let y = 0; y < canvas.height; y += dashHeight + gap) {
      ctx.fillRect(canvas.width / 2 - dashWidth / 2, y, dashWidth, dashHeight);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 8);
    return tex;
  }, []);

  useFrame((_, delta) => {
    if (!visible) return;
    smoothed.current += (speed - smoothed.current) * Math.min(1, delta * 5);
    const k = 0.008; // km/h → 텍스처 스크롤 계수 (원하는 느낌에 맞게 튜닝)
    texture.offset.y -= delta * (smoothed.current * k);
  });

  return (
    <group rotation={[0, rotationY, 0]} visible={visible}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[10, 50, 1, 1]} />
        <meshStandardMaterial map={texture} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

function ParkingOutline({ visible }: { visible: boolean }) {
  const size = 1.6;
  const depth = 2.6;
  const points = useMemo(() => {
    const p: [number, number, number][] = [
      [-size, 0, -depth],
      [size, 0, -depth],
      [size, 0, depth],
      [-size, 0, depth],
      [-size, 0, -depth],
    ];
    return p.map(x => new THREE.Vector3(...x));
  }, []);
  return (
    <group visible={visible} position={[0, 0.02, 0]}>
      <Line points={points} color={'#ffd54a'} lineWidth={4} dashed={false} />
    </group>
  );
}

function CameraRig({ mode }: { mode: VehicleMode }) {
  const { camera } = useThree();
  // Camera shake (disabled) — see commented block below
  const drivingBase = useMemo(() => new THREE.Vector3(0, 1.5, 4), []);
  const parkedBase = useMemo(() => new THREE.Vector3(0, 7.5, 0.02), []);

  useEffect(() => {
    const base = mode === 'driving' ? drivingBase : parkedBase;
    camera.position.copy(base);
    camera.lookAt(0, mode === 'driving' ? 0.5 : 0, 0);
  }, [camera, mode, drivingBase, parkedBase]);

  // useFrame(() => { /* camera shake disabled */ });
  return null;
}

/*
// To enable camera shake later, replace the CameraRig implementation with this:
function CameraRig({ mode, speed }: { mode: VehicleMode; speed: number }) {
  const { camera } = useThree();
  const tRef = useRef(0);
  const drivingBase = useMemo(() => new THREE.Vector3(0, 1.5, 4), []);
  const parkedBase = useMemo(() => new THREE.Vector3(0, 7.5, 0.02), []);

  useEffect(() => {
    const base = mode === 'driving' ? drivingBase : parkedBase;
    camera.position.copy(base);
    camera.lookAt(0, mode === 'driving' ? 0.5 : 0, 0);
  }, [camera, mode, drivingBase, parkedBase]);

  useFrame((_, delta) => {
    tRef.current += delta;
    if (mode === 'driving') {
      const normalized = Math.min(1, Math.max(0, speed / 120));
      const freq = 2.2;
      const ampY = 0.03 * (0.6 + 0.4 * normalized);
      const ampX = 0.015 * (0.6 + 0.4 * normalized);
      const offsetX = Math.sin(tRef.current * Math.PI * 2 * freq) * ampX;
      const offsetY = Math.cos(tRef.current * Math.PI * 2 * (freq * 0.85)) * ampY;
      const targetPos = new THREE.Vector3(
        drivingBase.x + offsetX,
        drivingBase.y + offsetY,
        drivingBase.z
      );
      camera.position.lerp(targetPos, 0.15);
      camera.lookAt(0, 0.5, 0);
    } else {
      camera.position.lerp(parkedBase, 0.2);
      camera.lookAt(0, 0, 0);
    }
  });
  return null;
}
*/

export default function Vehicle3D({
  mode,
  speed,
}: {
  mode: VehicleMode;
  speed: number;
}) {
  const vehicleRotationY = mode === 'driving' ? -Math.PI / 4 : -Math.PI;
  return (
    <div className='w-full aspect-video relative'>
      <Canvas
        camera={{
          position: [0, 1.5, 4],
          fov: 50,
        }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <CameraRig mode={mode} />
          {/* 조명 설정 */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />

          {/* 환경 조명 */}
          <Environment preset='city' />

          {/* 모드별 바닥 */}
          <Road
            visible={mode === 'driving'}
            rotationY={vehicleRotationY}
            speed={speed}
          />
          <ParkingOutline visible={mode === 'parked'} />

          {/* 3D 모델: 컨테이너 크기 변화에 따라 자동 프레이밍 */}
          <Bounds
            key={mode}
            fit
            clip
            observe
            margin={mode === 'driving' ? 0.8 : 1.3}
          >
            <VehicleModel rotationY={vehicleRotationY} />
          </Bounds>

          {/* 카메라 컨트롤 */}
          <OrbitControls
            enabled={mode === 'driving'}
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={12}
          />
        </Suspense>
      </Canvas>

      {/* 로딩 상태 표시 */}
      <Suspense fallback={<LoadingFallback />}>
        <div></div>
      </Suspense>
    </div>
  );
}

// glTF 모델 미리 로드
useGLTF.preload('/scene.gltf');
