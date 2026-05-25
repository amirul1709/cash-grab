import api from './axios';

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  amount: string;
  period: 'monthly' | 'weekly';
  start_date: string;
  category_name: string;
  category_color: string;
  spent: string;
}

export interface BudgetPayload {
  category_id: number;
  amount: number;
  period: 'monthly' | 'weekly';
  start_date: string;
}

export const budgetsApi = {
  list: () => api.get<Budget[]>('/budgets').then((r) => r.data),
  create: (data: BudgetPayload) => api.post<Budget>('/budgets', data).then((r) => r.data),
  update: (id: number, data: BudgetPayload) =>
    api.put<Budget>(`/budgets/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/budgets/${id}`),
};
