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

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(extension || '')) {
      setError('Invalid image. Please upload a valid lung/chest X-ray.');
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    try {
      const imageUrl = URL.createObjectURL(file);
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Unable to decode image'));
        img.src = imageUrl;
      });
      URL.revokeObjectURL(imageUrl);

      const aspectRatio = (image.naturalHeight || image.height) / (image.naturalWidth || image.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(200, image.naturalWidth || image.width);
      canvas.height = Math.min(200, image.naturalHeight || image.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      let saturation = 0;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        sum += (r + g + b) / 3;
        saturation += max === 0 ? 0 : ((max - min) / max) * 100;
        count += 1;
      }
      const meanGray = sum / count;
      const meanSaturation = saturation / count;
      if ((image.naturalWidth || image.width) < 300 || (image.naturalHeight || image.height) < 300 || aspectRatio < 0.6 || aspectRatio > 2.5 || meanGray < 15 || meanGray > 245 || meanSaturation > 28) {
        setError('Invalid image. Please upload a valid lung/chest X-ray.');
        setSelectedFile(null);
        setPreviewUrl('');
        return;
      }
    } catch (error) {
      setError('Invalid image. Please upload a valid lung/chest X-ray.');
      setSelectedFile(null);
      setPreviewUrl('');
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
    <PageContainer title="AI Disease Detection" subtitle="CNN-powered chest X-ray analysis with confidence scores and clinical insights.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left Column - Image Upload and Preview */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Upload X-Ray Image</h3>
            <label className="block text-sm text-slate-300 mb-2">
              Select an image for analysis
              <input type="file" accept=".jpg,.jpeg,.png" className="mt-2 block w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100" onChange={handleFileChange} />
            </label>
            <button type="button" onClick={handlePredict} disabled={loading} className="mt-4 w-full rounded-full bg-medical-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-medical-700 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Analyzing...' : 'Run Prediction'}
            </button>

            {loading ? <LoadingSpinner /> : null}
            {error ? <ErrorComponent message={error} /> : null}
            {toast ? <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{toast}</div> : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">X-Ray Image</h3>
            {previewUrl ? (
              <img src={previewUrl} alt="Detection preview" className="w-full rounded-2xl object-cover" style={{ maxHeight: '400px' }} />
            ) : (
              <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 text-sm text-slate-400">
                Select an image to inspect it here.
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Detection Results */}
        <div className="space-y-6">
          {prediction ? (
            <>
              {/* Main Prediction Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Detection Results</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    prediction.prediction === 'Pneumonia' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {prediction.prediction}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Confidence</p>
                    <p className="text-2xl font-bold text-medical-500 mt-1">{(prediction.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Severity</p>
                    <p className="text-2xl font-bold text-white mt-1 capitalize">{prediction.severity || 'Unknown'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Affected Organ</p>
                    <p className="text-lg font-semibold text-white mt-1 capitalize">{prediction.affected_organ || 'Unknown'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Processing Time</p>
                    <p className="text-lg font-semibold text-white mt-1">{prediction.processing_time || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* AI Explanation */}
              {prediction.ai_explanation && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">AI Clinical Explanation</h3>
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <p className="text-sm text-blue-200 leading-relaxed">{prediction.ai_explanation}</p>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {prediction.recommendations && prediction.recommendations.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Clinical Recommendations</h3>
                  <ul className="space-y-3">
                    {prediction.recommendations.map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm text-slate-300">
                        <span className="w-6 h-6 rounded-full bg-medical-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-medical-500 text-xs font-bold">{index + 1}</span>
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Model Info */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Model Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Model Architecture</span>
                    <span className="text-white">Custom CNN (4 conv blocks)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Training Dataset</span>
                    <span className="text-white">Kaggle Chest X-ray</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Training Accuracy</span>
                    <span className="text-white">97.9%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Validation Accuracy</span>
                    <span className="text-white">81.3%</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Detection Results</h3>
                <p className="text-sm text-slate-400">Upload an X-ray image and run prediction to see detailed analysis results here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default Detection;
