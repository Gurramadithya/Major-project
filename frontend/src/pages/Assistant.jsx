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
          <div className="rounded-3xl bg-slate-900 border border-medical-500/30 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-medical-500 to-medical-700 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">AI Medical Assistant</h3>
                <p className="text-sm text-medical-500">Powered by advanced AI models</p>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {response ? (
                <>
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-to-r from-medical-600 to-medical-700 px-5 py-4 text-sm text-white">
                      <p className="font-medium">{query}</p>
                    </div>
                  </div>
                  
                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-800 border border-medical-500/30 px-5 py-4 text-sm text-slate-200">
                      <p className="whitespace-pre-wrap leading-relaxed">{response.response}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-16 h-16 rounded-full bg-medical-500/10 flex items-center justify-center mb-4 border border-medical-500/30">
                    <svg className="w-8 h-8 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-400">Ask a clinical question to get started</p>
                  <p className="text-xs text-slate-500 mt-2">AI will provide evidence-based insights</p>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <textarea
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="min-h-[100px] w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-4 text-sm text-slate-100 outline-none focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20 transition-all placeholder:text-slate-500"
                  placeholder="Ask about diagnosis, treatment, or clinical guidance..."
                  required
                />
                <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                  Press Enter to submit
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-medical-600 to-medical-700 px-6 py-4 text-sm font-semibold text-white transition-all hover:from-medical-500 hover:to-medical-600 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Generating AI Response...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Get AI Insights
                  </>
                )}
              </button>
            </form>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </div>
            ) : null}
            {toast ? (
              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {toast}
                </div>
              </div>
            ) : null}
          </div>

          {/* Quick Questions */}
          <div className="rounded-3xl bg-slate-900 border border-medical-500/30 p-8 shadow-2xl shadow-medical-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-medical-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Quick Questions</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                "What are the treatment options for pneumonia?",
                "What follow-up tests are recommended?",
                "What specialist should I consult?",
                "What are the risk factors for this condition?",
              ].map((quickQuestion, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(quickQuestion)}
                  className="w-full text-left rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-300 hover:bg-medical-500/10 hover:border-medical-500/50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-medical-500">•</span>
                    {quickQuestion}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Context & Sources */}
        <div className="space-y-6">
          {/* Detection Context */}
          <div className="rounded-3xl bg-slate-900 border border-medical-500/30 p-8 shadow-2xl shadow-medical-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-medical-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Detection Context</h3>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Detected Condition</span>
                  <span className="text-sm font-bold text-medical-500">{diseasePrediction}</span>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Confidence Score</span>
                  <span className="text-sm font-bold text-medical-500">{(confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-medical-500 to-medical-700 transition-all duration-500"
                    style={{ width: `${confidence * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sources */}
          {response?.sources?.length ? (
            <div className="rounded-3xl bg-slate-900 border border-medical-500/30 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-medical-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">Knowledge Sources</h3>
              </div>
              <div className="space-y-3">
                {response.sources.map((source, index) => (
                  <div key={`${source.source}-${index}`} className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4 hover:border-medical-500/50 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-medical-500/10 flex items-center justify-center flex-shrink-0 border border-medical-500/30">
                        <svg className="w-5 h-5 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-medical-500">{source.source}</p>
                        <p className="mt-1 text-xs text-slate-400 leading-relaxed">{source.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Disclaimer */}
          <div className="rounded-3xl bg-medical-500/5 border border-medical-500/30 p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-medical-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-medical-500 mb-2">Medical Disclaimer</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This AI assistant provides general medical information for educational purposes only. 
                  Always consult with qualified healthcare professionals for medical diagnosis and treatment.
                  The information provided should not be used as a substitute for professional medical advice.
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
