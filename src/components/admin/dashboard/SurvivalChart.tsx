'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

type AreaStat = {
  area_code: string | null
  area_name: string | null
  survival_rate_pct: number | null
}

export default function SurvivalChart({ data }: { data: AreaStat[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">
        Chưa có dữ liệu tỷ lệ sống theo khu
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
        <XAxis dataKey="area_code" stroke="currentColor" fontSize={11} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="currentColor" fontSize={11} />
        <Tooltip
          formatter={(v) => `${v}%`}
          contentStyle={{ backgroundColor: 'rgb(31 41 55)', border: 'none', borderRadius: 6, color: '#fff' }}
        />
        <Bar dataKey="survival_rate_pct" fill="#10b981" name="Tỷ lệ sống" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
