import { NextResponse } from 'next/server'
import { loadCustomerLedger, ORDER_STATUS_LABEL, fmtDate } from '@/lib/reports/receivables'
import { buildExcel, buildPdf, type ReportMeta, type ReportSection } from '@/lib/reports/finance-export'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'excel'

  const ledger = await loadCustomerLedger(customerId)
  if (!ledger) return NextResponse.json({ error: 'Không tìm thấy khách' }, { status: 404 })

  const { customer, orders, payments, aging, totalInvoiced, totalPaid, totalDue, farmInfo } = ledger

  const safeName = customer.name.replace(/[^a-zA-Z0-9À-ỹ ]/g, '').replace(/\s+/g, '-')
  const filenameBase = `so-cong-no-${safeName}-${new Date().toISOString().slice(0, 10)}`

  const meta: ReportMeta = {
    title: 'SỔ CHI TIẾT CÔNG NỢ KHÁCH HÀNG',
    subtitle: `${customer.name}${customer.tier === 'vip' ? '  ·  ⭐ VIP' : ''}`,
    summary: [
      ['Khách hàng', customer.name],
      ['Liên hệ', `${customer.phone ?? ''}${customer.zalo ? '  ·  Zalo: ' + customer.zalo : ''}`],
      ['Địa chỉ', customer.address ?? '—'],
      ['Lịch sử giao dịch', `${customer.total_purchased} đơn đã giao  ·  ${Number(customer.total_spent).toLocaleString('vi-VN')} đ`],
      ['TỔNG HÓA ĐƠN', `${totalInvoiced.toLocaleString('vi-VN')} đ`],
      ['ĐÃ THANH TOÁN', `${totalPaid.toLocaleString('vi-VN')} đ`],
      ['CÒN NỢ', `${totalDue.toLocaleString('vi-VN')} đ`],
    ],
  }

  const sections: ReportSection[] = []

  if (totalDue > 0) {
    sections.push({
      title: 'Phân tích thời hạn nợ (Aging Analysis)',
      headers: ['< 30 ngày', '30-60 ngày', '60-90 ngày', '> 90 ngày', 'TỔNG NỢ'],
      rows: [[aging.lt30, aging.b30_60, aging.b60_90, aging.gt90, totalDue]],
      rightAlign: [0, 1, 2, 3, 4],
    })
  }

  sections.push({
    title: `Chi tiết đơn hàng (${orders.length} đơn)`,
    headers: [
      'Mã đơn',
      'Ngày đặt',
      'Gà',
      'Tổng',
      'Đã trả',
      'Còn nợ',
      'Trạng thái',
      'Ngày giao',
      'Ngày trôi',
    ],
    rows: orders.map((o) => [
      o.order_code,
      fmtDate(o.order_date),
      o.chicken_names,
      o.total_amount,
      o.paid_amount,
      o.amount_due,
      ORDER_STATUS_LABEL[o.status] ?? o.status,
      o.delivered_date ? fmtDate(o.delivered_date) : '—',
      o.amount_due > 0 ? o.days_since : '—',
    ]),
    footer: [
      'TỔNG',
      '',
      '',
      totalInvoiced,
      totalPaid,
      totalDue,
      '',
      '',
      '',
    ],
    rightAlign: [3, 4, 5, 8],
  })

  if (payments.length > 0) {
    sections.push({
      title: `Lịch sử thanh toán (${payments.length} giao dịch)`,
      headers: ['Ngày', 'Ghi chú', 'Mã đơn', 'Số tiền'],
      rows: payments.map((p) => [fmtDate(p.date), p.note, p.orderCode, p.amount]),
      footer: ['', '', 'TỔNG', payments.reduce((s, p) => s + p.amount, 0)],
      rightAlign: [3],
    })
  }

  if (format === 'pdf') {
    const buf = buildPdf(meta, sections, farmInfo)
    return new NextResponse(buf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
      },
    })
  }

  const buf = await buildExcel(meta, sections, farmInfo)
  return new NextResponse(buf as BodyInit, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
    },
  })
}
