import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const ORGANIZATION_SLUG = import.meta.env.VITE_ORGANIZATION_SLUG || 'gonullu360';

const USER_KEY = 'authUser';
let accessToken = null;
let refreshPromise = null;

axios.defaults.withCredentials = true;

export const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
};

export const hasSession = () => true;

const saveSession = (data) => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  accessToken = data.accessToken || data.token || null;
  if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
};

export const clearSession = () => {
  accessToken = null;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem(USER_KEY);
};

axios.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

axios.interceptors.response.use(response => response, async error => {
  const original = error.config;
  const isAuthRequest = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
  if (error.response?.status !== 401 || original?._retried || isAuthRequest) return Promise.reject(error);
  original._retried = true;
  try {
    if (!refreshPromise) {
      refreshPromise = axios.post(`${API_URL}/auth/refresh`)
        .then(response => { saveSession(response.data); return response.data.accessToken || response.data.token; })
        .finally(() => { refreshPromise = null; });
    }
    const token = await refreshPromise;
    original.headers.Authorization = `Bearer ${token}`;
    return axios(original);
  } catch (refreshError) {
    clearSession();
    window.dispatchEvent(new Event('auth:logout'));
    return Promise.reject(refreshError);
  }
});

export const login = async (email, password, mfaCode = '', backupCode = '') => {
  const response = await axios.post(`${API_URL}/auth/login`, { organizationSlug: ORGANIZATION_SLUG, email, password, ...(mfaCode ? { mfaCode } : {}), ...(backupCode ? { backupCode } : {}) });
  if (!response.data.mfaRequired) saveSession(response.data);
  return response.data;
};

export const requestPasswordReset = async (email) => (await axios.post(`${API_URL}/auth/forgot-password`, { organizationSlug: ORGANIZATION_SLUG, email })).data;
export const resetPassword = async (email, code, password) => (await axios.post(`${API_URL}/auth/reset-password`, { email, code, password })).data;
export const register = async (organizationSlug, name, email, password) => (await axios.post(`${API_URL}/auth/register`, { organizationSlug, name, email, password })).data;
export const verifyEmail = async (token) => (await axios.post(`${API_URL}/auth/verify-email`, { token })).data;
export const resendVerification = async (email) => (await axios.post(`${API_URL}/auth/resend-verification`, { organizationSlug: ORGANIZATION_SLUG, email })).data;

function csrfHeader() {
  const value = document.cookie.split(';').map(item => item.trim()).find(item => item.startsWith('csrf_token='))?.split('=').slice(1).join('=');
  return value ? { 'X-CSRF-Token': decodeURIComponent(value) } : {};
}
export const refreshSession = async () => {
  const response = await axios.post(`${API_URL}/auth/refresh`);
  saveSession(response.data);
  return response.data;
};

export const logout = async () => {
  try { await axios.post(`${API_URL}/auth/logout`, null, { headers: csrfHeader() }); } catch {
    // Sunucuya ulaşılamasa bile yerel oturum güvenli biçimde kapatılır.
  } finally {
    clearSession();
    window.dispatchEvent(new Event('auth:logout'));
  }
};

export const logoutAll = async () => {
  try { await axios.post(`${API_URL}/auth/logout-all`, null, { headers: csrfHeader() }); }
  finally { clearSession(); window.dispatchEvent(new Event('auth:logout')); }
};

export const getDashboardStats = async (year = 2026) => {
  const response = await axios.get(`${API_URL}/dashboard/stats?year=${year}`);
  return response.data;
};

export const getVolunteers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await axios.get(`${API_URL}/volunteers?${query}`);
  return response.data;
};
export const getDashboardRange = async (startYear, endYear) => {
  const params = new URLSearchParams();
  if (startYear !== undefined) params.set('startYear', startYear);
  if (endYear !== undefined) params.set('endYear', endYear);
  const query = params.toString();
  const response = await axios.get(`${API_URL}/dashboard/range${query ? `?${query}` : ''}`);
  return response.data;
};
export const getApplications = async (page = 1, limit = 50, search = '', timeFilter = 'tümü') => {
  const response = await axios.get(`${API_URL}/applications?page=${page}&limit=${limit}&search=${search}&timeFilter=${timeFilter}`);
  return response.data;
};

