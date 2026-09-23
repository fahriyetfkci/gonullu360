import { createApiClient } from '../../../services/client';
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";
const eventClient = createApiClient('/events');

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
