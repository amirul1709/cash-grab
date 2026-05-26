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
    // On mount, attempt a silent refresh using the HttpOnly cookie.
    // If the cookie is absent or expired the server returns 401 and we stay logged out.
    api
      .post('/auth/refresh')
      .then((res) => {
        setExpiry(res.data.accessTokenExpiresAt as number);
        return api.get<User>('/auth/me');
      })
      .then((res) => setUser(res.data))
      .catch(() => {
        // No valid cookie — user is not authenticated.
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
