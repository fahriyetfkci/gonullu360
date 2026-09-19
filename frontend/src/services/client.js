import axios from 'axios';
import { getAccessToken, refreshSession, notifySessionExpired } from '../features/auth/services/authApi';

export function createApiClient(path = '') {
  const client = axios.create({
    baseURL: `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}${path}`,
    timeout: 15000,
  });
  client.interceptors.request.use(config => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use(response => response, async error => {
    const request = error.config;
    if (error.response?.status !== 401 || !request || request._retriedAfterRefresh) throw error;
    request._retriedAfterRefresh = true;
    let token;
    try {
      token = await refreshSession();
      if (!token) throw error;
    } catch (refreshError) {
      notifySessionExpired();
      throw refreshError;
    }
    request.headers.Authorization = `Bearer ${token}`;
    return client(request);
  });
  return client;
}

export const apiClient = createApiClient();
