'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { PlanItem, Priority, PlanCategory } from '@/lib/planning/aggregator'

const PRI_META: Record<Priority, { label: string; cls: string; bar: string }> = {
  critical: { label: 'Khẩn cấp', cls: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800', bar: 'from-rose-500 to-red-500' },
  high: { label: 'Ưu tiên cao', cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800', bar: 'from-amber-500 to-orange-500' },
  medium: { label: 'Trung bình', cls: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800', bar: 'from-blue-500 to-indigo-500' },
  low: { label: 'Thấp', cls: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700', bar: 'from-gray-400 to-gray-500' },
}

const CAT_META: Record<PlanCategory, { label: string; emoji: string }> = {
  vaccine: { label: 'Tiêm phòng', emoji: '💉' },
  breeding: { label: 'Sinh sản', emoji: '🐣' },
  qr_tag: { label: 'Đeo thẻ QR', emoji: '🔳' },
  training: { label: 'Vần / Huấn luyện', emoji: '🥊' },
  mating: { label: 'Ghép đôi', emoji: '💕' },
  stock: { label: 'Kho thuốc / cám', emoji: '📦' },
  expiry: { label: 'Cận date', emoji: '⏳' },
  asset_maint: { label: 'Bảo trì tài sản', emoji: '🛠' },
  sales: { label: 'Đơn hàng', emoji: '🛒' },
  finance: { label: 'Tài chính', emoji: '💰' },
  system: { label: 'Hệ thống', emoji: '💾' },
}

type Horizon = 'today' | 'week' | 'month' | 'all'

function daysFromNow(iso: string): number {
  const today = new Date().toISOString().slice(0, 10)
  return Math.round((new Date(iso).getTime() - new Date(today).getTime()) / 86400000)
}

function dueLabel(iso: string): string {
  const d = daysFromNow(iso)
  if (d < 0) return `🚨 Quá hạn ${-d} ngày`
  if (d === 0) return 'Hôm nay'
  if (d === 1) return 'Ngày mai'
  if (d <= 7) return `Còn ${d} ngày`
  return new Date(iso).toLocaleDateString('vi-VN')
}

export function PlanClient({ items }: { items: PlanItem[] }) {
  const [horizon, setHorizon] = useState<Horizon>('week')
  const [filterCat, setFilterCat] = useState<PlanCategory | ''>('')
  const [filterPri, setFilterPri] = useState<Priority | ''>('')

  const now = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return today
  }, [])

  const horizonItems = useMemo(() => {
    return items.filter((it) => {
      const days = daysFromNow(it.due_date)
      if (horizon === 'today' && days > 1) return false
      if (horizon === 'week' && days > 7) return false
      if (horizon === 'month' && days > 30) return false
      if (filterCat && it.category !== filterCat) return false
      if (filterPri && it.priority !== filterPri) return false
      return true
    })
  }, [items, horizon, filterCat, filterPri])

  // Counts per horizon for tab badges
  const counts = useMemo(() => {
    let today = 0, week = 0, month = 0
    for (const it of items) {
      const d = daysFromNow(it.due_date)
      if (d <= 1) today++
      if (d <= 7) week++
      if (d <= 30) month++
    }
    return { today, week, month, all: items.length }
  }, [items])

  // Critical/high counts
  const urgentCount = items.filter((i) => i.priority === 'critical' || i.priority === 'high').length

  // Group by category for current horizon
  const grouped = useMemo(() => {
    const m = new Map<PlanCategory, PlanItem[]>()
    for (const it of horizonItems) {
      if (!m.has(it.category)) m.set(it.category, [])
      m.get(it.category)!.push(it)
    }
    return m
  }, [horizonItems])

  return (
    <>
      {/* Hero summary */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-600 text-white p-5 md:p-6 shadow-xl">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/80 mb-1">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold mb-2">
            {items.length === 0
              ? '🎉 Mọi việc đã ổn — không có việc cần làm gấp!'
              : `Bạn có ${items.length} việc cần lên kế hoạch`}
          </h2>
          {items.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm">
              {urgentCount > 0 && (
                <span className="bg-rose-500/40 backdrop-blur rounded-lg px-3 py-1.5 font-semibold animate-pulse">
                  🚨 {urgentCount} khẩn cấp / ưu tiên cao
                </span>
              )}
              <span className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5">
                📌 Hôm nay & mai: <b>{counts.today}</b>
              </span>
              <span className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5">
                📆 Tuần này: <b>{counts.week}</b>
              </span>
              <span className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5">
                🗓️ Tháng tới: <b>{counts.month}</b>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mt-4 overflow-x-auto">
        <TabButton active={horizon === 'today'} onClick={() => setHorizon('today')} label={`📌 Hôm nay & Mai`} count={counts.today} />
        <TabButton active={horizon === 'week'} onClick={() => setHorizon('week')} label={`📆 Tuần này`} count={counts.week} />
        <TabButton active={horizon === 'month'} onClick={() => setHorizon('month')} label={`🗓️ Tháng tới`} count={counts.month} />
        <TabButton active={horizon === 'all'} onClick={() => setHorizon('all')} label={`🔭 Tất cả`} count={counts.all} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mt-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">Lọc:</span>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value as PlanCategory | '')}
          className="text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1"
        >
          <option value="">Tất cả mảng</option>
          {Object.entries(CAT_META).map(([k, m]) => (
            <option key={k} value={k}>{m.emoji} {m.label}</option>
          ))}
        </select>
        <select
          value={filterPri}
          onChange={(e) => setFilterPri(e.target.value as Priority | '')}
          className="text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1"
        >
          <option value="">Mọi mức ưu tiên</option>
          {Object.entries(PRI_META).map(([k, m]) => (
            <option key={k} value={k}>{m.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          Hiện <strong className="text-gray-900 dark:text-gray-100">{horizonItems.length}</strong> việc
        </span>
      </div>

      {/* Items grouped by category */}
      <div className="mt-3 space-y-3">
        {horizonItems.length === 0 ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-2">🎉</div>
            <div className="text-base font-bold text-emerald-900 dark:text-emerald-200 mb-1">
              Không có việc nào trong khoảng đã chọn
            </div>
            <div className="text-sm text-emerald-700 dark:text-emerald-300">
              Trại đang vận hành ổn định! Quay lại sau để xem việc mới.
            </div>
          </div>
        ) : (
          [...grouped.entries()].map(([cat, list]) => {
            const meta = CAT_META[cat]
            return (
              <section key={cat} className="bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/40 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-xl">{meta.emoji}</span>
                    {meta.label}
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5 font-bold">
                      {list.length}
                    </span>
                  </h3>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {list.map((it) => {
                    const pri = PRI_META[it.priority]
                    return (
                      <li key={it.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition">
                        <div className="flex items-start gap-3">
                          <div className={'shrink-0 w-1 self-stretch rounded-full bg-gradient-to-b ' + pri.bar} />
                          <div className="text-2xl shrink-0 leading-none">{it.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{it.title}</h4>
                              <div className="flex gap-1.5 shrink-0">
                                <span className={'text-[10px] px-2 py-0.5 rounded-full border font-bold ' + pri.cls}>
                                  {pri.label}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-semibold">
                                  {dueLabel(it.due_date)}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{it.description}</p>
                            {it.action_url && (
                              <Link
                                href={it.action_url}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-2"
                              >
                                {it.action_label ?? 'Mở'} →
                              </Link>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
        💡 <b>Mẹo:</b> Mỗi sáng vào đây 5 phút — xem việc cần làm hôm nay + chuẩn bị cho ngày mai. Tuần đầu tháng xem
        "Tháng tới" để dự trù chi phí mua thuốc / cám / vật tư.
      </p>
    </>
  )
}

function TabButton({
  active, onClick, label, count,
}: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={
        'whitespace-nowrap px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition flex items-center gap-1.5 ' +
        (active
          ? 'border-violet-600 text-violet-700 dark:text-violet-300'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')
      }
    >
      {label}
      {count > 0 && (
        <span
          className={
            'text-[10px] px-1.5 py-0.5 rounded-full font-bold ' +
            (active ? 'bg-violet-200 dark:bg-violet-900 text-violet-900 dark:text-violet-100' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300')
          }
        >
          {count}
        </span>
      )}
    </button>
  )
}
