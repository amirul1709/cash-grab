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

const AXIS_TICK = {
  fontSize: 10,
  fontFamily: 'DM Mono, ui-monospace, monospace',
  fill: '#9CA3AF',
  letterSpacing: '0.05em',
};

export default function SpendingChart({ data }: Props) {
  const formatted = data.map((d) => ({
    month: d.month,
    Income: parseFloat(d.income),
    Expenses: parseFloat(d.expense),
  }));

  return (
    <div className="px-4 sm:px-6 pt-5 pb-4">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={formatted} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={6}>
          <CartesianGrid strokeDasharray="2 4" stroke="#EDE9E2" vertical={false} />
          <XAxis
            dataKey="month"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: '#DDD8CE' }}
            dy={6}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
            width={48}
          />
          <Tooltip
            cursor={{ fill: '#F8F6F2' }}
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid #DDD8CE',
              borderRadius: 8,
              boxShadow: 'none',
              fontSize: 12,
              fontFamily: 'DM Sans, system-ui, sans-serif',
              padding: '8px 12px',
            }}
            labelStyle={{
              fontFamily: 'DM Mono, ui-monospace, monospace',
              fontSize: 10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#9CA3AF',
              marginBottom: 4,
            }}
            itemStyle={{ color: '#111111', fontVariantNumeric: 'tabular-nums' }}
            formatter={(v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          <Legend
            iconType="square"
            iconSize={8}
            wrapperStyle={{
              fontFamily: 'DM Mono, ui-monospace, monospace',
              fontSize: 10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#6B7280',
              paddingTop: 12,
            }}
          />
          <Bar dataKey="Income" fill="#C49A3C" radius={[2, 2, 0, 0]} maxBarSize={28} />
          <Bar dataKey="Expenses" fill="#111111" radius={[2, 2, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
