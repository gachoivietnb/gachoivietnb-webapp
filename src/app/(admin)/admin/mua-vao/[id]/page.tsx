import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatDate, formatVnd } from '@/lib/utils/format'
import { numberToVietnameseWords } from '@/lib/utils/number-to-words'
import { PurchaseReceiptActions } from '@/components/admin/purchases/PurchaseReceiptActions'

export default async function PurchaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [purchaseRes, farmRes] = await Promise.all([
    supabase
      .from('purchases')
      .select(
        `
        *,
        supplier:suppliers(*),
        purchase_items(
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

  if (!purchaseRes.data) notFound()

  const p = purchaseRes.data as {
    id: string
    purchase_code: string
    purchase_date: string
    total_quantity: number
    total_amount: number
    notes: string | null
    supplier: {
      name: string
      phone: string | null
      address: string | null
      contact_person: string | null
    } | null
    purchase_items: Array<{
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

  const farm =
    ((farmRes.data as { value?: Record<string, string> } | null)?.value as Record<string, string>) ??
    {}
  const brandName = farm.name ?? 'Gà Chọi Việt NB'
  const brandAddress = farm.address ?? ''
  const brandPhone = farm.phone ?? ''

  const totalAmount = Number(p.total_amount)
  const totalQty = p.total_quantity || p.purchase_items.length
  const totalInWords = `${numberToVietnameseWords(Math.round(totalAmount))} đồng`

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden container mx-auto px-4 py-4 max-w-5xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/admin/mua-vao"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Link>
          <PurchaseReceiptActions purchaseId={p.id} purchaseCode={p.purchase_code} />
        </div>
      </div>

      {/* ===== RECEIPT DOCUMENT (also used as print target) ===== */}
      <article
        id="purchase-receipt"
        className="container mx-auto max-w-5xl px-4 pb-8 print:px-0 print:max-w-none"
      >
        <div className="bg-white dark:bg-gray-800 shadow-lg print:shadow-none rounded-xl print:rounded-none overflow-hidden border border-gray-200 dark:border-gray-700 print:border-0">
          {/* HEADER BRANDING */}
          <div className="px-6 md:px-10 py-6 md:py-8 bg-gradient-to-r from-blue-50 via-white to-indigo-50 dark:from-blue-950/30 dark:via-gray-800 dark:to-indigo-950/30 print:bg-white border-b-2 border-blue-600 dark:border-blue-500">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="text-xl md:text-2xl font-extrabold text-blue-700 dark:text-blue-400 print:text-blue-900 tracking-tight">
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
                  Mã phiếu
                </div>
                <div className="text-lg md:text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
                  {p.purchase_code}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ngày: <span className="font-semibold text-gray-900 dark:text-gray-200">{formatDate(p.purchase_date)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* TITLE */}
          <div className="px-6 md:px-10 pt-6 md:pt-8 text-center">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-wide uppercase">
              Phiếu Nhập Gà
            </h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
              (Biên nhận mua gà / phiếu nhập đàn)
            </p>
            <div className="mx-auto mt-3 w-20 h-0.5 bg-blue-600 dark:bg-blue-500" />
          </div>

          {/* SUPPLIER & PURCHASE INFO */}
          <div className="px-6 md:px-10 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoBlock title="Thông tin nhà cung cấp" icon="🏢">
              <Info label="Tên NCC" value={p.supplier?.name} />
              <Info label="Người liên hệ" value={p.supplier?.contact_person} />
              <Info label="Điện thoại" value={p.supplier?.phone} />
              <Info label="Địa chỉ" value={p.supplier?.address} />
            </InfoBlock>

            <InfoBlock title="Thông tin phiếu nhập" icon="📋">
              <Info label="Mã phiếu" value={p.purchase_code} mono />
              <Info label="Ngày nhập" value={formatDate(p.purchase_date)} />
              <Info label="Số lượng" value={`${totalQty} con`} />
              <Info
                label="Tổng thanh toán"
                value={formatVnd(totalAmount)}
                highlight
              />
            </InfoBlock>
          </div>

          {/* ITEMS TABLE */}
          <div className="px-6 md:px-10 pb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <span>📦</span>
              <span>Chi tiết từng con gà ({p.purchase_items.length})</span>
            </h3>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] uppercase tracking-wider">
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
                  {p.purchase_items.map((item, i) => {
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
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-red-600 dark:text-red-400 print:text-gray-900">
                          {formatVnd(item.unit_price)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-amber-50 dark:bg-amber-950/30 print:bg-amber-50 font-bold">
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-3 text-right uppercase tracking-wider text-amber-900 dark:text-amber-300 print:text-amber-900"
                    >
                      TỔNG CỘNG
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-lg text-amber-900 dark:text-amber-300 print:text-amber-900">
                      {formatVnd(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Amount in words */}
            <div className="mt-4 bg-blue-50 dark:bg-blue-950/30 print:bg-blue-50 border-l-4 border-blue-600 dark:border-blue-500 rounded-r-lg px-4 py-3">
              <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">
                Số tiền bằng chữ
              </div>
              <div className="text-sm md:text-base text-gray-900 dark:text-gray-100 italic font-semibold mt-1">
                {totalInWords}
              </div>
            </div>
          </div>

          {/* NOTES */}
          {p.notes && (
            <div className="px-6 md:px-10 pb-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 print:bg-gray-50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                  Ghi chú
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {p.notes}
                </p>
              </div>
            </div>
          )}

          {/* SIGNATURES */}
          <div className="px-6 md:px-10 pt-6 pb-10 grid grid-cols-2 gap-6 md:gap-12">
            <Signature title="Nhà cung cấp" subtitle="(Ký, ghi rõ họ tên)" />
            <Signature title="Đại diện trại" subtitle="(Ký, ghi rõ họ tên)" />
          </div>

          {/* FOOTER watermark */}
          <div className="print:block hidden border-t border-gray-200 text-center text-[10px] text-gray-400 py-2">
            Phiếu được xuất từ hệ thống quản lý {brandName} — {new Date().toLocaleString('vi-VN')}
          </div>
        </div>
      </article>

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
          .print\\:text-blue-900 { color: #1e3a8a !important; }
          .print\\:text-amber-900 { color: #78350f !important; }
          .print\\:bg-amber-50 { background: #fffbeb !important; }
          .print\\:bg-blue-50 { background: #eff6ff !important; }
          .print\\:bg-gray-50 { background: #f9fafb !important; }
          .print\\:no-underline { text-decoration: none !important; }
          nav, header, aside, .sidebar, [data-sidebar] { display: none !important; }
        }
      `,
        }}
      />
    </div>
  )
}

function InfoBlock({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
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
  highlight,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  highlight?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-xs text-gray-500 dark:text-gray-400 min-w-[90px]">{label}:</dt>
      <dd
        className={`font-semibold text-gray-900 dark:text-gray-100 ${mono ? 'font-mono' : ''} ${
          highlight ? 'text-red-600 dark:text-red-400 text-base print:text-gray-900' : ''
        }`}
      >
        {value}
      </dd>
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
