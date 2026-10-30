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

// The access token lasts 8 hours (see server/src/routes/auth.routes.js) -
// easily crossed during a real field day. Without this, every request made
// after it expires just rejects with a 401 that nothing is listening for:
// data-loading effects fail silently (nothing to .catch() them — see the
// pages that call api.get() directly in a useEffect), so a page can look
// "stuck" showing stale or empty content with no way out through the app's
// own UI. A hard redirect (not React Router's navigate) forces a real
// page load, which recovers cleanly no matter what broken in-page state
// caused the symptom, and re-authenticating is the only correct fix for
// an actually-expired token anyway.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('map_token');
      localStorage.removeItem('map_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
