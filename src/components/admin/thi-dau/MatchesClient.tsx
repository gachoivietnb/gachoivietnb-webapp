'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThiDauTabs } from './ThiDauTabs'
import { ResultBadge, OnFireBadge } from './CombatBadges'
import { TOURNAMENT_TYPE_META, RULES_META } from '@/lib/thi-dau/types'
import type { MatchResult } from '@/lib/thi-dau/types'

type Match = {
  id: string
  match_code: string | null
  match_date: string
  match_time: string | null
  chicken_id: string
  opponent_name: string
  opponent_breed: string | null
  opponent_owner: string | null
  opponent_origin: string | null
  opponent_weight_kg: number | null
  opponent_photo_url: string | null
  self_weight_kg: number | null
  rules: 'don' | 'cua'
  rounds_actual: number
  total_duration_minutes: number | null
  result: MatchResult | null
  result_round: number | null
  prize_money: number
  photo_urls: string[]
  video_url: string | null
  match_quality: number | null
  is_pinned: boolean
  is_public: boolean
  chicken: {
    id: string
    chicken_code: string
    name: string | null
    image_url: string | null
    breeds: { name_vi: string }[] | { name_vi: string } | null
  } | { chicken_code: string }[] | null
  tournament: { id: string; name: string; type: string } | { id: string; name: string; type: string }[] | null
}

type OnFire = { chicken_id: string; name: string | null; chicken_code: string; streak: number; stars: number }

const fmtVnd = (n: number) => Number(n || 0).toLocaleString('vi-VN')

