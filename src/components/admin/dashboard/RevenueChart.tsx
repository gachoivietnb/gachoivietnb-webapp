'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

type Trend = {
  month: string
  revenue: string | number
  expenses: string | number
  net_profit: string | number
}

export default function RevenueChart({ data }: { data: Trend[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">
        Chưa có dữ liệu doanh thu
      </div>
    )
  }

  const chartData = data.map((d) => ({
    month: d.month,
    'Doanh thu': Number(d.revenue),
    'Chi phí': Number(d.expenses),
    'Lãi ròng': Number(d.net_profit),
  }))

  const fmt = (v: number) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
    return `${v}`
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
        <XAxis dataKey="month" stroke="currentColor" fontSize={11} />
        <YAxis tickFormatter={fmt} stroke="currentColor" fontSize={11} />
        <Tooltip
          formatter={(v) => fmt(Number(v))}
          contentStyle={{ backgroundColor: 'rgb(31 41 55)', border: 'none', borderRadius: 6, color: '#fff' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Doanh thu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Chi phí" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="Lãi ròng" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
