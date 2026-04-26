'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { removeDiacritics } from '@/lib/utils/slugify'
import {
  type AssetWithValue,
  type AssetKind,
  type AssetStatus,
  KIND_META,
  STATUS_META,
  ASSET_CATEGORIES,
  categoryMeta,
  formatVnd,
  formatVndShort,
  depreciationPct,
} from '@/lib/assets/types'
import type { AssetKpi } from '@/lib/assets/queries'
import { AssetFormModal } from './AssetFormModal'

type Profile = { id: string; full_name: string }
type Area = { id: string; code: string; name: string }
type ViewMode = 'grid' | 'list'

export function AssetsListClient({
  initialAssets,
  kpi,
  profiles,
  areas,
}: {
  initialAssets: AssetWithValue[]
  kpi: AssetKpi
  profiles: Profile[]
  areas: Area[]
}) {
  const router = useRouter()
  const [items, setItems] = useState<AssetWithValue[]>(initialAssets)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<AssetKind | ''>('')
  const [status, setStatus] = useState<AssetStatus | ''>('')
  const [areaFilter, setAreaFilter] = useState<string>('')
  const [view, setView] = useState<ViewMode>('grid')
  const [addOpen, setAddOpen] = useState(false)

  async function refresh() {
    const params = new URLSearchParams()
    if (kind) params.set('kind', kind)
    if (status) params.set('status', status)
    const res = await fetch(`/api/assets?${params.toString()}`)
    if (res.ok) {
      const j = await res.json()
      setItems(j.data ?? [])
    }
  }

  const filtered = useMemo(() => {
    const qNorm = removeDiacritics(search.trim().toLowerCase())
    return items.filter((a) => {
      if (kind && a.kind !== kind) return false
      if (status && a.status !== status) return false
      if (areaFilter && a.area_id !== areaFilter) return false
      if (!qNorm) return true
      const hay = removeDiacritics(`${a.code} ${a.name} ${a.brand ?? ''} ${a.model ?? ''}`.toLowerCase())
      return hay.includes(qNorm)
    })
  }, [items, search, kind, status, areaFilter])

  return (
    <div className="space-y-4">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-xl">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <span className="absolute top-3 right-6 text-7xl">🛠</span>
          <span className="absolute bottom-2 left-8 text-5xl">🏭</span>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative p-6 md:p-7">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-80">Tài sản & CCDC</div>
              <div className="text-3xl md:text-4xl font-black tabular-nums mt-1">
                {formatVnd(kpi.totalValue)}
              </div>
              <div className="text-sm opacity-80 mt-0.5">
                Giá trị còn lại · {kpi.totalCount} mục đang quản lý · Đã thanh lý: {kpi.liquidatedCount}
              </div>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="bg-white text-orange-700 hover:bg-orange-50 rounded-xl px-5 py-2.5 font-bold shadow-lg flex items-center gap-1.5"
            >
              + Thêm tài sản / CCDC
            </button>
          </div>

          {/* Mini KPI hero strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-4">
            <HeroKpi
              label="🏭 TSCĐ"
              value={kpi.tscdCount}
              sub={`${formatVndShort(items.filter((a) => a.kind === 'tscd' && a.status !== 'da_thanh_ly').reduce((s, a) => s + Number(a.current_value), 0))}`}
            />
            <HeroKpi
              label="🛠 CCDC"
              value={kpi.ccdcCount}
              sub={`${formatVndShort(items.filter((a) => a.kind === 'ccdc' && a.status !== 'da_thanh_ly').reduce((s, a) => s + Number(a.current_value), 0))}`}
            />
            <HeroKpi
              label="🔧 Cần bảo trì"
              value={kpi.needMaintenance}
              sub="Quá hạn / sắp tới"
              alert={kpi.needMaintenance > 0}
            />
            <HeroKpi
              label="❌ Hỏng"
              value={kpi.brokenCount}
              sub="Cần xử lý"
              alert={kpi.brokenCount > 0}
            />
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-wrap items-center gap-2">
        {/* Kind chips */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5">
          <FilterChip
            active={kind === ''}
            label={`📚 Tất cả (${kpi.tscdCount + kpi.ccdcCount})`}
            onClick={() => setKind('')}
          />
          <FilterChip
            active={kind === 'tscd'}
            label={`🏭 TSCĐ (${kpi.tscdCount})`}
            onClick={() => setKind('tscd')}
          />
          <FilterChip
            active={kind === 'ccdc'}
            label={`🛠 CCDC (${kpi.ccdcCount})`}
            onClick={() => setKind('ccdc')}
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AssetStatus | '')}
          className="px-3 py-1.5 rounded-lg text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
        >
          <option value="">Tất cả trạng thái</option>
          {(Object.keys(STATUS_META) as AssetStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].emoji} {STATUS_META[s].label}
            </option>
          ))}
        </select>

        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
        >
          <option value="">Tất cả vị trí</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} · {a.name}
            </option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Tìm theo tên / mã / hãng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
        />

        {/* View toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5 ml-auto">
          {(['grid', 'list'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                'px-3 py-1.5 rounded text-xs font-semibold transition ' +
                (view === v
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400')
              }
            >
              {v === 'grid' ? '▦ Lưới' : '☰ Bảng'}
            </button>
          ))}
        </div>
      </div>

      {/* BODY */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <div className="text-6xl mb-3">🛠</div>
          <div className="text-base font-semibold mb-1">Chưa có tài sản nào</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {items.length === 0 ? 'Bắt đầu thêm tài sản đầu tiên của bạn' : 'Không tìm thấy theo bộ lọc hiện tại'}
          </div>
          {items.length === 0 && (
            <button
              onClick={() => setAddOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-5 py-2 text-sm font-semibold"
            >
              + Thêm tài sản đầu tiên
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      ) : (
        <AssetTable items={filtered} />
      )}

      {addOpen && (
        <AssetFormModal
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false)
            refresh()
            router.refresh()
          }}
          profiles={profiles}
          areas={areas}
        />
      )}
    </div>
  )
}

