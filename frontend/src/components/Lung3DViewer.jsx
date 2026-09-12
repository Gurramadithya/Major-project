import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useRef, useState, Suspense, useMemo, useCallback } from 'react';
import * as THREE from 'three';

const LungModel = ({ 
  highlightLeft = false, 
  highlightRight = false, 
  prediction = 'Normal',
  showHighlight = true,
  pulseEffect = true
}) => {
  const groupRef = useRef();
  const initializedRef = useRef(false);
  const highlightMeshRef = useRef(null);
  
  const gltf = useGLTF('/models/lungs.glb');
  const scene = gltf.scene;
  
  // Initialize scene once - center and scale the model
  if (scene && !initializedRef.current) {
    initializedRef.current = true;
    
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    scene.position.sub(center);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    scene.scale.set(scale, scale, scale);
    
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }
  
  // Create or update highlight sphere
  React.useEffect(() => {
    // Remove existing highlight
    if (highlightMeshRef.current) {
      groupRef.current?.remove(highlightMeshRef.current);
      highlightMeshRef.current.geometry.dispose();
      highlightMeshRef.current.material.dispose();
      highlightMeshRef.current = null;
    }
    
    // Only add highlight for abnormal predictions
    if (!showHighlight || !prediction || prediction.toLowerCase() === 'normal') {
      return;
    }
    
    // Determine highlight position based on region
    let highlightPosition = new THREE.Vector3(0, 0, 0);
    let highlightScale = 0.3;
    
    if (highlightLeft && highlightRight) {
      // Bilateral - center
      highlightPosition.set(0, 0.2, 0.4);
      highlightScale = 0.4;
    } else if (highlightLeft) {
      // Left lung
      highlightPosition.set(-0.4, 0.1, 0.3);
      highlightScale = 0.35;
    } else if (highlightRight) {
      // Right lung
      highlightPosition.set(0.4, 0.1, 0.3);
      highlightScale = 0.35;
    } else {
      // Default to bilateral if no specific region
      highlightPosition.set(0, 0.2, 0.4);
      highlightScale = 0.4;
    }
    
    // Create glowing sphere
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.6,
    });
    
    const highlightSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    highlightSphere.position.copy(highlightPosition);
    highlightSphere.scale.set(highlightScale, highlightScale, highlightScale);
    
    // Add to group so it rotates with the lung
    if (groupRef.current) {
      groupRef.current.add(highlightSphere);
      highlightMeshRef.current = highlightSphere;
    }
    
    return () => {
      if (highlightMeshRef.current) {
        groupRef.current?.remove(highlightMeshRef.current);
        highlightMeshRef.current.geometry.dispose();
        highlightMeshRef.current.material.dispose();
      }
    };
  }, [highlightLeft, highlightRight, prediction, showHighlight]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
};

const MemoizedLungModel = React.memo(LungModel);

class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error('WebGL error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-900/50 rounded-xl p-6">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-white font-medium mb-2">WebGL Not Available</p>
          <p className="text-slate-400 text-sm text-center max-w-xs mb-3">
            Your browser does not support WebGL
          </p>
          <div className="text-xs text-slate-500 text-center space-y-2">
            <p>To enable WebGL in Chrome:</p>
            <ol className="text-left list-decimal list-inside space-y-1">
              <li>Go to chrome://settings/system</li>
              <li>Enable "Use graphics acceleration when available"</li>
              <li>Restart Chrome</li>
            </ol>
            <p className="mt-3">Error: {this.state.error || 'WebGL initialization failed'}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Lung3DViewer = ({ 
  activeCase, 
  autoRotate = true,
  enableControls = true,
  showHighlight = true,
  pulseEffect = true
}) => {
  const controlsRef = useRef();
  
  const shouldShowModel = useMemo(() => {
    return activeCase && activeCase.prediction && activeCase.success !== false;
  }, [activeCase]);
  
  const regionKey = (activeCase?.affected_region || activeCase?.affectedRegion || 'Bilateral Lung').toLowerCase();
  const prediction = activeCase?.prediction || 'Normal';
  const isAbnormal = prediction && prediction.toLowerCase() !== 'normal';
  const shouldHighlightBoth = regionKey.includes('bilateral') || regionKey.includes('both') || regionKey.includes('lung') && !regionKey.includes('left') && !regionKey.includes('right');
  const highlightLeft = isAbnormal
    ? (activeCase?.highlightLeft ?? activeCase?.highlight_left ?? (
        regionKey.includes('left') || shouldHighlightBoth
      ))
    : false;
  const highlightRight = isAbnormal
    ? (activeCase?.highlightRight ?? activeCase?.highlight_right ?? (
        regionKey.includes('right') || shouldHighlightBoth
      ))
    : false;
  const displayRegion = activeCase?.affected_region || activeCase?.affectedRegion || 'Bilateral Lung';

  if (!shouldShowModel) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900/50 rounded-xl">
        <div className="w-16 h-16 rounded-full bg-medical-500/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-white font-medium mb-2">Upload a medical image to begin analysis</p>
        <p className="text-slate-400 text-sm">3D lung anatomy visualization will appear after detection</p>
      </div>
    );
  }

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-900/50 rounded-xl overflow-hidden">
      <CanvasErrorBoundary>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
          dpr={[1, 2]}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          <Suspense fallback={null}>
            <MemoizedLungModel 
              highlightLeft={highlightLeft}
              highlightRight={highlightRight}
              prediction={prediction}
              showHighlight={showHighlight}
              pulseEffect={pulseEffect}
            />
          </Suspense>
          {enableControls && (
            <OrbitControls
              ref={controlsRef}
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              autoRotate={autoRotate}
              autoRotateSpeed={0.5}
              minDistance={2}
              maxDistance={10}
            />
          )}
        </Canvas>
      </CanvasErrorBoundary>
      
      <button
        onClick={resetCamera}
        className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm hover:bg-slate-700/80 transition-colors"
      >
        Reset View
      </button>
      
      {activeCase?.prediction && (
        <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2">
          <p className="text-sm text-white font-medium">{activeCase.prediction}</p>
          <p className="text-xs text-medical-500 mt-1">Affected region: {displayRegion}</p>
        </div>
      )}
    </div>
  );
};

export default Lung3DViewer;
