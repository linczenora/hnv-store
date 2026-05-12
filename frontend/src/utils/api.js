import axios from 'axios';

// Dùng biến môi trường — tránh phụ thuộc vào React proxy (không ổn định với multipart)
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dv_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — chỉ redirect khi KHÔNG đang ở trang login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('dv_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Documents
export const docsAPI = {
  list: (params) => api.get('/documents', { params }),
  get: (id) => api.get(`/documents/${id}`),
  checkDuplicate: (title, folder_id, exclude_id) =>
    api.get('/documents/check-duplicate', { params: { title, folder_id, exclude_id } }),
  upload: (formData, onProgress) =>
    api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    }),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  viewToken: (id) => api.get(`/documents/${id}/view-token`),
  versions: (id) => api.get(`/documents/${id}/versions`),
  uploadVersion: (id, formData) =>
    api.post(`/documents/${id}/version`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  setPermissions: (id, data) => api.put(`/documents/${id}/permissions`, data),
};

// Folders
export const foldersAPI = {
  list: () => api.get('/folders'),
  create: (data) => api.post('/folders', data),
  update: (id, data) => api.put(`/folders/${id}`, data),
  delete: (id) => api.delete(`/folders/${id}`),
};

// Catalogs (dynamic categories)
export const catalogsAPI = {
  list: (type) => api.get('/catalogs', { params: type ? { type } : {} }),
  create: (data) => api.post('/catalogs', data),
  update: (id, data) => api.put(`/catalogs/${id}`, data),
  delete: (id) => api.delete(`/catalogs/${id}`),
};

// Users (admin)
export const usersAPI = {
  list: () => api.get('/users'),
  setRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  setStatus: (id, is_active) => api.put(`/users/${id}/status`, { is_active }),
  delete: (id) => api.delete(`/users/${id}`),
};

// Activity
export const activityAPI = {
  list: (params) => api.get('/activity', { params }),
  stats: () => api.get('/activity/stats'),
};

// Helper: trigger browser download from blob
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Stats
export const statsAPI = {
  activityPie:  (params) => api.get('/stats/activity-pie',  { params }),
  docsByFolder: (params) => api.get('/stats/docs-by-folder', { params }),
  report:       (params) => api.get('/stats/report',         { params }),
  uploadTrend:  (params) => api.get('/stats/upload-trend',   { params }),
};

// AI Search
export const searchAPI = {
  ai: (query) => api.post('/search/ai', { query }),
};

export default api;
