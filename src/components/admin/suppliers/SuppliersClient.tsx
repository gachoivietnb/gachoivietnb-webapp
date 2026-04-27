'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORY_META, type SupplierCategory, type SupplierStat } from '@/lib/suppliers/types'

const fmtVnd = (n: number) => Number(n || 0).toLocaleString('vi-VN')
const fmtVndShort = (n: number) => {
  const v = Number(n || 0)
  if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'T'
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + 'K'
  return v.toString()
}

export function SuppliersClient({
  suppliers,
  kpis,
  canWrite,
  canDelete,
}: {
  suppliers: SupplierStat[]
  kpis: { total?: number; active?: number; by_category?: Record<string, number>; top_rated?: number; orders_ytd?: number; top5?: Array<{ id: string; name: string; total_amount: number; orders: number; category: string }> }
  canWrite: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<'all' | SupplierCategory>('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [ratingFilter, setRatingFilter] = useState<number>(0)
  const [view, setView] = useState<'grid' | 'table'>('grid')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return suppliers.filter((s) => {
      if (catFilter !== 'all' && s.supplier_category !== catFilter) return false
      if (activeFilter === 'active' && !s.is_active) return false
      if (activeFilter === 'inactive' && s.is_active) return false
      if (ratingFilter > 0 && (s.rating ?? 0) < ratingFilter) return false
      if (q) {
        const hay = `${s.code} ${s.name} ${s.contact_person ?? ''} ${s.phone ?? ''} ${s.products_summary ?? ''} ${(s.tags ?? []).join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [suppliers, search, catFilter, activeFilter, ratingFilter])

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: suppliers.length }
    for (const s of suppliers) {
      if (!s.supplier_category) continue
      map[s.supplier_category] = (map[s.supplier_category] ?? 0) + 1
    }
    return map
  }, [suppliers])

  const top5 = (kpis.top5 ?? []) as Array<{ id: string; name: string; total_amount: number; orders: number; category: string }>

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi emoji="🏭" label="Tổng NCC" value={(kpis.total ?? 0).toString()} sub={`${kpis.active ?? 0} đang hoạt động`} tone="from-blue-500 to-indigo-600" />
        <Kpi emoji="⭐" label="NCC chất lượng" value={(kpis.top_rated ?? 0).toString()} sub="Đánh giá ≥ 4 sao" tone="from-amber-500 to-orange-600" />
        <Kpi emoji="💵" label="Mua YTD" value={fmtVndShort(Number(kpis.orders_ytd ?? 0)) + 'đ'} sub="Từ đầu năm" tone="from-emerald-500 to-teal-600" />
        <Kpi emoji="📦" label="Đa dạng" value={Object.keys(kpis.by_category ?? {}).length.toString()} sub="Loại NCC khác nhau" tone="from-violet-500 to-fuchsia-600" />
      </div>

      {/* Top 5 banner */}
      {top5.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3">
          <div className="text-xs font-bold text-amber-900 dark:text-amber-200 mb-2">🏆 TOP 5 NCC ĐƯỢC GIAO DỊCH NHIỀU NHẤT</div>
          <div className="flex flex-wrap gap-2">
            {top5.map((t, i) => {
              const meta = CATEGORY_META[t.category as SupplierCategory] ?? CATEGORY_META.khac
              return (
                <Link
                  key={t.id}
                  href={`/admin/nha-cung-cap/${t.id}`}
                  className="bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-xs font-semibold border border-amber-200 dark:border-amber-800 hover:border-amber-400 transition shadow-sm flex items-center gap-1.5"
                >
                  <span className="text-amber-600 font-bold">#{i + 1}</span>
                  <span>{meta.emoji}</span>
                  <span className="text-gray-900 dark:text-gray-100">{t.name}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtVndShort(t.total_amount)}đ</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên / SĐT / sản phẩm / tag..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg"
            />
          </div>
          {canWrite && (
            <Link
              href="/admin/nha-cung-cap/them-moi"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-bold shadow whitespace-nowrap"
            >
              + Thêm NCC
            </Link>
          )}
        </div>

        {/* Category chips */}
        <div className="flex gap-1.5 flex-wrap">
          <Pill active={catFilter === 'all'} onClick={() => setCatFilter('all')}>
            🌐 Tất cả ({counts.all})
          </Pill>
          {(Object.keys(CATEGORY_META) as SupplierCategory[]).map((c) => {
            const m = CATEGORY_META[c]
            const cnt = counts[c] ?? 0
            return (
              <Pill key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>
                {m.emoji} {m.label} ({cnt})
              </Pill>
            )
          })}
        </div>

        {/* Sub filters */}
        <div className="flex gap-2 items-center text-xs flex-wrap">
          <span className="text-gray-500">Trạng thái:</span>
          <Pill active={activeFilter === 'active'} onClick={() => setActiveFilter('active')}>✅ Đang hoạt động</Pill>
          <Pill active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>Tất cả</Pill>
          <Pill active={activeFilter === 'inactive'} onClick={() => setActiveFilter('inactive')}>⏸ Tạm ngưng</Pill>
          <span className="text-gray-300 mx-1">|</span>
          <span className="text-gray-500">Đánh giá:</span>
          {[0, 3, 4, 5].map((r) => (
            <Pill key={r} active={ratingFilter === r} onClick={() => setRatingFilter(r)}>
              {r === 0 ? 'Tất cả' : `≥ ${r}⭐`}
            </Pill>
          ))}
          <span className="text-gray-300 mx-1">|</span>
          <button onClick={() => setView(view === 'grid' ? 'table' : 'grid')} className="text-gray-600 hover:text-gray-900">
            {view === 'grid' ? '📋 Bảng' : '🎴 Card'}
          </button>
          <span className="text-gray-500 ml-auto">{filtered.length} kết quả</span>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <div className="text-6xl mb-2 opacity-50">🏭</div>
          <p className="text-sm text-gray-500">{suppliers.length === 0 ? 'Chưa có NCC nào' : 'Không khớp filter'}</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => <SupplierCard key={s.id} s={s} />)}
        </div>
      ) : (
        <SupplierTable suppliers={filtered} canDelete={canDelete} onDelete={async (id) => {
          if (!confirm('Tạm ngưng NCC này?')) return
          await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' })
          router.refresh()
        }} />
      )}
    </div>
  )
}

function SupplierCard({ s }: { s: SupplierStat }) {
  const meta = s.supplier_category ? CATEGORY_META[s.supplier_category] : CATEGORY_META.khac
  return (
    <Link
      href={`/admin/nha-cung-cap/${s.id}`}
      className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all"
      style={{ borderLeftWidth: '6px', borderLeftColor: 'var(--border-color)' }}
    >
      <div className={`h-2 bg-gradient-to-r ${meta.gradient}`} />
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-2xl flex-shrink-0`}>
            {s.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white">{meta.emoji}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-gray-500">{s.code}</span>
              {!s.is_active && <span className="text-[10px] bg-gray-300 text-gray-700 rounded px-1">⏸</span>}
              {s.rating && (
                <span className="text-[10px] font-bold text-amber-600">
                  {'⭐'.repeat(s.rating)}
                </span>
              )}
            </div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{s.name}</h3>
            <div className="text-[11px] text-gray-500 truncate">
              {s.contact_person ? `👤 ${s.contact_person}` : ''}
              {s.phone ? ` · 📞 ${s.phone}` : ''}
            </div>
          </div>
        </div>

        {s.products_summary && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">📦 {s.products_summary}</p>
        )}

        {s.tags && s.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-2">
            {s.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5">#{t}</span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-1 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-center">
          <div>
            <div className="text-sm font-bold text-blue-700 dark:text-blue-400">{s.total_orders}</div>
            <div className="text-[9px] text-gray-500 uppercase">Đơn</div>
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtVndShort(Number(s.total_amount))}đ</div>
            <div className="text-[9px] text-gray-500 uppercase">Tổng</div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {s.last_order_date ? s.last_order_date.split('-').reverse().join('/').slice(0, 5) : '—'}
            </div>
            <div className="text-[9px] text-gray-500 uppercase">Gần nhất</div>
          </div>
        </div>
      </div>
    </Link>
  )
}

function SupplierTable({ suppliers, canDelete, onDelete }: {
  suppliers: SupplierStat[]
  canDelete: boolean
  onDelete: (id: string) => void
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/40 text-[11px] uppercase text-gray-500">
          <tr>
            <th className="text-left p-2">Mã</th>
            <th className="text-left p-2">Tên NCC</th>
            <th className="text-left p-2">Loại</th>
            <th className="text-left p-2">Liên hệ</th>
            <th className="text-center p-2">Sao</th>
            <th className="text-right p-2">Đơn</th>
            <th className="text-right p-2">Tổng tiền</th>
            <th className="text-left p-2">Gần nhất</th>
            <th className="text-right p-2"></th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => {
            const meta = s.supplier_category ? CATEGORY_META[s.supplier_category] : CATEGORY_META.khac
            return (
              <tr key={s.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-blue-50/30">
                <td className="p-2 font-mono text-xs">
                  <Link href={`/admin/nha-cung-cap/${s.id}`} className="text-blue-600 hover:underline">{s.code}</Link>
                </td>
                <td className="p-2">
                  <Link href={`/admin/nha-cung-cap/${s.id}`} className="font-semibold hover:underline">{s.name}</Link>
                  {!s.is_active && <span className="ml-1 text-[10px] bg-gray-300 text-gray-700 rounded px-1">⏸</span>}
                </td>
                <td className="p-2">
                  <span className="text-xs">{meta.emoji} {meta.label}</span>
                </td>
                <td className="p-2 text-xs">
                  {s.contact_person && <div>{s.contact_person}</div>}
                  <div className="text-gray-500">{s.phone || '—'}</div>
                </td>
                <td className="p-2 text-center text-xs">
                  {s.rating ? '⭐'.repeat(s.rating) : '—'}
                </td>
                <td className="p-2 text-right font-mono">{s.total_orders}</td>
                <td className="p-2 text-right font-mono text-emerald-700 dark:text-emerald-400">
                  {fmtVnd(Number(s.total_amount))}
                </td>
                <td className="p-2 text-xs whitespace-nowrap">{s.last_order_date ? s.last_order_date.split('-').reverse().join('/') : '—'}</td>
                <td className="p-2 text-right">
                  {canDelete && s.is_active && (
                    <button onClick={() => onDelete(s.id)} className="text-xs text-red-600 hover:underline">Tạm ngưng</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Kpi({ emoji, label, value, sub, tone }: { emoji: string; label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className={`rounded-xl p-3 bg-gradient-to-br ${tone} text-white shadow-sm relative overflow-hidden`}>
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="text-2xl">{emoji}</div>
        <div className="text-[10px] uppercase tracking-wide opacity-90 font-semibold">{label}</div>
        <div className="font-extrabold text-2xl leading-tight truncate">{value}</div>
        {sub && <div className="text-[10px] opacity-80 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap transition ${
        active
          ? 'bg-blue-500 text-white border-blue-500 font-semibold shadow-sm'
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300'
      }`}
    >
      {children}
    </button>
  )
}
