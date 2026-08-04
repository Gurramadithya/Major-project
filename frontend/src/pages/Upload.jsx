import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/PageContainer';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorComponent from '../components/ErrorComponent';
import { detectImage, uploadFile } from '../services/api';

const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const Upload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const resetState = () => {
    setError('');
    setSuccess('');
    setProgress(0);
  };

  const validateFile = (file) => {
    if (!file) {
      return 'Please select an image file.';
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
      return 'Unsupported format. Use JPG, JPEG, or PNG.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File exceeds the 10MB limit.';
    }

    return '';
  };

  const handleFileSelection = (file) => {
    resetState();
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Please choose an image to upload.');
      return;
    }

    resetState();
    setLoading(true);
    setProgress(10);

    try {
      const uploadResponse = await uploadFile(selectedFile, (percent) => setProgress(percent));
      const { data: uploadData } = uploadResponse;
      setSuccess(uploadData.message || 'Upload successful');
      setProgress(70);

      const detectionResponse = await detectImage(selectedFile, uploadData.case_id);
      const detectionData = detectionResponse.data;
      const latestCase = {
        ...detectionData,
        caseId: uploadData.case_id,
        filename: uploadData.filename,
        filepath: uploadData.filepath,
        imageBase64: '',
      };
      localStorage.setItem('latestCase', JSON.stringify(latestCase));
      localStorage.setItem('analyticsSnapshot', JSON.stringify({
        totalCases: 1,
        totalReports: 0,
        averageConfidence: detectionData.confidence || 0,
        mostPredictedDisease: detectionData.prediction || 'Pending',
        predictionBreakdown: [detectionData.prediction || 'Pending'],
        reportHistory: ['Case uploaded and analyzed'],
        assistantUsage: ['Detection completed'],
      }));
      setProgress(100);
      setTimeout(() => navigate('/detection'), 700);
    } catch (err) {
      const message = err?.response?.data?.detail || 'Upload failed. Please try again.';
      setError(message);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Case Upload" subtitle="Securely upload medical images for review in a modern clinical workflow.">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${dragActive ? 'border-medical-500 bg-medical-500/10' : 'border-slate-700 bg-slate-900/70'}`}
          >
            <p className="text-lg font-semibold text-white">Drag and drop an image</p>
            <p className="mt-2 text-sm text-slate-400">Supported formats: JPG, JPEG, PNG</p>
            <label className="mt-4 inline-flex cursor-pointer rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
              Browse Files
              <input type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={handleInputChange} />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
            <p className="font-semibold text-white">Workflow</p>
            <p className="mt-1">Upload → Preview → Detection → Confidence → Recommendations → Assistant → Report</p>
            <p className="mt-2">Supported formats: {SUPPORTED_FORMATS.join(', ').toUpperCase()}</p>
            <p className="mt-1">Maximum file size: 10MB</p>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-full bg-medical-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-medical-700 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Uploading...' : 'Upload Image'}
          </button>

          {loading ? (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-medical-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm text-slate-400">Uploading {selectedFile?.name || 'image'}...</p>
            </div>
          ) : null}

          {error ? <ErrorComponent message={error} /> : null}
          {success ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">{success}</div> : null}
        </form>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <h3 className="text-lg font-semibold text-white">Uploaded image preview</h3>
          {previewUrl ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
              <img src={previewUrl} alt="Upload preview" className="h-80 w-full object-cover" />
            </div>
          ) : (
            <div className="mt-4 flex h-80 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 text-sm text-slate-400">
              No image selected yet.
            </div>
          )}
          <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-200">
            Once uploaded, the app will automatically continue into disease detection and report generation.
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Upload;
