import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import Link from 'next/link'
import { formatVnd } from '@/lib/utils/format'

// Card công nợ trên Dashboard — chỉ hiện cho người có quyền 'cong_no' read,
// và chỉ khi thực sự có công nợ. Tự truy vấn 2 view (RLS scope theo trại).
export async function CongNoDashboardCard() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx || !ctx.can('cong_no', 'read')) return null

  const supabase = await createClient()
  const [recRes, payRes] = await Promise.all([
    supabase.from('customer_receivables').select('amount_due, days_since_order'),
    supabase.from('supplier_debt').select('amount_due, days_since'),
  ])
  const rec = (recRes.data ?? []) as Array<{ amount_due: number; days_since_order: number }>
  const pay = (payRes.data ?? []) as Array<{ amount_due: number; days_since: number }>

  const totalRec = rec.reduce((s, r) => s + Number(r.amount_due), 0)
  const totalPay = pay.reduce((s, r) => s + Number(r.amount_due), 0)
  if (totalRec === 0 && totalPay === 0) return null

  const net = totalRec - totalPay
  const recOverdue = rec.filter((r) => r.days_since_order > 30).reduce((s, r) => s + Number(r.amount_due), 0)
  const payOverdue = pay.filter((r) => r.days_since > 30).reduce((s, r) => s + Number(r.amount_due), 0)
  const hasOverdue = recOverdue > 0 || payOverdue > 0

  return (
    <div className="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">💳 Công nợ</h3>
        <Link href="/admin/cong-no" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Xem chi tiết →</Link>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700">
        <Link href="/admin/cong-no/phai-thu" className="p-3 text-center hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10">
          <div className="text-[10.5px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phải thu</div>
          <div className="text-base md:text-lg font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">{formatVnd(totalRec)}</div>
        </Link>
        <Link href="/admin/cong-no/phai-tra" className="p-3 text-center hover:bg-red-50/40 dark:hover:bg-red-950/10">
          <div className="text-[10.5px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phải trả</div>
          <div className="text-base md:text-lg font-extrabold tabular-nums text-red-600 dark:text-red-400 mt-0.5">{formatVnd(totalPay)}</div>
        </Link>
        <div className="p-3 text-center">
          <div className="text-[10.5px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Chênh lệch</div>
          <div className={`text-base md:text-lg font-extrabold tabular-nums mt-0.5 ${net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {formatVnd(net)}
          </div>
        </div>
      </div>
      {hasOverdue && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 text-[11px] text-amber-800 dark:text-amber-300 border-t border-amber-100 dark:border-amber-900">
          ⚠️ Quá hạn 30 ngày: thu {formatVnd(recOverdue)} · trả {formatVnd(payOverdue)}
        </div>
      )}
    </div>
  )
}
