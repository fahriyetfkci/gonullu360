import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";
const ORGANIZATION_SLUG = process.env.REACT_APP_ORGANIZATION_SLUG || "ihh";

let accessToken = null;
let refreshRequest = null;

export const AUTH_SESSION_EXPIRED_EVENT = "auth:session-expired";

const authClient = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  timeout: 10000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

function unwrap(response) {
  return response.data?.data ?? null;
}

function readCookie(name) {
  const prefix = `${name}=`;
  const value = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

export function getAccessToken() {
  return accessToken;
}

export async function loginWithPassword(email, password) {
  const result = unwrap(await authClient.post("/login", {
    organizationSlug: ORGANIZATION_SLUG,
    email,
    password,
  }));
  accessToken = result?.accessToken ?? null;
  return accessToken;
}

export async function refreshSession() {
  if (!refreshRequest) {
    refreshRequest = authClient.post("/refresh")
      .then((response) => {
        const result = unwrap(response);
        accessToken = result?.accessToken ?? null;
        return accessToken;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

export async function getCurrentUser() {
  if (!accessToken) return null;
  return unwrap(await authClient.get("/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  }));
}

export async function requestPasswordReset(email) {
  return unwrap(await authClient.post("/forgot-password", {
    organizationSlug: ORGANIZATION_SLUG,
    email,
  }));
}

export async function logoutSession() {
  const csrfToken = readCookie("csrf_token");
  try {
    await authClient.post("/logout", null, {
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
    });
  } finally {
    accessToken = null;
  }
}

export function clearAccessToken() {
  accessToken = null;
}

export function notifySessionExpired() {
  clearAccessToken();
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}

export function getAuthErrorMessage(error) {
  if (error?.response?.status === 401) return "E-posta veya şifre hatalı.";
  if (error?.response?.status === 403) return "Bu panele erişmek için yönetici yetkisi gerekiyor.";
  if (error?.response?.status === 429) return "Çok fazla deneme yapıldı. Lütfen biraz bekleyin.";
  return error?.response?.data?.error?.message || "Sunucuya ulaşılamadı. Lütfen tekrar deneyin.";
}