export function MatchesClient({
  matches,
  kpis,
  tournaments,
  canWrite,
}: {
  matches: Match[]
  kpis: {
    matches_total?: number
    wins?: number
    losses?: number
    draws?: number
    prize_ytd?: number
    on_fire_chickens?: OnFire[]
  }
  tournaments: Array<{ id: string; name: string; type: string }>
  canWrite: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState<'all' | MatchResult>('all')
  const [tournamentFilter, setTournamentFilter] = useState<string>('all')
  const [rulesFilter, setRulesFilter] = useState<'all' | 'don' | 'cua'>('all')

  const total = Number(kpis.matches_total ?? 0)
  const wins = Number(kpis.wins ?? 0)
  const losses = Number(kpis.losses ?? 0)
  const draws = Number(kpis.draws ?? 0)
  const winRate = total > 0 ? (wins / total) * 100 : 0
  const onFire = (kpis.on_fire_chickens ?? []) as OnFire[]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return matches.filter((m) => {
      if (resultFilter !== 'all' && m.result !== resultFilter) return false
      if (rulesFilter !== 'all' && m.rules !== rulesFilter) return false
      const tour = Array.isArray(m.tournament) ? m.tournament[0] : m.tournament
      if (tournamentFilter !== 'all') {
        if (tournamentFilter === 'none' && tour) return false
        if (tournamentFilter !== 'none' && tour?.id !== tournamentFilter) return false
      }
      if (q) {
        const chick = Array.isArray(m.chicken) ? m.chicken[0] : m.chicken
        const haystack = `${m.match_code ?? ''} ${m.opponent_name} ${m.opponent_owner ?? ''} ${m.opponent_origin ?? ''} ${chick?.chicken_code ?? ''} ${('name' in (chick ?? {}) ? (chick as { name?: string }).name ?? '' : '')}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [matches, search, resultFilter, rulesFilter, tournamentFilter])

  return (
    <div>
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          ⚔️ Thi đấu & Thành tích
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Quản lý trận đấu, giải đấu và thành tích của từng con gà — đồng bộ với hồ sơ gà & gia phả công khai.
        </p>
      </div>

      <ThiDauTabs />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <KpiBig emoji="⚔️" label="Tổng trận" value={total.toString()} tone="from-blue-500 to-indigo-600" />
        <KpiBig emoji="✅" label="Thắng" value={`${wins} (${winRate.toFixed(0)}%)`} tone="from-emerald-500 to-teal-600" />
        <KpiBig emoji="❌" label="Thua" value={losses.toString()} tone="from-red-500 to-rose-600" />
        <KpiBig emoji="🤝" label="Hòa" value={draws.toString()} tone="from-amber-500 to-orange-500" />
        <KpiBig emoji="💰" label="Giải tiền YTD" value={`${fmtVnd(Number(kpis.prize_ytd ?? 0))}`} tone="from-yellow-500 to-amber-600" />
      </div>

      {/* On Fire banner */}
      {onFire.length > 0 && (
        <div className="bg-gradient-to-r from-orange-100 via-red-100 to-pink-100 dark:from-orange-950/40 dark:via-red-950/40 dark:to-pink-950/40 border border-orange-300 dark:border-orange-900 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔥</span>
            <span className="font-bold text-orange-900 dark:text-orange-200">ON FIRE</span>
            <span className="text-xs text-orange-700 dark:text-orange-300">— Đang win-streak ≥ 3 trận:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {onFire.map((c) => (
              <Link
                key={c.chicken_id}
                href={`/admin/ho-so-ga/${c.chicken_id}`}
                className="bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-xs font-semibold border border-orange-200 dark:border-orange-800 hover:border-orange-400 transition shadow-sm"
              >
                <span className="text-orange-600">🔥</span>{' '}
                <span className="font-mono text-amber-700">{c.chicken_code}</span>
                {c.name && <span className="text-gray-700 dark:text-gray-300"> · {c.name}</span>}
                <span className="ml-1.5 text-orange-600 font-bold">{c.streak} liên tiếp</span>
                <span className="ml-1.5">⭐ {c.stars}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-4 space-y-2">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã trận / gà / đối thủ..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg"
            />
          </div>
          {canWrite && (
            <Link
              href="/admin/thi-dau/them-tran"
              className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg px-4 py-2 text-sm font-bold shadow whitespace-nowrap"
            >
              + Ghi nhận trận mới
            </Link>
          )}
        </div>

        <div className="flex gap-1 flex-wrap text-xs">
          <Pill active={resultFilter === 'all'} onClick={() => setResultFilter('all')}>Tất cả</Pill>
          <Pill active={resultFilter === 'thang'} onClick={() => setResultFilter('thang')} color="emerald">✅ Thắng</Pill>
          <Pill active={resultFilter === 'thua'} onClick={() => setResultFilter('thua')} color="red">❌ Thua</Pill>
          <Pill active={resultFilter === 'hoa'} onClick={() => setResultFilter('hoa')} color="amber">🤝 Hòa</Pill>
          <Pill active={resultFilter === 'chet'} onClick={() => setResultFilter('chet')} color="gray">💀 Chết</Pill>
          <span className="text-gray-300 mx-1">|</span>
          <Pill active={rulesFilter === 'all'} onClick={() => setRulesFilter('all')}>Mọi luật</Pill>
          <Pill active={rulesFilter === 'don'} onClick={() => setRulesFilter('don')}>⚔️ Đòn</Pill>
          <Pill active={rulesFilter === 'cua'} onClick={() => setRulesFilter('cua')}>🗡 Cựa</Pill>
          <span className="text-gray-300 mx-1">|</span>
          <select
            value={tournamentFilter}
            onChange={(e) => setTournamentFilter(e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-full px-3 py-1"
          >
            <option value="all">Tất cả giải</option>
            <option value="none">Trận tự do (không giải)</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <div className="text-6xl mb-2 opacity-50">⚔️</div>
          <p className="text-sm text-gray-500 mb-3">
            {matches.length === 0 ? 'Chưa ghi nhận trận đấu nào' : 'Không khớp filter'}
          </p>
          {canWrite && matches.length === 0 && (
            <Link
              href="/admin/thi-dau/them-tran"
              className="inline-block bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg px-5 py-2 text-sm font-bold shadow"
            >
              + Ghi nhận trận đầu tiên
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  )
}

function MatchCard({ match: m }: { match: Match }) {
  const chick = Array.isArray(m.chicken) ? m.chicken[0] : m.chicken
  const tour = Array.isArray(m.tournament) ? m.tournament[0] : m.tournament
  const breed = chick && 'breeds' in chick
    ? Array.isArray(chick.breeds) ? chick.breeds[0]?.name_vi : (chick.breeds as { name_vi?: string } | null)?.name_vi
    : null
  const tourMeta = tour ? TOURNAMENT_TYPE_META[tour.type as keyof typeof TOURNAMENT_TYPE_META] : null
  const rulesMeta = RULES_META[m.rules]
  const chickName: string | null = chick && 'name' in chick ? (chick.name as string | null) : null
  const chickCode: string = chick && 'chicken_code' in chick ? (chick.chicken_code as string) : ''
  const chickImage: string | null = chick && 'image_url' in chick ? (chick.image_url as string | null) : null

  return (
    <Link
      href={`/admin/thi-dau/${m.id}`}
      className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-amber-300 transition-all"
    >
      {/* Header với date + tournament */}
      <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{m.match_code}</span>
          <span className="text-gray-500">📅 {m.match_date.split('-').reverse().join('/')}</span>
          {m.match_time && <span className="text-gray-500">🕐 {m.match_time.slice(0, 5)}</span>}
        </div>
        <div className="flex items-center gap-1">
          {m.is_pinned && <span title="Đã ghim">📌</span>}
          {!m.is_public && <span title="Riêng tư">🔒</span>}
          {tourMeta && (
            <span className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-1.5 py-0.5 font-semibold text-gray-700 dark:text-gray-300">
              {tourMeta.emoji} {tour?.name}
            </span>
          )}
        </div>
      </div>

      <div className="p-3">
        {/* Fight card mini */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          {/* Self chicken */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
              {chickImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={chickImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🐓</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                {chickName || chickCode}
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {chickCode}{breed ? ` · ${breed}` : ''}
                {m.self_weight_kg ? ` · ${m.self_weight_kg}kg` : ''}
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="text-center px-1">
            <div className="text-[10px] text-gray-400 font-bold">VS</div>
            {m.result && <ResultBadge result={m.result} />}
          </div>

          {/* Opponent */}
          <div className="flex items-center gap-2 flex-row-reverse min-w-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-red-300 bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
              {m.opponent_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.opponent_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🐔</span>
              )}
            </div>
            <div className="min-w-0 text-right">
              <div className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                {m.opponent_name}
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {m.opponent_owner || '—'}
                {m.opponent_weight_kg ? ` · ${m.opponent_weight_kg}kg` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <span title="Luật">{rulesMeta.emoji} {rulesMeta.label}</span>
          {m.rounds_actual > 0 && <span>🔄 {m.rounds_actual} hồ</span>}
          {m.total_duration_minutes && <span>⏱ {m.total_duration_minutes}p</span>}
          {m.result_round && <span>Hồ {m.result_round}</span>}
          {m.match_quality && <span>{'★'.repeat(m.match_quality)}</span>}
          {m.video_url && <span title="Có video">🎬</span>}
          {m.photo_urls && m.photo_urls.length > 0 && <span title={`${m.photo_urls.length} ảnh`}>📷 {m.photo_urls.length}</span>}
          {m.prize_money > 0 && (
            <span className="ml-auto text-amber-700 font-semibold">💰 +{fmtVnd(m.prize_money)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function KpiBig({ emoji, label, value, tone }: { emoji: string; label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-xl p-3 bg-gradient-to-br ${tone} text-white shadow-sm`}>
      <div className="text-2xl mb-0.5">{emoji}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="font-bold text-lg leading-tight truncate">{value}</div>
    </div>
  )
}

function Pill({
  active,
  onClick,
  color = 'amber',
  children,
}: {
  active: boolean
  onClick: () => void
  color?: 'amber' | 'emerald' | 'red' | 'gray'
  children: React.ReactNode
}) {
  const colorMap = {
    amber: 'bg-amber-500 text-white border-amber-500',
    emerald: 'bg-emerald-500 text-white border-emerald-500',
    red: 'bg-red-500 text-white border-red-500',
    gray: 'bg-gray-500 text-white border-gray-500',
  }
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border transition-all ${
        active
          ? colorMap[color] + ' font-semibold shadow-sm'
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-amber-300'
      }`}
    >
      {children}
    </button>
  )
}
