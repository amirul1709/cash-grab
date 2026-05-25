import api from './axios';

export interface Category {
  id: number;
  user_id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

export interface CategoryPayload {
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
}

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories').then((r) => r.data),
  create: (data: CategoryPayload) => api.post<Category>('/categories', data).then((r) => r.data),
  update: (id: number, data: CategoryPayload) =>
    api.put<Category>(`/categories/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/categories/${id}`),
};
