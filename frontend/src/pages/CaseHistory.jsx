import { useEffect, useMemo, useState } from 'react';
import PageContainer from '../components/PageContainer';
import api from '../services/api';

const CaseHistory = () => {
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCases = async () => {
    try {
      const response = await api.get('/history');
      setCases(response.data || []);
    } catch (error) {
      console.error('Unable to load case history', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const filteredCases = useMemo(() => {
    const query = search.toLowerCase();
    return cases.filter((item) => 
      `${item.prediction || ''} ${item.case_id || ''} ${item.filename || ''}`.toLowerCase().includes(query)
    );
  }, [cases, search]);

  const handleDelete = async (caseId) => {
    try {
      await api.delete(`/history/${caseId}`);
      setCases((current) => current.filter((item) => item.case_id !== caseId));
    } catch (error) {
      console.error('Unable to delete case', error);
    }
  };

  const stats = useMemo(() => {
    const total = cases.length;
    const pneumonia = cases.filter(c => c.prediction?.toLowerCase() === 'pneumonia').length;
    const normal = cases.filter(c => c.prediction?.toLowerCase() === 'normal').length;
    const avgConfidence = cases.length > 0 
      ? cases.reduce((sum, c) => sum + (c.confidence || 0), 0) / cases.length 
      : 0;
    
    return { total, pneumonia, normal, avgConfidence };
  }, [cases]);

  return (
    <PageContainer title="Case History" subtitle="Review prior uploads, detection results, and track patient cases over time.">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Total Cases</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Pneumonia</p>
            <p className="text-2xl font-bold text-rose-500 mt-1">{stats.pneumonia}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Normal</p>
            <p className="text-2xl font-bold text-emerald-500 mt-1">{stats.normal}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Avg Confidence</p>
            <p className="text-2xl font-bold text-medical-500 mt-1">{(stats.avgConfidence * 100).toFixed(1)}%</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by disease, case ID, or filename..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-medical-500 outline-none transition-colors"
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">
                Showing {filteredCases.length} of {cases.length} cases
              </span>
              <button
                onClick={fetchCases}
                className="rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Cases Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-medical-500/30 border-t-medical-500 animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-slate-400">Loading case history...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-slate-400 mb-2">No cases found</p>
              <p className="text-xs text-slate-500">Upload an image to start tracking cases</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-900/80 text-left text-slate-300">
                  <tr>
                    <th className="px-6 py-4 font-medium">Case ID</th>
                    <th className="px-6 py-4 font-medium">Filename</th>
                    <th className="px-6 py-4 font-medium">Detection</th>
                    <th className="px-6 py-4 font-medium">Confidence</th>
                    <th className="px-6 py-4 font-medium">Severity</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                  {filteredCases.map((item) => (
                    <tr key={item.case_id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-400">{item.case_id || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{item.filename || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.prediction?.toLowerCase() === 'pneumonia' 
                            ? 'bg-rose-500/20 text-rose-300' 
                            : item.prediction?.toLowerCase() === 'normal'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-500/20 text-slate-300'
                        }`}>
                          {item.prediction || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-medical-500 font-medium">
                          {item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white capitalize">{item.severity || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-400">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            className="rounded-lg bg-medical-500 hover:bg-medical-600 px-3 py-1.5 text-xs text-white transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleDelete(item.case_id)} 
                            className="rounded-lg bg-rose-500/20 hover:bg-rose-500/30 px-3 py-1.5 text-xs text-rose-300 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default CaseHistory;
