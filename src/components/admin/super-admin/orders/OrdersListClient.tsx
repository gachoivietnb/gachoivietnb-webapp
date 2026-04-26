'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  formatVnd,
  ORDER_STATUS_META,
  type SubscriptionOrder,
} from '@/lib/payment/shared'
import { TIER_LABEL, TIER_COLOR } from '@/lib/multitenancy/tiers'

type OrderRow = SubscriptionOrder & { farm_name?: string; farm_slug?: string }

const STATUSES: Array<SubscriptionOrder['status'] | 'all'> = [
  'all',
  'pending',
  'paid',
  'cancelled',
  'expired',
]

export function OrdersListClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders)
  const [filter, setFilter] = useState<SubscriptionOrder['status'] | 'all'>('all')
  const [search, setSearch] = useState('')
  const [busy, startTransition] = useTransition()
  const [actingId, setActingId] = useState<string | null>(null)

  const filtered = orders.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        o.payment_note.toLowerCase().includes(s) ||
        (o.farm_name ?? '').toLowerCase().includes(s) ||
        (o.farm_slug ?? '').toLowerCase().includes(s)
      )
    }
    return true
  })

  async function refresh(status?: SubscriptionOrder['status'] | 'all') {
    const url =
      status && status !== 'all'
        ? `/api/super-admin/orders?status=${status}`
        : '/api/super-admin/orders'
    const res = await fetch(url)
    if (res.ok) {
      const json = await res.json()
      setOrders(json.data ?? [])
    }
  }

  useEffect(() => {
    refresh(filter).catch(() => {})
  }, [filter])

  async function confirmOrder(o: OrderRow) {
    if (
      !confirm(
        `Xác nhận đã NHẬN ${formatVnd(o.amount_vnd)} từ ${o.farm_name}?\n\n` +
          `Sau khi xác nhận:\n` +
          `• Farm "${o.farm_name}" sẽ được nâng lên gói ${TIER_LABEL[o.tier]}\n` +
          `• Subscription gia hạn ${o.months} tháng\n` +
          `• Mã: ${o.payment_note}`
      )
    )
      return
    setActingId(o.id)
    const res = await fetch(`/api/super-admin/orders/${o.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm' }),
    })
    setActingId(null)
    if (!res.ok) {
      const j = await res.json()
      alert('Lỗi: ' + (typeof j.error === 'string' ? j.error : 'unknown'))
      return
    }
    startTransition(() => {
      refresh(filter)
      router.refresh()
    })
  }

  async function cancelOrderAction(o: OrderRow) {
    const reason = prompt('Lý do huỷ đơn (tuỳ chọn):', '')
    if (reason === null) return
    setActingId(o.id)
    const res = await fetch(`/api/super-admin/orders/${o.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', reason: reason || undefined }),
    })
    setActingId(null)
    if (!res.ok) {
      const j = await res.json()
      alert('Lỗi: ' + (typeof j.error === 'string' ? j.error : 'unknown'))
      return
    }
    startTransition(() => {
      refresh(filter)
      router.refresh()
    })
  }

  const stats = {
    pending: orders.filter((o) => o.status === 'pending').length,
    paid: orders.filter((o) => o.status === 'paid').length,
    revenue: orders
      .filter((o) => o.status === 'paid')
      .reduce((s, o) => s + o.amount_vnd, 0),
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          emoji="⏳"
          label="Đơn chờ xác nhận"
          value={stats.pending}
          tone="from-amber-500 to-orange-500"
        />
        <KpiCard
          emoji="✅"
          label="Đơn đã thanh toán"
          value={stats.paid}
          tone="from-emerald-500 to-teal-500"
        />
        <KpiCard
          emoji="💰"
          label="Doanh thu (đã thu)"
          value={formatVnd(stats.revenue)}
          tone="from-violet-500 to-purple-600"
        />
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => {
            const active = filter === s
            const meta = s === 'all' ? null : ORDER_STATUS_META[s]
            const count =
              s === 'all'
                ? orders.length
                : orders.filter((o) => o.status === s).length
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition ' +
                  (active
                    ? 'bg-orange-500 text-white shadow'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600')
                }
              >
                {meta?.emoji ?? '📋'} {s === 'all' ? 'Tất cả' : meta?.label}
                <span className="ml-1.5 opacity-60">({count})</span>
              </button>
            )
          })}
        </div>
        <div className="ml-auto">
          <input
            type="search"
            placeholder="Tìm mã đơn / tên trại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <div className="text-5xl mb-3">📭</div>
            <div className="text-sm">Không có đơn nào</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Mã ghi chú</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Trại</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Gói</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Số tiền</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Trạng thái</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Tạo lúc</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((o) => {
                  const tierColor = TIER_COLOR[o.tier]
                  const statusMeta = ORDER_STATUS_META[o.status]
                  const acting = actingId === o.id || busy
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        <div className="font-semibold">{o.payment_note}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          ID: {o.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {o.farm_name ?? '—'}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">{o.farm_slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            'px-2 py-0.5 rounded text-xs font-semibold border ' +
                            (tierColor?.cls ?? '')
                          }
                        >
                          {TIER_LABEL[o.tier]}
                        </span>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {o.months} tháng
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatVnd(o.amount_vnd)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ' +
                            statusMeta.cls
                          }
                        >
                          {statusMeta.emoji} {statusMeta.label}
                        </span>
                        {o.status === 'paid' && o.paid_at && (
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                            ✓ {new Date(o.paid_at).toLocaleString('vi-VN')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {new Date(o.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {o.status === 'pending' && (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => confirmOrder(o)}
                              disabled={acting}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50"
                            >
                              {acting ? '...' : '✅ Xác nhận'}
                            </button>
                            <button
                              onClick={() => cancelOrderAction(o)}
                              disabled={acting}
                              className="bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50"
                            >
                              Huỷ
                            </button>
                          </div>
                        )}
                        {o.status === 'paid' && o.confirmed_by && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {o.casso_txn_id ? '🤖 Auto' : '👤 Manual'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  emoji,
  label,
  value,
  tone,
}: {
  emoji: string
  label: string
  value: string | number
  tone: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
      <div
        className={
          'w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg shadow bg-gradient-to-br ' +
          tone
        }
      >
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</div>
        <div className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {value}
        </div>
      </div>
    </div>
  )
}
