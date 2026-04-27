import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac/guard'
import QRCode from 'qrcode'

/**
 * Trả về HTML print-friendly của HĐ — user có thể Ctrl+P để in / lưu PDF.
 * Format theo TT 78/2021/TT-BTC.
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

  const inv = invRes.data as Record<string, unknown>
  const items = (itemsRes.data ?? []) as Array<Record<string, unknown>>

  const seller = (inv.seller_snapshot as Record<string, string | null> | null) ?? {}

  // QR code: link tra cứu — TODO khi có URL thật của NCC, thay bằng URL đó
  const lookupUrl = inv.cqt_lookup_code
    ? `https://hoadondientu.gdt.gov.vn/?lookup=${inv.cqt_lookup_code}`
    : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://gachoivietnb.com'}/hoa-don/${id}`
  const qrDataUrl = await QRCode.toDataURL(lookupUrl, { margin: 1, width: 120 })

  const html = renderInvoiceHtml({ inv, items, seller, qrDataUrl, lookupUrl })

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function fmt(n: unknown): string {
  return Number(n || 0).toLocaleString('vi-VN')
}
function esc(s: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderInvoiceHtml({
  inv,
  items,
  seller,
  qrDataUrl,
  lookupUrl,
}: {
  inv: Record<string, unknown>
  items: Array<Record<string, unknown>>
  seller: Record<string, string | null>
  qrDataUrl: string
  lookupUrl: string
}): string {
  const issueDate = String(inv.issue_date || '').split('-')
  const dateStr = issueDate.length === 3 ? `Ngày ${issueDate[2]} tháng ${issueDate[1]} năm ${issueDate[0]}` : ''
  const isCancelled = inv.status === 'da_huy'

  const itemRows = items
    .map((it, idx) => `
      <tr>
        <td class="ct">${idx + 1}</td>
        <td>${esc(it.description)}</td>
        <td class="ct">${esc(it.unit)}</td>
        <td class="rt num">${fmt(it.quantity)}</td>
        <td class="rt num">${fmt(it.unit_price)}</td>
        <td class="ct">${esc(it.tax_rate_label || `${it.tax_rate}%`)}</td>
        <td class="rt num">${fmt(it.line_subtotal)}</td>
        <td class="rt num">${fmt(it.line_tax)}</td>
        <td class="rt num"><b>${fmt(it.line_total)}</b></td>
      </tr>
    `).join('')

  const blankRows = Math.max(0, 5 - items.length)
  let blanks = ''
  for (let i = 0; i < blankRows; i++) {
    blanks += `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>HĐ ${esc(inv.invoice_no || inv.internal_no)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; font-size: 13px; color: #000; margin: 0; padding: 20px; background: #f3f4f6; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; padding: 20mm; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: relative; }
  .watermark-cancel { position: absolute; top: 40%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-size: 100px; color: rgba(220,38,38,0.15); font-weight: bold; pointer-events: none; }
  .toolbar { max-width: 210mm; margin: 0 auto 12px; display: flex; gap: 8px; justify-content: flex-end; }
  .toolbar button { background: #d97706; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
  .toolbar button:hover { background: #b45309; }
  .header { text-align: center; margin-bottom: 16px; }
  .h-form { font-size: 11px; text-align: right; color: #666; margin-bottom: 4px; }
  .h-title { font-weight: bold; font-size: 22px; margin: 8px 0 4px; }
  .h-sub { font-size: 12px; color: #444; }
  .h-meta { display: flex; justify-content: space-between; margin: 6px 0 2px; font-size: 11px; color: #555; }
  .seller-buyer { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; border: 1px solid #999; border-radius: 4px; padding: 10px; margin-bottom: 12px; }
  .sb-block label { font-size: 10px; text-transform: uppercase; color: #666; letter-spacing: 0.04em; }
  .sb-block .name { font-weight: bold; font-size: 14px; margin: 2px 0; }
  .sb-block .row { font-size: 12px; margin: 1px 0; }
  table.items { width: 100%; border-collapse: collapse; margin: 8px 0; }
  table.items th { background: #f3f4f6; border: 1px solid #999; padding: 6px 4px; font-size: 11px; }
  table.items td { border: 1px solid #999; padding: 5px 4px; vertical-align: top; }
  .ct { text-align: center; }
  .rt { text-align: right; }
  .num { font-family: 'Courier New', monospace; }
  .totals { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; padding: 8px 4px; }
  .totals .label { text-align: right; }
  .totals .val { text-align: right; font-family: 'Courier New', monospace; min-width: 130px; }
  .totals .grand { font-weight: bold; font-size: 15px; border-top: 1px solid #999; padding-top: 6px; }
  .words { font-style: italic; padding: 6px 4px; border-top: 1px dashed #999; }
  .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
  .sign-block { text-align: center; padding: 8px; }
  .sign-block .role { font-weight: bold; }
  .sign-block .digital { font-size: 10px; color: #666; margin-top: 28px; padding: 4px; background: #fef3c7; border-radius: 4px; }
  .qr-block { display: flex; gap: 8px; align-items: flex-start; padding: 8px; border: 1px dashed #999; border-radius: 4px; margin-top: 12px; }
  .qr-block img { width: 100px; height: 100px; }
  .qr-block .desc { font-size: 10px; color: #444; }
  @media print {
    body { background: white; padding: 0; }
    .toolbar { display: none; }
    .page { box-shadow: none; padding: 15mm; margin: 0; }
    @page { size: A4; margin: 0; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <button onclick="window.print()">🖨 In hóa đơn</button>
  <button onclick="window.close()" style="background:#6b7280;">Đóng</button>
</div>
<div class="page">
  ${isCancelled ? '<div class="watermark-cancel">ĐÃ HỦY</div>' : ''}
  <div class="header">
    <div class="h-form">
      Mẫu số: <b>${esc(inv.invoice_form || '1')}</b> &nbsp;·&nbsp;
      Ký hiệu: <b>${esc(inv.invoice_serial || '')}</b> &nbsp;·&nbsp;
      Số: <b>${esc(inv.invoice_no || inv.internal_no)}</b>
    </div>
    <div class="h-title">HÓA ĐƠN GIÁ TRỊ GIA TĂNG</div>
    <div class="h-sub">${dateStr}</div>
    ${inv.cqt_code ? `<div class="h-sub" style="color:#059669;">Mã của cơ quan thuế: <b>${esc(inv.cqt_code)}</b></div>` : ''}
  </div>

  <div class="seller-buyer">
    <div class="sb-block">
      <label>Đơn vị bán</label>
      <div class="name">${esc(seller.name)}</div>
      <div class="row"><b>Mã số thuế:</b> ${esc(seller.tax_code)}</div>
      <div class="row"><b>Địa chỉ:</b> ${esc(seller.address)}</div>
      ${seller.phone ? `<div class="row"><b>Điện thoại:</b> ${esc(seller.phone)}</div>` : ''}
      ${seller.bank_account ? `<div class="row"><b>STK:</b> ${esc(seller.bank_account)} - ${esc(seller.bank_name)}</div>` : ''}
    </div>
    <div class="sb-block">
      <label>Người mua hàng</label>
      <div class="name">${esc(inv.buyer_name)}</div>
      ${inv.buyer_tax_code ? `<div class="row"><b>Mã số thuế:</b> ${esc(inv.buyer_tax_code)}</div>` : ''}
      <div class="row"><b>Địa chỉ:</b> ${esc(inv.buyer_address)}</div>
      ${inv.buyer_phone ? `<div class="row"><b>Điện thoại:</b> ${esc(inv.buyer_phone)}</div>` : ''}
      <div class="row"><b>Hình thức TT:</b> ${
        inv.payment_method === 'TM' ? 'Tiền mặt' :
        inv.payment_method === 'CK' ? 'Chuyển khoản' : 'TM/CK'
      }</div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:5%">STT</th>
        <th style="width:32%">Tên hàng hóa, dịch vụ</th>
        <th style="width:7%">ĐVT</th>
        <th style="width:8%">SL</th>
        <th style="width:11%">Đơn giá</th>
        <th style="width:7%">Thuế</th>
        <th style="width:10%">Cộng tiền hàng</th>
        <th style="width:8%">Tiền thuế</th>
        <th style="width:12%">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${blanks}
    </tbody>
  </table>

  <div class="totals">
    <div class="label">Cộng tiền hàng:</div><div class="val">${fmt(inv.subtotal)}</div>
    <div class="label">Tiền thuế GTGT:</div><div class="val">${fmt(inv.tax_amount)}</div>
    <div class="label grand">Tổng cộng tiền thanh toán:</div><div class="val grand">${fmt(inv.total)}</div>
  </div>

  <div class="words">
    <b>Số tiền viết bằng chữ:</b> ${esc(inv.total_words)}
  </div>

  <div class="qr-block">
    <img src="${qrDataUrl}" alt="QR tra cứu" />
    <div class="desc">
      <b>Quét mã QR để tra cứu hóa đơn</b><br/>
      Khách hàng có thể quét QR này hoặc truy cập:<br/>
      <span style="word-break:break-all;">${esc(lookupUrl)}</span><br/>
      ${inv.cqt_lookup_code ? `<br/>Mã tra cứu: <b>${esc(inv.cqt_lookup_code)}</b>` : ''}
    </div>
  </div>

  <div class="footer">
    <div class="sign-block">
      <div class="role">NGƯỜI MUA HÀNG</div>
      <div style="font-size:10px;color:#666;">(Ký, ghi rõ họ tên)</div>
      <div style="height: 60px;"></div>
    </div>
    <div class="sign-block">
      <div class="role">NGƯỜI BÁN HÀNG</div>
      <div style="font-size:10px;color:#666;">(Ký số / Ký điện tử)</div>
      ${inv.signed_at ? `<div class="digital">✓ Đã ký số lúc ${esc(new Date(String(inv.signed_at)).toLocaleString('vi-VN'))}</div>` : '<div style="height: 60px;"></div>'}
    </div>
  </div>
</div>
</body>
</html>`
}
