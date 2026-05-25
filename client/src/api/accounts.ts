import api from './axios';

export interface Account {
  id: number;
  user_id: number;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
  balance: string;
  currency: string;
  created_at: string;
}

export interface AccountPayload {
  name: string;
  type: Account['type'];
  balance?: number;
  currency?: string;
}

export const accountsApi = {
  list: () => api.get<Account[]>('/accounts').then((r) => r.data),
  get: (id: number) => api.get<Account>(`/accounts/${id}`).then((r) => r.data),
  create: (data: AccountPayload) => api.post<Account>('/accounts', data).then((r) => r.data),
  update: (id: number, data: Partial<AccountPayload>) =>
    api.put<Account>(`/accounts/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/accounts/${id}`),
};
