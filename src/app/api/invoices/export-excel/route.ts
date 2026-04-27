import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac/guard'
import ExcelJS from 'exceljs'

export async function GET(request: Request) {
  const ctx = await requirePermission('hoa_don', 'read')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const url = new URL(request.url)
  const ids = url.searchParams.get('ids')?.split(',').filter(Boolean) ?? []
  const from = url.searchParams.get('from') ?? null
  const to = url.searchParams.get('to') ?? null
  const status = url.searchParams.get('status') ?? null

  const supabase = await createClient()
  let q = supabase.from('invoices_full').select('*').order('issue_date', { ascending: false })
  if (ids.length > 0) q = q.in('id', ids)
  if (from) q = q.gte('issue_date', from)
  if (to) q = q.lte('issue_date', to)
  if (status && status !== 'all') q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = {
    internal_no: string
    invoice_no: string | null
    invoice_serial: string | null
    invoice_form: string | null
    issue_date: string
    buyer_name: string | null
    buyer_tax_code: string | null
    buyer_address: string | null
    subtotal: number
    tax_amount: number
    total: number
    status: string
    cqt_status: string
    cqt_code: string | null
    payment_method: string
    notes: string | null
  }
  const rows = (data ?? []) as Row[]

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Gà Chọi Việt NB'
  wb.created = new Date()

  const ws = wb.addWorksheet('Danh sách HĐ')
  ws.columns = [
    { header: 'Số nội bộ', key: 'internal_no', width: 14 },
    { header: 'Số HĐ', key: 'invoice_no', width: 12 },
    { header: 'Mẫu/Ký hiệu', key: 'serial', width: 14 },
    { header: 'Ngày', key: 'issue_date', width: 12 },
    { header: 'Người mua', key: 'buyer_name', width: 28 },
    { header: 'MST người mua', key: 'buyer_tax', width: 16 },
    { header: 'Địa chỉ', key: 'buyer_addr', width: 32 },
    { header: 'Cộng tiền hàng', key: 'subtotal', width: 16, style: { numFmt: '#,##0' } },
    { header: 'Tiền thuế', key: 'tax', width: 14, style: { numFmt: '#,##0' } },
    { header: 'Tổng cộng', key: 'total', width: 16, style: { numFmt: '#,##0' } },
    { header: 'Trạng thái', key: 'status', width: 14 },
    { header: 'Mã CQT', key: 'cqt', width: 18 },
    { header: 'PT thanh toán', key: 'payment', width: 12 },
    { header: 'Ghi chú', key: 'notes', width: 30 },
  ]
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } }
  ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
  ws.getRow(1).height = 22

  rows.forEach((r) => {
    ws.addRow({
      internal_no: r.internal_no,
      invoice_no: r.invoice_no || '',
      serial: [r.invoice_form, r.invoice_serial].filter(Boolean).join('/'),
      issue_date: r.issue_date,
      buyer_name: r.buyer_name || '',
      buyer_tax: r.buyer_tax_code || '',
      buyer_addr: r.buyer_address || '',
      subtotal: Number(r.subtotal),
      tax: Number(r.tax_amount),
      total: Number(r.total),
      status: STATUS_LABEL[r.status] || r.status,
      cqt: r.cqt_code || '',
      payment: r.payment_method,
      notes: r.notes || '',
    })
  })

  // Tổng cộng
  if (rows.length > 0) {
    const sumRow = ws.addRow({
      buyer_addr: 'TỔNG CỘNG',
      subtotal: rows.reduce((s, r) => s + Number(r.subtotal), 0),
      tax: rows.reduce((s, r) => s + Number(r.tax_amount), 0),
      total: rows.reduce((s, r) => s + Number(r.total), 0),
    })
    sumRow.font = { bold: true }
    sumRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
  }

  ws.getColumn('subtotal').alignment = { horizontal: 'right' }
  ws.getColumn('tax').alignment = { horizontal: 'right' }
  ws.getColumn('total').alignment = { horizontal: 'right' }

  const buf = await wb.xlsx.writeBuffer()
  const fileName = `hoa-don-${new Date().toISOString().slice(0, 10)}.xlsx`
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}

const STATUS_LABEL: Record<string, string> = {
  nhap: 'Nháp',
  cho_phat_hanh: 'Chờ PH',
  da_phat_hanh: 'Đã phát hành',
  da_huy: 'Đã hủy',
  dieu_chinh: 'Điều chỉnh',
  thay_the: 'Thay thế',
}
