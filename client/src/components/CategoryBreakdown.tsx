import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { name: string; color: string; total: string }[];
}

export default function CategoryBreakdown({ data }: Props) {
  const formatted = data.map((d) => ({ name: d.name, value: parseFloat(d.total), color: d.color }));
  const total = formatted.reduce((sum, d) => sum + d.value, 0);

  if (formatted.length === 0) {
    return (
      <div className="px-6 py-12 flex items-center justify-center">
        <p className="text-[10px] font-mono tracking-editorial uppercase text-gray-400">
          No expense data this month
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 pt-5 pb-5">
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 sm:gap-6 items-center">
        {/* Donut */}
        <div className="relative h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={formatted}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={84}
                paddingAngle={2}
                stroke="#FFFFFF"
                strokeWidth={2}
              >
                {formatted.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                cursor={false}
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
                }}
                itemStyle={{ color: '#111111', fontVariantNumeric: 'tabular-nums' }}
                formatter={(v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[9px] font-mono tracking-editorial uppercase text-gray-400">Total</p>
            <p className="text-lg font-light text-gray-900 tabular-nums tracking-tight">
              ${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Legend list */}
        <ul className="space-y-2.5">
          {formatted.map((entry) => {
            const pct = total > 0 ? (entry.value / total) * 100 : 0;
            return (
              <li key={entry.name} className="flex items-center gap-3">
                <span
                  className="block w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ background: entry.color }}
                />
                <span className="flex-1 min-w-0 text-sm text-gray-700 truncate">{entry.name}</span>
                <span className="text-[10px] font-mono text-gray-400 tabular-nums">
                  {pct.toFixed(0)}%
                </span>
                <span className="text-sm text-gray-900 tabular-nums whitespace-nowrap w-20 text-right">
                  ${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
