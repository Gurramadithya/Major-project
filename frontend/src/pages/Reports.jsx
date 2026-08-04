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
    setLoading(true);
    setMessage('');

    try {
      const response = await downloadReport({
        case_id: activeCase?.caseId || activeCase?.case_id || null,
        disease_prediction: activeCase?.prediction || 'Pending',
        confidence: activeCase?.confidence || 0.0,
        processing_time: activeCase?.processing_time || 'N/A',
        ai_explanation: activeCase?.message || 'The model suggests a likely abnormality. Review with a specialist for confirmation.',
        rag_medical_knowledge: 'The retrieved medical context highlights the need to correlate image findings with clinician assessment.',
        suggested_specialist: 'Dermatologist',
        hospital_name: 'Medical AI Platform',
        image_base64: activeCase?.imageBase64 || activeCase?.image_base64 || null,
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'medical_report.pdf');
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
    <PageContainer title="Reports" subtitle="Generate a professional PDF report from the current analysis context.">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <p className="text-sm text-slate-400">The report includes the hospital title, disease prediction, confidence, AI explanation, RAG context, specialist suggestion, and a medical advisory footer.</p>
        {activeCase?.prediction ? (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            <p className="font-medium text-white">Current case: {activeCase.prediction}</p>
            <p className="mt-1">Case ID: {activeCase.caseId || activeCase.case_id || 'N/A'}</p>
            <p className="mt-1">Confidence: {(activeCase.confidence * 100).toFixed(1)}%</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          className="mt-5 rounded-full bg-medical-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-medical-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Generating PDF...' : 'Download PDF Report'}
        </button>
        {message ? <p className="mt-4 text-sm text-slate-300">{message}</p> : null}
      </div>
    </PageContainer>
  );
};

export default Reports;
