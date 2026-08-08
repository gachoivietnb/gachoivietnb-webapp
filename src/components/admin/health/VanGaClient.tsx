'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'
import { getBreedColor } from '@/lib/utils/breed-colors'

type TopPerf = {
  chicken_id: string
  chicken_code: string
  name: string | null
  breed_code: string | null
  total_sessions: number
  wins: number
  losses: number
  draws: number
  avg_strength: number | null
  avg_appearance: number | null
  avg_aggression: number | null
  avg_total: number | null
  last_session_date: string | null
}

type Session = {
  id: string
  session_date: string
  duration_minutes: number | null
  score_strength: number | null
  score_appearance: number | null
  score_aggression: number | null
  result: 'thang' | 'thua' | 'hoa' | null
  opponent_name: string | null
  notes: string | null
  chickens: {
    id: string
    chicken_code: string
    name: string | null
    breed_code: string | null
    status: string
    breeds: { name_vi: string; code: string } | null
  } | null
}

type Breed = { code: string; name_vi: string }

const RESULT_META: Record<string, { label: string; pill: string; gradient: string }> = {
  thang: {
    label: '🥇 Thắng',
    pill: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
    gradient: 'from-emerald-500 to-green-600',
  },
  thua: {
    label: '❌ Thua',
    pill: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
    gradient: 'from-red-500 to-rose-600',
  },
  hoa: {
    label: '🤝 Hoà',
    pill: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
    gradient: 'from-amber-500 to-orange-600',
  },
}

const PODIUM_META = [
  { medal: '🥇', tint: 'from-yellow-400 to-amber-500', ring: 'ring-yellow-400 dark:ring-yellow-500', label: 'Quán quân' },
  { medal: '🥈', tint: 'from-slate-400 to-gray-500', ring: 'ring-slate-400 dark:ring-slate-500', label: 'Á quân' },
  { medal: '🥉', tint: 'from-orange-400 to-amber-600', ring: 'ring-orange-400 dark:ring-orange-500', label: 'Hạng ba' },
]

