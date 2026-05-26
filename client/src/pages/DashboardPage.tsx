import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';
import SpendingChart from '../components/SpendingChart';
import CategoryBreakdown from '../components/CategoryBreakdown';
import { formatDate } from '../utils/format';

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className={`bg-white border-l-2 ${accent} border-t border-r border-b border-cream-300 rounded-r-xl p-4 sm:p-5 xl:p-6`}>
      <p className="text-[9px] sm:text-[10px] font-mono tracking-wider xl:tracking-editorial uppercase text-gray-400 mb-2 sm:mb-3">{label}</p>
      <p className="text-2xl sm:text-3xl xl:text-4xl font-light text-gray-900 tracking-tight tabular-nums">{value}</p>
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
      <div className="p-8 flex justify-center items-center min-h-64">
        <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      {/* Page header */}
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[10px] text-gray-400">01 /</span>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Overview</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total Balance"     value={fmt(data?.totalBalance ?? 0)}    accent="border-l-gray-900" />
        <StatCard label="Income this month" value={fmt(data?.monthlyIncome ?? 0)}   accent="border-l-emerald-500" />
        <StatCard label="Spent this month"  value={fmt(data?.monthlyExpense ?? 0)}  accent="border-l-red-400" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
          <div className="px-6 pt-5 pb-1 border-b border-cream-200">
            <p className="text-[10px] font-mono tracking-editorial uppercase text-gray-400">02 / Spending Trends</p>
          </div>
          <SpendingChart data={data?.monthlyTrends ?? []} />
        </div>
        <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
          <div className="px-6 pt-5 pb-1 border-b border-cream-200">
            <p className="text-[10px] font-mono tracking-editorial uppercase text-gray-400">03 / By Category</p>
          </div>
          <CategoryBreakdown data={data?.topCategories ?? []} />
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-cream-200 flex items-baseline gap-3">
          <span className="font-mono text-[10px] text-gray-400">04 /</span>
          <h2 className="text-sm font-medium text-gray-700 tracking-tight">Recent Transactions</h2>
        </div>
        <ul className="divide-y divide-cream-100">
          {(data?.recentTransactions ?? []).length === 0 && (
            <li className="px-6 py-8 text-center text-gray-400 text-sm">No transactions yet</li>
          )}
          {(data?.recentTransactions ?? []).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-cream-50 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{t.description || t.account_name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate font-mono">
                  {formatDate(t.date)} · {t.account_name}
                </p>
              </div>
              <span className={`text-sm font-medium tabular-nums whitespace-nowrap ${
                t.type === 'income' ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {t.type === 'income' ? '+' : '−'}${parseFloat(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
