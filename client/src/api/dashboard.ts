import api from './axios';
import type { Transaction } from './transactions';

export interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  topCategories: { name: string; color: string; total: string }[];
  monthlyTrends: { month: string; income: string; expense: string }[];
  recentTransactions: Transaction[];
}

export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard').then((r) => r.data),
};
