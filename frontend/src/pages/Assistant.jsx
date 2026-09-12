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
    <PageContainer title="AI Clinical Assistant" subtitle="Chat with AI for clinical guidance, treatment recommendations, and medical insights.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left Column - Chat Interface */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Chat with AI Assistant</h3>
            
            {/* Chat Messages */}
            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
              {response ? (
                <>
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl bg-medical-500 px-4 py-3 text-sm text-white">
                      <p>{query}</p>
                    </div>
                  </div>
                  
                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                      <p className="whitespace-pre-wrap leading-relaxed">{response.response}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-400">Ask a clinical question to get started</p>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <textarea
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="min-h-[80px] w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-medical-500 transition-colors"
                  placeholder="Ask about diagnosis, treatment, or clinical guidance..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-medical-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-medical-600 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Message
                  </>
                )}
              </button>
            </form>

            {error ? (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}
            {toast ? (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {toast}
              </div>
            ) : null}
          </div>

          {/* Quick Questions */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Questions</h3>
            <div className="space-y-2">
              {[
                "What are the treatment options for pneumonia?",
                "What follow-up tests are recommended?",
                "What specialist should I consult?",
                "What are the risk factors for this condition?",
              ].map((quickQuestion, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(quickQuestion)}
                  className="w-full text-left rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:border-medical-500/50 transition-colors"
                >
                  {quickQuestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Context & Sources */}
        <div className="space-y-6">
          {/* Detection Context */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Detection Context</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Detected Condition</span>
                <span className="text-sm font-medium text-white">{diseasePrediction}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Confidence</span>
                <span className="text-sm font-medium text-medical-500">{(confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Sources */}
          {response?.sources?.length ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Knowledge Sources</h3>
              <div className="space-y-3">
                {response.sources.map((source, index) => (
                  <div key={`${source.source}-${index}`} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-200">{source.source}</p>
                        <p className="mt-1 text-xs text-slate-400">{source.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Disclaimer */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-300">Medical Disclaimer</p>
                <p className="mt-1 text-xs text-amber-200/80 leading-relaxed">
                  This AI assistant provides general medical information for educational purposes only. 
                  Always consult with qualified healthcare professionals for medical diagnosis and treatment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Assistant;
