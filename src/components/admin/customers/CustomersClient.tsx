'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatVnd, formatDate } from '@/lib/utils/format'
import { removeDiacritics } from '@/lib/utils/slugify'
import { CustomerFormModal, type CustomerFormData } from './CustomerFormModal'

export type CustomerRow = {
  id: string
  name: string
  phone: string | null
  zalo: string | null
  facebook: string | null
  email: string | null
  address: string | null
  tier: string
  notes: string | null
  source: string | null
  total_purchased: number
  total_spent: number
  last_purchase_date: string | null
  days_since_last: number | null
  total_due: number
  oldest_due_days: number
  orders_overdue: number
  created_at: string
}

type SortKey = 'spent_desc' | 'recent_purchase' | 'debt_desc' | 'name' | 'orders_desc' | 'oldest_due'
type ViewMode = 'grid' | 'list'

export function CustomersClient({
  customers,
  canWrite,
  canDelete,
}: {
  customers: CustomerRow[]
  canWrite: boolean
  canDelete: boolean
}) {
  const [editing, setEditing] = useState<CustomerRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('')
  const [debtFilter, setDebtFilter] = useState<'' | 'has_debt' | 'overdue' | 'no_debt'>('')
  const [activityFilter, setActivityFilter] = useState<'' | 'active' | 'dormant' | 'never'>('')
  const [spendingBand, setSpendingBand] = useState<'' | 'low' | 'medium' | 'high'>('')
  const [sortKey, setSortKey] = useState<SortKey>('spent_desc')
  const [view, setView] = useState<ViewMode>('grid')

  const router = useRouter()
  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    const out = customers.filter((c) => {
      if (qNorm) {
        const hay = removeDiacritics(`${c.name} ${c.phone ?? ''} ${c.zalo ?? ''} ${c.email ?? ''} ${c.address ?? ''}`)
        if (!hay.includes(qNorm)) return false
      }
      if (tier && c.tier !== tier) return false
      if (debtFilter === 'has_debt' && c.total_due <= 0) return false
      if (debtFilter === 'overdue' && c.orders_overdue === 0) return false
      if (debtFilter === 'no_debt' && c.total_due > 0) return false
      if (activityFilter === 'active' && (c.days_since_last == null || c.days_since_last > 60)) return false
      if (activityFilter === 'dormant' && (c.days_since_last == null || c.days_since_last <= 60)) return false
      if (activityFilter === 'never' && c.total_purchased > 0) return false
      if (spendingBand === 'low' && c.total_spent >= 20_000_000) return false
      if (spendingBand === 'medium' && (c.total_spent < 20_000_000 || c.total_spent >= 100_000_000)) return false
      if (spendingBand === 'high' && c.total_spent < 100_000_000) return false
      return true
    })
    const sorted = [...out]
    if (sortKey === 'spent_desc') sorted.sort((a, b) => b.total_spent - a.total_spent)
    else if (sortKey === 'recent_purchase')
      sorted.sort((a, b) => (b.last_purchase_date ?? '').localeCompare(a.last_purchase_date ?? ''))
    else if (sortKey === 'debt_desc') sorted.sort((a, b) => b.total_due - a.total_due)
    else if (sortKey === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    else if (sortKey === 'orders_desc') sorted.sort((a, b) => b.total_purchased - a.total_purchased)
    else if (sortKey === 'oldest_due') sorted.sort((a, b) => b.oldest_due_days - a.oldest_due_days)
    return sorted
  }, [customers, qNorm, tier, debtFilter, activityFilter, spendingBand, sortKey])

  // KPIs
  const total = customers.length
  const vipCount = customers.filter((c) => c.tier === 'vip').length
  const totalRevenue = customers.reduce((s, c) => s + c.total_spent, 0)
  const totalDebt = customers.reduce((s, c) => s + c.total_due, 0)
  const debtorCount = customers.filter((c) => c.total_due > 0).length
  const overdueCount = customers.filter((c) => c.orders_overdue > 0).length
  const activeCount = customers.filter((c) => c.days_since_last != null && c.days_since_last <= 60).length
  const dormantCount = customers.filter((c) => c.days_since_last != null && c.days_since_last > 60).length

  const top = customers
    .filter((c) => c.total_spent > 0)
    .sort((a, b) => b.total_spent - a.total_spent)[0]

  const hasFilter = !!(q || tier || debtFilter || activityFilter || spendingBand)
  function clearFilters() {
    setQ('')
    setTier('')
    setDebtFilter('')
    setActivityFilter('')
    setSpendingBand('')
  }

  async function save(data: CustomerFormData, id?: string) {
    const url = id ? `/api/customers/${id}` : '/api/customers'
    const method = id ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const j = await res.json()
    if (!res.ok) throw new Error(j.error ?? 'Lỗi lưu')
    setMsg(id ? '✓ Đã cập nhật khách hàng' : '✓ Đã thêm khách hàng mới')
    setTimeout(() => setMsg(null), 3000)
    router.refresh()
  }

  async function remove(c: CustomerRow) {
    if (!confirm(`Xóa khách "${c.name}"? Hành động không hoàn tác.`)) return
    setBusy(c.id)
    try {
      const res = await fetch(`/api/customers/${c.id}`, { method: 'DELETE' })
      const j = await res.json()
      if (!res.ok) {
        setMsg(`❌ ${j.error ?? 'Lỗi xóa'}`)
      } else {
        setMsg(`✓ Đã xóa ${c.name}`)
        router.refresh()
      }
      setTimeout(() => setMsg(null), 4000)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            👥 Khách hàng
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            CRM thông minh · Theo dõi VIP, công nợ, hoạt động · Lọc đa chiều
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            + Thêm khách hàng
          </button>
        )}
      </div>

      {msg && (
        <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 p-2.5 rounded-lg text-sm">
          {msg}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Tổng khách" value={total.toLocaleString('vi-VN')} sub={`${filtered.length} hiển thị`} tint="blue" icon="👥" />
        <Kpi
          label="Khách VIP"
          value={vipCount.toLocaleString('vi-VN')}
          sub={total > 0 ? `${Math.round((vipCount / total) * 100)}% / tổng` : '—'}
          tint="amber"
          icon="⭐"
        />
        <Kpi
          label="Doanh thu"
          value={formatVnd(totalRevenue)}
          sub={top ? `${top.name}: ${formatVnd(top.total_spent)}` : '—'}
          tint="emerald"
          icon="💰"
        />
        <Kpi
          label="Công nợ phải thu"
          value={formatVnd(totalDebt)}
          sub={debtorCount > 0 ? `${debtorCount} người nợ · ${overdueCount} quá hạn` : 'Đã thu sạch'}
          tint="red"
          icon="📋"
        />
        <Kpi
          label="Khách hoạt động"
          value={activeCount.toLocaleString('vi-VN')}
          sub={`${dormantCount} khách ngủ đông (>60d)`}
          tint="purple"
          icon="🔥"
        />
      </div>

      {/* Critical alerts */}
      {(overdueCount > 0 || dormantCount >= 5) && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 rounded-lg p-3 flex items-start gap-3 flex-wrap">
          <span className="text-2xl">💡</span>
          <div className="flex-1 text-sm">
            {overdueCount > 0 && (
              <div>
                <b className="text-amber-700 dark:text-amber-300">{overdueCount} khách</b> có đơn quá hạn ({'>'}30 ngày).
                <button onClick={() => setDebtFilter('overdue')} className="ml-2 text-amber-700 dark:text-amber-300 underline font-semibold">
                  xem ngay →
                </button>
              </div>
            )}
            {dormantCount >= 5 && (
              <div className="mt-1">
                <b className="text-amber-700 dark:text-amber-300">{dormantCount} khách</b> chưa mua trên 60 ngày — cần chăm sóc.
                <button onClick={() => setActivityFilter('dormant')} className="ml-2 text-amber-700 dark:text-amber-300 underline font-semibold">
                  xem ngay →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tên, SĐT, Zalo, email, địa chỉ..."
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">⭐ Mọi hạng</option>
            <option value="vip">★ VIP</option>
            <option value="thuong">Thường</option>
          </select>
          <select
            value={debtFilter}
            onChange={(e) => setDebtFilter(e.target.value as '' | 'has_debt' | 'overdue' | 'no_debt')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">📋 Mọi tình trạng</option>
            <option value="has_debt">⚠ Đang nợ</option>
            <option value="overdue">🚨 Quá hạn ({'>'}30d)</option>
            <option value="no_debt">✓ Không nợ</option>
          </select>
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value as '' | 'active' | 'dormant' | 'never')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">🔥 Mọi hoạt động</option>
            <option value="active">✓ Hoạt động (≤60d)</option>
            <option value="dormant">😴 Ngủ đông ({'>'}60d)</option>
            <option value="never">⊘ Chưa mua</option>
          </select>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={spendingBand}
            onChange={(e) => setSpendingBand(e.target.value as '' | 'low' | 'medium' | 'high')}
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">💰 Mức chi</option>
            <option value="low">{'<'} 20 triệu</option>
            <option value="medium">20 – 100 triệu</option>
            <option value="high">≥ 100 triệu</option>
          </select>
        </div>

        {/* Sort + view */}
        <div className="mt-3 flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sắp xếp:</span>
          {(
            [
              ['spent_desc', '💰 Chi nhiều nhất'],
              ['debt_desc', '⚠ Nợ nhiều'],
              ['recent_purchase', '🆕 Mua gần đây'],
              ['orders_desc', '📋 Nhiều đơn'],
              ['oldest_due', '⏰ Nợ lâu nhất'],
              ['name', '🔤 Tên'],
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

          <div className="ml-auto flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                view === 'grid' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              ▦ Lưới
            </button>
            <button
              onClick={() => setView('list')}
              className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                view === 'list' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              ☰ Bảng
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-12 text-center">
          <div className="text-5xl mb-2">👥</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
            {customers.length === 0 ? 'Chưa có khách hàng' : 'Không có khách nào khớp tiêu chí'}
          </p>
          {hasFilter && customers.length > 0 && (
            <button onClick={clearFilters} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((c) => (
            <CustomerCard
              key={c.id}
              c={c}
              canWrite={canWrite}
              canDelete={canDelete}
              onEdit={() => setEditing(c)}
              onDelete={() => remove(c)}
              busy={busy === c.id}
            />
          ))}
        </div>
      ) : (
        <ListView
          items={filtered}
          canWrite={canWrite}
          canDelete={canDelete}
          onEdit={setEditing}
          onDelete={remove}
          busy={busy}
        />
      )}

      {(editing || creating) && (
        <CustomerFormModal
          customer={editing}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSave={async (data) => {
            await save(data, editing?.id)
            setEditing(null)
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

/* ========= CARD ========= */
function CustomerCard({
  c,
  canWrite,
  canDelete,
  onEdit,
  onDelete,
  busy,
}: {
  c: CustomerRow
  canWrite: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
  busy: boolean
}) {
  const isVip = c.tier === 'vip'
  const initial = c.name.split(' ').slice(-1)[0]?.[0] ?? '?'
  const hasDebt = c.total_due > 0
  const isOverdue = c.orders_overdue > 0
  const isDormant = c.days_since_last != null && c.days_since_last > 60
  const isActive = c.days_since_last != null && c.days_since_last <= 60

  // Header gradient by tier
  const headerGrad = isVip
    ? 'from-amber-400 via-yellow-500 to-orange-500'
    : isOverdue
      ? 'from-red-500 to-rose-600'
      : 'from-indigo-500 to-purple-600'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all">
      {/* Header gradient */}
      <div className={`relative h-16 bg-gradient-to-br ${headerGrad} flex items-end px-4 pb-2`}>
        <div className="absolute -bottom-6 left-4 w-14 h-14 rounded-full bg-white dark:bg-gray-800 p-1 shadow-md">
          <div className={`w-full h-full rounded-full bg-gradient-to-br ${headerGrad} text-white flex items-center justify-center text-xl font-bold`}>
            {initial}
          </div>
        </div>
        {isVip && (
          <span className="ml-auto bg-white/95 text-amber-700 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider shadow-sm">
            ★ VIP
          </span>
        )}
        {!isVip && isOverdue && (
          <span className="ml-auto bg-white/95 text-red-700 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm">
            🚨 NỢ QUÁ HẠN
          </span>
        )}
      </div>

      <div className="p-4 pt-8">
        {/* Name + meta */}
        <div className="mb-3">
          <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100 truncate">{c.name}</h3>
          {c.address && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">📍 {c.address}</div>
          )}
        </div>

        {/* Contact icons */}
        <div className="flex flex-wrap gap-1.5 mb-3 text-[11px]">
          {c.phone && (
            <a
              href={`tel:${c.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5 font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              📞 {c.phone}
            </a>
          )}
          {c.zalo && (
            <span className="inline-flex items-center gap-1 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 rounded-full px-2 py-0.5 font-semibold">
              💬 {c.zalo}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 text-center">
            <div className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Tổng đơn</div>
            <div className="text-lg font-extrabold tabular-nums text-blue-700 dark:text-blue-400 leading-tight">
              {c.total_purchased}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 text-center">
            <div className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Tổng chi</div>
            <div className="text-base font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 leading-tight">
              {c.total_spent > 0 ? formatVnd(c.total_spent) : '—'}
            </div>
          </div>
        </div>

        {/* Debt */}
        {hasDebt && (
          <div
            className={`rounded-lg p-2 mb-3 border ${
              isOverdue
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-widest">
              <span className={isOverdue ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}>
                {isOverdue ? '🚨 Đang nợ quá hạn' : '⏳ Đang nợ'}
              </span>
              {c.oldest_due_days > 0 && (
                <span className="text-gray-500 dark:text-gray-400">{c.oldest_due_days} ngày</span>
              )}
            </div>
            <div className={`text-base font-extrabold tabular-nums leading-tight mt-0.5 ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {formatVnd(c.total_due)}
            </div>
          </div>
        )}

        {/* Last purchase */}
        <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
          {c.last_purchase_date ? (
            <span>
              🕒 Mua gần nhất:{' '}
              <b className="text-gray-700 dark:text-gray-300">{formatDate(c.last_purchase_date)}</b>
              {c.days_since_last != null && (
                <span className={`ml-1 ${isDormant ? 'text-amber-600 dark:text-amber-400' : isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  ({c.days_since_last === 0 ? 'hôm nay' : c.days_since_last === 1 ? 'hôm qua' : `${c.days_since_last}d trước`})
                </span>
              )}
            </span>
          ) : (
            <span className="italic">Chưa từng mua</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
          <Link
            href={`/admin/tai-chinh/bao-cao/cong-no/${c.id}`}
            className="flex-1 text-[11px] text-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg py-1.5 font-semibold transition"
          >
            📋 Sổ chi tiết
          </Link>
          {canWrite && (
            <button
              onClick={onEdit}
              className="text-[11px] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg px-3 py-1.5 font-semibold transition"
            >
              ✎ Sửa
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={busy}
              className="text-[11px] bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50 transition"
            >
              {busy ? '...' : '🗑'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ========= LIST VIEW ========= */
function ListView({
  items,
  canWrite,
  canDelete,
  onEdit,
  onDelete,
  busy,
}: {
  items: CustomerRow[]
  canWrite: boolean
  canDelete: boolean
  onEdit: (c: CustomerRow) => void
  onDelete: (c: CustomerRow) => void
  busy: string | null
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm min-w-[1000px]">
        <thead className="bg-gray-50 dark:bg-gray-900/60 text-[11px] uppercase text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2.5 text-left">Khách</th>
            <th className="px-3 py-2.5 text-left">Liên hệ</th>
            <th className="px-3 py-2.5 text-right">Đơn</th>
            <th className="px-3 py-2.5 text-right">Tổng chi</th>
            <th className="px-3 py-2.5 text-right">Đang nợ</th>
            <th className="px-3 py-2.5 text-left">Mua gần nhất</th>
            <th className="px-3 py-2.5 text-center">Hạng</th>
            <th className="px-3 py-2.5 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((c) => {
            const isVip = c.tier === 'vip'
            const isOverdue = c.orders_overdue > 0
            const isDormant = c.days_since_last != null && c.days_since_last > 60
            return (
              <tr
                key={c.id}
                className={`hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition ${
                  isOverdue ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                }`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-full ${isVip ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
                      {c.name.split(' ').slice(-1)[0]?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{c.name}</div>
                      {c.address && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[200px]">📍 {c.address}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">
                  {c.phone && <div>📞 {c.phone}</div>}
                  {c.zalo && <div className="text-cyan-700 dark:text-cyan-400">💬 {c.zalo}</div>}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{c.total_purchased}</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {c.total_spent > 0 ? formatVnd(c.total_spent) : '—'}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {c.total_due > 0 ? (
                    <span className={isOverdue ? 'font-bold text-red-600 dark:text-red-400' : 'font-bold text-amber-600 dark:text-amber-400'}>
                      {formatVnd(c.total_due)}
                      {isOverdue && <div className="text-[10px] font-normal">{c.oldest_due_days}d</div>}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {c.last_purchase_date ? (
                    <div>
                      <div className="text-gray-700 dark:text-gray-300">{formatDate(c.last_purchase_date)}</div>
                      {c.days_since_last != null && (
                        <div className={`text-[10px] ${isDormant ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                          {c.days_since_last}d trước
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {isVip ? (
                    <span className="text-[10px] font-bold tracking-wider rounded-full px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                      ★ VIP
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Thường</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Link href={`/admin/tai-chinh/bao-cao/cong-no/${c.id}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-2" title="Xem sổ công nợ">
                    📋
                  </Link>
                  {canWrite && (
                    <button onClick={() => onEdit(c)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-2">
                      Sửa
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => onDelete(c)}
                      disabled={busy === c.id}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      {busy === c.id ? '...' : 'Xóa'}
                    </button>
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
  tint: 'blue' | 'amber' | 'emerald' | 'red' | 'purple'
  icon: string
}) {
  const map: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-green-600',
    red: 'from-red-500 to-rose-600',
    purple: 'from-purple-500 to-fuchsia-600',
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-14 h-14 rounded-full bg-gradient-to-br ${map[tint]} opacity-10 -translate-y-4 translate-x-4`} />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">{label}</div>
          <div className="text-base md:text-lg font-extrabold text-gray-900 dark:text-gray-100 mt-0.5 tabular-nums truncate">
            {value}
          </div>
          {sub && <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{sub}</div>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
