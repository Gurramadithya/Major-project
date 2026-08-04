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
    return cases.filter((item) => `${item.prediction || ''} ${item.case_id || ''}`.toLowerCase().includes(query));
  }, [cases, search]);

  const handleDelete = async (caseId) => {
    try {
      await api.delete(`/history/${caseId}`);
      setCases((current) => current.filter((item) => item.case_id !== caseId));
    } catch (error) {
      console.error('Unable to delete case', error);
    }
  };

  return (
    <PageContainer title="Case History" subtitle="Review prior uploads, confidence scores, and report status in one place.">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search cases"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 md:max-w-sm"
          />
          <div className="text-sm text-slate-400">{filteredCases.length} cases</div>
        </div>

        {loading ? <div className="text-sm text-slate-400">Loading history…</div> : null}

        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/80 text-left text-slate-300">
              <tr>
                <th className="px-3 py-3">Image</th>
                <th className="px-3 py-3">Disease</th>
                <th className="px-3 py-3">Confidence</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/60">
              {filteredCases.map((item) => (
                <tr key={item.case_id}>
                  <td className="px-3 py-3 text-slate-300">{item.filename}</td>
                  <td className="px-3 py-3 text-slate-300">{item.prediction || 'Pending'}</td>
                  <td className="px-3 py-3 text-slate-300">{item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : 'N/A'}</td>
                  <td className="px-3 py-3 text-slate-300">{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <button type="button" className="rounded-full bg-cyan-600 px-3 py-1 text-xs text-white">Open</button>
                      <button type="button" onClick={() => handleDelete(item.case_id)} className="rounded-full bg-rose-600 px-3 py-1 text-xs text-white">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
};

export default CaseHistory;
