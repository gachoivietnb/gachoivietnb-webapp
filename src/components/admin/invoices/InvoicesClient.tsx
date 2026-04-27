'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type InvoiceRow = {
  id: string
  internal_no: string
  invoice_no: string | null
  invoice_serial: string | null
  invoice_form: string | null
  issue_date: string
  status: 'nhap' | 'cho_phat_hanh' | 'da_phat_hanh' | 'da_huy' | 'dieu_chinh' | 'thay_the'
  cqt_status: 'chua_gui' | 'cho_cap_ma' | 'da_cap_ma' | 'tu_choi'
  cqt_code: string | null
  subtotal: number
  tax_amount: number
  total: number
  payment_method: 'TM' | 'CK' | 'TM_CK'
  buyer_id: string | null
  buyer_name: string | null
  buyer_tax_code: string | null
  buyer_email: string | null
  provider_id: string | null
  provider_name: string | null
  provider_code: string | null
  notes: string | null
  item_count: number
  created_at: string
  buyer_email_sent_at: string | null
}

type Provider = { id: string; name: string; provider_code: string }
type MonthlyStat = {
  month: string
  issued_count: number
  draft_count: number
  cancelled_count: number
  total_revenue: number
  total_tax: number
}

type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all'
type StatusFilter = 'all' | 'nhap' | 'cho_phat_hanh' | 'da_phat_hanh' | 'da_huy' | 'dieu_chinh'

