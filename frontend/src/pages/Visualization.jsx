import { useEffect, useRef, useState } from 'react';
import PageContainer from '../components/PageContainer';
import Lung3DViewer from '../components/Lung3DViewer';

const Visualization = () => {
  const [activeCase, setActiveCase] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showHighlight, setShowHighlight] = useState(true);
  const [pulseEffect, setPulseEffect] = useState(true);

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

  const hasDisease = activeCase?.prediction && activeCase.prediction.toLowerCase() !== 'normal';

  return (
    <PageContainer title="3D Lung Visualization" subtitle="Interactive 3D model showing lung anatomy with affected region highlighting.">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.4fr]">
        {/* 3D Viewer */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Interactive Model</h3>
                <p className="text-sm text-slate-400">Drag to rotate • Scroll to zoom</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    autoRotate ? 'bg-medical-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {autoRotate ? 'Auto-rotate ON' : 'Auto-rotate OFF'}
                </button>
                <button
                  onClick={() => setShowHighlight(!showHighlight)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    showHighlight ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {showHighlight ? 'Highlight ON' : 'Highlight OFF'}
                </button>
                <button
                  onClick={() => setPulseEffect(!pulseEffect)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    pulseEffect ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {pulseEffect ? 'Pulse ON' : 'Pulse OFF'}
                </button>
              </div>
            </div>
            
            {activeCase?.prediction ? (
              <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Current detection: {activeCase.prediction}</p>
                    <p className="mt-1">Confidence: {(activeCase.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    hasDisease ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {hasDisease ? 'Affected' : 'Normal'}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="h-[500px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <Lung3DViewer 
                activeCase={activeCase}
                showHighlight={showHighlight}
                pulseEffect={pulseEffect}
                autoRotate={autoRotate}
                enableControls={true}
              />
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Anatomy Legend</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-400"></div>
                <span className="text-sm text-slate-300">Healthy Lungs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-slate-300"></div>
                <span className="text-sm text-slate-300">Airways</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-rose-500"></div>
                <span className="text-sm text-slate-300">Heart</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-rose-400"></div>
                <span className="text-sm text-slate-300">Affected Region ({activeCase?.prediction || 'None'})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Info Panel */}
        <div className="space-y-6">
          {/* Medical Information Panel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Medical Information</h3>
            {activeCase ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Organ</p>
                  <p className="text-lg font-semibold text-white">Lungs</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Disease</p>
                  <p className="text-lg font-semibold text-white">{activeCase.prediction || 'Unknown'}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Severity</p>
                  <p className="text-lg font-semibold text-white capitalize">{activeCase.severity || 'Unknown'}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Affected Region</p>
                  <p className="text-lg font-semibold text-white">{activeCase.affected_region || activeCase.affectedRegion || 'Not available'}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Highlight Status</p>
                  <p className={`text-lg font-semibold ${showHighlight && hasDisease ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {showHighlight && hasDisease ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-400">No active detection</p>
                <p className="text-xs text-slate-500 mt-1">Upload an image to see medical information</p>
              </div>
            )}
          </div>

          {/* View Controls */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">View Controls</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <span className="text-slate-300">Left click + drag to rotate</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
                <span className="text-slate-300">Scroll to zoom in/out</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </div>
                <span className="text-slate-300">Right click + drag to pan</span>
              </div>
            </div>
          </div>

          {/* Clinical Notes */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Clinical Notes</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <p>• 3D model automatically loads based on detection results</p>
              <p>• Affected regions highlight based on disease type</p>
              <p>• Use toggle buttons to control visualization</p>
              <p>• Pulse effect indicates active disease regions</p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Visualization;
