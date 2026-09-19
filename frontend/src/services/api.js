import { apiClient } from './client';

export const getDashboardStats = async (year = new Date().getFullYear()) => {
  const response = await apiClient.get(`/dashboard/stats?year=${year}`);
  return response.data.data;
};

export const getVolunteers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await apiClient.get(`/volunteers?${query}`);
  return response.data.data;
};
export const getDashboardRange = async (startYear, endYear) => {
  const params = new URLSearchParams();
  if (startYear !== undefined) params.set('startYear', startYear);
  if (endYear !== undefined) params.set('endYear', endYear);
  const query = params.toString();
  const response = await apiClient.get(`/dashboard/range${query ? `?${query}` : ''}`);
  return response.data.data;
};
export const getApplications = async (page = 1, limit = 50, search = '', timeFilter = 'tümü') => {
  const response = await apiClient.get(`/applications?page=${page}&limit=${limit}&search=${search}&timeFilter=${timeFilter}`);
  return response.data.data;
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

  const response = await apiClient.get(`/volunteers/grouped?${queryParams}`);
  return response.data.data;
};

export const addVolunteer = async (volunteer) => {
  const response = await apiClient.post(`/volunteers`, volunteer);
  return response.data.data;
};

export const updateVolunteer = async (id, volunteer) => {
  const response = await apiClient.put(`/volunteers/${id}`, volunteer);
  return response.data.data;
};

export const deleteVolunteer = async (id) => {
  const response = await apiClient.delete(`/volunteers/${id}`);
  return response.data.data;
};

export const getUser = async () => {
  const response = await apiClient.get(`/auth/me`);
  return response.data.data;
};

export const getNotifications = async (page = 1, limit = 20) => {
  const response = await apiClient.get(`/notifications`, { params: { page, limit } });
  return response.data.data;
};

export const markNotificationRead = async (id) => {
  const response = await apiClient.put(`/notifications/${id}/read`);
  return response.data.data;
};


export const getApplication = async (id) => {
  const response = await apiClient.get(`/applications/${id}`);
  return response.data.data;
};

export const updateApplicationStatus = async (id, status) => {
  const response = await apiClient.put(`/applications/${id}/status`, { status });
  return response.data.data;
};

export const getVolunteerProfile = async (id) => {
  const response = await apiClient.get(`/volunteers/${id}/profile`);
  return response.data.data;
};

export const updateVolunteerProfile = async (id, profile) => {
  const response = await apiClient.put(`/volunteers/${id}/profile`, profile);
  return response.data.data;
};
