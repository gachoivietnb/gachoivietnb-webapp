import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CombatTierBadge, StarRating, OnFireBadge, ResultBadge } from './CombatBadges'
import { COMBAT_TIER_META, RULES_META, type ChickenCombatTier } from '@/lib/thi-dau/types'

const fmtVnd = (n: number) => Number(n || 0).toLocaleString('vi-VN')

export async function ChickenAchievementSection({ chickenId }: { chickenId: string }) {
  const supabase = await createClient()
  const [statsRes, matchesRes] = await Promise.all([
    supabase.from('chicken_combat_stats').select('*').eq('chicken_id', chickenId).single(),
    supabase
      .from('matches')
      .select('id, match_code, match_date, opponent_name, opponent_breed, result, result_round, rounds_actual, total_duration_minutes, rules, prize_money, video_url, photo_urls, is_pinned, tournament:tournaments(id, name, type)')
      .eq('chicken_id', chickenId)
      .order('match_date', { ascending: false })
      .limit(50),
  ])

  type Stats = {
    chicken_id: string
    combat_tier: ChickenCombatTier
    combat_tier_manual: ChickenCombatTier | null
    total_matches: number
    wins: number
    losses: number
    draws: number
    forfeits: number
    deaths: number
    stars: number
    win_rate_pct: number | null
    last_match_date: string | null
    prize_total: number
    avg_rounds: number | null
    avg_duration: number | null
    current_win_streak: number
  }
  const stats = (statsRes.data as Stats | null) || ({} as Stats)
  const matches = (matchesRes.data ?? []) as Array<{
    id: string
    match_code: string | null
    match_date: string
    opponent_name: string
    opponent_breed: string | null
    result: string | null
    result_round: number | null
    rounds_actual: number
    total_duration_minutes: number | null
    rules: 'don' | 'cua'
    prize_money: number
    video_url: string | null
    photo_urls: string[]
    is_pinned: boolean
    tournament: { id: string; name: string; type: string } | { id: string; name: string; type: string }[] | null
  }>

  const tier = stats.combat_tier || 'ga_to'
  const tierMeta = COMBAT_TIER_META[tier]
  const stars = stats.stars || 0
  const noMatches = !stats.total_matches

  if (noMatches) {
    return (
      <div className="text-center py-6">
        <CombatTierBadge tier={tier} size="lg" />
        <p className="text-sm text-gray-500 mt-2">{tierMeta.desc}</p>
        <Link
          href={`/admin/thi-dau/them-tran?chicken=${chickenId}`}
          className="mt-3 inline-block bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg px-4 py-2 text-sm font-bold shadow"
        >
          + Ghi nhận trận đầu tiên
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className={`bg-gradient-to-br ${tierMeta.gradient} rounded-2xl p-5 text-white shadow-lg`}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-90">CẤP ĐỘ HIỆN TẠI</div>
            <div className="text-3xl font-black mt-1">{tierMeta.emoji} {tierMeta.label}</div>
            <div className="text-xs opacity-80 mt-1">{tierMeta.desc}</div>
          </div>
          <div className="text-right">
            <StarRating stars={stars} max={10} size="xl" animated />
            <div className="text-xs opacity-90 mt-1">{stars} sao chiến thắng</div>
          </div>
        </div>

        <OnFireBadge streak={stats.current_win_streak || 0} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/20">
          <Stat label="Tổng trận" value={stats.total_matches.toString()} />
          <Stat label="Thắng / Thua" value={`${stats.wins} / ${stats.losses}`} />
          <Stat label="Tỷ lệ thắng" value={`${stats.win_rate_pct?.toFixed(0) ?? '—'}%`} />
          <Stat label="Giải tiền" value={`${fmtVnd(stats.prize_total)}đ`} />
        </div>
      </div>

      {/* Win/Loss/Draw donut + extras */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Donut wins={stats.wins} losses={stats.losses} draws={stats.draws} />
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 col-span-1 md:col-span-2 space-y-1.5 text-sm">
          <Row label="Trận đấu gần nhất" value={stats.last_match_date?.split('-').reverse().join('/') ?? '—'} />
          <Row label="Số hồ trung bình" value={stats.avg_rounds ? Number(stats.avg_rounds).toFixed(1) : '—'} />
          <Row label="Thời gian TB / trận" value={stats.avg_duration ? `${Number(stats.avg_duration).toFixed(0)} phút` : '—'} />
          <Row label="Thua liên tục cao nhất" value={(stats.forfeits + stats.losses).toString()} />
          <Row label="Win streak hiện tại" value={`${stats.current_win_streak} liên tiếp`} highlight={stats.current_win_streak >= 3} />
        </div>
      </div>

      {/* Match timeline */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b bg-gray-50 dark:bg-gray-900/40 flex items-center justify-between">
          <h4 className="font-semibold text-sm">⚔️ Lịch sử thi đấu ({matches.length})</h4>
          <Link
            href={`/admin/thi-dau?chicken=${chickenId}`}
            className="text-xs text-blue-600 hover:underline"
          >
            Xem tất cả →
          </Link>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {matches.slice(0, 10).map((m) => {
            const tour = Array.isArray(m.tournament) ? m.tournament[0] : m.tournament
            return (
              <li key={m.id}>
                <Link href={`/admin/thi-dau/${m.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <div className="text-xs text-gray-500 w-20 shrink-0">
                    {m.match_date.split('-').reverse().join('/')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">vs {m.opponent_name}</span>
                      {m.is_pinned && <span title="Ghim">📌</span>}
                      {m.video_url && <span title="Có video">🎬</span>}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {tour ? `${tour.name} · ` : ''}{RULES_META[m.rules].label}
                      {m.rounds_actual ? ` · ${m.rounds_actual} hồ` : ''}
                      {m.total_duration_minutes ? ` · ${m.total_duration_minutes}p` : ''}
                      {m.result_round ? ` · KT hồ ${m.result_round}` : ''}
                    </div>
                  </div>
                  {m.result && <ResultBadge result={m.result} />}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 rounded-lg p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-orange-600' : 'text-gray-900 dark:text-gray-100'}`}>{value}</span>
    </div>
  )
}

function Donut({ wins, losses, draws }: { wins: number; losses: number; draws: number }) {
  const total = wins + losses + draws
  if (total === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-center">
        <span className="text-xs text-gray-400">Chưa có dữ liệu</span>
      </div>
    )
  }
  const winPct = (wins / total) * 100
  const lossPct = (losses / total) * 100
  const drawPct = (draws / total) * 100

  // SVG donut
  const r = 35
  const c = 2 * Math.PI * r
  const winArc = (winPct / 100) * c
  const lossArc = (lossPct / 100) * c
  const drawArc = (drawPct / 100) * c

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
      <h4 className="text-xs font-semibold mb-2">📊 Phân bổ kết quả</h4>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="14" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#10b981" strokeWidth="14"
            strokeDasharray={`${winArc} ${c}`} />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#ef4444" strokeWidth="14"
            strokeDasharray={`${lossArc} ${c}`} strokeDashoffset={-winArc} />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f59e0b" strokeWidth="14"
            strokeDasharray={`${drawArc} ${c}`} strokeDashoffset={-(winArc + lossArc)} />
        </svg>
        <div className="text-xs space-y-1 flex-1">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> Thắng: <b>{wins}</b> ({winPct.toFixed(0)}%)</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-red-500 rounded-full" /> Thua: <b>{losses}</b> ({lossPct.toFixed(0)}%)</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-amber-500 rounded-full" /> Hòa: <b>{draws}</b> ({drawPct.toFixed(0)}%)</div>
        </div>
      </div>
    </div>
  )
}
