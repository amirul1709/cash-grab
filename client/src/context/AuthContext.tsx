import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../api/axios';
import { setToken, getToken } from '../api/tokenStore';

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
    const stored = localStorage.getItem('refreshToken');
    if (!stored) {
      setIsLoading(false);
      return;
    }

    api
      .post('/auth/refresh', { refreshToken: stored })
      .then((res) => {
        setToken(res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        return api.get<User>('/auth/me');
      })
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('refreshToken'))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (email: string, name: string, password: string) => {
    const res = await api.post('/auth/register', { email, name, password });
    setToken(res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (getToken()) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // best-effort
      }
    }
    setToken(null);
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
