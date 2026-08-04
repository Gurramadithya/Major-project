import { useEffect, useState } from 'react';
import PageContainer from '../components/PageContainer';
import { askAssistant } from '../services/api';

const Assistant = () => {
  const [query, setQuery] = useState('');
  const [diseasePrediction, setDiseasePrediction] = useState('Possible pulmonary pattern');
  const [confidence, setConfidence] = useState(0.82);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const savedCase = localStorage.getItem('latestCase');
    if (savedCase) {
      try {
        const parsedCase = JSON.parse(savedCase);
        setDiseasePrediction(parsedCase.prediction || 'Possible pulmonary pattern');
        setConfidence(parsedCase.confidence || 0.82);
        setQuery(`Explain the detected condition ${parsedCase.prediction || 'in this case'} and outline next steps for a specialist.`);
      } catch (error) {
        console.error('Unable to restore assistant context', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(''), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const { data } = await askAssistant({
        query,
        diseasePrediction,
        confidence,
      });
      setResponse(data);
      setToast('Assistant insight generated successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to contact the assistant right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="AI Assistant" subtitle="Retrieve relevant medical context and generate a clinician-friendly summary.">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Clinical question</label>
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-[96px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none"
            placeholder="Describe the case, symptoms, or treatment question"
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Detection output</label>
            <input
              value={diseasePrediction}
              onChange={(event) => setDiseasePrediction(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Confidence</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={confidence}
              onChange={(event) => setConfidence(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Generating...' : 'Generate insight'}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
      {toast ? <div className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-300">{toast}</div> : null}

      {response ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <h3 className="text-lg font-semibold text-white">Assistant response</h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{response.response}</p>

          {response.sources?.length ? (
            <div className="mt-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Sources</h4>
              <ul className="mt-2 space-y-2">
                {response.sources.map((source, index) => (
                  <li key={`${source.source}-${index}`} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">
                    <p className="font-medium text-slate-200">{source.source}</p>
                    <p className="mt-2 text-slate-400">{source.content}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </PageContainer>
  );
};

export default Assistant;
