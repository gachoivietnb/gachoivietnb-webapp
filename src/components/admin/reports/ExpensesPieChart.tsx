'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

type Row = {
  category_name: string | null
  total_amount: string | number
  percentage: string | number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function ExpensesPieChart({ data }: { data: Row[] }) {
  const chartData = data
    .map((r) => ({
      name: r.category_name ?? '(không xác định)',
      value: Number(r.total_amount),
      percentage: Number(r.percentage),
    }))
    .filter((d) => d.value > 0)

  if (chartData.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">
        Chưa có chi phí trong kỳ
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={(entry) => {
            const p = (entry as { payload?: { percentage?: number } }).payload?.percentage
            return p ? `${p}%` : ''
          }}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => `${Number(v).toLocaleString('vi-VN')} đ`}
          contentStyle={{ backgroundColor: 'rgb(31 41 55)', border: 'none', borderRadius: 6, color: '#fff' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
