import { useEffect, useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LineController,
  PointElement,
  ArcElement,
  Tooltip,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import PageContainer from '../components/PageContainer';
import api from '../services/api';

ChartJS.register(BarElement, CategoryScale, Legend, LineElement, LineController, PointElement, ArcElement, Tooltip);

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/analytics');
        setAnalyticsData(response.data);
        localStorage.setItem('analyticsSnapshot', JSON.stringify(response.data));
      } catch (error) {
        console.error('Unable to load analytics data', error);
        const stored = localStorage.getItem('analyticsSnapshot');
        if (stored) {
          try {
            setAnalyticsData(JSON.parse(stored));
          } catch (parseError) {
            console.error('Unable to parse analytics data', parseError);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const summaryCards = useMemo(() => {
    if (!analyticsData) {
      return [];
    }

    return [
      { label: 'Total Cases', value: analyticsData.totalCases, accent: 'text-cyan-400' },
      { label: 'Total Reports', value: analyticsData.totalReports, accent: 'text-emerald-400' },
      { label: 'Most Predicted Disease', value: analyticsData.mostPredictedDisease, accent: 'text-amber-400' },
      { label: 'Average Confidence', value: `${(analyticsData.averageConfidence * 100).toFixed(1)}%`, accent: 'text-rose-400' },
    ];
  }, [analyticsData]);

  const barData = useMemo(() => ({
    labels: ['Cases', 'Reports', 'Assistants'],
    datasets: [{
      label: 'Workflow volume',
      data: [analyticsData?.totalCases || 0, analyticsData?.totalReports || 0, (analyticsData?.assistantUsage?.length || 0)],
      backgroundColor: ['#38bdf8', '#34d399', '#f59e0b'],
      borderRadius: 8,
    }],
  }), [analyticsData]);

  const pieData = useMemo(() => ({
    labels: analyticsData?.predictionBreakdown?.length ? analyticsData.predictionBreakdown : ['No data'],
    datasets: [{
      data: analyticsData?.predictionBreakdown?.length ? [Math.max(1, analyticsData.totalCases || 1), Math.max(1, Math.round((analyticsData.totalCases || 1) / 2)), Math.max(1, Math.round((analyticsData.totalCases || 1) / 3))] : [1],
      backgroundColor: ['#38bdf8', '#34d399', '#f43f5e'],
    }],
  }), [analyticsData]);

  const lineData = useMemo(() => ({
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: 'Confidence trend',
      data: [0.82, 0.88, 0.9, 0.93],
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56, 189, 248, 0.2)',
      tension: 0.35,
      fill: true,
    }],
  }), []);

  return (
    <PageContainer title="Analytics Dashboard" subtitle="A lightweight operational view of cases, reports, and assistant usage.">
      {loading ? <div className="mt-4 text-sm text-slate-400">Loading analytics…</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-lg shadow-slate-950/30">
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${card.accent}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h3 className="text-lg font-semibold text-white">Workflow activity</h3>
          <div className="mt-4 h-72">
            <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h3 className="text-lg font-semibold text-white">Prediction distribution</h3>
          <div className="mt-4 h-72">
            <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h3 className="text-lg font-semibold text-white">Performance trend</h3>
          <div className="mt-4 h-72">
            <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h3 className="text-lg font-semibold text-white">Recent activity</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {(analyticsData?.reportHistory || []).slice(0, 4).map((item) => (
              <div key={item} className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                {item}
              </div>
            ))}
            {(analyticsData?.assistantUsage || []).slice(0, 4).map((item) => (
              <div key={item} className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                Assistant: {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Analytics;
