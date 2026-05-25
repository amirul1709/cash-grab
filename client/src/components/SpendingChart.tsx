import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  data: { month: string; income: string; expense: string }[];
}

export default function SpendingChart({ data }: Props) {
  const formatted = data.map((d) => ({
    month: d.month,
    Income: parseFloat(d.income),
    Expenses: parseFloat(d.expense),
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-700 mb-4">Income vs Expenses (6 months)</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Income"   fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