export const getGroupedVolunteers = async (params = {}) => {
  const {
    page = 1,
    limit = 50,
    search = '',
    status = '',
    education = '',
    startDate = '',
    endDate = '',
  } = params;

  const queryParams = new URLSearchParams({
    page,
    limit,
    search,
    status,
    education,
    startDate,
    endDate,
  });

  const response = await axios.get(`${API_URL}/volunteers/grouped?${queryParams}`);
  return response.data;
};

export const addVolunteer = async (volunteer) => {
  const response = await axios.post(`${API_URL}/volunteers`, volunteer);
  return response.data;
};

export const updateVolunteer = async (id, volunteer) => {
  const response = await axios.put(`${API_URL}/volunteers/${id}`, volunteer);
  return response.data;
};

export const deleteVolunteer = async (id) => {
  const response = await axios.delete(`${API_URL}/volunteers/${id}`);
  return response.data;
};

export const getUser = async () => {
  const response = await axios.get(`${API_URL}/auth/me`);
  return response.data;
};

export const getNotifications = async (page = 1, limit = 20) => {
  const response = await axios.get(`${API_URL}/notifications`, { params: { page, limit } });
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await axios.put(`${API_URL}/notifications/${id}/read`);
  return response.data;
};

export const setupMfa = async () => (await axios.post(`${API_URL}/auth/mfa/setup`)).data;
export const enableMfa = async (code) => (await axios.post(`${API_URL}/auth/mfa/enable`, { code })).data;
export const disableMfa = async (password) => (await axios.post(`${API_URL}/auth/mfa/disable`, { password })).data;

export const getApplication = async (id) => {
  const response = await axios.get(`${API_URL}/applications/${id}`);
  return response.data;
};

export const updateApplicationStatus = async (id, status) => {
  const response = await axios.put(`${API_URL}/applications/${id}/status`, { status });
  return response.data;
};

export const getVolunteerProfile = async (id) => {
  const response = await axios.get(`${API_URL}/volunteers/${id}/profile`);
  return response.data;
};

export const updateVolunteerProfile = async (id, profile) => {
  const response = await axios.put(`${API_URL}/volunteers/${id}/profile`, profile);
  return response.data;
};

export const getForms = async () => (await axios.get(`${API_URL}/forms`)).data;
export const createForm = async (schema) => (await axios.post(`${API_URL}/forms`, { schema })).data;
export const getForm = async (id) => (await axios.get(`${API_URL}/forms/${id}`)).data;
export const saveFormDraft = async (id, schema, expectedRevision) => (await axios.put(`${API_URL}/forms/${id}`, { schema, expectedRevision })).data;
export const publishForm = async (id, expectedRevision) => (await axios.post(`${API_URL}/forms/${id}/publish`, { expectedRevision })).data;
export const deleteForm = async (id) => (await axios.delete(`${API_URL}/forms/${id}`)).data;
export const getPublishedForm = async (id) => (await axios.get(`${API_URL}/forms/published/${id}`)).data;
export const submitForm = async (id, payload) => (await axios.post(
  `${API_URL}/forms/${id}/submissions`,
  payload instanceof FormData ? payload : { answers: payload },
)).data;
export const getFormSubmissions = async (id, page = 1, limit = 20) => (await axios.get(`${API_URL}/forms/${id}/submissions`, { params: { page, limit } })).data;
export const downloadSubmissionFile = async (formId, submissionId, file) => {
  const response = await axios.get(`${API_URL}/forms/${formId}/submissions/${submissionId}/files/${file.id}`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.originalName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
