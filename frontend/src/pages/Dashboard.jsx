import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Lung3DViewer from '../components/Lung3DViewer';
import ErrorBoundary from '../components/ErrorBoundary';
import { uploadFile, detectImage, queryRAG, askAssistant, downloadReport } from '../services/api';

const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'dcm'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const Dashboard = () => {
  const [activeCase, setActiveCase] = useState(null);
  const requestIdRef = useRef(0);
  
  // Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedCaseId, setUploadedCaseId] = useState(null);

  // Detection state
  const [detectionLoading, setDetectionLoading] = useState(false);
  const [detectionResults, setDetectionResults] = useState(null);
  const [detectionError, setDetectionError] = useState('');

  // RAG state
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResults, setRagResults] = useState(null);
  const [ragError, setRagError] = useState('');

  // AI Assistant state
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState('');
  const [assistantError, setAssistantError] = useState('');

  // Load activeCase from localStorage on mount - REMOVED to prevent showing stale data
  // const loadSavedCase = useCallback(() => {
  //   const savedCase = localStorage.getItem('activeCase');
  //   if (savedCase) {
  //     try {
  //       const parsedCase = JSON.parse(savedCase);
  //       setActiveCase(parsedCase);
  //       if (parsedCase.imageBase64) {
  //         setPreviewUrl(parsedCase.imageBase64);
  //       }
  //       if (parsedCase.prediction) {
  //         setDetectionResults({
  //           prediction: parsedCase.prediction,
  //           confidence: parsedCase.confidence,
  //           severity: parsedCase.severity,
  //           affected_organ: parsedCase.affectedOrgan,
  //           processing_time: parsedCase.processingTime,
  //           recommendations: parsedCase.recommendations,
  //           ai_explanation: parsedCase.aiExplanation,
  //           heatmap: parsedCase.heatmap,
  //           highlight_left: parsedCase.highlightLeft,
  //           highlight_right: parsedCase.highlightRight,
  //           affected_region: parsedCase.affectedRegion,
  //           success: parsedCase.success,
  //         });
  //       }
  //     } catch (error) {
  //       console.error('Failed to load saved case:', error);
  //     }
  //   }
  // }, []);
  
  // useEffect(() => {
  //   loadSavedCase();
  // }, [loadSavedCase]);
  
  // Keep both storage keys synchronized so the current case is never stale.
  useEffect(() => {
    if (activeCase) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('activeCase', JSON.stringify(activeCase));
        localStorage.setItem('latestCase', JSON.stringify(activeCase));
      }, 300);
      return () => clearTimeout(timeoutId);
    }

    localStorage.removeItem('activeCase');
    localStorage.removeItem('latestCase');
  }, [activeCase]);

  // Generate rule-based clinical recommendations from detection results - memoized
  const generateClinicalRecommendations = useCallback((results) => {
    if (!results || !results.prediction) return null;

    const prediction = String(results.prediction || 'Normal');
    const predictionKey = prediction.toLowerCase();
    const confidenceValue = Number(results.confidence || 0);
    const confidencePct = confidenceValue <= 1 ? confidenceValue * 100 : confidenceValue;
    const severity = String(results.severity || 'Unknown').toLowerCase();
    const region = String(results.affected_region || 'Bilateral Lung');
    const isNormal = predictionKey === 'normal';

    const specialist = predictionKey.includes('pneumonia')
      ? 'Pulmonologist'
      : predictionKey.includes('effusion')
        ? 'Pulmonologist'
        : predictionKey.includes('cardio') || predictionKey.includes('heart')
          ? 'Cardiologist'
          : 'General Physician';

    const urgencyLevel = isNormal
      ? 'Routine'
      : confidencePct >= 85 ? 'High' : confidencePct >= 65 ? 'Medium' : 'Low';
    const riskLevel = isNormal
      ? 'Low'
      : severity.includes('critical') || confidencePct >= 90
        ? 'High'
        : severity.includes('moderate') || confidencePct >= 70
          ? 'Medium'
          : 'Low';

    const regionDescription = region && region.toLowerCase() !== 'no dominant lung region'
      ? ` in the ${region.toLowerCase()}`
      : ' in the lungs';

    return {
      specialist,
      urgencyLevel,
      riskLevel,
      hospitalization: riskLevel === 'High' ? 'Yes' : 'No',
      followUp: isNormal ? 'Routine clinical follow-up if symptoms persist' : confidencePct >= 85 ? '48-72 hours' : '1-2 weeks',
      treatment: isNormal
        ? 'No acute radiographic abnormality is suggested on this image.'
        : `Clinical evaluation is recommended for suspected ${prediction.toLowerCase()}${regionDescription}.`,
      medication: isNormal
        ? 'No image-based medication recommendation is indicated.'
        : 'Start or adjust treatment only after formal clinical assessment and clinician guidance.',
      lifestyle: isNormal
        ? 'Maintain routine wellness and reassess if symptoms develop.'
        : 'Rest, hydrate, monitor respiratory symptoms, and seek prompt evaluation if symptoms worsen.',
      diagnostics: isNormal
        ? 'Routine clinical correlation is suitable if symptoms are present.'
        : 'Correlate this image with the patient history and consider targeted follow-up imaging if clinically indicated.',
    };
  }, []);

  // File validation
  const validateFile = (file) => {
    if (!file) {
      return 'Please select a file.';
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
      if (extension === 'dcm' || extension === 'dicom') {
        return 'DICOM format is not yet supported by the backend.';
      }
      return 'Unsupported format. Use JPG, JPEG, or PNG.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File exceeds the 10MB limit.';
    }

    return '';
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFileSelection = (file) => {
    setUploadError('');
    setUploadStatus('idle');
    setUploadProgress(0);

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
  };

  // Drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  // File input handler
  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  // Upload handler
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file first.');
      return;
    }

    const currentRequestId = ++requestIdRef.current;

    // Clear all previous data before new upload
    setActiveCase(null);
    setDetectionResults(null);
    setDetectionError('');
    setRagResults(null);
    setRagError('');
    setAssistantResponse('');
    setAssistantError('');
    localStorage.removeItem('activeCase');
    localStorage.removeItem('latestCase');

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadError('');

    try {
      const response = await uploadFile(selectedFile, (percent) => {
        setUploadProgress(percent);
      });
      
      const { data } = response;
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      setUploadedCaseId(data.case_id);
      setUploadStatus('success');
      
      // Store uploaded case for next phase
      setActiveCase({
        caseId: data.case_id,
        filename: data.filename,
        filepath: data.filepath,
        imageBase64: previewUrl,
      });
      
      // Auto-trigger detection after successful upload
      setTimeout(() => {
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
        handleDetection(selectedFile, data.case_id);
      }, 500);
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setUploadStatus('idle');
      }, 3000);
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || 'Upload failed. Please try again.';
      setUploadError(errorMessage);
      setUploadStatus('error');
    }
  };

  // Reset upload
  const handleReset = () => {
    requestIdRef.current += 1;
    setSelectedFile(null);
    setPreviewUrl('');
    setUploadProgress(0);
    setUploadStatus('idle');
    setUploadError('');
    setUploadedCaseId(null);
    
    // Clear all detection data
    setActiveCase(null);
    setDetectionLoading(false);
    setDetectionResults(null);
    setDetectionError('');
    
    // Clear RAG data
    setRagLoading(false);
    setRagResults(null);
    setRagError('');
    
    // Clear AI Assistant data
    setAssistantQuery('');
    setAssistantLoading(false);
    setAssistantResponse('');
    setAssistantError('');
    
    // Clear all localStorage case data so stale outputs are never shown.
    localStorage.removeItem('activeCase');
    localStorage.removeItem('latestCase');
  };

  // Detection handler
  const handleDetection = async (file, caseId) => {
    const currentRequestId = ++requestIdRef.current;

    // Prevent duplicate requests
    if (detectionLoading) {
      return;
    }

    setDetectionLoading(true);
    setDetectionError('');
    setDetectionResults(null);

    try {
      const response = await detectImage(file, caseId);
      const { data } = response;
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      
      setDetectionResults(data);
      const detectionCase = {
        caseId: caseId,
        prediction: data.prediction,
        confidence: data.confidence,
        severity: data.severity,
        affected_organ: data.affected_organ,
        affectedOrgan: data.affected_organ,
        processing_time: data.processing_time,
        processingTime: data.processing_time,
        recommendations: data.recommendations || [],
        findings: data.findings || [],
        ai_explanation: data.ai_explanation,
        aiExplanation: data.ai_explanation,
        heatmap: data.heatmap,
        highlight_left: data.highlight_left,
        highlightLeft: data.highlight_left,
        highlight_right: data.highlight_right,
        highlightRight: data.highlight_right,
        affected_region: data.affected_region,
        affectedRegion: data.affected_region,
        visualization_mode: data.visualization_mode,
        visualizationMode: data.visualization_mode,
        success: data.success,
      };

      const nextCase = {
        ...(activeCase || {}),
        ...detectionCase,
      };
      setActiveCase(nextCase);

      localStorage.setItem('activeCase', JSON.stringify(nextCase));
      localStorage.setItem('latestCase', JSON.stringify(nextCase));

      // Auto-trigger RAG after detection completes
      if (data.prediction) {
        setTimeout(() => {
          handleRAGQuery(data.prediction);
        }, 500);
      }
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || 'Detection failed. Please try again.';
      setDetectionError(errorMessage);
    } finally {
      setDetectionLoading(false);
    }
  };

  // RAG handler
  const handleRAGQuery = async (query) => {
    setRagLoading(true);
    setRagError('');
    setRagResults(null);

    try {
      const response = await queryRAG(query);
      const { data } = response;
      
      setRagResults(data);
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || 'Knowledge retrieval failed. Please try again.';
      setRagError(errorMessage);
    } finally {
      setRagLoading(false);
    }
  };

  // AI Assistant handler
  const handleAssistantQuery = async () => {
    if (!assistantQuery.trim()) {
      setAssistantError('Please enter a question');
      return;
    }

    // Check if detection results are available
    if (!detectionResults || !detectionResults.prediction) {
      setAssistantError('Please upload and analyze an image first before asking questions.');
      return;
    }

    setAssistantLoading(true);
    setAssistantError('');
    setAssistantResponse('');

    try {
      const response = await askAssistant({
        query: assistantQuery,
        diseasePrediction: detectionResults.prediction || 'Unknown',
        confidence: detectionResults.confidence || 0,
      });
      const { data } = response;
      
      setAssistantResponse(data.response || 'No response received');
    } catch (err) {
      console.error('AI Assistant error:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'AI Assistant failed. Please try again.';
      setAssistantError(errorMessage);
    } finally {
      setAssistantLoading(false);
    }
  };

  // Report download handler
  const handleReportDownload = async () => {
    if (!activeCase?.caseId) {
      alert('Please upload and analyze an image first.');
      return;
    }

    try {
      const response = await downloadReport(activeCase.caseId);
      
      // Check if response has data
      if (!response || !response.data) {
        throw new Error('No data received from server');
      }
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `medical_report_${activeCase.caseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download error:', err);
      alert(`Failed to download report: ${err?.message || 'Please try again.'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Medical AI Dashboard</h1>
        <p className="text-slate-400">Clinical Intelligence Platform - Single Page View</p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - Upload & Detection */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Upload Panel */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-medical-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Upload Panel</h2>
                <p className="text-sm text-slate-400">Medical image upload</p>
              </div>
            </div>
            
            {!selectedFile ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragActive ? 'border-medical-500 bg-medical-500/10' : 'border-slate-700 hover:border-medical-500/50'
                }`}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-slate-300 font-medium">Drop medical image here</p>
                <p className="text-sm text-slate-500 mt-1">or click to browse</p>
                <p className="text-xs text-slate-600 mt-3">JPG, JPEG, PNG up to 10MB</p>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.dcm"
                  onChange={handleInputChange}
                  className="hidden"
                  id="file-input"
                />
                <label
                  htmlFor="file-input"
                  className="mt-4 inline-block bg-medical-500 hover:bg-medical-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Browse Files
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="relative">
                  <div className="rounded-xl overflow-hidden bg-slate-900/50">
                    <img
                      src={previewUrl}
                      alt="Original X-ray"
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                      <p className="text-xs text-white">Original X-ray</p>
                    </div>
                  </div>
                  
                  {/* Reset Button */}
                  <button
                    onClick={handleReset}
                    className="absolute top-2 right-2 bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg transition-colors z-10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* File Info */}
                <div className="glass-light rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Filename</span>
                    <span className="text-sm text-white font-medium truncate ml-2">{selectedFile.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Size</span>
                    <span className="text-sm text-white font-medium">{formatFileSize(selectedFile.size)}</span>
                  </div>
                  {uploadedCaseId && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Case ID</span>
                      <span className="text-sm text-medical-500 font-medium">{uploadedCaseId}</span>
                    </div>
                  )}
                </div>
                
                {/* Upload Progress */}
                {uploadStatus === 'uploading' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Uploading...</span>
                      <span className="text-sm text-medical-500 font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-medical-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Status Messages */}
                {uploadStatus === 'success' && (
                  <div className="glass-accent rounded-lg p-3 text-sm text-emerald-300 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Upload successful! Case ready for analysis.
                  </div>
                )}
                
                {uploadStatus === 'error' && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-sm text-rose-300">
                    {uploadError}
                  </div>
                )}
                
                {/* Upload Button */}
                {uploadStatus !== 'uploading' && uploadStatus !== 'success' && (
                  <button
                    onClick={handleUpload}
                    className="w-full bg-medical-500 hover:bg-medical-600 text-white font-medium py-3 rounded-xl transition-colors"
                  >
                    Upload Image
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Detection Panel */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-medical-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Detection Panel</h2>
                <p className="text-sm text-slate-400">AI disease detection</p>
              </div>
            </div>
            
            {/* Loading State */}
            {detectionLoading && (
              <div className="space-y-4">
                <div className="glass-light rounded-xl p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-medical-500/30 border-t-medical-500 animate-spin"></div>
                  <p className="text-white font-medium">Running AI Detection...</p>
                  <p className="text-sm text-slate-400 mt-2">Analyzing medical image</p>
                </div>
              </div>
            )}
            
            {/* Error State */}
            {detectionError && !detectionLoading && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-rose-300 font-medium">Detection Error</p>
                    <p className="text-rose-200/80 text-sm mt-1">{detectionError}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Results State */}
            {detectionResults && !detectionLoading && (
              <div className="space-y-3">
                {/* Success Animation */}
                <div className="glass-accent rounded-xl p-4 flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-emerald-300 font-medium">Detection Complete</p>
                    <p className="text-xs text-emerald-200/70">Analysis finished successfully</p>
                  </div>
                </div>
                
                {/* Disease Name */}
                <div className="glass-light rounded-xl p-4">
                  <p className="text-sm text-slate-400">Disease Name</p>
                  <p className="text-white font-medium mt-1">{detectionResults.prediction || 'Unknown'}</p>
                </div>
                
                {/* Confidence */}
                <div className="glass-light rounded-xl p-4">
                  <p className="text-sm text-slate-400">Confidence</p>
                  <p className="text-medical-500 font-medium mt-1">
                    {(() => {
                      const value = Number(detectionResults.confidence || 0);
                      const normalized = value <= 1 ? value * 100 : value;
                      return Number.isFinite(normalized) ? `${normalized.toFixed(1)}%` : '--';
                    })()}
                  </p>
                </div>
                
                {/* Severity */}
                <div className="glass-light rounded-xl p-4">
                  <p className="text-sm text-slate-400">Severity</p>
                  <p className="text-white font-medium mt-1 capitalize">{detectionResults.severity || 'Unknown'}</p>
                </div>
                
                {/* Affected Region */}
                <div className="glass-light rounded-xl p-4">
                  <p className="text-sm text-slate-400">Affected Region</p>
                  <p className="text-white font-medium mt-1 capitalize">{detectionResults.affected_region || detectionResults.affected_organ || 'Unknown'}</p>
                </div>
                
                {/* Inference Time */}
                <div className="glass-light rounded-xl p-4">
                  <p className="text-sm text-slate-400">Inference Time</p>
                  <p className="text-white font-medium mt-1">{detectionResults.processing_time || 'N/A'}</p>
                </div>
                
                {/* Model Used */}
                <div className="glass-light rounded-xl p-4">
                  <p className="text-sm text-slate-400">Model Used</p>
                  <p className="text-white font-medium mt-1">EfficientNet-B0 (Lightweight)</p>
                </div>

                {/* Key Findings */}
                {Array.isArray(detectionResults.findings) && detectionResults.findings.length > 0 && (
                  <div className="glass-light rounded-xl p-4">
                    <p className="text-sm text-slate-400">Key Findings</p>
                    <ul className="mt-2 space-y-2 text-sm text-white leading-relaxed list-disc list-inside">
                      {detectionResults.findings.slice(0, 3).map((finding, index) => (
                        <li key={`${finding}-${index}`}>{finding}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Clinical Summary */}
                {detectionResults.ai_explanation && (
                  <div className="glass-light rounded-xl p-4">
                    <p className="text-sm text-slate-400">Clinical Summary</p>
                    <p className="text-white font-medium mt-1 text-sm leading-relaxed">{detectionResults.ai_explanation}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Idle State */}
            {!detectionResults && !detectionLoading && !detectionError && (
              <div className="space-y-3">
                <div className="glass-light rounded-xl p-4">
                  <p className="text-sm text-slate-400">Prediction</p>
                  <p className="text-white font-medium mt-1">Awaiting analysis...</p>
                </div>
                <div className="glass-light rounded-xl p-4">
                  <p className="text-sm text-slate-400">Confidence</p>
                  <p className="text-medical-500 font-medium mt-1">--</p>
                </div>
                <p className="text-xs text-slate-500 text-center">Upload an image to begin automatic detection</p>
              </div>
            )}
          </div>


        </div>

        {/* Center Column - 3D Viewer (Full Width) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 3D Anatomy Viewer */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-medical-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">3D Anatomy Viewer</h2>
                <p className="text-sm text-slate-400">Interactive visualization</p>
              </div>
            </div>
            <div className="h-[500px] rounded-xl overflow-hidden bg-slate-900/50">
              <Lung3DViewer activeCase={activeCase} />
            </div>
          </div>

          {/* Clinical Recommendations */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-medical-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Clinical Recommendations</h2>
                <p className="text-sm text-slate-400">Treatment guidance</p>
              </div>
            </div>
            
            {/* Loading Skeleton */}
            {detectionLoading && (
              <div className="space-y-3">
                <div className="glass-light rounded-lg p-3 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-slate-800 rounded w-2/3"></div>
                </div>
                <div className="glass-light rounded-lg p-3 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-slate-800 rounded w-2/3"></div>
                </div>
                <div className="glass-light rounded-lg p-3 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-slate-800 rounded w-2/3"></div>
                </div>
              </div>
            )}
            
            {/* Clinical Recommendations Cards */}
            {detectionResults && !detectionLoading && (
              <div className="space-y-3">
                {(() => {
                  const recs = generateClinicalRecommendations(detectionResults);
                  if (!recs) return null;
                  
                  const urgencyColor = recs.urgencyLevel === 'High' ? 'text-rose-400' : recs.urgencyLevel === 'Medium' ? 'text-amber-400' : 'text-emerald-400';
                  const riskColor = recs.riskLevel === 'High' ? 'text-rose-400' : recs.riskLevel === 'Medium' ? 'text-amber-400' : 'text-emerald-400';
                  
                  return (
                    <>
                      {/* Recommended Specialist */}
                      <div className="glass-light rounded-lg p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-medical-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Recommended Specialist</p>
                          <p className="text-sm text-white font-medium truncate">{recs.specialist}</p>
                        </div>
                      </div>

                      {/* Urgency Level */}
                      <div className="glass-light rounded-lg p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Urgency Level</p>
                          <p className={`text-sm font-medium ${urgencyColor}`}>{recs.urgencyLevel}</p>
                        </div>
                      </div>

                      {/* Risk Level */}
                      <div className="glass-light rounded-lg p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Risk Level</p>
                          <p className={`text-sm font-medium ${riskColor}`}>{recs.riskLevel}</p>
                        </div>
                      </div>

                      {/* Treatment Recommendation */}
                      <div className="glass-light rounded-lg p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Treatment</p>
                          <p className="text-sm text-white font-medium">{recs.treatment}</p>
                        </div>
                      </div>

                      {/* Medication Suggestions */}
                      <div className="glass-light rounded-lg p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Medication</p>
                          <p className="text-sm text-white font-medium">{recs.medication}</p>
                        </div>
                      </div>

                      {/* Lifestyle Advice */}
                      <div className="glass-light rounded-lg p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Lifestyle</p>
                          <p className="text-sm text-white font-medium">{recs.lifestyle}</p>
                        </div>
                      </div>

                      {/* Further Diagnostic Tests */}
                      <div className="glass-light rounded-lg p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Diagnostics</p>
                          <p className="text-sm text-white font-medium">{recs.diagnostics}</p>
                        </div>
                      </div>

                      {/* Follow-up Interval */}
                      <div className="glass-light rounded-lg p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Follow-up</p>
                          <p className="text-sm text-white font-medium">{recs.followUp}</p>
                        </div>
                      </div>

                      {/* Hospitalization Required */}
                      <div className="glass-light rounded-lg p-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400">Hospitalization</p>
                          <p className={`text-sm font-medium ${recs.hospitalization === 'Yes' ? 'text-rose-400' : 'text-emerald-400'}`}>{recs.hospitalization}</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            
            {/* Idle State */}
            {!detectionResults && !detectionLoading && (
              <div className="space-y-2">
                <div className="glass-light rounded-lg p-3 text-sm text-slate-300">
                  <span className="text-medical-500">•</span> Upload an image to begin analysis
                </div>
                <div className="glass-light rounded-lg p-3 text-sm text-slate-300">
                  <span className="text-medical-500">•</span> AI detection will provide insights
                </div>
                <div className="glass-light rounded-lg p-3 text-sm text-slate-300">
                  <span className="text-medical-500">•</span> Clinical recommendations will appear here
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - AI Assistant & Report */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* AI Assistant */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-medical-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
                <p className="text-sm text-slate-400">Clinical guidance</p>
              </div>
            </div>
            <div className="glass-light rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-400">Ask about the detected condition</p>
              <textarea 
                className="w-full mt-2 bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-medical-500 resize-none"
                rows={3}
                placeholder="Enter your clinical question..."
                value={assistantQuery}
                onChange={(e) => setAssistantQuery(e.target.value)}
              />
            </div>
            
            {/* Error Message */}
            {assistantError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 mb-4">
                <p className="text-rose-300 text-sm">{assistantError}</p>
              </div>
            )}
            
            {/* Loading State */}
            {assistantLoading && (
              <div className="glass-light rounded-lg p-3 mb-4 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-medical-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-medical-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-medical-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="text-sm text-slate-400 ml-2">Generating AI response...</span>
                </div>
              </div>
            )}
            
            {/* Response Display */}
            {assistantResponse && !assistantLoading && (
              <div className="glass-light rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-400 mb-2">AI Response:</p>
                <p className="text-sm text-white leading-relaxed">{assistantResponse}</p>
              </div>
            )}
            
            <button 
              onClick={handleAssistantQuery}
              disabled={assistantLoading}
              className="w-full bg-medical-500 hover:bg-medical-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
            >
              {assistantLoading ? 'Processing...' : 'Get AI Insight'}
            </button>
          </div>

          {/* Medical Knowledge (RAG) */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-medical-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Medical Knowledge</h2>
                <p className="text-sm text-slate-400">Retrieved references</p>
              </div>
            </div>
            
            {/* Loading State */}
            {ragLoading && (
              <div className="space-y-3">
                <div className="glass-light rounded-lg p-3 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-slate-800 rounded w-full"></div>
                </div>
                <div className="glass-light rounded-lg p-3 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-slate-800 rounded w-2/3"></div>
                </div>
              </div>
            )}
            
            {/* Error State */}
            {ragError && !ragLoading && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
                <p className="text-rose-300 text-sm">{ragError}</p>
              </div>
            )}
            
            {/* Results State */}
            {ragResults && !ragLoading && (
              <div className="space-y-3">
                {ragResults.results && ragResults.results.length > 0 ? (
                  ragResults.results.slice(0, 4).map((doc, index) => {
                    // Extract different sections from the content
                    const content = doc.content || doc.text || '';
                    const lines = content.split('\n').filter(line => line.trim());
                    
                    // Categorize content based on index to show diverse information
                    const categories = [
                      { title: 'Disease Overview', icon: '📋' },
                      { title: 'Causes & Risk Factors', icon: '⚠️' },
                      { title: 'Symptoms', icon: '🩺' },
                      { title: 'Diagnosis & Treatment', icon: '💊' }
                    ];
                    
                    const category = categories[index] || { title: 'Medical Information', icon: '📄' };
                    const relevantLines = lines.slice(index * 3, (index * 3) + 3).join(' • ');
                    
                    return (
                      <div key={index} className="glass-light rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-medical-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs">{category.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-medical-500 font-medium mb-1">{category.title}</p>
                            <p className="text-sm text-white leading-relaxed line-clamp-2">
                              {relevantLines || content.substring(0, 150)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Relevance: {(doc.score * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="glass-light rounded-lg p-3 text-center">
                    <p className="text-sm text-slate-400">No relevant medical references found.</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Idle State */}
            {!ragResults && !ragLoading && !ragError && (
              <div className="glass-light rounded-lg p-3 text-center">
                <p className="text-sm text-slate-400">Medical knowledge will appear after detection</p>
              </div>
            )}
          </div>

          {/* Report Download */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-medical-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Report Download</h2>
                <p className="text-sm text-slate-400">Generate PDF report</p>
              </div>
            </div>
            <div className="glass-light rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-400">Report Status</p>
              <p className="text-white font-medium mt-1">{activeCase ? 'Ready to generate' : 'Upload an image first'}</p>
            </div>
            <button 
              onClick={handleReportDownload}
              className="w-full bg-medical-500 hover:bg-medical-600 text-white font-medium py-3 rounded-xl transition-colors"
              disabled={!activeCase}
            >
              Download PDF
            </button>
          </div>

          {/* Recommendations and Grad-CAM Heatmap Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recommendations Card */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-medical-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Recommendations</h2>
                  <p className="text-sm text-slate-400">Treatment guidance</p>
                </div>
              </div>
              
              {detectionResults && !detectionLoading && detectionResults.recommendations && detectionResults.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {detectionResults.recommendations.map((rec, index) => (
                    <div key={index} className="glass-light rounded-lg p-3 flex items-start gap-2">
                      <span className="text-medical-500 mt-1">•</span>
                      <span className="text-sm text-white">{rec}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400">
                  Upload a chest X-ray to generate recommendations.
                </div>
              )}
            </div>

            {/* Grad-CAM Heatmap Card */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-medical-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-medical-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Grad-CAM Heatmap</h2>
                  <p className="text-sm text-slate-400">AI attention regions</p>
                </div>
              </div>
              
              {detectionResults && !detectionLoading && detectionResults.heatmap ? (
                <div className="rounded-lg overflow-hidden bg-slate-900/50">
                  <img 
                    src={`data:image/png;base64,${detectionResults.heatmap}`} 
                    alt="Grad-CAM Heatmap" 
                    className="w-full h-auto object-cover"
                  />
                  {detectionResults.affected_region && (
                    <p className="text-xs text-medical-500 mt-2 px-2">
                      Affected: {detectionResults.affected_region}
                    </p>
                  )}
                </div>
              ) : detectionLoading ? (
                <div className="glass-light rounded-lg p-4 animate-pulse">
                  <div className="h-32 bg-slate-700 rounded"></div>
                </div>
              ) : (
                <div className="text-sm text-slate-400">
                  Upload a chest X-ray to generate AI attention regions.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;
