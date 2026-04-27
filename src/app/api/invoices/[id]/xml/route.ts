import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac/guard'

/**
 * Sinh XML chuẩn TT 78/2021/TT-BTC + QĐ 1450/QĐ-TCT cho 1 HĐ.
 * Format này có thể nộp trực tiếp lên cổng GDT (sau khi ký số).
 *
 * Schema gốc: <HDon><DLHDon><TTChung>...</TTChung><NDHDon>...</NDHDon></DLHDon></HDon>
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission('hoa_don', 'read')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const supabase = await createClient()

  const [invRes, itemsRes] = (await Promise.all([
    supabase.from('invoices_full').select('*').eq('id', id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
  ])) as [
    { data: Record<string, unknown> | null },
    { data: Array<Record<string, unknown>> | null }
  ]

  if (!invRes.data) return NextResponse.json({ error: 'Không tìm thấy HĐ' }, { status: 404 })

  const inv = invRes.data
  const items = itemsRes.data ?? []
  const seller = (inv.seller_snapshot as Record<string, string | null> | null) ?? {}

  // Group lines by tax rate cho block <THTTLTSuat>
  const taxGroups = new Map<number, { subtotal: number; tax: number }>()
  for (const it of items) {
    const rate = Number(it.tax_rate)
    const cur = taxGroups.get(rate) || { subtotal: 0, tax: 0 }
    cur.subtotal += Number(it.line_subtotal)
    cur.tax += Number(it.line_tax)
    taxGroups.set(rate, cur)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<HDon>
  <DLHDon Id="data">
    <TTChung>
      <PBan>2.0.0</PBan>
      <THDon>Hóa đơn giá trị gia tăng</THDon>
      <KHMSHDon>${esc(inv.invoice_form || '1')}</KHMSHDon>
      <KHHDon>${esc(inv.invoice_serial || '')}</KHHDon>
      <SHDon>${esc(inv.invoice_no || '')}</SHDon>
      <NLap>${esc(inv.issue_date)}</NLap>
      <DVTTe>${esc(inv.currency || 'VND')}</DVTTe>
      <TGia>${Number(inv.exchange_rate || 1)}</TGia>
      <HTTToan>${paymentLabel(inv.payment_method as string)}</HTTToan>
      <MSTTCGP></MSTTCGP>
      <TTHDon>${ttHDonCode(inv.status as string)}</TTHDon>
      <HTHDon>1</HTHDon>
    </TTChung>
    <NDHDon>
      <NBan>
        <Ten>${esc(seller.name)}</Ten>
        <MST>${esc(seller.tax_code)}</MST>
        <DChi>${esc(seller.address)}</DChi>
        ${seller.phone ? `<SDThoai>${esc(seller.phone)}</SDThoai>` : ''}
        ${seller.email ? `<DCThuDTu>${esc(seller.email)}</DCThuDTu>` : ''}
        ${seller.bank_account ? `<STKNHang>${esc(seller.bank_account)}</STKNHang>` : ''}
        ${seller.bank_name ? `<TNHang>${esc(seller.bank_name)}</TNHang>` : ''}
      </NBan>
      <NMua>
        <Ten>${esc(inv.buyer_name)}</Ten>
        ${inv.buyer_tax_code ? `<MST>${esc(inv.buyer_tax_code)}</MST>` : ''}
        <DChi>${esc(inv.buyer_address)}</DChi>
        ${inv.buyer_phone ? `<SDThoai>${esc(inv.buyer_phone)}</SDThoai>` : ''}
        ${inv.buyer_email ? `<DCThuDTu>${esc(inv.buyer_email)}</DCThuDTu>` : ''}
        ${inv.buyer_type === 'doanh_nghiep' ? '<HTTDVu>1</HTTDVu>' : '<HTTDVu>2</HTTDVu>'}
      </NMua>
      <DSHHDVu>
${items
  .map(
    (it, idx) => `        <HHDVu>
          <TChat>1</TChat>
          <STT>${idx + 1}</STT>
          ${it.product_code ? `<MHHDVu>${esc(it.product_code)}</MHHDVu>` : ''}
          <THHDVu>${esc(it.description)}</THHDVu>
          <DVTinh>${esc(it.unit)}</DVTinh>
          <SLuong>${Number(it.quantity)}</SLuong>
          <DGia>${Number(it.unit_price)}</DGia>
          ${Number(it.discount_pct) > 0 ? `<TLCKhau>${Number(it.discount_pct)}</TLCKhau>` : ''}
          ${Number(it.discount_amount || 0) > 0 ? `<STCKhau>${Number(it.discount_amount)}</STCKhau>` : ''}
          <ThTien>${Number(it.line_subtotal)}</ThTien>
          <TSuat>${taxRateXml(Number(it.tax_rate))}</TSuat>
        </HHDVu>`
  )
  .join('\n')}
      </DSHHDVu>
      <TToan>
${Array.from(taxGroups.entries())
  .map(
    ([rate, sums]) => `        <THTTLTSuat>
          <LTSuat>${taxRateXml(rate)}</LTSuat>
          <ThTien>${sums.subtotal}</ThTien>
          <TThue>${sums.tax}</TThue>
        </THTTLTSuat>`
  )
  .join('\n')}
        <TgTCThue>${Number(inv.subtotal)}</TgTCThue>
        <TgTThue>${Number(inv.tax_amount)}</TgTThue>
        <TTCKTMai>0</TTCKTMai>
        <TgTTTBSo>${Number(inv.total)}</TgTTTBSo>
        <TgTTTBChu>${esc(inv.total_words)}</TgTTTBChu>
      </TToan>
    </NDHDon>
  </DLHDon>
  <DLQRCode></DLQRCode>
</HDon>
`

  const fileName = `HD_${inv.invoice_no || inv.internal_no}.xml`
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}

function esc(s: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function paymentLabel(m: string): string {
  if (m === 'TM') return 'TM'
  if (m === 'CK') return 'CK'
  return 'TM/CK'
}

function ttHDonCode(s: string): string {
  // Mã trạng thái HĐ theo TT 78
  if (s === 'da_phat_hanh') return '1'
  if (s === 'da_huy') return '2'
  if (s === 'dieu_chinh') return '3'
  if (s === 'thay_the') return '4'
  return '0' // nháp
}

function taxRateXml(rate: number): string {
  if (rate === -1) return 'KCT'
  if (rate === -2) return 'KKKNT'
  return `${rate}%`
}
