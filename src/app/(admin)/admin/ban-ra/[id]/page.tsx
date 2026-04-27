import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatDate, formatVnd } from '@/lib/utils/format'
import { numberToVietnameseWords } from '@/lib/utils/number-to-words'
import { OrderActions } from '@/components/admin/sales/OrderActions'
import { SalesReceiptActions } from '@/components/admin/sales/SalesReceiptActions'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  hoi_mua: {
    label: 'Hỏi mua',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  dat_coc: {
    label: 'Đã đặt cọc',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  da_giao: {
    label: 'Đã giao',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  },
  huy: {
    label: 'Đã hủy',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
}

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [orderRes, farmRes] = await Promise.all([
    supabase
      .from('sales_orders')
      .select(
        `
        *,
        customer:customers(*),
        sales_items(
          *,
          chicken:chickens(
            id, chicken_code, name, status, weight_kg, color, gender,
            breeds(name_vi)
          )
        )
      `
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('system_settings').select('value').eq('key', 'farm_info').maybeSingle(),
  ])

  if (!orderRes.data) notFound()

  const o = orderRes.data as {
    id: string
    order_code: string
    order_date: string
    status: string
    total_amount: number
    paid_amount: number
    deposit_amount: number
    delivered_date: string | null
    payment_method: string | null
    notes: string | null
    customer: {
      id: string
      name: string
      tier: string | null
      phone: string | null
      zalo: string | null
      address: string | null
    } | null
    sales_items: Array<{
      unit_price: number
      notes: string | null
      chicken: {
        id: string
        chicken_code: string
        name: string | null
        status: string
        weight_kg: number | null
        color: string | null
        gender: string | null
        breeds: { name_vi: string } | null
      } | null
    }>
  }

  // Fetch cost basis for internal profit preview (hidden on print/export)
  const chickenIds = o.sales_items.map((si) => si.chicken?.id).filter(Boolean) as string[]
  const { data: costRows } = chickenIds.length > 0
    ? await supabase.from('chicken_cost_basis').select('id, total_cost').in('id', chickenIds)
    : { data: [] }
  const costMap = new Map(
    (costRows ?? []).map((r) => [
      (r as { id: string; total_cost: number }).id,
      (r as { id: string; total_cost: number }).total_cost,
    ])
  )
  const totalCost = o.sales_items.reduce(
    (s, si) => s + (costMap.get(si.chicken?.id ?? '') ?? 0),
    0
  )
  const profit = o.total_amount - totalCost

  const farm =
    ((farmRes.data as { value?: Record<string, string> } | null)?.value as Record<string, string>) ??
    {}
  const brandName = farm.name ?? 'Gà Chọi Việt NB'
  const brandAddress = farm.address ?? ''
  const brandPhone = farm.phone ?? ''

  const totalAmount = Number(o.total_amount)
  const paid = Number(o.paid_amount ?? 0)
  const deposit = Number(o.deposit_amount ?? 0)
  const remaining = totalAmount - paid
  const totalQty = o.sales_items.length
  const totalInWords = `${numberToVietnameseWords(Math.round(totalAmount))} đồng`
  const statusInfo = STATUS_LABELS[o.status] ?? { label: o.status, color: 'bg-gray-100' }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden container mx-auto px-4 py-4 max-w-5xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/admin/ban-ra"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/admin/hoa-don/them-moi?from_sale=${o.id}`}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white rounded-lg px-3 py-2 text-sm font-semibold shadow"
              title="Tạo HĐ điện tử từ phiếu bán này — pre-fill khách + items"
            >
              🧾 Phát hành HĐ điện tử
            </Link>
            <SalesReceiptActions orderId={o.id} orderCode={o.order_code} />
          </div>
        </div>
      </div>

      {/* ===== RECEIPT DOCUMENT ===== */}
      <article
        id="sales-receipt"
        className="container mx-auto max-w-5xl px-4 pb-8 print:px-0 print:max-w-none"
      >
        <div className="bg-white dark:bg-gray-800 shadow-lg print:shadow-none rounded-xl print:rounded-none overflow-hidden border border-gray-200 dark:border-gray-700 print:border-0">
          {/* HEADER BRANDING */}
          <div className="px-6 md:px-10 py-6 md:py-8 bg-gradient-to-r from-emerald-50 via-white to-green-50 dark:from-emerald-950/30 dark:via-gray-800 dark:to-green-950/30 print:bg-white border-b-2 border-emerald-600 dark:border-emerald-500">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="text-xl md:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 print:text-emerald-900 tracking-tight">
                  {brandName}
                </div>
                {brandAddress && (
                  <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    📍 {brandAddress}
                  </div>
                )}
                {brandPhone && (
                  <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    ☎ {brandPhone}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold tracking-widest text-gray-500 dark:text-gray-400 uppercase">
                  Mã hoá đơn
                </div>
                <div className="text-lg md:text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
                  {o.order_code}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ngày: <span className="font-semibold text-gray-900 dark:text-gray-200">{formatDate(o.order_date)}</span>
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-block text-[11px] font-bold tracking-wider rounded-full px-3 py-1 ${statusInfo.color} print:ring-1 print:ring-gray-400`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TITLE */}
          <div className="px-6 md:px-10 pt-6 md:pt-8 text-center">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-wide uppercase">
              Hoá Đơn Bán Gà
            </h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
              (Biên nhận giao dịch bán gà chọi)
            </p>
            <div className="mx-auto mt-3 w-20 h-0.5 bg-emerald-600 dark:bg-emerald-500" />
          </div>

          {/* CUSTOMER & ORDER INFO */}
          <div className="px-6 md:px-10 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoBlock title="Thông tin khách hàng" icon="👤">
              <Info
                label="Tên khách"
                value={
                  o.customer?.name
                    ? `${o.customer.name}${o.customer.tier === 'vip' ? ' ★ VIP' : ''}`
                    : '—'
                }
              />
              <Info label="Điện thoại" value={o.customer?.phone} />
              <Info label="Zalo" value={o.customer?.zalo} />
              <Info label="Địa chỉ" value={o.customer?.address} />
            </InfoBlock>

            <InfoBlock title="Thông tin đơn hàng" icon="📋">
              <Info label="Mã đơn" value={o.order_code} mono />
              <Info label="Ngày đặt" value={formatDate(o.order_date)} />
              {o.delivered_date && (
                <Info label="Ngày giao" value={formatDate(o.delivered_date)} />
              )}
              <Info label="Số lượng" value={`${totalQty} con`} />
              {o.payment_method && <Info label="Phương thức TT" value={o.payment_method} />}
            </InfoBlock>
          </div>

          {/* ITEMS TABLE */}
          <div className="px-6 md:px-10 pb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <span>🐓</span>
              <span>Chi tiết gà bán ({o.sales_items.length})</span>
            </h3>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-emerald-600 to-green-600 text-white text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-10">STT</th>
                    <th className="px-3 py-2.5 text-left">Mã gà</th>
                    <th className="px-3 py-2.5 text-left">Tên</th>
                    <th className="px-3 py-2.5 text-left">Giống</th>
                    <th className="px-3 py-2.5 text-center w-16">Giới</th>
                    <th className="px-3 py-2.5 text-left">Màu</th>
                    <th className="px-3 py-2.5 text-right w-20">Cân (kg)</th>
                    <th className="px-3 py-2.5 text-right w-32">Đơn giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {o.sales_items.map((item, i) => {
                    const c = item.chicken
                    return (
                      <tr
                        key={i}
                        className={`${i % 2 === 1 ? 'bg-gray-50/60 dark:bg-gray-900/30' : ''}`}
                      >
                        <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400 font-semibold">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {c ? (
                            <Link
                              href={`/admin/ho-so-ga/${c.id}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold print:text-gray-900 print:no-underline"
                            >
                              {c.chicken_code}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2">{c?.name ?? '—'}</td>
                        <td className="px-3 py-2">{c?.breeds?.name_vi ?? '—'}</td>
                        <td className="px-3 py-2 text-center text-xs">
                          {c?.gender === 'trong' ? '♂ Trống' : c?.gender === 'mai' ? '♀ Mái' : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                          {c?.color ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {c?.weight_kg != null ? Number(c.weight_kg).toFixed(2) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 print:text-gray-900">
                          {formatVnd(item.unit_price)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-emerald-50 dark:bg-emerald-950/30 print:bg-emerald-50 font-bold">
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-3 text-right uppercase tracking-wider text-emerald-900 dark:text-emerald-300 print:text-emerald-900"
                    >
                      TỔNG CỘNG
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-lg text-emerald-900 dark:text-emerald-300 print:text-emerald-900">
                      {formatVnd(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payment summary */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <PaymentBox
                label="Đặt cọc"
                value={deposit}
                tint="amber"
                hideIfZero={deposit === 0}
              />
              <PaymentBox label="Đã thanh toán" value={paid} tint="green" />
              <PaymentBox
                label={remaining > 0 ? 'Còn nợ' : 'Đã tất toán'}
                value={remaining}
                tint={remaining > 0 ? 'red' : 'green'}
              />
            </div>

            {/* Amount in words */}
            <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/30 print:bg-emerald-50 border-l-4 border-emerald-600 dark:border-emerald-500 rounded-r-lg px-4 py-3">
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                Số tiền bằng chữ
              </div>
              <div className="text-sm md:text-base text-gray-900 dark:text-gray-100 italic font-semibold mt-1">
                {totalInWords}
              </div>
            </div>

            {/* Internal profit preview — hidden when printing */}
            {totalCost > 0 && (
              <div className="print:hidden mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200/50 dark:border-purple-900/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-widest">
                    🔒 Chỉ nội bộ — Phân tích lãi lỗ
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Doanh thu</div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                      {formatVnd(totalAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Giá vốn</div>
                    <div className="font-bold text-gray-700 dark:text-gray-300">
                      {formatVnd(totalCost)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Lãi/Lỗ</div>
                    <div
                      className={`font-bold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                    >
                      {profit >= 0 ? '+' : ''}
                      {formatVnd(profit)}
                      {totalAmount > 0 && (
                        <span className="text-xs ml-1">
                          ({((profit / totalAmount) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* NOTES */}
          {o.notes && (
            <div className="px-6 md:px-10 pb-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 print:bg-gray-50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                  Ghi chú
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {o.notes}
                </p>
              </div>
            </div>
          )}

          {/* SIGNATURES */}
          <div className="px-6 md:px-10 pt-6 pb-10 grid grid-cols-2 gap-6 md:gap-12">
            <Signature title="Người mua" subtitle="(Ký, ghi rõ họ tên)" />
            <Signature title="Người bán" subtitle="(Ký, ghi rõ họ tên)" />
          </div>

          {/* FOOTER watermark (only on print) */}
          <div className="print:block hidden border-t border-gray-200 text-center text-[10px] text-gray-400 py-2">
            Hoá đơn được xuất từ hệ thống quản lý {brandName} — {new Date().toLocaleString('vi-VN')}
          </div>
        </div>
      </article>

      {/* Admin order actions (update status/payment) — hidden on print */}
      <div className="print:hidden container mx-auto px-4 pb-8 max-w-5xl">
        <OrderActions
          orderId={o.id}
          orderCode={o.order_code}
          status={o.status}
          totalAmount={o.total_amount}
          paidAmount={o.paid_amount}
        />
      </div>

      {/* Print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: A4 portrait; margin: 12mm 10mm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:px-0 { padding-left: 0 !important; padding-right: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:text-gray-900 { color: #111827 !important; }
          .print\\:text-emerald-900 { color: #064e3b !important; }
          .print\\:bg-emerald-50 { background: #ecfdf5 !important; }
          .print\\:bg-gray-50 { background: #f9fafb !important; }
          .print\\:no-underline { text-decoration: none !important; }
          .print\\:ring-1 { box-shadow: inset 0 0 0 1px #9ca3af !important; }
          nav, header, aside, .sidebar, [data-sidebar] { display: none !important; }
        }
      `,
        }}
      />
    </div>
  )
}

function InfoBlock({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/40 print:bg-gray-50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
        <span className="text-sm">{icon}</span>
        <span>{title}</span>
      </div>
      <dl className="space-y-1.5 text-sm">{children}</dl>
    </div>
  )
}

function Info({
  label,
  value,
  mono,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-xs text-gray-500 dark:text-gray-400 min-w-[90px]">{label}:</dt>
      <dd
        className={`font-semibold text-gray-900 dark:text-gray-100 ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}

function PaymentBox({
  label,
  value,
  tint,
  hideIfZero,
}: {
  label: string
  value: number
  tint: 'amber' | 'green' | 'red'
  hideIfZero?: boolean
}) {
  if (hideIfZero) return <div className="hidden md:block" aria-hidden />
  const map: Record<string, string> = {
    amber:
      'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300',
    green:
      'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 text-green-800 dark:text-green-300',
    red: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300',
  }
  return (
    <div
      className={`border rounded-lg px-4 py-3 ${map[tint]} print:ring-1 print:ring-gray-400 print:bg-white`}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</div>
      <div className="text-lg font-extrabold tabular-nums mt-0.5">{formatVnd(value)}</div>
    </div>
  )
}

function Signature({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
        {title}
      </div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 italic mt-0.5">{subtitle}</div>
      <div className="h-20 border-b border-dashed border-gray-400 dark:border-gray-600 mx-6 md:mx-10 mt-2" />
    </div>
  )
}
