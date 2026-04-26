import { NextResponse } from 'next/server'
import { loadReceivablesSummary } from '@/lib/reports/receivables'
import { buildExcel, buildPdf, type ReportMeta, type ReportSection } from '@/lib/reports/finance-export'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'excel'

  const { customers, grandTotal, farmInfo } = await loadReceivablesSummary()
  const overdueCount = customers.reduce((s, c) => s + c.overdue_count, 0)
  const overdueTotal = customers.reduce((s, c) => s + c.b30_60 + c.b60_90 + c.gt90, 0)

  const filenameBase = `bao-cao-cong-no-tong-hop-${new Date().toISOString().slice(0, 10)}`

  const meta: ReportMeta = {
    title: 'BÁO CÁO CÔNG NỢ KHÁCH HÀNG (TỔNG HỢP)',
    subtitle: `${customers.length} khách đang nợ · ${overdueCount} đơn quá 30 ngày`,
    summary: [
      ['Tổng nợ toàn hệ thống', `${grandTotal.toLocaleString('vi-VN')} đ`],
      ['Số khách đang nợ', `${customers.length}`],
      ['Nợ quá 30 ngày', `${overdueTotal.toLocaleString('vi-VN')} đ (${overdueCount} đơn)`],
    ],
  }

  const sections: ReportSection[] = [
    {
      title: 'Công nợ từng khách hàng (sắp xếp theo số còn nợ giảm dần)',
      headers: [
        'STT',
        'Khách hàng',
        'SĐT',
        'Hạng',
        'Số đơn',
        'Tổng hóa đơn',
        'Đã thu',
        'Còn nợ',
        'Nợ lâu nhất (ngày)',
        '< 30 ngày',
        '30-60 ngày',
        '60-90 ngày',
        '> 90 ngày',
      ],
      rows: customers.map((c, i) => [
        i + 1,
        c.customer_name,
        c.phone ?? '',
        c.tier === 'vip' ? '⭐ VIP' : 'Thường',
        c.order_count,
        c.total_value,
        c.total_paid,
        c.total_due,
        c.oldest_days,
        c.lt30,
        c.b30_60,
        c.b60_90,
        c.gt90,
      ]),
      footer: [
        '',
        'TỔNG',
        '',
        '',
        customers.reduce((s, c) => s + c.order_count, 0),
        customers.reduce((s, c) => s + c.total_value, 0),
        customers.reduce((s, c) => s + c.total_paid, 0),
        grandTotal,
        '',
        customers.reduce((s, c) => s + c.lt30, 0),
        customers.reduce((s, c) => s + c.b30_60, 0),
        customers.reduce((s, c) => s + c.b60_90, 0),
        customers.reduce((s, c) => s + c.gt90, 0),
      ],
      rightAlign: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    },
  ]

  if (format === 'pdf') {
    const buf = buildPdf(meta, sections, farmInfo)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
      },
    })
  }

  const buf = await buildExcel(meta, sections, farmInfo)
  return new NextResponse(buf, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
    },
  })
}
