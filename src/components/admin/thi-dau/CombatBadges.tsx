'use client'

import { COMBAT_TIER_META, type ChickenCombatTier } from '@/lib/thi-dau/types'

export function CombatTierBadge({
  tier,
  size = 'md',
  showLabel = true,
}: {
  tier: ChickenCombatTier
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}) {
  const m = COMBAT_TIER_META[tier]
  const padCls = size === 'lg' ? 'px-3 py-1.5 text-sm' : size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold text-white bg-gradient-to-r ${m.gradient} shadow-sm ${padCls}`}
      title={m.desc}
    >
      <span>{m.emoji}</span>
      {showLabel && <span>{m.label}</span>}
    </span>
  )
}

export function StarRating({
  stars,
  max = 10,
  size = 'md',
  animated = false,
}: {
  stars: number
  max?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
}) {
  const sz = { sm: 'text-xs', md: 'text-base', lg: 'text-2xl', xl: 'text-4xl' }[size]
  const cap = Math.min(stars, max)
  return (
    <div className={`inline-flex items-center gap-0.5 ${sz}`}>
      {Array.from({ length: cap }, (_, i) => (
        <span
          key={i}
          className={animated ? 'animate-bounce' : ''}
          style={animated ? { animationDelay: `${i * 80}ms`, animationDuration: '600ms', animationIterationCount: '1' } : undefined}
        >
          ⭐
        </span>
      ))}
      {stars > max && <span className="ml-1 text-amber-600 font-bold">+{stars - max}</span>}
      {stars === 0 && <span className="text-gray-300">—</span>}
    </div>
  )
}

export function OnFireBadge({ streak }: { streak: number }) {
  if (streak < 3) return null
  return (
    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
      🔥 ON FIRE · {streak} liên tiếp
    </span>
  )
}

export function ResultBadge({ result, large = false }: { result: string; large?: boolean }) {
  const map: Record<string, { label: string; emoji: string; cls: string }> = {
    thang:        { label: 'THẮNG',    emoji: '✅', cls: 'bg-emerald-500 text-white' },
    thua:         { label: 'THUA',     emoji: '❌', cls: 'bg-red-500 text-white' },
    hoa:          { label: 'HÒA',      emoji: '🤝', cls: 'bg-amber-500 text-white' },
    be_tran_minh: { label: 'BỂ TRẬN',  emoji: '🚪', cls: 'bg-rose-500 text-white' },
    be_tran_doi:  { label: 'ĐỐI BỎ',   emoji: '🏃', cls: 'bg-emerald-400 text-white' },
    chet:         { label: 'GÀ CHẾT',  emoji: '💀', cls: 'bg-gray-700 text-white' },
    bi_thuong:    { label: 'BỊ THƯƠNG', emoji: '🤕', cls: 'bg-orange-500 text-white' },
    huy:          { label: 'HỦY',      emoji: '⚠️', cls: 'bg-gray-400 text-white' },
  }
  const m = map[result] || map.huy
  const sizeCls = large ? 'text-base px-4 py-1.5 rounded-lg' : 'text-[10px] px-2 py-0.5 rounded-full'
  return (
    <span className={`inline-flex items-center gap-1 font-bold ${m.cls} ${sizeCls}`}>
      <span>{m.emoji}</span>
      <span>{m.label}</span>
    </span>
  )
}