export function VanGaClient({
  initialTab,
  initialQuery,
  ranking,
  sessions,
  breeds,
}: {
  initialTab: 'ranking' | 'sessions'
  initialQuery: string
  ranking: TopPerf[]
  sessions: Session[]
  breeds: Breed[]
}) {
  const [tab, setTab] = useState<'ranking' | 'sessions'>(initialTab)
  const [query, setQuery] = useState(initialQuery)
  const [breed, setBreed] = useState<string>('')
  const [minScore, setMinScore] = useState<string>('')
  const [resultFilter, setResultFilter] = useState<'' | 'thang' | 'thua' | 'hoa'>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [sortKey, setSortKey] = useState<'avg_total' | 'wins' | 'sessions' | 'recent'>('avg_total')
  const router = useRouter()
  const [editing, setEditing] = useState<Session | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(s: Session) {
    if (!window.confirm(`Xóa buổi vần ngày ${formatDate(s.session_date)} của ${s.chickens?.name ?? s.chickens?.chicken_code ?? 'gà này'}?`)) return
    setDeletingId(s.id)
    const res = await fetch(`/api/training-sessions/${s.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      window.alert('Lỗi xóa: ' + (j.error ?? `HTTP ${res.status}`))
      setDeletingId(null)
      return
    }
    setDeletingId(null)
    router.refresh()
  }

  const q = removeDiacritics(query.trim())

  const filteredRanking = useMemo(() => {
    const out = ranking.filter((r) => {
      if (q) {
        const hay = removeDiacritics(`${r.name ?? ''} ${r.chicken_code}`)
        if (!hay.includes(q)) return false
      }
      if (breed && r.breed_code !== breed) return false
      if (minScore && (r.avg_total ?? 0) < parseFloat(minScore)) return false
      return true
    })
    const sorted = [...out]
    if (sortKey === 'avg_total')
      sorted.sort((a, b) => (b.avg_total ?? -1) - (a.avg_total ?? -1) || b.total_sessions - a.total_sessions)
    else if (sortKey === 'wins') sorted.sort((a, b) => b.wins - a.wins || b.total_sessions - a.total_sessions)
    else if (sortKey === 'sessions') sorted.sort((a, b) => b.total_sessions - a.total_sessions)
    else if (sortKey === 'recent')
      sorted.sort((a, b) => (b.last_session_date ?? '').localeCompare(a.last_session_date ?? ''))
    return sorted
  }, [ranking, q, breed, minScore, sortKey])

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const c = s.chickens
      if (q) {
        const hay = removeDiacritics(`${c?.name ?? ''} ${c?.chicken_code ?? ''} ${s.opponent_name ?? ''}`)
        if (!hay.includes(q)) return false
      }
      if (breed && c?.breed_code !== breed) return false
      if (resultFilter && s.result !== resultFilter) return false
      if (dateFrom && s.session_date < dateFrom) return false
      if (dateTo && s.session_date > dateTo) return false
      const total = ((s.score_strength ?? 0) + (s.score_appearance ?? 0) + (s.score_aggression ?? 0)) / 3
      if (minScore && total < parseFloat(minScore)) return false
      return true
    })
  }, [sessions, q, breed, minScore, resultFilter, dateFrom, dateTo])

  // === KPIs ===
  const totalChickens = ranking.length
  const eliteCount = ranking.filter((r) => (r.avg_total ?? 0) >= 8).length
  const totalSessions = sessions.length
  const totalWins = sessions.filter((s) => s.result === 'thang').length
  const winRate = totalSessions > 0 ? (totalWins / totalSessions) * 100 : 0
  const avgScoreOverall =
    ranking.length > 0
      ? ranking.reduce((s, r) => s + (r.avg_total ?? 0), 0) / ranking.length
      : 0
  const top3 = filteredRanking.slice(0, 3)
  const restRanking = filteredRanking.slice(3)

  const last30Days = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const recentSessions = sessions.filter((s) => s.session_date >= last30Days).length

  const hasFilter = !!(query || breed || minScore || resultFilter || dateFrom || dateTo)
  function clearFilters() {
    setQuery('')
    setBreed('')
    setMinScore('')
    setResultFilter('')
    setDateFrom('')
    setDateTo('')
  }

  // Score band distribution (for KPI insight)
  const scoreBands = [
    { label: '⭐ ≥ 9', count: ranking.filter((r) => (r.avg_total ?? 0) >= 9).length, color: 'bg-purple-500' },
    { label: '✨ 8-9', count: ranking.filter((r) => (r.avg_total ?? 0) >= 8 && (r.avg_total ?? 0) < 9).length, color: 'bg-emerald-500' },
    { label: '👍 7-8', count: ranking.filter((r) => (r.avg_total ?? 0) >= 7 && (r.avg_total ?? 0) < 8).length, color: 'bg-blue-500' },
    { label: '~ 5-7', count: ranking.filter((r) => (r.avg_total ?? 0) >= 5 && (r.avg_total ?? 0) < 7).length, color: 'bg-amber-500' },
    { label: '⚠ < 5', count: ranking.filter((r) => (r.avg_total ?? 0) < 5).length, color: 'bg-red-400' },
  ]
  const scoreBandTotal = scoreBands.reduce((s, b) => s + b.count, 0)

  return (
    <>
      {/* === KPI cards === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi
          label="Gà có thành tích"
          value={totalChickens.toLocaleString('vi-VN')}
          sub={`${eliteCount} gà ưu tú (≥ 8 điểm)`}
          tint="purple"
          icon="🏆"
        />
        <Kpi
          label="Tổng buổi vần"
          value={totalSessions.toLocaleString('vi-VN')}
          sub={`${recentSessions} trong 30 ngày`}
          tint="blue"
          icon="🥊"
        />
        <Kpi
          label="Tỉ lệ thắng"
          value={`${winRate.toFixed(1)}%`}
          sub={`${totalWins} / ${totalSessions} trận`}
          tint="emerald"
          icon="🥇"
        />
        <Kpi
          label="Điểm TB toàn trại"
          value={avgScoreOverall > 0 ? avgScoreOverall.toFixed(2) : '—'}
          sub={`Trên thang 10`}
          tint="amber"
          icon="⭐"
        />
      </div>

      {/* Score band distribution */}
      {scoreBandTotal > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              📊 Phân bổ điểm trung bình
            </span>
            <span className="font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">
              {scoreBandTotal} gà
            </span>
          </div>
          <div className="flex h-5 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
            {scoreBands.map((b, i) => {
              const pct = (b.count / scoreBandTotal) * 100
              return (
                <div
                  key={i}
                  title={`${b.label}: ${b.count} gà (${pct.toFixed(1)}%)`}
                  className={`${b.color} flex items-center justify-center text-white text-[10px] font-bold transition-all hover:opacity-90`}
                  style={{ width: `${pct}%` }}
                >
                  {pct >= 8 ? <span className="px-1 truncate">{b.count}</span> : null}
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] mt-2">
            {scoreBands.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${b.color}`} />
                <span className="text-gray-700 dark:text-gray-300 font-medium">{b.label}:</span>
                <span className="text-gray-500 dark:text-gray-400 tabular-nums">{b.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {([
          ['ranking', `🏆 Bảng xếp hạng (${filteredRanking.length})`],
          ['sessions', `📋 Tất cả buổi vần (${filteredSessions.length})`],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition ${
              tab === k
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 md:p-4 mb-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">🔍 Lọc thông minh</h2>
          {hasFilter && (
            <button onClick={clearFilters} className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold ml-auto">
              ✕ Xóa lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3">
          <div className="relative md:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên, mã, đối thủ..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none transition"
            />
          </div>
          <select
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🧬 Tất cả giống</option>
            {breeds.map((b) => (
              <option key={b.code} value={b.code}>{b.name_vi}</option>
            ))}
          </select>
          <select
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">⭐ Điểm bất kỳ</option>
            <option value="5">≥ 5.0</option>
            <option value="6">≥ 6.0</option>
            <option value="7">≥ 7.0</option>
            <option value="8">≥ 8.0 (giỏi)</option>
            <option value="9">≥ 9.0 (xuất sắc)</option>
          </select>
        </div>

        {tab === 'sessions' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="md:col-span-2 flex gap-2 items-center flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">
                Kết quả:
              </span>
              {(
                [
                  ['', 'Tất cả', ''],
                  ['thang', '🥇', RESULT_META.thang.pill],
                  ['thua', '❌', RESULT_META.thua.pill],
                  ['hoa', '🤝', RESULT_META.hoa.pill],
                ] as const
              ).map(([val, label, tint]) => (
                <button
                  key={val}
                  onClick={() => setResultFilter(val as '' | 'thang' | 'thua' | 'hoa')}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                    resultFilter === val
                      ? 'bg-blue-600 text-white shadow-sm'
                      : tint || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
            <div className="text-sm text-gray-500 dark:text-gray-400 self-center">
              {filteredSessions.length}/{sessions.length} buổi
            </div>
          </div>
        )}

        {tab === 'ranking' && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Sắp xếp:
            </span>
            {(
              [
                ['avg_total', '⭐ Điểm cao'],
                ['wins', '🥇 Nhiều thắng'],
                ['sessions', '🥊 Nhiều buổi'],
                ['recent', '🕒 Mới nhất'],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                  sortKey === k
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CONTENT */}
      {tab === 'ranking' ? (
        filteredRanking.length === 0 ? (
          <EmptyState message="Không có gà nào khớp tiêu chí" onClear={hasFilter ? clearFilters : null} />
        ) : (
          <div className="space-y-4">
            {/* PODIUM TOP 3 */}
            {top3.length > 0 && sortKey === 'avg_total' && !hasFilter && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {top3.map((p, i) => (
                  <PodiumCard key={p.chicken_id} chicken={p} rank={i} />
                ))}
              </div>
            )}
            <RankingTable items={hasFilter || sortKey !== 'avg_total' ? filteredRanking : restRanking} startIndex={hasFilter || sortKey !== 'avg_total' ? 0 : 3} />
          </div>
        )
      ) : filteredSessions.length === 0 ? (
        <EmptyState message="Không có buổi vần nào khớp tiêu chí" onClear={hasFilter ? clearFilters : null} />
      ) : (
        <SessionsView items={filteredSessions} onEdit={setEditing} onDelete={handleDelete} deletingId={deletingId} />
      )}
      {editing && (
        <EditSessionModal
          session={editing}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); router.refresh() }}
        />
      )}
    </>
  )
}

/* === Podium card for top 3 === */
function PodiumCard({ chicken: p, rank }: { chicken: TopPerf; rank: number }) {
  const meta = PODIUM_META[rank]
  const color = getBreedColor(p.breed_code)
  const winRate = p.total_sessions > 0 ? (p.wins / p.total_sessions) * 100 : 0

  return (
    <Link
      href={`/admin/ho-so-ga/${p.chicken_id}`}
      className={`group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border-2 ${color.border} ring-4 ${meta.ring}/50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all`}
    >
      {/* Ribbon */}
      <div className={`bg-gradient-to-r ${meta.tint} text-white px-4 py-2 flex items-center justify-between`}>
        <span className="text-xs font-bold uppercase tracking-widest">{meta.label}</span>
        <span className="text-2xl">{meta.medal}</span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-14 h-14 rounded-2xl ${color.bg} flex items-center justify-center text-3xl flex-shrink-0`}>
            🐓
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-base truncate">{p.name ?? p.chicken_code}</div>
            <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500 truncate">{p.chicken_code}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums leading-none">
              {p.avg_total ?? '—'}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5">điểm TB</div>
          </div>
        </div>

        {/* Win/Loss/Draw */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <StatPill label="Thắng" value={p.wins} tint="emerald" />
          <StatPill label="Thua" value={p.losses} tint="red" />
          <StatPill label="Hoà" value={p.draws} tint="amber" />
        </div>

        {/* Win rate bar */}
        {p.total_sessions > 0 && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 flex justify-between">
            <span>Tỉ lệ thắng</span>
            <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">{winRate.toFixed(0)}%</span>
          </div>
        )}
        {p.total_sessions > 0 && (
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${winRate >= 60 ? 'bg-emerald-500' : winRate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${winRate}%` }}
            />
          </div>
        )}

        {/* Sub-scores */}
        <div className="grid grid-cols-3 gap-1 mt-3 text-[10px] text-center">
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-1">
            <div className="text-gray-500 dark:text-gray-400">💪 Thể</div>
            <div className="font-bold tabular-nums">{p.avg_strength ?? '—'}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-1">
            <div className="text-gray-500 dark:text-gray-400">🦚 Vóc</div>
            <div className="font-bold tabular-nums">{p.avg_appearance ?? '—'}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-1">
            <div className="text-gray-500 dark:text-gray-400">🔥 Hung</div>
            <div className="font-bold tabular-nums">{p.avg_aggression ?? '—'}</div>
          </div>
        </div>
      </div>
    </Link>
  )
}

function StatPill({ label, value, tint }: { label: string; value: number; tint: 'emerald' | 'red' | 'amber' }) {
  const map = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
    red: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
    amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
  }
  return (
    <div className={`${map[tint]} rounded-lg px-2 py-1 text-center`}>
      <div className="text-[9px] font-bold uppercase tracking-widest opacity-80">{label}</div>
      <div className="text-base font-extrabold tabular-nums leading-tight">{value}</div>
    </div>
  )
}

/* === Ranking table === */
function RankingTable({ items, startIndex }: { items: TopPerf[]; startIndex: number }) {
  if (items.length === 0) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2.5 text-left w-12">#</th>
            <th className="px-3 py-2.5 text-left">Gà</th>
            <th className="px-3 py-2.5 text-center">Buổi</th>
            <th className="px-3 py-2.5 text-center">T/T/H</th>
            <th className="px-3 py-2.5 text-center">% Thắng</th>
            <th className="px-3 py-2.5 text-center">💪 Thể</th>
            <th className="px-3 py-2.5 text-center">🦚 Vóc</th>
            <th className="px-3 py-2.5 text-center">🔥 Hung</th>
            <th className="px-3 py-2.5 text-center">⭐ Tổng</th>
            <th className="px-3 py-2.5 text-center">Mới nhất</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((p, i) => {
            const winRate = p.total_sessions > 0 ? (p.wins / p.total_sessions) * 100 : 0
            return (
              <tr key={p.chicken_id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-3 py-2 text-gray-400 dark:text-gray-500 font-mono">
                  {startIndex + i + 1}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/ho-so-ga/${p.chicken_id}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    {p.name ?? p.chicken_code}
                  </Link>
                  <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500">{p.chicken_code}</div>
                </td>
                <td className="px-3 py-2 text-center font-semibold">{p.total_sessions}</td>
                <td className="px-3 py-2 text-center text-xs">
                  <span className="text-green-600 dark:text-green-400 font-semibold">{p.wins}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-red-600 dark:text-red-400 font-semibold">{p.losses}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-600 dark:text-gray-400 font-semibold">{p.draws}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden min-w-[40px]">
                      <div
                        className={`h-full ${winRate >= 60 ? 'bg-emerald-500' : winRate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${winRate}%` }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums w-10 text-right">{winRate.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">{p.avg_strength ?? '—'}</td>
                <td className="px-3 py-2 text-center">{p.avg_appearance ?? '—'}</td>
                <td className="px-3 py-2 text-center">{p.avg_aggression ?? '—'}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${scoreBadgeClass(p.avg_total)}`}>
                    {p.avg_total ?? '—'}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-400">
                  {p.last_session_date ? formatDate(p.last_session_date) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* === Sessions view (timeline cards) === */
function SessionsView({
  items,
  onEdit,
  onDelete,
  deletingId,
}: {
  items: Session[]
  onEdit: (s: Session) => void
  onDelete: (s: Session) => void
  deletingId: string | null
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2.5 text-left">Ngày</th>
            <th className="px-3 py-2.5 text-left">Gà</th>
            <th className="px-3 py-2.5 text-left">Giống</th>
            <th className="px-3 py-2.5 text-center">Thời lượng</th>
            <th className="px-3 py-2.5 text-center">💪</th>
            <th className="px-3 py-2.5 text-center">🦚</th>
            <th className="px-3 py-2.5 text-center">🔥</th>
            <th className="px-3 py-2.5 text-center">⭐ Tổng</th>
            <th className="px-3 py-2.5 text-center">Kết quả</th>
            <th className="px-3 py-2.5 text-left">Đối thủ / Ghi chú</th>
            <th className="px-3 py-2.5 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((s) => {
            const c = s.chickens
            const total = ((s.score_strength ?? 0) + (s.score_appearance ?? 0) + (s.score_aggression ?? 0)) / 3
            const resultInfo = s.result ? RESULT_META[s.result] : null
            return (
              <tr key={s.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition">
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {formatDate(s.session_date)}
                </td>
                <td className="px-3 py-2">
                  {c ? (
                    <Link href={`/admin/ho-so-ga/${c.id}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                      {c.name ?? c.chicken_code}
                    </Link>
                  ) : <span className="text-gray-400 italic">—</span>}
                  {c && <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500">{c.chicken_code}</div>}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">{c?.breeds?.name_vi ?? '—'}</td>
                <td className="px-3 py-2 text-center">{s.duration_minutes ? `${s.duration_minutes}'` : '—'}</td>
                <td className="px-3 py-2 text-center">{s.score_strength ?? '—'}</td>
                <td className="px-3 py-2 text-center">{s.score_appearance ?? '—'}</td>
                <td className="px-3 py-2 text-center">{s.score_aggression ?? '—'}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${scoreBadgeClass(total)}`}>
                    {total.toFixed(1)}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {resultInfo ? (
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${resultInfo.pill}`}>
                      {resultInfo.label}
                    </span>
                  ) : <span className="text-gray-400 text-xs">—</span>}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 max-w-[260px]">
                  {s.opponent_name && <div className="font-medium text-gray-900 dark:text-gray-100">vs. {s.opponent_name}</div>}
                  {s.notes && <div className="line-clamp-2">{s.notes}</div>}
                  {!s.opponent_name && !s.notes && <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-2 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onEdit(s)}
                      title="Sửa"
                      className="text-xs px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(s)}
                      disabled={deletingId === s.id}
                      title="Xóa"
                      className="text-xs px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 font-semibold"
                    >
                      {deletingId === s.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ message, onClear }: { message: string; onClear: (() => void) | null }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-12 text-center">
      <div className="text-5xl mb-2">🥊</div>
      <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">{message}</p>
      {onClear && (
        <button onClick={onClear} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
          Bỏ tất cả bộ lọc
        </button>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Yêu cầu ≥ 3 buổi để gà xuất hiện trong bảng xếp hạng
      </p>
    </div>
  )
}

function scoreBadgeClass(score: number | null): string {
  if (score == null) return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
  if (score >= 8.5) return 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300'
  if (score >= 7) return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
  if (score >= 5) return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
  return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
}

function Kpi({
  label,
  value,
  sub,
  tint,
  icon,
}: {
  label: string
  value: string
  sub?: string
  tint: 'blue' | 'emerald' | 'amber' | 'purple'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-fuchsia-600',
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-14 h-14 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-4 translate-x-4`} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">{label}</div>
          <div className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{sub}</div>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

/* === Edit session modal === */
function EditSessionModal({
  session,
  onClose,
  onDone,
}: {
  session: Session
  onClose: () => void
  onDone: () => void
}) {
  const [form, setForm] = useState({
    session_date: session.session_date,
    duration_minutes: session.duration_minutes ?? 0,
    score_strength: session.score_strength ?? 0,
    score_appearance: session.score_appearance ?? 0,
    score_aggression: session.score_aggression ?? 0,
    result: (session.result ?? '') as '' | 'thang' | 'thua' | 'hoa',
    opponent_name: session.opponent_name ?? '',
    notes: session.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    const res = await fetch(`/api/training-sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_date: form.session_date,
        duration_minutes: form.duration_minutes || null,
        score_strength: form.score_strength,
        score_appearance: form.score_appearance,
        score_aggression: form.score_aggression,
        result: form.result || null,
        opponent_name: form.opponent_name || null,
        notes: form.notes || null,
      }),
    })
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      setErr(typeof j.error === 'string' ? j.error : 'Lỗi cập nhật')
      setLoading(false)
      return
    }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="p-4 md:p-5 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            🥊 Sửa buổi vần — {session.chickens?.name ?? session.chickens?.chicken_code ?? ''}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Ngày vần
              <input
                type="date"
                value={form.session_date}
                onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Thời lượng (phút)
              <input
                type="number"
                min={0}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm tabular-nums"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              💪 Thể lực (0-10)
              <input
                type="number" min={0} max={10} step={0.5}
                value={form.score_strength}
                onChange={(e) => setForm({ ...form, score_strength: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm tabular-nums"
              />
            </label>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              🦚 Vóc dáng (0-10)
              <input
                type="number" min={0} max={10} step={0.5}
                value={form.score_appearance}
                onChange={(e) => setForm({ ...form, score_appearance: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm tabular-nums"
              />
            </label>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              🔥 Hung hăng (0-10)
              <input
                type="number" min={0} max={10} step={0.5}
                value={form.score_aggression}
                onChange={(e) => setForm({ ...form, score_aggression: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm tabular-nums"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Kết quả
              <select
                value={form.result}
                onChange={(e) => setForm({ ...form, result: e.target.value as typeof form.result })}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Không ghi —</option>
                <option value="thang">🥇 Thắng</option>
                <option value="thua">❌ Thua</option>
                <option value="hoa">🤝 Hoà</option>
              </select>
            </label>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Đối thủ
              <input
                type="text"
                value={form.opponent_name}
                onChange={(e) => setForm({ ...form, opponent_name: e.target.value })}
                placeholder="Tên gà đối thủ"
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">
            Ghi chú
            <textarea
              value={form.notes}
              rows={2}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          {err && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg px-3 py-2 text-sm">
              ✗ {err}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-4 py-2 text-sm"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-5 py-2 text-sm font-semibold shadow hover:shadow-lg disabled:opacity-50 transition"
            >
              {loading ? '⏳ Đang lưu…' : '💾 Cập nhật'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
