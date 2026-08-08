import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  buildExcel,
  buildPdf,
  type FarmInfo,
  type ReportMeta,
  type ReportSection,
} from '@/lib/reports/finance-export'

const REPORTS = {
  pnl: 'Báo cáo Lãi/Lỗ (P&L)',
  expenses: 'Báo cáo Chi phí 8 hạng mục',
  trends: 'Báo cáo Xu hướng 6 tháng',
  gia_von: 'Báo cáo Giá vốn từng con',
  inventory: 'Báo cáo Nhập xuất tồn gà',
} as const
type ReportKey = keyof typeof REPORTS

function fmtNum(n: number | string | null | undefined): number {
  if (n == null) return 0
  return Number(n)
}

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const supabase = await createClient()
  const { data } = await (supabase.rpc as unknown as (
    f: string,
    a: Record<string, unknown>
  ) => Promise<{ data: T[] | null; error: { message: string } | null }>)(fn, args)
  return data ?? []
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const report = (searchParams.get('report') ?? 'pnl') as ReportKey
  const format = searchParams.get('format') ?? 'excel'
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  if (!REPORTS[report]) {
    return NextResponse.json({ error: 'Báo cáo không hỗ trợ' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: farmRow } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'farm_info')
    .maybeSingle()
  const farm =
    ((farmRow as { value?: FarmInfo } | null)?.value as FarmInfo) ?? { name: 'Gà Chọi Việt NB' }

  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const defaultTo = today.toISOString().slice(0, 10)
  const fromD = from || defaultFrom
  const toD = to || defaultTo

  let meta: ReportMeta
  let sections: ReportSection[] = []
  let filenameBase = `bao-cao-${report}-${new Date().toISOString().slice(0, 10)}`

  if (report === 'pnl') {
    const rows = await rpc<{
      line_item: string
      amount: number | string
      category: string
      display_order: number
    }>('pnl_report', { p_from_date: fromD, p_to_date: toD })

    const byCat = (cats: string[]) => rows.filter((r) => cats.includes(r.category))
    const revenue = byCat(['revenue'])
    const revenueTotal = byCat(['revenue_total'])[0]
    const cogs = byCat(['cogs'])[0]
    const gross = byCat(['gross_profit'])[0]
    const grossMargin = byCat(['gross_margin'])[0]
    const opex = byCat(['opex'])
    const opexTotal = byCat(['opex_total'])[0]
    const operating = byCat(['operating_profit'])[0]
    const operatingMargin = byCat(['operating_margin'])[0]
    const netProfit = byCat(['net_profit'])[0]
    const netMargin = byCat(['net_margin'])[0]

    const totalRev = fmtNum(revenueTotal?.amount ?? 0)
    const pctOf = (n: number) => (totalRev > 0 ? `${((n / totalRev) * 100).toFixed(1)}%` : '—')

    const line = (
      r: { line_item: string; amount: number | string } | undefined,
      showPct = true
    ): [string, number, string] => {
      if (!r) return ['—', 0, '']
      const amt = fmtNum(r.amount)
      return [r.line_item, amt, showPct ? pctOf(amt) : '']
    }

    meta = {
      title: 'BÁO CÁO LÃI LỖ (P&L)',
      period: `${fromD} → ${toD}`,
      summary: [
        ['Tổng doanh thu', `${totalRev.toLocaleString('vi-VN')} đ`],
        ['Lợi nhuận gộp', `${fmtNum(gross?.amount).toLocaleString('vi-VN')} đ   (${fmtNum(grossMargin?.amount)}%)`],
        ['Lợi nhuận hoạt động (EBIT)', `${fmtNum(operating?.amount).toLocaleString('vi-VN')} đ   (${fmtNum(operatingMargin?.amount)}%)`],
        ['Lợi nhuận ròng', `${fmtNum(netProfit?.amount).toLocaleString('vi-VN')} đ   (${fmtNum(netMargin?.amount)}%)`],
      ],
    }

    sections = [
      {
        title: '1. DOANH THU',
        headers: ['Phân khúc', 'Số tiền (đ)', '% / Tổng DT'],
        rows: revenue.map((r) => line(r)),
        footer: revenueTotal
          ? [revenueTotal.line_item, fmtNum(revenueTotal.amount), '100.0%']
          : undefined,
        rightAlign: [1, 2],
      },
      {
        title: '2. GIÁ VỐN HÀNG BÁN & LỢI NHUẬN GỘP',
        headers: ['Khoản mục', 'Số tiền (đ)', '% / Tổng DT'],
        rows: [
          line(cogs),
          gross
            ? [gross.line_item, fmtNum(gross.amount), pctOf(fmtNum(gross.amount))]
            : ['—', 0, ''],
          grossMargin
            ? [grossMargin.line_item, fmtNum(grossMargin.amount), '']
            : ['—', 0, ''],
        ],
        rightAlign: [1, 2],
      },
      {
        title: '3. CHI PHÍ VẬN HÀNH (OPEX)',
        headers: ['Hạng mục', 'Số tiền (đ)', '% / Tổng DT'],
        rows: opex.map((r) => line(r)),
        footer: opexTotal
          ? [opexTotal.line_item, fmtNum(opexTotal.amount), pctOf(fmtNum(opexTotal.amount))]
          : undefined,
        rightAlign: [1, 2],
      },
      {
        title: '4. KẾT QUẢ KINH DOANH',
        headers: ['Chỉ tiêu', 'Giá trị', '% / Tổng DT'],
        rows: [
          operating
            ? [operating.line_item, fmtNum(operating.amount), pctOf(fmtNum(operating.amount))]
            : ['—', 0, ''],
          operatingMargin
            ? [operatingMargin.line_item, fmtNum(operatingMargin.amount), '']
            : ['—', 0, ''],
          netProfit
            ? [netProfit.line_item, fmtNum(netProfit.amount), pctOf(fmtNum(netProfit.amount))]
            : ['—', 0, ''],
          netMargin
            ? [netMargin.line_item, fmtNum(netMargin.amount), '']
            : ['—', 0, ''],
        ],
        rightAlign: [1, 2],
      },
    ]
  } else if (report === 'expenses') {
    const rows = await rpc<{
      category_code: string
      category_name: string
      total_amount: number | string
      transaction_count: number | string
      percentage: number | string
    }>('expenses_summary', { p_from_date: fromD, p_to_date: toD })
    const total = rows.reduce((s, r) => s + fmtNum(r.total_amount), 0)
    meta = {
      title: 'BÁO CÁO CHI PHÍ 8 HẠNG MỤC',
      period: `${fromD} → ${toD}`,
      summary: [['Tổng chi phí', `${total.toLocaleString('vi-VN')} đ`]],
    }
    sections = [
      {
        title: 'Chi tiết theo hạng mục',
        headers: ['Hạng mục', 'Số giao dịch', 'Số tiền', 'Tỷ trọng %'],
        rows: rows.map((r) => [
          r.category_name ?? r.category_code,
          fmtNum(r.transaction_count),
          fmtNum(r.total_amount),
          fmtNum(r.percentage),
        ]),
        footer: ['TỔNG', '', total, 100],
        rightAlign: [1, 2, 3],
      },
    ]
  } else if (report === 'trends') {
    const rows = await rpc<{
      month: string
      revenue: number | string
      expenses: number | string
      cogs: number | string
      net_profit: number | string
      chickens_sold: number | string
      chickens_died: number | string
    }>('trends_6_months', {})
    const totalRev = rows.reduce((s, r) => s + fmtNum(r.revenue), 0)
    const totalExp = rows.reduce((s, r) => s + fmtNum(r.expenses), 0)
    const totalProfit = rows.reduce((s, r) => s + fmtNum(r.net_profit), 0)

    meta = {
      title: 'BÁO CÁO XU HƯỚNG 6 THÁNG',
      period: rows.length > 0 ? `${rows[0].month} → ${rows[rows.length - 1].month}` : '',
      summary: [
        ['Tổng doanh thu 6 tháng', `${totalRev.toLocaleString('vi-VN')} đ`],
        ['Tổng chi phí 6 tháng', `${totalExp.toLocaleString('vi-VN')} đ`],
        ['Lãi ròng 6 tháng', `${totalProfit.toLocaleString('vi-VN')} đ`],
      ],
    }
    sections = [
      {
        title: 'Theo tháng',
        headers: ['Tháng', 'Doanh thu', 'Giá vốn', 'Chi phí', 'Lãi ròng', 'Bán', 'Chết'],
        rows: rows.map((r) => [
          r.month,
          fmtNum(r.revenue),
          fmtNum(r.cogs),
          fmtNum(r.expenses),
          fmtNum(r.net_profit),
          fmtNum(r.chickens_sold),
          fmtNum(r.chickens_died),
        ]),
        footer: [
          'TỔNG',
          totalRev,
          rows.reduce((s, r) => s + fmtNum(r.cogs), 0),
          totalExp,
          totalProfit,
          rows.reduce((s, r) => s + fmtNum(r.chickens_sold), 0),
          rows.reduce((s, r) => s + fmtNum(r.chickens_died), 0),
        ],
        rightAlign: [1, 2, 3, 4, 5, 6],
      },
    ]
  } else if (report === 'gia_von') {
    const { data } = await supabase
      .from('sales_performance')
      .select('*')
      .order('sale_date', { ascending: false })

    const rows = (data ?? []) as Array<{
      chicken_code: string | null
      breed_name: string | null
      sale_date: string | null
      sale_price: number | null
      cost_basis: number | null
      profit: number | null
      profit_margin_pct: number | null
      price_segment: string | null
    }>

    const totalRev = rows.reduce((s, r) => s + fmtNum(r.sale_price), 0)
    const totalCost = rows.reduce((s, r) => s + fmtNum(r.cost_basis), 0)
    const totalProfit = rows.reduce((s, r) => s + fmtNum(r.profit), 0)

    meta = {
      title: 'BÁO CÁO GIÁ VỐN TỪNG CON',
      summary: [
        ['Số con đã bán', `${rows.length}`],
        ['Tổng doanh thu', `${totalRev.toLocaleString('vi-VN')} đ`],
        ['Tổng giá vốn', `${totalCost.toLocaleString('vi-VN')} đ`],
        ['Tổng lãi', `${totalProfit.toLocaleString('vi-VN')} đ`],
      ],
    }
    sections = [
      {
        title: 'Chi tiết từng con',
        headers: [
          'Mã',
          'Giống',
          'Ngày bán',
          'Giá bán',
          'Giá vốn',
          'Lãi',
          'Biên %',
          'Phân khúc',
        ],
        rows: rows.map((r) => [
          r.chicken_code ?? '',
          r.breed_name ?? '',
          r.sale_date ?? '',
          fmtNum(r.sale_price),
          fmtNum(r.cost_basis),
          fmtNum(r.profit),
          fmtNum(r.profit_margin_pct),
          r.price_segment === 'cao_cap'
            ? 'Cao cấp'
            : r.price_segment === 'pho_thong'
              ? 'Phổ thông'
              : r.price_segment === 'thit'
                ? 'Gà thịt'
                : '',
        ]),
        footer: ['TỔNG', '', '', totalRev, totalCost, totalProfit, '', ''],
        rightAlign: [3, 4, 5, 6],
      },
    ]
  } else if (report === 'inventory') {
    const rows = await rpc<{ category: string; count: number | string; description: string }>(
      'inventory_report',
      { p_from_date: fromD, p_to_date: toD }
    )
    meta = {
      title: 'BÁO CÁO NHẬP XUẤT TỒN GÀ',
      period: `${fromD} → ${toD}`,
    }
    sections = [
      {
        title: 'Biến động đàn',
        headers: ['Mô tả', 'Mã', 'Số lượng'],
        rows: rows.map((r) => [r.description, r.category, fmtNum(r.count)]),
        rightAlign: [2],
      },
    ]
  } else {
    return NextResponse.json({ error: 'unreachable' }, { status: 400 })
  }

  filenameBase = `${filenameBase}`

  if (format === 'pdf') {
    const buf = buildPdf(meta, sections, farm)
    return new NextResponse(buf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
      },
    })
  }

  const buf = await buildExcel(meta, sections, farm)
  return new NextResponse(buf as BodyInit, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
    },
  })
}

