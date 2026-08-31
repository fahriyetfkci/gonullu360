import axios from "axios";
import {
  getAccessToken,
  notifySessionExpired,
  refreshSession,
} from "../../auth/services/authApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";
const ORGANIZATION_SLUG = process.env.REACT_APP_ORGANIZATION_SLUG || "ihh";

const formClient = axios.create({
  baseURL: `${API_BASE_URL}/forms`,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

formClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

formClient.interceptors.response.use(
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
      return formClient(originalRequest);
    } catch (refreshError) {
      notifySessionExpired();
      return Promise.reject(refreshError);
    }
  },
);

function unwrap(response) {
  return response.data?.data ?? null;
}

export async function getFormDraft(clientFormId) {
  const response = await formClient.get("/draft", {
    params: clientFormId ? { clientFormId } : {},
  });
  return unwrap(response);
}

export async function saveFormDraft(schema, expectedRevision) {
  const response = await formClient.put("/draft", {
    expectedRevision,
    schema,
  });
  return unwrap(response);
}

export async function publishFormDraft(clientFormId, expectedRevision) {
  const response = await formClient.post("/publish", {
    clientFormId,
    expectedRevision,
  });
  return unwrap(response);
}

export async function getPublishedForm(clientFormId) {
  const response = await formClient.get("/published", {
    params: { organizationSlug: ORGANIZATION_SLUG, ...(clientFormId ? { clientFormId } : {}) },
  });
  return unwrap(response);
}

export function getFormApiErrorMessage(error) {
  if (error?.response?.status === 409) {
    return "Taslak başka bir oturumda güncellendi. Sayfayı yenileyip tekrar deneyin.";
  }
  return error?.response?.data?.error?.message || "Form sunucusuna ulaşılamadı. Değişiklik yerel olarak korundu.";
}
