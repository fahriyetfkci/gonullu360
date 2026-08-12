import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const getDashboardStats = async (year = 2026) => {
  const response = await axios.get(`${API_URL}/dashboard/stats?year=${year}`);
  return response.data;
};

export const getVolunteers = async (page = 1, limit = 10) => {
  const response = await axios.get(`${API_URL}/volunteers?page=${page}&limit=${limit}`);
  return response.data;
};
export const getAllYearsStats = async () => {
  const [data2024, data2025, data2026] = await Promise.all([
    getDashboardStats(2024),
    getDashboardStats(2025),
    getDashboardStats(2026),
  ]);
  return { 2024: data2024, 2025: data2025, 2026: data2026 };
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

export const getUser = async (id) => {
  const response = await axios.get(`${API_URL}/auth/me/${id}`);
  return response.data;
};

export const getNotifications = async (userId) => {
  const response = await axios.get(`${API_URL}/notifications/${userId}`);
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await axios.put(`${API_URL}/notifications/${id}/read`);
  return response.data;
};