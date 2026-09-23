import { apiClient } from '../../services/client';

export async function getAccountProfile() {
  return (await apiClient.get('/account/profile')).data.data;
}

export async function saveAccountProfile(profile) {
  return (await apiClient.put('/account/profile', profile)).data.data;
}
