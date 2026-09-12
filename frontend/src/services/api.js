import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api/v1` : '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        onProgress(percentCompleted);
      }
    },
  });
};

export const detectImage = async (file, caseId) => {
  const formData = new FormData();
  formData.append('file', file);
  if (caseId) {
    formData.append('case_id', caseId);
  }

  return api.post('/detect', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const queryRAG = async (query) => api.post('/rag', { query });

export const askAssistant = async ({ query, diseasePrediction, confidence }) => api.post('/assistant', {
  query,
  disease_prediction: diseasePrediction,
  confidence,
});

export const downloadReport = async (caseId) => api.get(`/reports/download/${caseId}`, {
  responseType: 'blob',
});

export default api;
