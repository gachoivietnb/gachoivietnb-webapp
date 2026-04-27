import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { COMBAT_TIER_META, RESULT_META, RULES_META, type ChickenCombatTier } from '@/lib/thi-dau/types'

/**
 * Public achievement display — KHÔNG hiển thị prize_money / betting_amount
 * theo yêu cầu của user.
 */
export async function ChickenAchievementPublic({ chickenId }: { chickenId: string }) {
  const supabase = await createClient()

  const [statsRes, matchesRes] = await Promise.all([
    supabase.from('chicken_combat_stats').select('*').eq('chicken_id', chickenId).single(),
    supabase
      .from('matches')
      .select('id, match_code, match_date, opponent_name, opponent_breed, opponent_origin, result, result_round, rounds_actual, total_duration_minutes, rules, video_url, photo_urls, public_notes, is_pinned, tournament:tournaments(id, name, type)')
      .eq('chicken_id', chickenId)
      .eq('is_public', true)
      .order('match_date', { ascending: false })
      .limit(20),
  ])

  type Stats = {
    combat_tier: ChickenCombatTier
    total_matches: number
    wins: number
    losses: number
    draws: number
    stars: number
    win_rate_pct: number | null
    current_win_streak: number
  }
  const stats = (statsRes.data as Stats | null) || ({} as Stats)
  const matches = (matchesRes.data ?? []) as Array<{
    id: string
    match_code: string | null
    match_date: string
    opponent_name: string
    opponent_breed: string | null
    opponent_origin: string | null
    result: string | null
    result_round: number | null
    rounds_actual: number
    total_duration_minutes: number | null
    rules: 'don' | 'cua'
    video_url: string | null
    photo_urls: string[]
    public_notes: string | null
    is_pinned: boolean
    tournament: { id: string; name: string; type: string } | { id: string; name: string; type: string }[] | null
  }>

  if (!stats.total_matches) return null

  const tier = stats.combat_tier
  const tierMeta = COMBAT_TIER_META[tier]
  const stars = stats.stars || 0
  const onFire = (stats.current_win_streak || 0) >= 3

  // Top 3 best wins (pinned first, then most recent)
  const topWins = [...matches]
    .filter((m) => m.result === 'thang' || m.result === 'be_tran_doi')
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      return b.match_date.localeCompare(a.match_date)
    })
    .slice(0, 3)

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100 dark:from-yellow-950/40 dark:via-amber-950/40 dark:to-orange-950/40 border-2 border-amber-300 dark:border-amber-800 shadow-xl">
      {/* Decorative glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-yellow-300/30 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-orange-300/30 blur-3xl" />

      <div className="relative p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-black uppercase tracking-widest rounded-full px-4 py-1.5 mb-3 shadow-md">
            🏆 Thành Tích Thi Đấu
          </div>
          <div className={`inline-block bg-gradient-to-r ${tierMeta.gradient} text-white rounded-2xl px-6 py-3 shadow-lg`}>
            <div className="text-4xl md:text-5xl font-black mb-1">{tierMeta.emoji}</div>
            <div className="text-lg md:text-xl font-extrabold">{tierMeta.label.toUpperCase()}</div>
            <div className="text-xs opacity-90 mt-1">{tierMeta.desc}</div>
          </div>

          {/* Stars */}
          <div className="mt-4 flex justify-center items-center gap-1 flex-wrap">
            {Array.from({ length: Math.min(stars, 12) }, (_, i) => (
              <span key={i} className="text-3xl md:text-4xl drop-shadow-md">⭐</span>
            ))}
            {stars > 12 && <span className="text-2xl font-black text-amber-700 ml-2">+{stars - 12}</span>}
          </div>
          <div className="text-sm text-amber-900 dark:text-amber-300 font-bold mt-1">
            {stars} sao chiến thắng
          </div>

          {onFire && (
            <div className="inline-block mt-3 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white text-xs font-black px-4 py-1 rounded-full shadow-md animate-pulse">
              🔥 ON FIRE · {stats.current_win_streak} TRẬN LIÊN TIẾP
            </div>
          )}
        </div>

        {/* W/L/D summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatBig emoji="✅" label="THẮNG" value={stats.wins} tone="from-emerald-500 to-teal-600" />
          <StatBig emoji="❌" label="THUA" value={stats.losses} tone="from-red-500 to-rose-600" />
          <StatBig emoji="📊" label="TỶ LỆ" value={`${stats.win_rate_pct?.toFixed(0) ?? '0'}%`} tone="from-amber-500 to-orange-600" />
        </div>

        {/* Top wins highlight */}
        {topWins.length > 0 && (
          <div className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-2xl p-4 mb-4">
            <h3 className="font-black text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-1.5">
              🏆 Top {topWins.length} chiến công nổi bật
            </h3>
            <ul className="space-y-2">
              {topWins.map((m) => {
                const tour = Array.isArray(m.tournament) ? m.tournament[0] : m.tournament
                const resultMeta = m.result ? RESULT_META[m.result as keyof typeof RESULT_META] : null
                return (
                  <li key={m.id} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 dark:text-gray-100">
                        {resultMeta?.label === 'THẮNG' ? '✅ Thắng' : '🏃 Đối bỏ'} vs <span className="text-amber-700 dark:text-amber-300">{m.opponent_name}</span>
                        {tour && <span className="text-xs text-gray-500 font-normal"> — {tour.name}</span>}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        📅 {m.match_date.split('-').reverse().join('/')}
                        {m.opponent_origin && ` · 📍 ${m.opponent_origin}`}
                        {m.result_round && ` · KT hồ ${m.result_round}`}
                        {m.total_duration_minutes && ` · ${m.total_duration_minutes}p`}
                        {m.video_url && ' · 🎬 có video'}
                      </div>
                      {m.public_notes && (
                        <div className="text-xs italic text-gray-700 dark:text-gray-300 mt-1">
                          &ldquo;{m.public_notes}&rdquo;
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* All matches list */}
        <details className="bg-white/70 dark:bg-gray-900/40 backdrop-blur-sm rounded-2xl p-4 group">
          <summary className="cursor-pointer text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:rotate-90 transition-transform">▶</span>
            ⚔️ Lịch sử thi đấu đầy đủ ({matches.length} trận)
          </summary>
          <ul className="mt-3 space-y-1.5">
            {matches.map((m) => {
              const tour = Array.isArray(m.tournament) ? m.tournament[0] : m.tournament
              const resultMeta = m.result ? RESULT_META[m.result as keyof typeof RESULT_META] : null
              return (
                <li key={m.id} className="flex items-center gap-2 text-xs border-b border-amber-200/50 dark:border-amber-900/50 pb-1.5">
                  <span className="text-gray-500 w-20 shrink-0">{m.match_date.split('-').reverse().join('/')}</span>
                  <span className="flex-1 truncate">
                    vs <b>{m.opponent_name}</b>
                    {tour && <span className="text-gray-500"> · {tour.name}</span>}
                    <span className="text-gray-500"> · {RULES_META[m.rules].label}</span>
                  </span>
                  {resultMeta && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${resultMeta.cls}`}>
                      {resultMeta.emoji} {resultMeta.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </details>

        {/* CTA */}
        <div className="mt-6 text-center">
          <Link
            href="/lien-he"
            className="inline-block bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl px-6 py-3 text-sm font-black shadow-lg hover:scale-105 transition-transform"
          >
            🛒 Liên hệ mua gà chiến này
          </Link>
        </div>
      </div>
    </section>
  )
}

function StatBig({ emoji, label, value, tone }: { emoji: string; label: string; value: string | number; tone: string }) {
  return (
    <div className={`bg-gradient-to-br ${tone} text-white rounded-xl p-3 text-center shadow-md`}>
      <div className="text-2xl">{emoji}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-90 font-semibold">{label}</div>
      <div className="text-xl md:text-2xl font-black mt-0.5">{value}</div>
    </div>
  )
}
