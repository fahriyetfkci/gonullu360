import axios from "axios";
import {
  getAccessToken,
  notifySessionExpired,
  refreshSession,
} from "../../auth/services/authApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";

const eventClient = axios.create({
  baseURL: `${API_BASE_URL}/events`,
  timeout: 15000,
});

eventClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

eventClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retriedAfterRefresh) {
      return Promise.reject(error);
    }

    originalRequest._retriedAfterRefresh = true;
    try {
      const token = await refreshSession();
      if (!token) throw error;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return eventClient(originalRequest);
    } catch (refreshError) {
      notifySessionExpired();
      return Promise.reject(refreshError);
    }
  },
);

function unwrap(response) {
  return response.data?.data ?? null;
}

export async function getEventOptions() {
  return unwrap(await eventClient.get("/options"));
}

export async function createEvent(payload) {
  return unwrap(await eventClient.post("/", payload, {
    headers: { "Content-Type": "application/json" },
  }));
}

export async function createEventGroup(payload) {
  return unwrap(await eventClient.post("/groups", payload, {
    headers: { "Content-Type": "application/json" },
  }));
}

export async function uploadEventPoster(file) {
  return unwrap(await eventClient.post("/poster", file, {
    headers: { "Content-Type": file.type },
  }));
}

export function resolvePosterUrl(path) {
  if (!path || /^https?:\/\//.test(path)) return path;
  return new URL(path, API_BASE_URL).toString();
}

export function getEventApiErrorMessage(error) {
  if (error?.response?.data?.error?.code === "EVENT_SLUG_TAKEN") {
    return "Bu kısa URL başka bir etkinlik tarafından kullanılıyor.";
  }
  if (error?.response?.status === 413) return "Afiş dosyası en fazla 5 MB olabilir.";
  return error?.response?.data?.error?.message || "Etkinlik kaydedilemedi. Lütfen tekrar deneyin.";
}
