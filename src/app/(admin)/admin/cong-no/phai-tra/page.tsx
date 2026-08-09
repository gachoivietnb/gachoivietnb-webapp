import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatVnd } from '@/lib/utils/format'
import { SupplierPaymentButton } from '@/components/admin/suppliers/SupplierPaymentButton'

export const revalidate = 0

type Row = {
  supplier_id: string
  supplier_name: string
  phone: string | null
  purchase_id: string
  purchase_code: string
  purchase_date: string
  kind: string | null
  total_amount: number
  paid_amount: number
  amount_due: number
  payment_status: string
  days_since: number
}

const KIND_LABEL: Record<string, string> = {
  ga: '🐓 Gà',
  thuc_an: '🌾 Thức ăn',
  thuoc: '💊 Thuốc',
  vat_tu: '📦 Vật tư',
  khac: '📦 Khác',
}

export default async function PhaiTraPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('cong_no', 'read')) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Không có quyền xem công nợ.</div>
  }
  const canPay = ctx.can('mua_vao', 'write')

  const supabase = await createClient()
  const { data } = await supabase.from('supplier_debt').select('*').order('days_since', { ascending: false })
  const rows = (data ?? []) as Row[]
  const total = rows.reduce((s, r) => s + Number(r.amount_due), 0)

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href="/admin/cong-no" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" /> Tổng quan công nợ
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">📤 Phải trả — mình nợ NCC</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {rows.length} phiếu chưa tất toán · Tổng phải trả <b className="text-red-600 dark:text-red-400">{formatVnd(total)}đ</b>
            {canPay ? ' · Bấm “Trả” để ghi nhận (tự chi quỹ)' : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/cong-no/phai-tra/bao-cao" className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-3 py-2 text-sm font-medium">
            📊 Báo cáo theo kỳ
          </Link>
          <Link href="/admin/cong-no/phai-tra/so-chi-tiet" className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-3 py-2 text-sm font-medium">
            📒 Sổ chi tiết
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Không có công nợ phải trả — đã tất toán hết với NCC.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="text-[11px] uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="text-left p-2.5">Phiếu</th>
                  <th className="text-left p-2.5">NCC</th>
                  <th className="text-left p-2.5">Loại</th>
                  <th className="text-right p-2.5">Tổng</th>
                  <th className="text-right p-2.5">Đã trả</th>
                  <th className="text-right p-2.5">Còn nợ</th>
                  <th className="text-right p-2.5">Tuổi nợ</th>
                  <th className="p-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.purchase_id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-red-50/30 dark:hover:bg-red-950/10">
                    <td className="p-2.5">
                      <Link href={`/admin/mua-vao/${r.purchase_id}`} className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        {r.purchase_code}
                      </Link>
                      <div className="text-[11px] text-gray-400">{r.purchase_date.split('-').reverse().join('/')}</div>
                    </td>
                    <td className="p-2.5">
                      <Link href={`/admin/nha-cung-cap/${r.supplier_id}`} className="text-xs font-medium hover:underline">{r.supplier_name}</Link>
                      {r.phone && <div className="text-[11px] text-gray-400">{r.phone}</div>}
                    </td>
                    <td className="p-2.5 text-xs">{KIND_LABEL[r.kind ?? 'ga'] ?? r.kind}</td>
                    <td className="p-2.5 text-right font-mono text-xs">{formatVnd(Number(r.total_amount))}</td>
                    <td className="p-2.5 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">{formatVnd(Number(r.paid_amount))}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-red-600 dark:text-red-400">{formatVnd(Number(r.amount_due))}</td>
                    <td className="p-2.5 text-right">
                      <span className={`text-xs ${r.days_since > 30 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>{r.days_since}n</span>
                    </td>
                    <td className="p-2.5 text-right">
                      {canPay ? (
                        <SupplierPaymentButton purchaseId={r.purchase_id} purchaseCode={r.purchase_code} remaining={Math.max(0, Number(r.amount_due))} />
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
