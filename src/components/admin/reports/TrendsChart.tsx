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

type Row = {
  month: string
  revenue: string | number
  expenses: string | number
  net_profit: string | number
  chickens_sold: string | number
}

export default function TrendsChart({ data }: { data: Row[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">
        Chưa có dữ liệu
      </div>
    )
  }

  const chart = data.map((d) => ({
    month: d.month,
    'Doanh thu': Number(d.revenue),
    'Chi phí': Number(d.expenses),
    'Lãi ròng': Number(d.net_profit),
    'Số con bán': Number(d.chickens_sold),
  }))

  const fmt = (v: number) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
    return `${v}`
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={chart}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
        <XAxis dataKey="month" stroke="currentColor" fontSize={11} />
        <YAxis yAxisId="money" tickFormatter={fmt} stroke="currentColor" fontSize={11} />
        <YAxis yAxisId="count" orientation="right" stroke="currentColor" fontSize={11} />
        <Tooltip
          formatter={(v, n) =>
            n === 'Số con bán' ? String(v) : `${Number(v).toLocaleString('vi-VN')}`
          }
          contentStyle={{ backgroundColor: 'rgb(31 41 55)', border: 'none', borderRadius: 6, color: '#fff' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="money" dataKey="Doanh thu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="money" dataKey="Chi phí" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Line yAxisId="money" type="monotone" dataKey="Lãi ròng" stroke="#10b981" strokeWidth={2} />
        <Line yAxisId="count" type="monotone" dataKey="Số con bán" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