const STATUS_LABEL: Record<string, { label: string; emoji: string; color: string }> = {
  nhap:           { label: 'Nháp',          emoji: '📝', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  cho_phat_hanh:  { label: 'Chờ PH',        emoji: '⏳', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  da_phat_hanh:   { label: 'Đã phát hành', emoji: '✅', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  da_huy:         { label: 'Đã hủy',        emoji: '❌', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  dieu_chinh:     { label: 'Điều chỉnh',    emoji: '✏️', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  thay_the:       { label: 'Thay thế',      emoji: '🔁', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
}

const formatVND = (n: number) =>
  n.toLocaleString('vi-VN', { maximumFractionDigits: 0 })

export function InvoicesClient({
  initial,
  providers,
  monthlyStats,
  canWrite,
  canDelete,
}: {
  initial: InvoiceRow[]
  providers: Provider[]
  monthlyStats: MonthlyStat[]
  canWrite: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('month')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'TM' | 'CK' | 'TM_CK'>('all')
  const [cqtFilter, setCqtFilter] = useState<'all' | 'da_cap_ma' | 'cho_cap_ma' | 'tu_choi' | 'chua_gui'>('all')
  const [hasErrorFilter, setHasErrorFilter] = useState(false)
  const [savedView, setSavedView] = useState<string>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable')
  const searchRef = useRef<HTMLInputElement>(null)

  // Cmd+K → focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setAdvancedOpen(false)
        if (document.activeElement === searchRef.current) searchRef.current?.blur()
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && canWrite) {
          window.location.href = '/admin/hoa-don/them-moi'
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canWrite])

  // Date preset → range
  const dateRange = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const day = now.getDate()
    if (datePreset === 'today') return { from: dateStr(now), to: dateStr(now) }
    if (datePreset === 'week') {
      const start = new Date(now)
      start.setDate(day - 7)
      return { from: dateStr(start), to: dateStr(now) }
    }
    if (datePreset === 'month') {
      return { from: dateStr(new Date(year, month, 1)), to: dateStr(new Date(year, month + 1, 0)) }
    }
    if (datePreset === 'quarter') {
      const qStart = Math.floor(month / 3) * 3
      return { from: dateStr(new Date(year, qStart, 1)), to: dateStr(new Date(year, qStart + 3, 0)) }
    }
    if (datePreset === 'year') {
      return { from: dateStr(new Date(year, 0, 1)), to: dateStr(new Date(year, 11, 31)) }
    }
    return null
  }, [datePreset])

  const effectiveDateRange = useMemo(() => {
    if (customDateFrom || customDateTo) {
      return { from: customDateFrom || '0000-01-01', to: customDateTo || '9999-12-31' }
    }
    return dateRange
  }, [customDateFrom, customDateTo, dateRange])

  // Filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return initial.filter((inv) => {
      // Date
      if (effectiveDateRange) {
        if (inv.issue_date < effectiveDateRange.from || inv.issue_date > effectiveDateRange.to) return false
      }
      // Status
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false
      // Provider
      if (providerFilter !== 'all' && inv.provider_id !== providerFilter) return false
      // Payment
      if (paymentFilter !== 'all' && inv.payment_method !== paymentFilter) return false
      // CQT
      if (cqtFilter !== 'all' && inv.cqt_status !== cqtFilter) return false
      // Amount
      if (amountMin && inv.total < Number(amountMin)) return false
      if (amountMax && inv.total > Number(amountMax)) return false
      // Has error (cqt rejected hoặc cancelled với reason)
      if (hasErrorFilter && inv.cqt_status !== 'tu_choi' && inv.status !== 'da_huy') return false
      // Search
      if (q) {
        const hay = `${inv.internal_no} ${inv.invoice_no ?? ''} ${inv.invoice_serial ?? ''} ${inv.buyer_name ?? ''} ${inv.buyer_tax_code ?? ''} ${inv.notes ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [initial, search, effectiveDateRange, statusFilter, providerFilter, paymentFilter, cqtFilter, amountMin, amountMax, hasErrorFilter])

  // Counts cho status pills (sau khi filter date)
  const statusCounts = useMemo(() => {
    const baseScope = initial.filter((inv) => {
      if (effectiveDateRange) {
        if (inv.issue_date < effectiveDateRange.from || inv.issue_date > effectiveDateRange.to) return false
      }
      return true
    })
    return {
      all: baseScope.length,
      nhap: baseScope.filter((i) => i.status === 'nhap').length,
      cho_phat_hanh: baseScope.filter((i) => i.status === 'cho_phat_hanh').length,
      da_phat_hanh: baseScope.filter((i) => i.status === 'da_phat_hanh').length,
      da_huy: baseScope.filter((i) => i.status === 'da_huy').length,
      dieu_chinh: baseScope.filter((i) => i.status === 'dieu_chinh').length,
    }
  }, [initial, effectiveDateRange])

  // KPIs
  const kpis = useMemo(() => {
    const issued = filtered.filter((i) => i.status === 'da_phat_hanh')
    const revenue = issued.reduce((s, i) => s + Number(i.total || 0), 0)
    const tax = issued.reduce((s, i) => s + Number(i.tax_amount || 0), 0)
    const draft = filtered.filter((i) => i.status === 'nhap').length
    const errors = filtered.filter((i) => i.cqt_status === 'tu_choi').length
    return { count: issued.length, revenue, tax, draft, errors }
  }, [filtered])

  const allSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id))
  const someSelected = filtered.some((i) => selected.has(i.id))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((i) => i.id)))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function applySavedView(view: string) {
    setSavedView(view)
    setSelected(new Set())
    if (view === 'today_issued') {
      setDatePreset('today')
      setStatusFilter('da_phat_hanh')
      setCqtFilter('all')
      setHasErrorFilter(false)
    } else if (view === 'errors') {
      setDatePreset('all')
      setStatusFilter('all')
      setCqtFilter('tu_choi')
      setHasErrorFilter(true)
    } else if (view === 'pending') {
      setDatePreset('all')
      setStatusFilter('cho_phat_hanh')
    } else if (view === 'drafts') {
      setDatePreset('all')
      setStatusFilter('nhap')
    } else if (view === 'sent') {
      setDatePreset('month')
      setStatusFilter('da_phat_hanh')
    }
  }

  function clearFilters() {
    setSearch('')
    setDatePreset('month')
    setCustomDateFrom('')
    setCustomDateTo('')
    setStatusFilter('all')
    setProviderFilter('all')
    setAmountMin('')
    setAmountMax('')
    setPaymentFilter('all')
    setCqtFilter('all')
    setHasErrorFilter(false)
    setSavedView('')
  }

  const hasActiveAdvancedFilter =
    providerFilter !== 'all' ||
    paymentFilter !== 'all' ||
    cqtFilter !== 'all' ||
    amountMin !== '' ||
    amountMax !== '' ||
    hasErrorFilter

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <KPI emoji="📤" label="HĐ phát hành" value={kpis.count.toString()} tone="from-emerald-500 to-teal-500" />
        <KPI emoji="💵" label="Doanh thu" value={formatVND(kpis.revenue)} tone="from-amber-500 to-orange-600" />
        <KPI emoji="🧾" label="Tổng thuế" value={formatVND(kpis.tax)} tone="from-blue-500 to-indigo-500" />
        <KPI emoji="📝" label="Nháp" value={kpis.draft.toString()} tone="from-gray-500 to-gray-600" />
        <KPI emoji="❌" label="Lỗi/Từ chối" value={kpis.errors.toString()} tone="from-red-500 to-pink-500" />
      </div>

      {/* Search + quick chips */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm số HĐ / nội bộ / tên người mua / MST / ghi chú..."
              className="w-full pl-9 pr-16 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 bg-gray-50 dark:bg-gray-900 hidden md:inline">
              Ctrl+K
            </span>
          </div>
          {canWrite && (
            <Link
              href="/admin/hoa-don/them-moi"
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold shadow whitespace-nowrap"
            >
              + Tạo HĐ
            </Link>
          )}
        </div>

        {/* Date chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-gray-500 mr-1">Thời gian:</span>
          {(
            [
              ['today', 'Hôm nay'],
              ['week', '7 ngày'],
              ['month', 'Tháng này'],
              ['quarter', 'Quý này'],
              ['year', 'Năm nay'],
              ['all', 'Tất cả'],
            ] as Array<[DatePreset, string]>
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => {
                setDatePreset(k)
                setCustomDateFrom('')
                setCustomDateTo('')
              }}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                datePreset === k && !customDateFrom && !customDateTo
                  ? 'bg-amber-500 text-white border-amber-500 font-semibold shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-amber-300'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="text-[11px] text-gray-400 mx-1">·</span>
          <input
            type="date"
            value={customDateFrom}
            onChange={(e) => setCustomDateFrom(e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1"
          />
          <span className="text-xs text-gray-400">→</span>
          <input
            type="date"
            value={customDateTo}
            onChange={(e) => setCustomDateTo(e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded px-2 py-1"
          />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-gray-500 mr-1">Trạng thái:</span>
          <StatusPill label="Tất cả" emoji="📋" count={statusCounts.all} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
          <StatusPill label="Nháp" emoji="📝" count={statusCounts.nhap} active={statusFilter === 'nhap'} onClick={() => setStatusFilter('nhap')} />
          <StatusPill label="Chờ PH" emoji="⏳" count={statusCounts.cho_phat_hanh} active={statusFilter === 'cho_phat_hanh'} onClick={() => setStatusFilter('cho_phat_hanh')} />
          <StatusPill label="Đã PH" emoji="✅" count={statusCounts.da_phat_hanh} active={statusFilter === 'da_phat_hanh'} onClick={() => setStatusFilter('da_phat_hanh')} color="emerald" />
          <StatusPill label="Hủy" emoji="❌" count={statusCounts.da_huy} active={statusFilter === 'da_huy'} onClick={() => setStatusFilter('da_huy')} color="red" />
          <StatusPill label="Điều chỉnh" emoji="✏️" count={statusCounts.dieu_chinh} active={statusFilter === 'dieu_chinh'} onClick={() => setStatusFilter('dieu_chinh')} />
        </div>

        {/* Toolbar row 3 */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAdvancedOpen(true)}
            className={`text-xs px-3 py-1.5 rounded-lg border ${
              hasActiveAdvancedFilter
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 text-amber-700 dark:text-amber-300 font-semibold'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            ⚙️ Bộ lọc nâng cao{hasActiveAdvancedFilter && ' ·'}
          </button>

          {hasActiveAdvancedFilter || statusFilter !== 'all' || customDateFrom || customDateTo || search ? (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              ↺ Xoá filter
            </button>
          ) : null}

          {/* Saved views */}
          <div className="ml-auto flex items-center gap-1 flex-wrap">
            <span className="text-[11px] text-gray-500 mr-1">Nhanh:</span>
            <SavedViewBtn label="🕐 Hôm nay" active={savedView === 'today_issued'} onClick={() => applySavedView('today_issued')} />
            <SavedViewBtn label="🚨 Lỗi" active={savedView === 'errors'} onClick={() => applySavedView('errors')} />
            <SavedViewBtn label="⏳ Chờ PH" active={savedView === 'pending'} onClick={() => applySavedView('pending')} />
            <SavedViewBtn label="📝 Nháp" active={savedView === 'drafts'} onClick={() => applySavedView('drafts')} />
            <SavedViewBtn label="📤 Đã gửi" active={savedView === 'sent'} onClick={() => applySavedView('sent')} />
          </div>
        </div>

        {/* Density toggle */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Hiển thị {filtered.length}/{initial.length} HĐ</span>
          <span className="mx-1">·</span>
          <button
            onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
            className="hover:text-gray-700 dark:hover:text-gray-300"
          >
            {density === 'compact' ? '📐 Thoải mái' : '📏 Thu gọn'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState canWrite={canWrite} hasFilters={search.length > 0 || statusFilter !== 'all' || hasActiveAdvancedFilter} onClear={clearFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allSelected && someSelected
                      }}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="text-left px-3 py-2">Số / Mã</th>
                  <th className="text-left px-3 py-2">Ngày</th>
                  <th className="text-left px-3 py-2">Người mua</th>
                  <th className="text-right px-3 py-2">Tiền (chưa thuế)</th>
                  <th className="text-right px-3 py-2">Thuế</th>
                  <th className="text-right px-3 py-2">Tổng</th>
                  <th className="text-left px-3 py-2">Trạng thái</th>
                  <th className="text-left px-3 py-2">CQT</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <InvoiceRowItem
                    key={inv.id}
                    inv={inv}
                    selected={selected.has(inv.id)}
                    onToggle={() => toggleOne(inv.id)}
                    density={density}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating selection bar */}
      {selected.size > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-30 bg-gray-900 dark:bg-gray-700 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-semibold">Đã chọn {selected.size}</span>
          <span className="h-5 w-px bg-gray-700 dark:bg-gray-600" />
          <button
            onClick={() => bulkAction('export-excel', selected, router)}
            className="text-xs bg-emerald-500 hover:bg-emerald-600 rounded px-3 py-1.5 font-semibold"
          >
            📊 Excel
          </button>
          <button
            onClick={() => bulkAction('zip-pdf', selected, router)}
            className="text-xs bg-blue-500 hover:bg-blue-600 rounded px-3 py-1.5 font-semibold"
          >
            ⬇️ ZIP PDF
          </button>
          <button
            onClick={() => bulkAction('email', selected, router)}
            className="text-xs bg-purple-500 hover:bg-purple-600 rounded px-3 py-1.5 font-semibold"
          >
            📧 Gửi mail
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-gray-300 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Advanced filter sheet */}
      {advancedOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setAdvancedOpen(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 sticky top-0 z-10">
              <h2 className="font-semibold">⚙️ Bộ lọc nâng cao</h2>
              <button onClick={() => setAdvancedOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1.5">Nhà cung cấp HĐĐT</label>
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
                >
                  <option value="all">Tất cả NCC</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5">Phương thức TT</label>
                <div className="flex gap-1">
                  {(['all', 'TM', 'CK', 'TM_CK'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPaymentFilter(p)}
                      className={`text-xs px-3 py-1.5 rounded border ${
                        paymentFilter === p
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {p === 'all' ? 'Tất cả' : p === 'TM' ? 'Tiền mặt' : p === 'CK' ? 'Chuyển khoản' : 'TM/CK'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5">Trạng thái CQT</label>
                <div className="flex gap-1 flex-wrap">
                  {(['all', 'da_cap_ma', 'cho_cap_ma', 'tu_choi', 'chua_gui'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCqtFilter(c)}
                      className={`text-xs px-3 py-1.5 rounded border ${
                        cqtFilter === c
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {c === 'all' ? 'Tất cả' : c === 'da_cap_ma' ? '✅ Đã cấp mã' : c === 'cho_cap_ma' ? '⏳ Chờ' : c === 'tu_choi' ? '❌ Từ chối' : 'Chưa gửi'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5">Khoảng tiền (VNĐ)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={amountMin}
                    onChange={(e) => setAmountMin(e.target.value)}
                    placeholder="Từ"
                    className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={amountMax}
                    onChange={(e) => setAmountMax(e.target.value)}
                    placeholder="Đến"
                    className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasErrorFilter}
                  onChange={(e) => setHasErrorFilter(e.target.checked)}
                />
                <span className="text-sm">🚨 Chỉ hiện HĐ có lỗi (CQT từ chối / hủy)</span>
              </label>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                <button
                  onClick={() => setAdvancedOpen(false)}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-2 text-sm font-semibold"
                >
                  Áp dụng
                </button>
                <button
                  onClick={() => {
                    clearFilters()
                    setAdvancedOpen(false)
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Xoá hết filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini-chart cuối trang */}
      {monthlyStats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            📈 Doanh thu HĐ 12 tháng gần nhất
          </h3>
          <MonthlyChart data={monthlyStats} />
        </div>
      )}
    </div>
  )
}

function bulkAction(action: string, selected: Set<string>, router: ReturnType<typeof useRouter>) {
  const ids = Array.from(selected).join(',')
  if (action === 'export-excel') {
    window.location.href = `/api/invoices/export-excel?ids=${ids}`
  } else if (action === 'zip-pdf') {
    window.location.href = `/api/invoices/export-zip?ids=${ids}`
  } else if (action === 'email') {
    if (!confirm(`Gửi HĐ qua email cho ${selected.size} người mua?`)) return
    fetch('/api/invoices/bulk-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected) }),
    }).then(async (r) => {
      const json = await r.json()
      alert(json.message || 'Đã gửi')
      router.refresh()
    })
  }
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function KPI({ emoji, label, value, tone }: { emoji: string; label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-xl p-3 bg-gradient-to-br ${tone} text-white shadow-sm`}>
      <div className="text-2xl mb-0.5">{emoji}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="font-bold text-lg leading-tight truncate">{value}</div>
    </div>
  )
}

function StatusPill({
  label,
  emoji,
  count,
  active,
  onClick,
  color,
}: {
  label: string
  emoji: string
  count: number
  active: boolean
  onClick: () => void
  color?: 'emerald' | 'red'
}) {
  const activeColor =
    color === 'emerald'
      ? 'bg-emerald-500 text-white border-emerald-500'
      : color === 'red'
      ? 'bg-red-500 text-white border-red-500'
      : 'bg-amber-500 text-white border-amber-500'
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1 transition-all ${
        active
          ? activeColor + ' font-semibold shadow-sm'
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-amber-300'
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
      <span
        className={`text-[10px] rounded-full px-1.5 ${
          active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function SavedViewBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded border ${
        active
          ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 text-amber-800 dark:text-amber-200 font-semibold'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-amber-300'
      }`}
    >
      {label}
    </button>
  )
}

function InvoiceRowItem({
  inv,
  selected,
  onToggle,
  density,
}: {
  inv: InvoiceRow
  selected: boolean
  onToggle: () => void
  density: 'compact' | 'comfortable'
}) {
  const status = STATUS_LABEL[inv.status]
  const padY = density === 'compact' ? 'py-1.5' : 'py-2.5'
  return (
    <tr className={`border-t border-gray-100 dark:border-gray-700 hover:bg-amber-50/30 dark:hover:bg-amber-950/10 ${selected ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}>
      <td className={`px-3 ${padY}`}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td className={`px-3 ${padY}`}>
        <Link href={`/admin/hoa-don/${inv.id}`} className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          {inv.invoice_no || inv.internal_no}
        </Link>
        {inv.invoice_serial && (
          <div className="text-[10px] text-gray-500">{inv.invoice_form ? `M${inv.invoice_form}/` : ''}{inv.invoice_serial}</div>
        )}
      </td>
      <td className={`px-3 ${padY} text-xs whitespace-nowrap`}>{formatDateVN(inv.issue_date)}</td>
      <td className={`px-3 ${padY}`}>
        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{inv.buyer_name || '—'}</div>
        {inv.buyer_tax_code && <div className="font-mono text-[10px] text-gray-500">MST: {inv.buyer_tax_code}</div>}
      </td>
      <td className={`px-3 ${padY} text-right font-mono text-xs`}>{formatVND(Number(inv.subtotal))}</td>
      <td className={`px-3 ${padY} text-right font-mono text-xs text-gray-500`}>{formatVND(Number(inv.tax_amount))}</td>
      <td className={`px-3 ${padY} text-right font-mono font-semibold`}>{formatVND(Number(inv.total))}</td>
      <td className={`px-3 ${padY}`}>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${status?.color}`}>
          {status?.emoji} {status?.label}
        </span>
      </td>
      <td className={`px-3 ${padY}`}>
        <CqtBadge status={inv.cqt_status} code={inv.cqt_code} />
      </td>
      <td className={`px-3 ${padY} text-right whitespace-nowrap`}>
        <Link href={`/admin/hoa-don/${inv.id}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-2">
          Mở
        </Link>
        <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer" className="text-xs text-gray-600 dark:text-gray-400 hover:underline">
          PDF
        </a>
      </td>
    </tr>
  )
}

function CqtBadge({ status, code }: { status: string; code: string | null }) {
  if (status === 'da_cap_ma') {
    return (
      <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono" title={code || ''}>
        ✓ Có mã
      </span>
    )
  }
  if (status === 'cho_cap_ma') return <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">⏳ Chờ</span>
  if (status === 'tu_choi') return <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">❌ Từ chối</span>
  return <span className="text-[10px] text-gray-400">—</span>
}

function EmptyState({ canWrite, hasFilters, onClear }: { canWrite: boolean; hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="p-12 text-center">
      <div className="text-6xl mb-3 opacity-50">{hasFilters ? '🔍' : '🧾'}</div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {hasFilters ? 'Không có HĐ khớp filter' : 'Chưa có HĐ nào'}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {hasFilters ? 'Thử bỏ bớt điều kiện lọc' : 'Tạo HĐ đầu tiên để bắt đầu phát hành'}
      </p>
      {hasFilters ? (
        <button onClick={onClear} className="text-sm text-amber-600 hover:underline">
          ↺ Xoá filter
        </button>
      ) : (
        canWrite && (
          <Link
            href="/admin/hoa-don/them-moi"
            className="inline-block bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg px-5 py-2 text-sm font-semibold shadow"
          >
            + Tạo HĐ đầu tiên
          </Link>
        )
      )}
    </div>
  )
}

function formatDateVN(s: string): string {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function MonthlyChart({ data }: { data: MonthlyStat[] }) {
  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month))
  const max = Math.max(...sorted.map((s) => Number(s.total_revenue || 0)), 1)
  return (
    <div className="flex items-end gap-1 h-32">
      {sorted.map((s) => {
        const h = (Number(s.total_revenue) / max) * 100
        const month = s.month.slice(5, 7)
        return (
          <div key={s.month} className="flex-1 flex flex-col items-center group">
            <div className="text-[9px] text-gray-500 mb-0.5 opacity-0 group-hover:opacity-100 whitespace-nowrap">
              {formatVND(Number(s.total_revenue))}
            </div>
            <div
              className="w-full bg-gradient-to-t from-amber-500 to-orange-400 rounded-t hover:opacity-80 transition-opacity"
              style={{ height: `${Math.max(h, 2)}%` }}
              title={`${s.month}: ${formatVND(Number(s.total_revenue))} đ — ${s.issued_count} HĐ`}
            />
            <div className="text-[10px] text-gray-500 mt-1">T{month}</div>
          </div>
        )
      })}
    </div>
  )
}
