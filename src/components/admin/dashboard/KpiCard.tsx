'use client'

type Tone =
  | 'amber' | 'orange' | 'emerald' | 'green' | 'teal' | 'blue' | 'indigo'
  | 'violet' | 'fuchsia' | 'rose' | 'red' | 'cyan' | 'gray' | 'sky'

const TONE_CLS: Record<Tone, { gradient: string; ring: string; text: string }> = {
  amber:   { gradient: 'from-amber-400 to-orange-500',    ring: 'ring-amber-200',    text: 'text-amber-700' },
  orange:  { gradient: 'from-orange-400 to-red-500',      ring: 'ring-orange-200',   text: 'text-orange-700' },
  emerald: { gradient: 'from-emerald-400 to-teal-600',    ring: 'ring-emerald-200',  text: 'text-emerald-700' },
  green:   { gradient: 'from-green-400 to-emerald-600',   ring: 'ring-green-200',    text: 'text-green-700' },
  teal:    { gradient: 'from-teal-400 to-cyan-600',       ring: 'ring-teal-200',     text: 'text-teal-700' },
  blue:    { gradient: 'from-blue-400 to-indigo-600',     ring: 'ring-blue-200',     text: 'text-blue-700' },
  indigo:  { gradient: 'from-indigo-400 to-purple-600',   ring: 'ring-indigo-200',   text: 'text-indigo-700' },
  violet:  { gradient: 'from-violet-400 to-fuchsia-600',  ring: 'ring-violet-200',   text: 'text-violet-700' },
  fuchsia: { gradient: 'from-fuchsia-400 to-pink-600',    ring: 'ring-fuchsia-200',  text: 'text-fuchsia-700' },
  rose:    { gradient: 'from-rose-400 to-pink-600',       ring: 'ring-rose-200',     text: 'text-rose-700' },
  red:     { gradient: 'from-red-400 to-rose-600',        ring: 'ring-red-200',      text: 'text-red-700' },
  cyan:    { gradient: 'from-cyan-400 to-blue-600',       ring: 'ring-cyan-200',     text: 'text-cyan-700' },
  gray:    { gradient: 'from-gray-400 to-gray-600',       ring: 'ring-gray-200',     text: 'text-gray-700' },
  sky:     { gradient: 'from-sky-400 to-blue-600',        ring: 'ring-sky-200',      text: 'text-sky-700' },
}

export type KpiCardProps = {
  emoji: string
  label: string
  value: string | number
  subtitle?: string
  delta?: { value: number; suffix?: string; better?: 'up' | 'down' }
  tone?: Tone
  size?: 'lg' | 'md' | 'sm'
  href?: string
  sparkline?: number[]
  hint?: string
}

export function KpiCard({
  emoji,
  label,
  value,
  subtitle,
  delta,
  tone = 'blue',
  size = 'md',
  href,
  sparkline,
  hint,
}: KpiCardProps) {
  const t = TONE_CLS[tone]
  const isLg = size === 'lg'
  const isSm = size === 'sm'

  const Wrapper: React.ElementType = href ? 'a' : 'div'
  const wrapperProps = href ? { href } : {}

  // Delta direction
  let deltaTone: 'pos' | 'neg' | 'flat' = 'flat'
  if (delta) {
    if (delta.value > 0) deltaTone = delta.better === 'down' ? 'neg' : 'pos'
    else if (delta.value < 0) deltaTone = delta.better === 'down' ? 'pos' : 'neg'
  }

  const deltaCls =
    deltaTone === 'pos'
      ? 'text-emerald-100 bg-emerald-900/30'
      : deltaTone === 'neg'
      ? 'text-rose-100 bg-rose-900/30'
      : 'text-white/70 bg-white/10'

  return (
    <Wrapper
      {...wrapperProps}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.gradient} text-white shadow-md hover:shadow-xl transition-all ${
        href ? 'hover:scale-[1.02] cursor-pointer' : ''
      } ${isLg ? 'p-5' : isSm ? 'p-3' : 'p-4'}`}
      title={hint}
    >
      {/* Decorative glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className={`flex items-center gap-1.5 ${isLg ? 'text-2xl' : 'text-xl'}`}>
              <span>{emoji}</span>
            </div>
            <div className={`uppercase tracking-wider opacity-90 font-semibold mt-1 ${isLg ? 'text-[11px]' : 'text-[10px]'}`}>
              {label}
            </div>
          </div>
          {delta && (
            <div className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 ${deltaCls}`}>
              {delta.value > 0 ? '↑' : delta.value < 0 ? '↓' : '–'} {Math.abs(delta.value).toFixed(delta.value % 1 === 0 ? 0 : 1)}
              {delta.suffix ?? '%'}
            </div>
          )}
        </div>

        <div className={`font-extrabold mt-1 leading-none truncate ${isLg ? 'text-3xl' : isSm ? 'text-xl' : 'text-2xl'}`}>
          {value}
        </div>

        {subtitle && (
          <div className={`opacity-80 mt-1 ${isLg ? 'text-xs' : 'text-[11px]'}`}>{subtitle}</div>
        )}

        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} />
        )}
      </div>
    </Wrapper>
  )
}

function Sparkline({ data }: { data: number[] }) {
  const w = 100
  const h = 24
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full h-6 opacity-80">
      <polyline points={pts} fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// Helper format currency
export function fmtVnd(n: number | string | null | undefined, compact = false): string {
  const v = Number(n || 0)
  if (compact && Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}T`
  if (compact && Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (compact && Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 0 })
}

export function fmtPct(num: number, denom: number, decimals = 1): string {
  if (!denom || denom === 0) return '–'
  return `${((num / denom) * 100).toFixed(decimals)}%`
}

export function deltaPct(curr: number, prev: number): number {
  if (!prev || prev === 0) return curr > 0 ? 100 : 0
  return ((curr - prev) / Math.abs(prev)) * 100
}
