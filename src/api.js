// Shared Axios instance for every API call made by the app.
// Nothing outside this file should call fetch/axios directly — components and
// pages import `api` from here so the token header stays in one place.
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach the signed-in user's JWT (saved at login, see pages/Login.jsx) to
// every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('map_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
