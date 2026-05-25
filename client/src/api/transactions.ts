import api from './axios';

export interface Transaction {
  id: number;
  user_id: number;
  account_id: number;
  category_id: number | null;
  amount: string;
  type: 'income' | 'expense';
  description: string | null;
  date: string;
  created_at: string;
  category_name: string | null;
  category_color: string | null;
  account_name: string;
}

export interface TransactionPayload {
  account_id: number;
  category_id?: number | null;
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  date: string;
}

export interface TransactionListParams {
  account_id?: number;
  category_id?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface TransactionListResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export const transactionsApi = {
  list: (params?: TransactionListParams) =>
    api.get<TransactionListResponse>('/transactions', { params }).then((r) => r.data),
  get: (id: number) => api.get<Transaction>(`/transactions/${id}`).then((r) => r.data),
  create: (data: TransactionPayload) =>
    api.post<Transaction>('/transactions', data).then((r) => r.data),
  update: (id: number, data: TransactionPayload) =>
    api.put<Transaction>(`/transactions/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/transactions/${id}`),
};
