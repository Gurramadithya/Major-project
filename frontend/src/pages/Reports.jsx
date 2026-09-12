import { useEffect, useState } from 'react';
import PageContainer from '../components/PageContainer';
import { downloadReport } from '../services/api';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeCase, setActiveCase] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const savedCase = localStorage.getItem('latestCase');
    if (savedCase) {
      try {
        setActiveCase(JSON.parse(savedCase));
      } catch (error) {
        console.error('Unable to parse latest case for report', error);
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

  const handleDownload = async () => {
    if (!activeCase?.caseId && !activeCase?.case_id) {
      setMessage('No active case. Please upload and analyze an image first.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const caseId = activeCase?.caseId || activeCase?.case_id;
      const response = await downloadReport(caseId);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `medical_report_${caseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage('Report downloaded successfully.');
      setToast('PDF report downloaded.');
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'Unable to generate the PDF report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Medical Reports" subtitle="Generate and download professional PDF reports with complete clinical analysis.">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.6fr]">
        {/* Left Column - Report Generation */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-medical-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Generate Report</h3>
                <p className="text-sm text-slate-400">Create a comprehensive medical report</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <h4 className="text-sm font-semibold text-white mb-3">Report Contents</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Hospital identification
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Disease prediction & confidence
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    AI clinical explanation
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    RAG medical knowledge
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Specialist recommendations
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Medical advisory footer
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={loading || !activeCase}
                className="w-full rounded-xl bg-medical-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-medical-600 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF Report
                  </>
                )}
              </button>

              {message ? (
                <div className={`rounded-xl p-4 text-sm ${
                  message.includes('success') || message.includes('downloaded') 
                    ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' 
                    : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}>
                  {message}
                </div>
              ) : null}
              {toast ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                  {toast}
                </div>
              ) : null}
            </div>
          </div>

          {/* Report Format Info */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Report Format</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">PDF Format</p>
                  <p className="text-slate-400">Professional medical document format</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">Secure & Private</p>
                  <p className="text-slate-400">Generated locally on your device</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">Print-Ready</p>
                  <p className="text-slate-400">High quality for medical records</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Case Information */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Current Case Information</h3>
            {activeCase ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Detection Result</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      activeCase.prediction?.toLowerCase() === 'pneumonia' 
                        ? 'bg-rose-500/20 text-rose-300' 
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {activeCase.prediction || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Confidence</span>
                    <span className="text-sm font-medium text-medical-500">
                      {activeCase.confidence ? `${activeCase.confidence}%` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Case ID</span>
                    <span className="text-white font-medium">{activeCase.caseId || activeCase.case_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Severity</span>
                    <span className="text-white font-medium capitalize">{activeCase.severity || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Affected Organ</span>
                    <span className="text-white font-medium capitalize">{activeCase.affected_organ || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Processing Time</span>
                    <span className="text-white font-medium">{activeCase.processing_time || 'N/A'}</span>
                  </div>
                </div>

                {activeCase.ai_explanation && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <p className="text-xs text-slate-400 mb-2">AI Explanation</p>
                    <p className="text-sm text-blue-200 leading-relaxed">{activeCase.ai_explanation}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-400 mb-2">No active case</p>
                <p className="text-xs text-slate-500">Upload and analyze an image to generate a report</p>
              </div>
            )}
          </div>

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
                  This report is generated by AI for informational purposes only. 
                  It should not be used as a substitute for professional medical diagnosis or treatment.
                  Always consult with qualified healthcare professionals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Reports;
