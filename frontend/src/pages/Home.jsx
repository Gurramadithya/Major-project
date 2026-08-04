import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/PageContainer';

const quickActions = [
  { to: '/upload', label: 'Upload & Analyze', detail: 'Start the full clinical workflow from image intake.', tone: 'cyan' },
  { to: '/viewer', label: 'Open 3D Anatomy', detail: 'Inspect the anatomical context with interactive controls.', tone: 'emerald' },
  { to: '/assistant', label: 'Ask the Assistant', detail: 'Generate specialist-style guidance from the active case.', tone: 'amber' },
];

const Home = () => {
  const [caseSummary, setCaseSummary] = useState(null);

  useEffect(() => {
    const latestCase = localStorage.getItem('latestCase');
    const analytics = localStorage.getItem('analyticsSnapshot');

    try {
      setCaseSummary({
        latestCase: latestCase ? JSON.parse(latestCase) : null,
        analytics: analytics ? JSON.parse(analytics) : null,
      });
    } catch (error) {
      console.error('Unable to parse dashboard data', error);
      setCaseSummary({ latestCase: null, analytics: null });
    }
  }, []);

  const stats = useMemo(() => {
    const analytics = caseSummary?.analytics;

    return [
      { label: 'Total Cases', value: analytics?.totalCases ?? '0', hint: 'Uploaded and stored' },
      { label: 'Reports', value: analytics?.totalReports ?? '0', hint: 'Generated for review' },
      { label: 'Most Predicted', value: analytics?.mostPredictedDisease ?? 'Pending', hint: 'Current trend' },
      { label: 'Avg Confidence', value: analytics?.averageConfidence ? `${(analytics.averageConfidence * 100).toFixed(1)}%` : 'N/A', hint: 'Model confidence' },
    ];
  }, [caseSummary]);

  const latestPrediction = caseSummary?.latestCase?.prediction || 'No active case yet';
  const latestConfidence = caseSummary?.latestCase?.confidence ? `${(caseSummary.latestCase.confidence * 100).toFixed(1)}%` : 'Not available';

  return (
    <div className="space-y-6">
      <PageContainer title="Clinical Planning Workspace" subtitle="A professional medical AI workspace for upload, analysis, visualization, and reporting.">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Clinical review</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Upload, analyze, and report from one workflow</h3>
              </div>
              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">Workflow online</div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{item.hint}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
            <p className="text-sm font-semibold text-slate-300">Current case</p>
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-sm text-slate-400">Latest detection</p>
              <p className="mt-2 text-lg font-semibold text-white">{latestPrediction}</p>
              <p className="mt-2 text-sm text-slate-400">Confidence: {latestConfidence}</p>
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-200">
              The upload flow now moves automatically into detection, recommendations, the 3D viewer, assistant guidance, and report generation.
            </div>
          </div>
        </div>
      </PageContainer>

      <PageContainer title="Recommended next actions" subtitle="Move from image intake to report delivery with a consistent clinical workflow.">
        <div className="grid gap-4 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={`block rounded-2xl border p-4 transition hover:-translate-y-0.5 ${action.tone === 'cyan' ? 'border-cyan-500/20 bg-cyan-500/10' : action.tone === 'emerald' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}
            >
              <p className="font-semibold text-white">{action.label}</p>
              <p className="mt-1 text-sm text-slate-300">{action.detail}</p>
            </Link>
          ))}
        </div>
      </PageContainer>
    </div>
  );
};

export default Home;
