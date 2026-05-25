import axios from 'axios';
import { getToken, setToken } from './tokenStore';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isRefreshEndpoint = original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !original._retry && !isRefreshEndpoint) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      try {
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        setToken(null);
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

async function doRefresh(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');

  const res = await api.post('/auth/refresh', { refreshToken });
  setToken(res.data.accessToken);
  localStorage.setItem('refreshToken', res.data.refreshToken);
  return res.data.accessToken as string;
}

export default api;
