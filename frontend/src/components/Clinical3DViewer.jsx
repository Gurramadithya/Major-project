import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Text } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';

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

  useEffect(() => {
    setHasCase(Boolean(activeCase));
  }, [activeCase]);

  const highlighted = Boolean(
    hasCase &&
      activeCase?.success !== false &&
      activeCase?.prediction &&
      !['Unknown', 'Pending', 'Model unavailable', 'Inference unavailable', 'Inference failed'].includes(activeCase.prediction)
  );

  const organs = ['lungs', 'heart', 'bones', 'bronchi'];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
        <div>
          <p className="font-semibold text-white">Interactive anatomy view</p>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Rotate · Zoom · Pan · Reset</p>
        </div>
        <span className={highlighted ? 'text-rose-400' : 'text-emerald-400'}>{highlighted ? 'Affected region highlighted' : 'Ready for review'}</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {organs.map((organ) => (
          <button
            key={organ}
            type="button"
            onClick={() => setSelectedOrgan(organ)}
            className={`rounded-full px-3 py-1.5 text-sm capitalize transition ${selectedOrgan === organ ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
          >
            {organ}
          </button>
        ))}
      </div>
      <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <Canvas camera={{ position: [0, 0, 6], fov: 40 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 4, 3]} intensity={1.2} />
          <pointLight position={[-3, -2, -2]} intensity={0.6} />
          <OrganModel organ={selectedOrgan} highlighted={highlighted} />
          <OrbitControls enablePan enableZoom enableRotate />
        </Canvas>
      </div>
    </div>
  );
};

export default Clinical3DViewer;
