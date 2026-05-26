import axios from 'axios';
import { isTokenExpiring, setExpiry, clearExpiry } from './tokenStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

// Proactive refresh: fire before token expires to avoid mid-flight 401s.
api.interceptors.request.use(async (config) => {
  const isRefreshEndpoint = config.url?.includes('/auth/refresh');
  if (!isRefreshEndpoint && isTokenExpiring()) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isRefreshEndpoint = original?.url?.includes('/auth/refresh');

    // Reactive fallback: catch 401s that slip through (clock skew, edge cases).
    if (error.response?.status === 401 && !original._retry && !isRefreshEndpoint) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      try {
        await refreshPromise;
        return api(original);
      } catch {
        clearExpiry();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

async function doRefresh(): Promise<void> {
  const res = await api.post('/auth/refresh');
  setExpiry(res.data.accessTokenExpiresAt as number);
}

export default api;