function HeroKpi({ label, value, sub, alert }: { label: string; value: number | string; sub: string; alert?: boolean }) {
  return (
    <div className={'bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 ' + (alert ? 'ring-2 ring-yellow-300 animate-pulse' : '')}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-lg md:text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[10.5px] opacity-70">{sub}</div>
    </div>
  )
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        'px-3 py-1.5 rounded text-xs font-semibold transition ' +
        (active
          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200')
      }
    >
      {label}
    </button>
  )
}

function AssetCard({ asset }: { asset: AssetWithValue }) {
  const cat = categoryMeta(asset.category)
  const km = KIND_META[asset.kind]
  const sm = STATUS_META[asset.status]
  const dep = depreciationPct(asset.months_used, asset.useful_life_months)
  const maintenanceWarn = asset.maintenance_status === 'overdue' ? 'Quá hạn bảo trì' :
    asset.maintenance_status === 'due_soon' ? 'Sắp tới hạn bảo trì' : null

  return (
    <Link
      href={`/admin/tai-san/${asset.id}`}
      className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700 transition flex flex-col"
    >
      {/* Top stripe gradient theo kind */}
      <div className={`h-1.5 bg-gradient-to-r ${km.bar}`} />

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-2.5 mb-2">
          <div
            className={
              'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ' +
              (asset.kind === 'tscd'
                ? 'bg-blue-50 dark:bg-blue-950/40'
                : 'bg-amber-50 dark:bg-amber-950/40')
            }
          >
            {cat.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded border ' + km.cls}>
                {km.emoji} {km.label}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">{asset.code}</span>
            </div>
            <div className="font-bold text-sm text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
              {asset.name}
            </div>
            {(asset.brand || asset.model) && (
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {[asset.brand, asset.model].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </div>

        {/* Status pill */}
        <div className="flex flex-wrap gap-1 mb-2">
          <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ' + sm.cls}>
            {sm.emoji} {sm.label}
          </span>
          {asset.quantity > 1 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
              ×{asset.quantity} {asset.unit}
            </span>
          )}
          {maintenanceWarn && (
            <span
              className={
                'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ' +
                (asset.maintenance_status === 'overdue'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 animate-pulse'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300')
              }
            >
              🔧 {maintenanceWarn}
            </span>
          )}
        </div>

        {/* Value display */}
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Còn lại</span>
            <span
              className={
                'text-base font-extrabold tabular-nums ' +
                (asset.status === 'da_thanh_ly'
                  ? 'text-gray-400 dark:text-gray-500 line-through'
                  : 'text-gray-900 dark:text-gray-100')
              }
            >
              {formatVnd(asset.current_value)}
            </span>
          </div>

          {asset.useful_life_months && asset.purchase_date && (
            <div>
              <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                <span>Khấu hao: {dep}%</span>
                <span>{asset.months_used}/{asset.useful_life_months} tháng</span>
              </div>
              <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full bg-gradient-to-r ${km.bar}`}
                  style={{ width: `${dep}%` }}
                />
              </div>
            </div>
          )}

          {(asset.area_name || asset.responsible_name) && (
            <div className="flex items-center justify-between text-[10.5px] text-gray-500 dark:text-gray-400 pt-1">
              <span className="truncate">
                {asset.area_name && <>📍 {asset.area_name}</>}
              </span>
              <span className="truncate">
                {asset.responsible_name && <>👤 {asset.responsible_name}</>}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function AssetTable({ items }: { items: AssetWithValue[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-600 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Mã</th>
              <th className="px-3 py-2 text-left font-semibold">Tên / Phân loại</th>
              <th className="px-3 py-2 text-center font-semibold">Loại</th>
              <th className="px-3 py-2 text-center font-semibold">Trạng thái</th>
              <th className="px-3 py-2 text-left font-semibold">Vị trí / Phụ trách</th>
              <th className="px-3 py-2 text-right font-semibold">Giá mua</th>
              <th className="px-3 py-2 text-right font-semibold">Còn lại</th>
              <th className="px-3 py-2 text-center font-semibold">KH</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((a) => {
              const cat = categoryMeta(a.category)
              const km = KIND_META[a.kind]
              const sm = STATUS_META[a.status]
              const dep = depreciationPct(a.months_used, a.useful_life_months)
              return (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link href={`/admin/tai-san/${a.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {a.code}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <span>{cat.emoji}</span>
                      <span className="truncate">{a.name}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{cat.label}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded border ' + km.cls}>
                      {km.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={'text-[10px] font-semibold px-1.5 py-0.5 rounded border ' + sm.cls}>
                      {sm.emoji}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div>{a.area_name ?? '—'}</div>
                    <div className="text-gray-500 dark:text-gray-400">{a.responsible_name ?? '—'}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatVndShort(a.purchase_price)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">
                    {formatVndShort(a.current_value)}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    {a.useful_life_months ? <span className={dep > 80 ? 'text-rose-600 font-bold' : ''}>{dep}%</span> : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
