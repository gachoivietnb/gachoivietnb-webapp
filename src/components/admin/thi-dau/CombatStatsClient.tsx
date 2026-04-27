'use client'

import { useMemo } from 'react'
import Link from 'next/link'

type Match = {
  id: string
  match_date: string
  result: string | null
  rules: string
  total_duration_minutes: number | null
  prize_money: number
  opponent_name: string
  opponent_owner: string | null
  opponent_origin: string | null
  chicken: { chicken_code: string; name: string | null } | { chicken_code: string; name: string | null }[] | null
}

const fmtVnd = (n: number) => Number(n || 0).toLocaleString('vi-VN')

export function CombatStatsClient({
  matches,
  kpis,
}: {
  matches: Match[]
  kpis: Record<string, unknown>
}) {
  // Calendar heatmap data — last 90 days
  const heatmap = useMemo(() => {
    const map = new Map<string, { count: number; wins: number }>()
    for (const m of matches) {
      const cur = map.get(m.match_date) || { count: 0, wins: 0 }
      cur.count++
      if (m.result === 'thang') cur.wins++
      map.set(m.match_date, cur)
    }
    const days: Array<{ date: string; count: number; wins: number }> = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      const data = map.get(iso) || { count: 0, wins: 0 }
      days.push({ date: iso, ...data })
    }
    return days
  }, [matches])

  // Monthly bar
  const monthlyBars = useMemo(() => {
    const map = new Map<string, { total: number; wins: number; losses: number; draws: number; prize: number }>()
    for (const m of matches) {
      const month = m.match_date.slice(0, 7)
      const cur = map.get(month) || { total: 0, wins: 0, losses: 0, draws: 0, prize: 0 }
      cur.total++
      if (m.result === 'thang') cur.wins++
      else if (m.result === 'thua') cur.losses++
      else if (m.result === 'hoa') cur.draws++
      cur.prize += Number(m.prize_money || 0)
      map.set(month, cur)
    }
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
    return sorted
  }, [matches])

  // Opponent / rivalry
  const opponents = useMemo(() => {
    const map = new Map<string, { name: string; owner: string | null; origin: string | null; total: number; wins: number; losses: number; draws: number }>()
    for (const m of matches) {
      const key = `${m.opponent_name}__${m.opponent_owner ?? ''}`
      const cur = map.get(key) || {
        name: m.opponent_name,
        owner: m.opponent_owner,
        origin: m.opponent_origin,
        total: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      }
      cur.total++
      if (m.result === 'thang') cur.wins++
      else if (m.result === 'thua') cur.losses++
      else if (m.result === 'hoa') cur.draws++
      map.set(key, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [matches])

  const rivals = opponents.filter((o) => o.total >= 2)

  const total = Number(kpis.matches_total ?? 0)
  const wins = Number(kpis.wins ?? 0)
  const losses = Number(kpis.losses ?? 0)
  const draws = Number(kpis.draws ?? 0)
  const winRate = total > 0 ? (wins / total) * 100 : 0
  const maxMonth = Math.max(...monthlyBars.map((b) => b[1].total), 1)

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiSimple emoji="⚔️" label="Tổng trận" value={total.toString()} />
        <KpiSimple emoji="✅" label="Thắng" value={`${wins} (${winRate.toFixed(0)}%)`} tone="emerald" />
        <KpiSimple emoji="❌" label="Thua" value={losses.toString()} tone="red" />
        <KpiSimple emoji="💰" label="Giải tiền YTD" value={`${fmtVnd(Number(kpis.prize_ytd ?? 0))}đ`} tone="amber" />
      </div>

      {/* Monthly bars */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <h3 className="font-bold text-sm mb-3">📈 Trận đấu theo tháng (12 tháng gần nhất)</h3>
        {monthlyBars.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">Chưa có dữ liệu</p>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {monthlyBars.map(([month, b]) => {
              const h = (b.total / maxMonth) * 100
              return (
                <div key={month} className="flex-1 flex flex-col items-center group">
                  <div className="text-[9px] text-gray-500 mb-0.5 opacity-0 group-hover:opacity-100">
                    {b.wins}W/{b.losses}L/{b.draws}D
                  </div>
                  <div className="w-full flex flex-col-reverse" style={{ height: `${h}%`, minHeight: '4px' }}>
                    <div
                      className="bg-emerald-500"
                      style={{ height: `${(b.wins / b.total) * 100}%` }}
                      title={`Thắng: ${b.wins}`}
                    />
                    <div
                      className="bg-amber-400"
                      style={{ height: `${(b.draws / b.total) * 100}%` }}
                      title={`Hòa: ${b.draws}`}
                    />
                    <div
                      className="bg-red-500"
                      style={{ height: `${(b.losses / b.total) * 100}%` }}
                      title={`Thua: ${b.losses}`}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">{month.slice(5, 7)}</div>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
          <span><span className="inline-block w-2 h-2 bg-emerald-500 rounded-sm mr-1" />Thắng</span>
          <span><span className="inline-block w-2 h-2 bg-amber-400 rounded-sm mr-1" />Hòa</span>
          <span><span className="inline-block w-2 h-2 bg-red-500 rounded-sm mr-1" />Thua</span>
        </div>
      </div>

      {/* Heatmap calendar 90 days */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <h3 className="font-bold text-sm mb-3">🗓 90 ngày gần đây</h3>
        <div className="grid grid-cols-15 gap-0.5" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
          {heatmap.map((d) => {
            const intensity = d.count === 0 ? 0 : d.wins === d.count ? 4 : d.wins > 0 ? 3 : d.count > 1 ? 2 : 1
            const cls = [
              'bg-gray-100 dark:bg-gray-700',
              'bg-amber-200',
              'bg-orange-300',
              'bg-emerald-400',
              'bg-emerald-600',
            ][intensity]
            return (
              <div
                key={d.date}
                className={`aspect-square rounded ${cls}`}
                title={`${d.date.split('-').reverse().join('/')} — ${d.count} trận, ${d.wins} thắng`}
              />
            )
          })}
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
          <span>Ít</span>
          <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700 rounded" />
          <div className="w-3 h-3 bg-amber-200 rounded" />
          <div className="w-3 h-3 bg-orange-300 rounded" />
          <div className="w-3 h-3 bg-emerald-400 rounded" />
          <div className="w-3 h-3 bg-emerald-600 rounded" />
          <span>Nhiều thắng</span>
        </div>
      </div>

      {/* Rivalry */}
      {rivals.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-900 rounded-xl p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5">
            ⚔️ Đối thủ truyền kiếp <span className="text-[10px] font-normal text-gray-500">(đã đấu ≥ 2 lần)</span>
          </h3>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase text-gray-500 border-b">
              <tr>
                <th className="text-left p-2">Đối thủ</th>
                <th className="text-left p-2 hidden md:table-cell">Chủ / Trại</th>
                <th className="text-left p-2 hidden md:table-cell">Xuất xứ</th>
                <th className="text-center p-2">Lần đấu</th>
                <th className="text-center p-2">W-L-D</th>
                <th className="text-center p-2">Tỷ số</th>
              </tr>
            </thead>
            <tbody>
              {rivals.map((r, i) => {
                const dom = r.wins > r.losses ? '👑 Áp đảo' : r.wins < r.losses ? '⚠️ Bị áp đảo' : '🤝 Cân tài'
                return (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-2 font-bold">{r.name}</td>
                    <td className="p-2 hidden md:table-cell text-xs text-gray-600">{r.owner ?? '—'}</td>
                    <td className="p-2 hidden md:table-cell text-xs text-gray-500">{r.origin ?? '—'}</td>
                    <td className="p-2 text-center font-mono">{r.total}</td>
                    <td className="p-2 text-center font-mono">
                      <span className="text-emerald-700">{r.wins}</span>-<span className="text-red-700">{r.losses}</span>-<span className="text-amber-700">{r.draws}</span>
                    </td>
                    <td className="p-2 text-center text-xs">{dom}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* All opponents */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <h3 className="font-bold text-sm mb-3">🆚 Tất cả đối thủ đã gặp ({opponents.length})</h3>
        {opponents.length === 0 ? (
          <p className="text-xs text-gray-500">Chưa có dữ liệu</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {opponents.map((o, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-xs">
                <div className="font-semibold">{o.name}</div>
                <div className="text-gray-500">{[o.owner, o.origin].filter(Boolean).join(' · ') || '—'}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-gray-500">{o.total} lần</span>
                  <span className="text-emerald-700">{o.wins}W</span>
                  <span className="text-red-700">{o.losses}L</span>
                  <span className="text-amber-700">{o.draws}D</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiSimple({ emoji, label, value, tone = 'blue' }: { emoji: string; label: string; value: string; tone?: 'blue' | 'emerald' | 'red' | 'amber' }) {
  const cls = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-teal-600',
    red: 'from-red-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
  }[tone]
  return (
    <div className={`rounded-xl p-3 bg-gradient-to-br ${cls} text-white shadow-sm`}>
      <div className="text-2xl">{emoji}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="font-bold text-lg leading-tight truncate">{value}</div>
    </div>
  )
}
