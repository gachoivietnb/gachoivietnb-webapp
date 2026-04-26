import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatDate, formatVnd } from '@/lib/utils/format'
import { StatusPill, ORDER_STATUS_VARIANT } from '@/components/ui/StatusPill'

export const revalidate = 0

type Customer = {
  id: string
  name: string
  phone: string | null
  zalo: string | null
  facebook: string | null
  email: string | null
  address: string | null
  tier: string | null
  source: string | null
  notes: string | null
  total_purchased: number
  total_spent: number
  last_purchase_date: string | null
  created_at: string
}

type Order = {
  id: string
  order_code: string
  order_date: string
  status: string
  total_amount: number
  paid_amount: number
  deposit_amount: number | null
  deposit_date: string | null
  delivered_date: string | null
  payment_method: string | null
  bank_transfer_ref: string | null
  notes: string | null
  sales_items: Array<{
    id: string
    unit_price: number
    chicken: {
      chicken_code: string | null
      name: string | null
      breeds?: { name_vi: string } | null
    } | null
  }> | null
}

export default async function CustomerLedgerPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const supabase = await createClient()

  const { data: cRaw } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle()

  if (!cRaw) notFound()
  const c = cRaw as Customer

  const { data: ordersRaw } = await supabase
    .from('sales_orders')
    .select(
      'id, order_code, order_date, status, total_amount, paid_amount, deposit_amount, deposit_date, delivered_date, payment_method, bank_transfer_ref, notes, sales_items(id, unit_price, chicken:chickens(chicken_code, name, breeds(name_vi)))'
    )
    .eq('customer_id', customerId)
    .order('order_date', { ascending: false })

  const orders = (ordersRaw ?? []) as unknown as Order[]

  // Aggregations
  const activeOrders = orders.filter((o) => o.status !== 'huy')
  const totalInvoiced = activeOrders.reduce((s, o) => s + Number(o.total_amount), 0)
  const totalPaid = activeOrders.reduce((s, o) => s + Number(o.paid_amount ?? 0), 0)
  const totalDue = totalInvoiced - totalPaid
  const unpaidOrders = activeOrders.filter(
    (o) => Number(o.total_amount) - Number(o.paid_amount ?? 0) > 0
  )

  // Aging buckets — theo ngày trôi từ order_date đối với phần còn nợ
  const today = new Date()
  const buckets = { lt30: 0, b30_60: 0, b60_90: 0, gt90: 0 }
  for (const o of unpaidOrders) {
    const due = Number(o.total_amount) - Number(o.paid_amount ?? 0)
    if (due <= 0) continue
    const days = Math.floor(
      (today.getTime() - new Date(o.order_date).getTime()) / (86400 * 1000)
    )
    if (days < 30) buckets.lt30 += due
    else if (days < 60) buckets.b30_60 += due
    else if (days < 90) buckets.b60_90 += due
    else buckets.gt90 += due
  }

  // Payments timeline — synthesize từ deposit_date + delivered_date
  type Payment = { date: string; amount: number; note: string; orderCode: string }
  const payments: Payment[] = []
  for (const o of activeOrders) {
    if (o.deposit_amount && Number(o.deposit_amount) > 0 && o.deposit_date) {
      payments.push({
        date: o.deposit_date,
        amount: Number(o.deposit_amount),
        note: 'Đặt cọc',
        orderCode: o.order_code,
      })
    }
    const settledAmount = Number(o.paid_amount ?? 0) - Number(o.deposit_amount ?? 0)
    if (settledAmount > 0 && o.delivered_date) {
      payments.push({
        date: o.delivered_date,
        amount: settledAmount,
        note: 'Thanh toán khi giao',
        orderCode: o.order_code,
      })
    }
  }
  payments.sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          href="/admin/tai-chinh/bao-cao/cong-no"
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại công nợ
        </Link>
        <div className="flex gap-2">
          <a
            href={`/api/finance/reports/receivables-detail/${customerId}/export?format=excel`}
            className="border border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            📊 Xuất Excel
          </a>
          <a
            href={`/api/finance/reports/receivables-detail/${customerId}/export?format=pdf`}
            className="border border-red-500 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg px-3 py-1.5 text-xs font-medium"
          >
            📄 Xuất PDF
          </a>
        </div>
      </div>

      {/* Customer profile card */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-semibold shrink-0">
            {c.name.split(' ').slice(-1)[0]?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{c.name}</h1>
              {c.tier === 'vip' && (
                <span className="text-[10px] font-bold tracking-wider rounded px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  ★ VIP
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 space-x-3">
              {c.phone && <span>📞 {c.phone}</span>}
              {c.zalo && <span>💬 Zalo: {c.zalo}</span>}
              {c.email && <span>✉️ {c.email}</span>}
            </div>
            {c.address && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">📍 {c.address}</div>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Khách từ {formatDate(c.created_at)} · Lịch sử{' '}
              <strong className="text-gray-900 dark:text-gray-100">{c.total_purchased}</strong> đơn
              đã giao · đã chi tổng{' '}
              <strong className="text-gray-900 dark:text-gray-100">{formatVnd(c.total_spent)}</strong>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1"
              >
                📞 Gọi
              </a>
            )}
            {c.zalo && (
              <a
                href={`https://zalo.me/${c.zalo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium"
              >
                💬 Zalo
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Tổng hóa đơn" value={formatVnd(totalInvoiced)} accent="blue" />
        <Stat
          label="Đã thanh toán"
          value={formatVnd(totalPaid)}
          accent="emerald"
          sub={`${activeOrders.length} đơn`}
        />
        <Stat
          label="Còn nợ"
          value={formatVnd(totalDue)}
          accent={totalDue > 0 ? 'red' : 'gray'}
          sub={`${unpaidOrders.length} đơn chưa đủ`}
          big
        />
        <Stat
          label="Quá hạn (>30 ngày)"
          value={formatVnd(buckets.b30_60 + buckets.b60_90 + buckets.gt90)}
          accent="amber"
        />
      </div>

      {/* Aging breakdown */}
      {totalDue > 0 && (
        <section className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            📊 Phân tích thời hạn nợ
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <AgingBucket label="< 30 ngày" amount={buckets.lt30} color="emerald" />
            <AgingBucket label="30-60 ngày" amount={buckets.b30_60} color="amber" />
            <AgingBucket label="60-90 ngày" amount={buckets.b60_90} color="orange" />
            <AgingBucket label="> 90 ngày" amount={buckets.gt90} color="red" />
          </div>
        </section>
      )}

      {/* Orders ledger */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            📋 Sổ chi tiết đơn hàng ({orders.length} đơn)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Bao gồm cả đơn đã thanh toán đủ và đơn đã hủy
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs uppercase text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-3 py-2">Mã đơn</th>
                <th className="px-3 py-2">Ngày</th>
                <th className="px-3 py-2">Gà</th>
                <th className="px-3 py-2 text-right">Tổng</th>
                <th className="px-3 py-2 text-right">Đã trả</th>
                <th className="px-3 py-2 text-right">Còn nợ</th>
                <th className="px-3 py-2">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-900 dark:text-gray-100">
              {orders.map((o) => {
                const due = Number(o.total_amount) - Number(o.paid_amount ?? 0)
                const isUnpaid = due > 0 && o.status !== 'huy'
                const info = ORDER_STATUS_VARIANT[o.status]
                const days = Math.floor(
                  (today.getTime() - new Date(o.order_date).getTime()) / (86400 * 1000)
                )
                return (
                  <tr
                    key={o.id}
                    className={isUnpaid && days > 30 ? 'bg-red-50/40 dark:bg-red-950/20' : ''}
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/admin/ban-ra/${o.id}`}
                        className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {o.order_code}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(o.order_date)}
                      {isUnpaid && days > 0 && (
                        <div
                          className={`text-[10px] ${
                            days > 30
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-gray-500'
                          }`}
                        >
                          {days} ngày trước
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {o.sales_items && o.sales_items.length > 0
                        ? o.sales_items
                            .slice(0, 2)
                            .map(
                              (si) =>
                                si.chicken?.name ?? si.chicken?.chicken_code ?? '—'
                            )
                            .join(', ') +
                          (o.sales_items.length > 2 ? ` +${o.sales_items.length - 2}` : '')
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                      {formatVnd(Number(o.total_amount))}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-green-600 dark:text-green-400 whitespace-nowrap">
                      {formatVnd(Number(o.paid_amount ?? 0))}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right tabular-nums font-semibold whitespace-nowrap ${
                        due > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
                      }`}
                    >
                      {due > 0 ? formatVnd(due) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {info && <StatusPill variant={info.variant}>{info.label}</StatusPill>}
                    </td>
                  </tr>
                )
              })}
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    Khách hàng chưa có đơn hàng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payments timeline */}
      {payments.length > 0 && (
        <section className="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            💰 Lịch sử thanh toán
          </h2>
          <ul className="space-y-2">
            {payments.map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm">
                    ✓
                  </div>
                  <div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {p.note}{' '}
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {p.orderCode}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(p.date)}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                  + {formatVnd(p.amount)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.notes && (
        <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-sm text-amber-900 dark:text-amber-100">
          <strong>📝 Ghi chú:</strong> {c.notes}
        </section>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  accent,
  big,
}: {
  label: string
  value: string
  sub?: string
  accent?: 'emerald' | 'blue' | 'red' | 'amber' | 'gray'
  big?: boolean
}) {
  const accentMap: Record<string, string> = {
    emerald: 'border-l-emerald-500 text-emerald-600 dark:text-emerald-400',
    blue: 'border-l-blue-500 text-blue-600 dark:text-blue-400',
    red: 'border-l-red-500 text-red-600 dark:text-red-400',
    amber: 'border-l-amber-500 text-amber-700 dark:text-amber-400',
    gray: 'border-l-gray-400 text-gray-600 dark:text-gray-400',
  }
  const cls = accent ? accentMap[accent] : ''
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/80 dark:border-gray-700 border-l-4 shadow-sm ${cls}`}
    >
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">
        {label}
      </div>
      <div
        className={`${big ? 'text-2xl' : 'text-xl'} font-semibold mt-1.5 tabular-nums text-gray-900 dark:text-gray-100`}
      >
        {value}
      </div>
      {sub && <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">{sub}</div>}
    </div>
  )
}

function AgingBucket({
  label,
  amount,
  color,
}: {
  label: string
  amount: number
  color: 'emerald' | 'amber' | 'orange' | 'red'
}) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    orange: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900',
    red: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900',
  }
  return (
    <div className={`rounded-lg border p-3 ${map[color]}`}>
      <div className="text-xs uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold mt-1 tabular-nums">{formatVnd(amount)}</div>
    </div>
  )
}
