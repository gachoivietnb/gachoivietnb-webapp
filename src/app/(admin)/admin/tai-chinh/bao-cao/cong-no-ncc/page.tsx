import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatVnd } from '@/lib/utils/format'

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

type Agg = {
  supplier_id: string
  supplier_name: string
  phone: string | null
  total_due: number
  purchase_count: number
  oldest_days: number
}

const KIND_LABEL: Record<string, string> = {
  ga: '🐓 Gà',
  thuc_an: '🌾 Thức ăn',
  thuoc: '💊 Thuốc',
  vat_tu: '📦 Vật tư',
  khac: '📦 Khác',
}

export default async function PayablesPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('supplier_debt')
    .select('*')
    .order('days_since', { ascending: false })

  const rows = (data ?? []) as Row[]

  const bySup = new Map<string, Agg>()
  for (const r of rows) {
    const a =
      bySup.get(r.supplier_id) ?? {
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name,
        phone: r.phone,
        total_due: 0,
        purchase_count: 0,
        oldest_days: 0,
      }
    a.total_due += Number(r.amount_due)
    a.purchase_count += 1
    if (r.days_since > a.oldest_days) a.oldest_days = r.days_since
    bySup.set(r.supplier_id, a)
  }
  const suppliers = Array.from(bySup.values()).sort((x, y) => y.total_due - x.total_due)
  const totalDebt = rows.reduce((s, r) => s + Number(r.amount_due), 0)

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/admin/tai-chinh/bao-cao"
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại báo cáo
        </Link>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          💸 Công nợ phải trả nhà cung cấp
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {suppliers.length} NCC còn nợ · Tổng phải trả{' '}
          <b className="text-red-600 dark:text-red-400">{formatVnd(totalDebt)}đ</b> · Bấm NCC để ghi trả từng phiếu
        </p>
      </div>

      {/* Tổng quan */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <Stat label="Tổng phải trả" value={`${formatVnd(totalDebt)}đ`} emoji="💸" tone="red" />
        <Stat label="Số NCC còn nợ" value={String(suppliers.length)} emoji="🏢" />
        <Stat label="Số phiếu chưa tất toán" value={String(rows.length)} emoji="🧾" />
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Không có công nợ phải trả — đã tất toán hết với NCC.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Tổng hợp theo NCC */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <h3 className="font-bold text-sm">Tổng hợp theo nhà cung cấp</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left p-2.5">Nhà cung cấp</th>
                    <th className="text-right p-2.5">Số phiếu nợ</th>
                    <th className="text-right p-2.5">Nợ cũ nhất</th>
                    <th className="text-right p-2.5">Tổng phải trả</th>
                    <th className="p-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.supplier_id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-red-50/30 dark:hover:bg-red-950/10">
                      <td className="p-2.5">
                        <Link href={`/admin/nha-cung-cap/${s.supplier_id}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                          {s.supplier_name}
                        </Link>
                        {s.phone && <div className="text-xs text-gray-400">{s.phone}</div>}
                      </td>
                      <td className="p-2.5 text-right font-mono">{s.purchase_count}</td>
                      <td className="p-2.5 text-right">
                        <span className={`text-xs font-semibold ${s.oldest_days > 30 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                          {s.oldest_days} ngày
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-red-600 dark:text-red-400">{formatVnd(s.total_due)}đ</td>
                      <td className="p-2.5 text-right">
                        <Link href={`/admin/nha-cung-cap/${s.supplier_id}`} className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded px-2.5 py-1">
                          Xem / Trả
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chi tiết từng phiếu còn nợ */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <h3 className="font-bold text-sm">Chi tiết phiếu chưa tất toán ({rows.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left p-2.5">Phiếu</th>
                    <th className="text-left p-2.5">NCC</th>
                    <th className="text-left p-2.5">Loại</th>
                    <th className="text-right p-2.5">Tổng</th>
                    <th className="text-right p-2.5">Đã trả</th>
                    <th className="text-right p-2.5">Còn nợ</th>
                    <th className="text-right p-2.5">Tuổi nợ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.purchase_id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="p-2.5">
                        <Link href={`/admin/mua-vao/${r.purchase_id}`} className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          {r.purchase_code}
                        </Link>
                        <div className="text-xs text-gray-400">{r.purchase_date.split('-').reverse().join('/')}</div>
                      </td>
                      <td className="p-2.5 text-xs">{r.supplier_name}</td>
                      <td className="p-2.5 text-xs">{KIND_LABEL[r.kind ?? 'ga'] ?? r.kind}</td>
                      <td className="p-2.5 text-right font-mono text-xs">{formatVnd(Number(r.total_amount))}</td>
                      <td className="p-2.5 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">{formatVnd(Number(r.paid_amount))}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-red-600 dark:text-red-400">{formatVnd(Number(r.amount_due))}</td>
                      <td className="p-2.5 text-right">
                        <span className={`text-xs ${r.days_since > 30 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>{r.days_since}n</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, emoji, tone }: { label: string; value: string; emoji: string; tone?: 'red' }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <span>{emoji}</span> {label}
      </div>
      <div className={`text-lg font-bold mt-0.5 ${tone === 'red' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </div>
    </div>
  )
}
