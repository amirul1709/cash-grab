import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../api/axios';
import { setExpiry, clearExpiry } from '../api/tokenStore';

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip the silent refresh entirely when the advisory `has_session` cookie is absent
    // or empty. Without this hint, logged-out visitors would log a 401 on every cold load.
    const hasSessionHint = document.cookie
      .split('; ')
      .some((c) => {
        const eq = c.indexOf('=');
        return eq > 0 && c.slice(0, eq) === 'has_session' && c.slice(eq + 1).length > 0;
      });
    if (!hasSessionHint) {
      setIsLoading(false);
      return;
    }

    api
      .post('/auth/refresh')
      .then((res) => {
        setExpiry(res.data.accessTokenExpiresAt as number);
        return api.get<User>('/auth/me');
      })
      .then((res) => setUser(res.data))
      .catch((err) => {
        // Hint was stale (e.g. server-side revoke). Clear it on auth failure so
        // we don't keep hitting /refresh on every reload. Leave it alone on
        // network/server errors so a transient outage doesn't force re-login.
        if (err?.response?.status === 401) {
          document.cookie = 'has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setExpiry(res.data.accessTokenExpiresAt as number);
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (email: string, name: string, password: string) => {
    const res = await api.post('/auth/register', { email, name, password });
    setExpiry(res.data.accessTokenExpiresAt as number);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // best-effort
    }
    clearExpiry();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
