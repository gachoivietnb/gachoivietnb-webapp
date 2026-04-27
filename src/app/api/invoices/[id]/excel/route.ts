import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac/guard'
import ExcelJS from 'exceljs'

/**
 * Xuất 1 HĐ ra Excel theo layout phiếu hóa đơn (mẫu chuẩn TT 78).
 * 1 sheet — trông giống bản in: header + bên bán/mua + items + tổng tiền + tiền-bằng-chữ.
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

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Gà Chọi Việt NB'
  wb.created = new Date()

  const ws = wb.addWorksheet('HD')
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  }

  ws.columns = [
    { width: 6 },   // STT
    { width: 32 },  // tên hàng
    { width: 8 },   // ĐVT
    { width: 10 },  // SL
    { width: 14 },  // ĐG
    { width: 8 },   // CK%
    { width: 10 },  // thuế
    { width: 16 },  // thành tiền
  ]

  let row = 1

  // Form info top right
  ws.mergeCells(`F${row}:H${row}`)
  ws.getCell(`F${row}`).value = `Mẫu số: ${inv.invoice_form || '1'}`
  ws.getCell(`F${row}`).alignment = { horizontal: 'right' }
  ws.getCell(`F${row}`).font = { size: 10, italic: true }
  row++
  ws.mergeCells(`F${row}:H${row}`)
  ws.getCell(`F${row}`).value = `Ký hiệu: ${inv.invoice_serial || ''}`
  ws.getCell(`F${row}`).alignment = { horizontal: 'right' }
  ws.getCell(`F${row}`).font = { size: 10, italic: true }
  row++
  ws.mergeCells(`F${row}:H${row}`)
  ws.getCell(`F${row}`).value = `Số: ${inv.invoice_no || inv.internal_no}`
  ws.getCell(`F${row}`).alignment = { horizontal: 'right' }
  ws.getCell(`F${row}`).font = { size: 11, bold: true }
  row += 2

  // Title
  ws.mergeCells(`A${row}:H${row}`)
  ws.getCell(`A${row}`).value = 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG'
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' }
  ws.getCell(`A${row}`).font = { size: 16, bold: true }
  row++

  // Date
  const d = String(inv.issue_date || '').split('-')
  ws.mergeCells(`A${row}:H${row}`)
  ws.getCell(`A${row}`).value = d.length === 3 ? `Ngày ${d[2]} tháng ${d[1]} năm ${d[0]}` : ''
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' }
  ws.getCell(`A${row}`).font = { size: 11, italic: true }
  row++

  if (inv.cqt_code) {
    ws.mergeCells(`A${row}:H${row}`)
    ws.getCell(`A${row}`).value = `Mã của cơ quan thuế: ${inv.cqt_code}`
    ws.getCell(`A${row}`).alignment = { horizontal: 'center' }
    ws.getCell(`A${row}`).font = { size: 10, color: { argb: 'FF059669' } }
    row++
  }
  row++

  // Seller block
  const sellerStart = row
  ws.mergeCells(`A${row}:H${row}`)
  ws.getCell(`A${row}`).value = 'ĐƠN VỊ BÁN HÀNG'
  ws.getCell(`A${row}`).font = { bold: true, size: 11 }
  row++
  ws.mergeCells(`A${row}:H${row}`)
  ws.getCell(`A${row}`).value = `Tên: ${seller.name || ''}`
  row++
  ws.mergeCells(`A${row}:H${row}`)
  ws.getCell(`A${row}`).value = `Mã số thuế: ${seller.tax_code || ''}`
  row++
  ws.mergeCells(`A${row}:H${row}`)
  ws.getCell(`A${row}`).value = `Địa chỉ: ${seller.address || ''}`
  row++
  if (seller.bank_account) {
    ws.mergeCells(`A${row}:H${row}`)
    ws.getCell(`A${row}`).value = `Số TK: ${seller.bank_account} — ${seller.bank_name || ''}`
    row++
  }
  // Border for seller block
  for (let r = sellerStart; r < row; r++) {
    ws.getCell(`A${r}`).border = { left: { style: 'thin' }, right: { style: 'thin' } }
    if (r === sellerStart) ws.getCell(`A${r}`).border = { ...ws.getCell(`A${r}`).border, top: { style: 'thin' } }
    if (r === row - 1) ws.getCell(`A${r}`).border = { ...ws.getCell(`A${r}`).border, bottom: { style: 'thin' } }
  }
  row++

  // Buyer block
  const buyerStart = row
  ws.mergeCells(`A${row}:H${row}`)
  ws.getCell(`A${row}`).value = 'NGƯỜI MUA HÀNG'
  ws.getCell(`A${row}`).font = { bold: true, size: 11 }
  row++
  ws.mergeCells(`A${row}:H${row}`)
  ws.getCell(`A${row}`).value = `Tên: ${inv.buyer_name || ''}`
  row++
  ws.mergeCells(`A${row}:H${row}`)
  ws.getCell(`A${row}`).value = `Mã số thuế: ${inv.buyer_tax_code || ''}`
  row++
  ws.mergeCells(`A${row}:H${row}`)
  ws.getCell(`A${row}`).value = `Địa chỉ: ${inv.buyer_address || ''}`
  row++
  ws.mergeCells(`A${row}:H${row}`)
  ws.getCell(`A${row}`).value = `Hình thức thanh toán: ${
    inv.payment_method === 'TM' ? 'Tiền mặt' : inv.payment_method === 'CK' ? 'Chuyển khoản' : 'TM/CK'
  }`
  row++
  void buyerStart
  row++

  // Items table header
  const headerRow = row
  ws.getCell(`A${row}`).value = 'STT'
  ws.getCell(`B${row}`).value = 'Tên hàng hóa, dịch vụ'
  ws.getCell(`C${row}`).value = 'ĐVT'
  ws.getCell(`D${row}`).value = 'Số lượng'
  ws.getCell(`E${row}`).value = 'Đơn giá'
  ws.getCell(`F${row}`).value = 'CK%'
  ws.getCell(`G${row}`).value = 'Thuế suất'
  ws.getCell(`H${row}`).value = 'Thành tiền'
  for (const c of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
    const cell = ws.getCell(`${c}${row}`)
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    }
  }
  ws.getRow(row).height = 28
  row++

  // Items
  items.forEach((it, idx) => {
    ws.getCell(`A${row}`).value = idx + 1
    ws.getCell(`B${row}`).value = String(it.description ?? '')
    ws.getCell(`C${row}`).value = String(it.unit ?? '')
    ws.getCell(`D${row}`).value = Number(it.quantity)
    ws.getCell(`E${row}`).value = Number(it.unit_price)
    ws.getCell(`F${row}`).value = Number(it.discount_pct) > 0 ? `${Number(it.discount_pct)}%` : ''
    ws.getCell(`G${row}`).value = String(it.tax_rate_label ?? `${Number(it.tax_rate)}%`)
    ws.getCell(`H${row}`).value = Number(it.line_total)

    ws.getCell(`A${row}`).alignment = { horizontal: 'center' }
    ws.getCell(`C${row}`).alignment = { horizontal: 'center' }
    ws.getCell(`D${row}`).alignment = { horizontal: 'right' }
    ws.getCell(`E${row}`).numFmt = '#,##0'
    ws.getCell(`E${row}`).alignment = { horizontal: 'right' }
    ws.getCell(`F${row}`).alignment = { horizontal: 'center' }
    ws.getCell(`G${row}`).alignment = { horizontal: 'center' }
    ws.getCell(`H${row}`).numFmt = '#,##0'
    ws.getCell(`H${row}`).alignment = { horizontal: 'right' }
    ws.getCell(`H${row}`).font = { bold: true }

    for (const c of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
      ws.getCell(`${c}${row}`).border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      }
    }
    row++
  })

  void headerRow
  row++

  // Totals
  ws.mergeCells(`A${row}:G${row}`)
  ws.getCell(`A${row}`).value = 'Cộng tiền hàng:'
  ws.getCell(`A${row}`).alignment = { horizontal: 'right' }
  ws.getCell(`H${row}`).value = Number(inv.subtotal)
  ws.getCell(`H${row}`).numFmt = '#,##0'
  ws.getCell(`H${row}`).alignment = { horizontal: 'right' }
  row++

  ws.mergeCells(`A${row}:G${row}`)
  ws.getCell(`A${row}`).value = 'Tiền thuế GTGT:'
  ws.getCell(`A${row}`).alignment = { horizontal: 'right' }
  ws.getCell(`H${row}`).value = Number(inv.tax_amount)
  ws.getCell(`H${row}`).numFmt = '#,##0'
  ws.getCell(`H${row}`).alignment = { horizontal: 'right' }
  row++

  ws.mergeCells(`A${row}:G${row}`)
  ws.getCell(`A${row}`).value = 'Tổng cộng tiền thanh toán:'
  ws.getCell(`A${row}`).alignment = { horizontal: 'right' }
  ws.getCell(`A${row}`).font = { bold: true, size: 13 }
  ws.getCell(`H${row}`).value = Number(inv.total)
  ws.getCell(`H${row}`).numFmt = '#,##0'
  ws.getCell(`H${row}`).alignment = { horizontal: 'right' }
  ws.getCell(`H${row}`).font = { bold: true, size: 13, color: { argb: 'FFD97706' } }
  ws.getCell(`H${row}`).border = { top: { style: 'medium' } }
  row++

  // Tiền bằng chữ
  row++
  ws.mergeCells(`A${row}:H${row}`)
  ws.getCell(`A${row}`).value = `Số tiền viết bằng chữ: ${inv.total_words || ''}`
  ws.getCell(`A${row}`).font = { italic: true }
  ws.getCell(`A${row}`).alignment = { wrapText: true }
  row++

  // Status note
  if (inv.status === 'nhap') {
    row++
    ws.mergeCells(`A${row}:H${row}`)
    ws.getCell(`A${row}`).value = '⚠ Đây là HÓA ĐƠN NHÁP — chưa phát hành, không có giá trị pháp lý'
    ws.getCell(`A${row}`).font = { color: { argb: 'FFD97706' }, bold: true, italic: true }
    ws.getCell(`A${row}`).alignment = { horizontal: 'center' }
  }
  if (inv.status === 'da_huy') {
    row++
    ws.mergeCells(`A${row}:H${row}`)
    ws.getCell(`A${row}`).value = `❌ HÓA ĐƠN ĐÃ HỦY — Lý do: ${inv.cancel_reason || ''}`
    ws.getCell(`A${row}`).font = { color: { argb: 'FFDC2626' }, bold: true, italic: true }
    ws.getCell(`A${row}`).alignment = { horizontal: 'center' }
  }

  const buf = await wb.xlsx.writeBuffer()
  const fileName = `HD_${inv.invoice_no || inv.internal_no}.xlsx`
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
