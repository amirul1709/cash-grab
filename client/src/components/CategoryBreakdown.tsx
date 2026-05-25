import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: { name: string; color: string; total: string }[];
}

export default function CategoryBreakdown({ data }: Props) {
  const formatted = data.map((d) => ({ name: d.name, value: parseFloat(d.total), color: d.color }));

  if (formatted.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-center h-48 text-gray-400 text-sm">
        No expense data this month
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-700 mb-4">Top Expense Categories</h2>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={formatted} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
            {formatted.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
