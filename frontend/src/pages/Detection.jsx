import { useEffect, useState } from 'react';
import PageContainer from '../components/PageContainer';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorComponent from '../components/ErrorComponent';
import { detectImage } from '../services/api';

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read the selected image.'));
  reader.readAsDataURL(file);
});

const Detection = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const savedCase = localStorage.getItem('latestCase');
    if (savedCase) {
      try {
        const parsedCase = JSON.parse(savedCase);
        setPrediction(parsedCase);
        setUploadedImageBase64(parsedCase.imageBase64 || '');
        if (parsedCase.filepath) {
          setPreviewUrl(parsedCase.filepath);
        }
      } catch (error) {
        console.error('Unable to restore latest case', error);
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

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPrediction(null);
    setError('');
    setUploadedImageBase64('');
    localStorage.removeItem('latestCase');

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setUploadedImageBase64(dataUrl);
    } catch (err) {
      setError(err.message || 'Unable to read the selected image.');
    }
  };

  const handlePredict = async () => {
    if (!selectedFile) {
      setError('Please select an image first.');
      return;
    }

    setLoading(true);
    setError('');
    setPrediction(null);

    try {
      const response = await detectImage(selectedFile);
      const result = {
        ...response.data,
        imageBase64: uploadedImageBase64,
      };
      setPrediction(result);
      localStorage.setItem('latestCase', JSON.stringify(result));
      const analyticsSnapshot = {
        totalCases: 1,
        totalReports: 0,
        mostPredictedDisease: result.prediction || 'Pending',
        averageConfidence: result.confidence || 0.0,
        predictionBreakdown: [result.prediction || 'Pending', 'Follow-up imaging', 'Specialist review'],
        reportHistory: ['Detection completed', 'Case is ready for report generation'],
        assistantUsage: ['Clinical explanation generated', 'Knowledge retrieval prepared'],
      };
      localStorage.setItem('analyticsSnapshot', JSON.stringify(analyticsSnapshot));
      setToast('Detection complete and workflow context updated.');
    } catch (err) {
      const message = err?.response?.data?.detail || 'Prediction failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="AI Disease Detection" subtitle="Run lightweight inference for uploaded medical images using a local checkpoint when available.">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <label className="block text-sm text-slate-300">
            Select an image for analysis
            <input type="file" accept=".jpg,.jpeg,.png" className="mt-2 block w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100" onChange={handleFileChange} />
          </label>
          <button type="button" onClick={handlePredict} disabled={loading} className="mt-4 w-full rounded-full bg-medical-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-medical-700 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Analyzing...' : 'Run Prediction'}
          </button>

          {loading ? <LoadingSpinner /> : null}
          {error ? <ErrorComponent message={error} /> : null}
          {toast ? <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{toast}</div> : null}

          {prediction ? (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Prediction</p>
              <p className="mt-2">{prediction.prediction}</p>
              <p className="mt-2">Confidence: {(prediction.confidence * 100).toFixed(1)}%</p>
              <p className="mt-2">Affected organ: {prediction.affected_organ || 'Unknown'}</p>
              <p className="mt-2">Severity: {prediction.severity || 'Unknown'}</p>
              <p className="mt-2">Processing time: {prediction.processing_time}</p>
              {prediction.recommendations?.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-400">
                  {prediction.recommendations.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
              {prediction.message ? <p className="mt-2 text-slate-400">{prediction.message}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <h3 className="text-lg font-semibold text-white">Preview</h3>
          {previewUrl ? (
            <img src={previewUrl} alt="Detection preview" className="mt-4 h-80 w-full rounded-2xl object-cover" />
          ) : (
            <div className="mt-4 flex h-80 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 text-sm text-slate-400">
              Select an image to inspect it here.
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default Detection;
