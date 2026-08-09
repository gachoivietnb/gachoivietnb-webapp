import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatVnd } from '@/lib/utils/format'
import { CustomerCollectButton } from '@/components/admin/finance/CustomerCollectButton'

export const revalidate = 0

type Row = {
  customer_id: string
  customer_name: string
  phone: string | null
  order_id: string
  order_code: string
  order_date: string
  total_amount: number
  paid_amount: number
  amount_due: number
  status: string
  days_since_order: number
}

export default async function PhaiThuPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('cong_no', 'read')) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Không có quyền xem công nợ.</div>
  }
  const canCollect = ctx.can('ban_ra', 'write')

  const supabase = await createClient()
  const { data } = await supabase
    .from('customer_receivables')
    .select('*')
    .order('days_since_order', { ascending: false })
  const rows = (data ?? []) as Row[]
  const total = rows.reduce((s, r) => s + Number(r.amount_due), 0)

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin/cong-no" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" /> Tổng quan công nợ
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">📥 Phải thu — khách nợ mình</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {rows.length} đơn chưa thu đủ · Tổng phải thu <b className="text-emerald-600 dark:text-emerald-400">{formatVnd(total)}đ</b>
            {canCollect ? ' · Bấm “Thu” để ghi nhận (tự vào quỹ)' : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/cong-no/phai-thu/bao-cao" className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-3 py-2 text-sm font-medium">
            📊 Báo cáo theo kỳ
          </Link>
          <Link href="/admin/cong-no/phai-thu/so-chi-tiet" className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-3 py-2 text-sm font-medium">
            📒 Sổ chi tiết
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Không có công nợ phải thu — khách đã thanh toán hết.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-[11px] uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="text-left p-2.5">Đơn</th>
                  <th className="text-left p-2.5">Khách</th>
                  <th className="text-right p-2.5">Tổng</th>
                  <th className="text-right p-2.5">Đã thu</th>
                  <th className="text-right p-2.5">Còn nợ</th>
                  <th className="text-right p-2.5">Tuổi nợ</th>
                  <th className="p-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.order_id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10">
                    <td className="p-2.5">
                      <Link href={`/admin/ban-ra/${r.order_id}`} className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        {r.order_code}
                      </Link>
                      <div className="text-[11px] text-gray-400">{r.order_date.split('-').reverse().join('/')}</div>
                    </td>
                    <td className="p-2.5">
                      <div className="text-xs font-medium">{r.customer_name}</div>
                      {r.phone && <div className="text-[11px] text-gray-400">{r.phone}</div>}
                    </td>
                    <td className="p-2.5 text-right font-mono text-xs">{formatVnd(Number(r.total_amount))}</td>
                    <td className="p-2.5 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">{formatVnd(Number(r.paid_amount))}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-red-600 dark:text-red-400">{formatVnd(Number(r.amount_due))}</td>
                    <td className="p-2.5 text-right">
                      <span className={`text-xs ${r.days_since_order > 30 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>{r.days_since_order}n</span>
                    </td>
                    <td className="p-2.5 text-right">
                      {canCollect ? (
                        <CustomerCollectButton orderId={r.order_id} orderCode={r.order_code} remaining={Math.max(0, Number(r.amount_due))} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
