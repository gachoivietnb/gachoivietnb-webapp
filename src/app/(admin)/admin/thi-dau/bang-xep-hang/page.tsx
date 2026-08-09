import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { ThiDauTabs } from '@/components/admin/thi-dau/ThiDauTabs'
import { CombatTierBadge, StarRating, OnFireBadge } from '@/components/admin/thi-dau/CombatBadges'
import type { ChickenCombatTier } from '@/lib/thi-dau/types'

export const revalidate = 0

export default async function BangXepHangPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('bxh_thi_dau', 'read')) {
    return <div className="text-sm text-gray-500">Không có quyền.</div>
  }

  const supabase = await createClient()
  const { data: rankData } = await supabase
    .from('farm_top_chickens')
    .select('*')
    .order('rank_overall')
    .limit(100)

  // Fetch images separately (view không có FK constraint)
  type RankRow = { chicken_id: string; [key: string]: unknown }
  const rankRows = (rankData ?? []) as unknown as RankRow[]
  const ids = rankRows.map((r) => r.chicken_id).filter(Boolean)
  const { data: imgData } = ids.length > 0
    ? await supabase.from('chickens').select('id, image_url').in('id', ids)
    : { data: [] }
  const imgMap = new Map<string, string | null>(
    ((imgData ?? []) as Array<{ id: string; image_url: string | null }>).map((i) => [i.id, i.image_url])
  )
  const data = rankRows.map((r) => ({ ...r, chicken: { image_url: imgMap.get(r.chicken_id) ?? null } }))

  type Row = {
    chicken_id: string
    chicken_code: string
    name: string | null
    combat_tier: ChickenCombatTier
    total_matches: number
    wins: number
    losses: number
    draws: number
    stars: number
    win_rate_pct: number | null
    last_match_date: string | null
    prize_total: number
    current_win_streak: number
    rank_overall: number
    chicken: { image_url: string | null } | { image_url: string | null }[] | null
  }
  const rows = (data ?? []) as unknown as Row[]
  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">🥇 Bảng xếp hạng gà của trại</h1>
      <p className="text-sm text-gray-500 mb-2">Xếp theo số sao chiến thắng → tỷ lệ thắng. Chỉ gà đã có ít nhất 1 trận.</p>
      <ThiDauTabs />

      {top3.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-12 text-center">
          <div className="text-6xl mb-2 opacity-50">🥇</div>
          <p className="text-sm text-gray-500">Chưa có gà nào được xếp hạng — cần ghi nhận ít nhất 1 trận.</p>
        </div>
      ) : (
        <>
          {/* Podium top 3 */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 items-end">
            {[2, 1, 3].map((rank) => {
              const r = top3[rank - 1]
              if (!r) return <div key={rank} />
              const heightCls = rank === 1 ? 'h-72 md:h-80' : rank === 2 ? 'h-56 md:h-64' : 'h-48 md:h-56'
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
              const tone = rank === 1 ? 'from-yellow-400 to-amber-500' : rank === 2 ? 'from-gray-300 to-gray-500' : 'from-orange-400 to-orange-600'
              const img = Array.isArray(r.chicken) ? r.chicken[0]?.image_url : r.chicken?.image_url
              return (
                <Link
                  key={r.chicken_id}
                  href={`/admin/ho-so-ga/${r.chicken_id}`}
                  className={`block bg-gradient-to-br ${tone} text-white rounded-2xl p-3 md:p-4 ${heightCls} flex flex-col items-center justify-end text-center shadow-xl hover:scale-105 transition-transform`}
                >
                  <div className="text-3xl md:text-5xl mb-1">{medal}</div>
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mb-2 bg-white/20">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl md:text-5xl">🐓</div>
                    )}
                  </div>
                  <div className="font-bold text-sm md:text-base truncate w-full">{r.name || r.chicken_code}</div>
                  <div className="text-[10px] md:text-xs opacity-80">{r.chicken_code}</div>
                  <div className="mt-1 md:mt-2 text-base md:text-lg font-black">⭐ {r.stars}</div>
                  <div className="text-[10px] md:text-xs">
                    {r.wins}/{r.total_matches} trận · {r.win_rate_pct?.toFixed(0)}%
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Full table */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="text-left p-2 w-12">#</th>
                  <th className="text-left p-2">Gà</th>
                  <th className="text-left p-2">Cấp độ</th>
                  <th className="text-center p-2">Sao</th>
                  <th className="text-center p-2">Thắng/Tổng</th>
                  <th className="text-center p-2">Tỷ lệ</th>
                  <th className="text-center p-2">Streak</th>
                  <th className="text-right p-2 hidden md:table-cell">Giải tiền</th>
                  <th className="text-left p-2 hidden md:table-cell">Trận gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((r) => {
                  const img = Array.isArray(r.chicken) ? r.chicken[0]?.image_url : r.chicken?.image_url
                  return (
                    <tr
                      key={r.chicken_id}
                      className="border-t border-gray-100 dark:border-gray-700 hover:bg-amber-50/30 dark:hover:bg-amber-950/10"
                    >
                      <td className="p-2 text-center font-bold text-gray-500">{r.rank_overall}</td>
                      <td className="p-2">
                        <Link href={`/admin/ho-so-ga/${r.chicken_id}`} className="flex items-center gap-2 hover:underline">
                          <div className="w-9 h-9 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-base">🐓</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate text-sm">{r.name || r.chicken_code}</div>
                            <div className="text-[10px] text-gray-500">{r.chicken_code}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="p-2"><CombatTierBadge tier={r.combat_tier} size="sm" /></td>
                      <td className="p-2 text-center"><StarRating stars={r.stars} max={5} size="sm" /></td>
                      <td className="p-2 text-center font-mono">
                        <span className="text-emerald-700 font-bold">{r.wins}</span>/<span className="text-gray-500">{r.total_matches}</span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`font-bold ${(r.win_rate_pct ?? 0) >= 70 ? 'text-emerald-600' : (r.win_rate_pct ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {r.win_rate_pct?.toFixed(0) ?? '—'}%
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <OnFireBadge streak={r.current_win_streak} />
                        {r.current_win_streak > 0 && r.current_win_streak < 3 && (
                          <span className="text-xs">+{r.current_win_streak}</span>
                        )}
                      </td>
                      <td className="p-2 text-right hidden md:table-cell font-mono text-amber-700">
                        {r.prize_total > 0 ? `${Number(r.prize_total).toLocaleString('vi-VN')}đ` : '—'}
                      </td>
                      <td className="p-2 hidden md:table-cell text-xs text-gray-500">
                        {r.last_match_date?.split('-').reverse().join('/') ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
