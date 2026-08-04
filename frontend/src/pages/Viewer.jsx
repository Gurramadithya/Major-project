import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Text } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import PageContainer from '../components/PageContainer';

const AnatomyModel = ({ highlighted }) => {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      <RoundedBox args={[2.2, 2.6, 1.4]} radius={0.2} smoothness={8}>
        <meshStandardMaterial color={highlighted ? '#ef4444' : '#38bdf8'} emissive={highlighted ? '#7f1d1d' : '#0f172a'} emissiveIntensity={0.15} />
      </RoundedBox>
      <mesh position={[0, 0.7, 0.71]}>
        <cylinderGeometry args={[0.5, 0.55, 0.5, 20]} />
        <meshStandardMaterial color={highlighted ? '#fb923c' : '#cbd5e1'} />
      </mesh>
      <mesh position={[0, -0.55, 0.6]}>
        <boxGeometry args={[1.1, 0.8, 0.5]} />
        <meshStandardMaterial color={highlighted ? '#fca5a5' : '#e2e8f0'} />
      </mesh>
      <Text position={[0, -1.6, 0]} fontSize={0.22} color="#f8fafc" anchorX="center" anchorY="middle">
        {highlighted ? 'Affected region' : 'Healthy anatomy'}
      </Text>
    </group>
  );
};

const Viewer = () => {
  const [activeCase, setActiveCase] = useState(null);

  useEffect(() => {
    const savedCase = localStorage.getItem('latestCase');
    if (savedCase) {
      try {
        setActiveCase(JSON.parse(savedCase));
      } catch (error) {
        console.error('Unable to parse latest case', error);
      }
    }
  }, []);

  const highlighted = Boolean(
    activeCase?.success &&
      activeCase?.prediction &&
      !['No disease detected', 'Healthy', 'Model unavailable', 'Inference unavailable', 'Inference failed', 'Unknown'].includes(activeCase.prediction)
  );

  return (
    <PageContainer title="3D Viewer" subtitle="Inspect a lightweight anatomy placeholder with rotation, zoom, and pan controls.">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
          <span>Lightweight placeholder model • no heavy assets downloaded</span>
          <span className={highlighted ? 'text-rose-400' : 'text-emerald-400'}>{highlighted ? 'Affected region highlighted' : 'No active detection'}</span>
        </div>
        {activeCase?.prediction ? (
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            <p className="font-medium text-white">Current detection: {activeCase.prediction}</p>
            <p className="mt-1">Confidence: {(activeCase.confidence * 100).toFixed(1)}%</p>
          </div>
        ) : null}
        <div className="h-[520px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <Canvas camera={{ position: [0, 0, 6], fov: 40 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[3, 4, 3]} intensity={1.2} />
            <pointLight position={[-3, -2, -2]} intensity={0.6} />
            <AnatomyModel highlighted={highlighted} />
            <OrbitControls enablePan enableZoom enableRotate />
          </Canvas>
        </div>
      </div>
    </PageContainer>
  );
};

export default Viewer;
