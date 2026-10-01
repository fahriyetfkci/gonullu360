import { createEventGroup as saveGroup, createFullManagedEvent, getEventManagementOptions, uploadEventPoster as uploadPoster } from '../../../services/api';

export async function getEventOptions() {
  return getEventManagementOptions();
}

export async function createEvent(payload) {
  return createFullManagedEvent(payload);
}

export async function createEventGroup(payload) {
  return saveGroup(payload);
}

export async function uploadEventPoster(file) {
  return uploadPoster(file);
}

export function resolvePosterUrl(path) { return path; }

export function getEventApiErrorMessage(error) {
  if (error?.response?.status === 413) return 'Afiş dosyası en fazla 5 MB olabilir.';
  return error?.response?.data?.error?.message || error?.response?.data?.error || 'Etkinlik kaydedilemedi. Lütfen tekrar deneyin.';
}
