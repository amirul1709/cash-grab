import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';
import SpendingChart from '../components/SpendingChart';
import CategoryBreakdown from '../components/CategoryBreakdown';
import { formatDate } from '../utils/format';

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
  });

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total Balance"    value={fmt(data?.totalBalance ?? 0)}    color="text-gray-900" />
        <StatCard label="Income this month" value={fmt(data?.monthlyIncome ?? 0)}  color="text-green-600" />
        <StatCard label="Spent this month"  value={fmt(data?.monthlyExpense ?? 0)} color="text-red-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <SpendingChart data={data?.monthlyTrends ?? []} />
        <CategoryBreakdown data={data?.topCategories ?? []} />
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Recent Transactions</h2>
        </div>
        <ul className="divide-y divide-gray-50">
          {(data?.recentTransactions ?? []).length === 0 && (
            <li className="px-5 py-6 text-center text-gray-400 text-sm">No transactions yet</li>
          )}
          {(data?.recentTransactions ?? []).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 truncate">{t.description || t.account_name}</p>
                <p className="text-xs text-gray-400 truncate">{formatDate(t.date)} · {t.account_name}</p>
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                {t.type === 'income' ? '+' : '-'}${parseFloat(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
