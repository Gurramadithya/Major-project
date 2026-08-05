import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Text } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const OrganModel = ({ organ, highlighted }) => {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.17;
    }
  });

  const organStyles = useMemo(() => ({
    lungs: {
      primary: '#38bdf8',
      accent: '#0f172a',
      label: 'Pulmonary anatomy',
    },
    heart: {
      primary: '#fb923c',
      accent: '#431407',
      label: 'Cardiac anatomy',
    },
    bones: {
      primary: '#e2e8f0',
      accent: '#1e293b',
      label: 'Skeletal anatomy',
    },
    bronchi: {
      primary: '#34d399',
      accent: '#052e16',
      label: 'Bronchial tree',
    },
  }), []);

  const style = organStyles[organ] || organStyles.lungs;

  return (
    <group ref={groupRef}>
      <RoundedBox args={[2.3, 2.6, 1.4]} radius={0.2} smoothness={8}>
        <meshStandardMaterial color={highlighted ? '#ef4444' : style.primary} emissive={highlighted ? '#7f1d1d' : style.accent} emissiveIntensity={0.18} />
      </RoundedBox>
      <mesh position={[0, 0.7, 0.72]}>
        <cylinderGeometry args={[0.52, 0.56, 0.5, 20]} />
        <meshStandardMaterial color={highlighted ? '#fca5a5' : style.primary} />
      </mesh>
      <mesh position={[0, -0.55, 0.6]}>
        <boxGeometry args={[1.2, 0.85, 0.5]} />
        <meshStandardMaterial color={highlighted ? '#fde68a' : '#f8fafc'} />
      </mesh>
      <Text position={[0, -1.6, 0]} fontSize={0.22} color="#f8fafc" anchorX="center" anchorY="middle">
        {highlighted ? `${style.label} · highlighted` : style.label}
      </Text>
    </group>
  );
};

const Clinical3DViewer = ({ activeCase }) => {
  const [selectedOrgan, setSelectedOrgan] = useState('lungs');
  const [hasCase, setHasCase] = useState(Boolean(activeCase));
  const [viewerError, setViewerError] = useState(false);
  const cameraRef = useRef();

  useEffect(() => {
    setHasCase(Boolean(activeCase));
  }, [activeCase]);

  // Auto-select organ based on detection result
  useEffect(() => {
    if (activeCase?.affectedOrgan) {
      const organMap = {
        'lung': 'lungs',
        'lungs': 'lungs',
        'pulmonary': 'lungs',
        'heart': 'heart',
        'cardiac': 'heart',
        'bone': 'bones',
        'bones': 'bones',
        'skeletal': 'bones',
        'bronchi': 'bronchi',
        'bronchial': 'bronchi',
      };
      const mappedOrgan = organMap[activeCase.affectedOrgan.toLowerCase()] || 'lungs';
      setSelectedOrgan(mappedOrgan);
    }
  }, [activeCase?.affectedOrgan]);

  const highlighted = Boolean(
    hasCase &&
      activeCase?.success !== false &&
      activeCase?.prediction &&
      !['Unknown', 'Pending', 'Model unavailable', 'Inference unavailable', 'Inference failed'].includes(activeCase.prediction)
  );

  const organs = ['lungs', 'heart', 'bones', 'bronchi'];

  const handleResetCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 6);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      {/* Status Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
        <div className="space-y-1">
          <p className="font-semibold text-white">Interactive anatomy view</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="uppercase tracking-[0.3em] text-medical-500">Rotate · Zoom · Pan</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Current: <span className="text-white capitalize">{selectedOrgan}</span></span>
            {activeCase?.affectedOrgan && (
              <>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">Affected: <span className="text-medical-500 capitalize">{activeCase.affectedOrgan}</span></span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${highlighted ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {highlighted ? 'Affected' : 'Ready'}
          </span>
          <span className="px-2 py-1 rounded-lg bg-medical-500/20 text-medical-400 text-xs font-medium">
            3D Ready
          </span>
        </div>
      </div>

      {/* Organ Selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {organs.map((organ) => (
          <button
            key={organ}
            type="button"
            onClick={() => setSelectedOrgan(organ)}
            className={`rounded-full px-3 py-1.5 text-sm capitalize transition ${selectedOrgan === organ ? 'bg-medical-500 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
          >
            {organ}
          </button>
        ))}
        <button
          type="button"
          onClick={handleResetCamera}
          className="rounded-full px-3 py-1.5 text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 transition flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset Camera
        </button>
      </div>

      {/* 3D Canvas */}
      {viewerError ? (
        <div className="h-[420px] rounded-2xl border border-slate-800 bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-slate-400 font-medium">3D Viewer Unavailable</p>
            <p className="text-sm text-slate-500 mt-1">Please try refreshing the page</p>
          </div>
        </div>
      ) : (
        <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <Canvas camera={{ position: [0, 0, 6], fov: 40 }} onError={() => setViewerError(true)}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[3, 4, 3]} intensity={1.2} />
            <pointLight position={[-3, -2, -2]} intensity={0.6} />
            <OrganModel organ={selectedOrgan} highlighted={highlighted} />
            <OrbitControls enablePan enableZoom enableRotate />
          </Canvas>
        </div>
      )}
    </div>
  );
};

export default Clinical3DViewer;
