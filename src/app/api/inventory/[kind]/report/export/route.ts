import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  buildExcel,
  buildPdf,
  type FarmInfo,
  type ReportMeta,
  type ReportSection,
} from '@/lib/reports/finance-export'

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('vi-VN')
}
function fmtVnd(v: number): string {
  return `${Math.round(v).toLocaleString('vi-VN')} đ`
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind: k } = await params
  if (k !== 'medicine' && k !== 'feed') {
    return NextResponse.json({ error: 'kind không hợp lệ' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const defaultTo = today.toISOString().slice(0, 10)
  const from = searchParams.get('from') || defaultFrom
  const to = searchParams.get('to') || defaultTo
  const mode = (searchParams.get('mode') ?? 'summary').toLowerCase() // summary | detail
  const format = (searchParams.get('format') ?? 'excel').toLowerCase()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: farmRow } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'farm_info')
    .maybeSingle()
  const farm =
    ((farmRow as { value?: FarmInfo } | null)?.value as FarmInfo) ?? { name: 'Gà Chọi Việt NB' }

  // Fetch aggregated data from preview endpoint (include filters)
  const origin = new URL(request.url).origin
  const previewParams = new URLSearchParams()
  previewParams.set('from', from)
  previewParams.set('to', to)
  if (searchParams.get('q')) previewParams.set('q', searchParams.get('q')!)
  if (searchParams.get('item_id')) previewParams.set('item_id', searchParams.get('item_id')!)
  if (searchParams.get('type')) previewParams.set('type', searchParams.get('type')!)

  const res = await fetch(
    `${origin}/api/inventory/${k}/report/preview?${previewParams}`,
    { headers: { cookie: request.headers.get('cookie') ?? '' }, cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  const data = (await res.json()) as {
    summary: {
      total_items: number
      active_items: number
      total_nhap: number
      total_xuat: number
      total_cost_in: number
      total_cost_out: number
      current_total_value: number
    }
    items: Array<{
      item_id: string
      code: string
      name_vi: string
      unit: string
      opening: number
      nhap: number
      xuat: number
      closing: number
      cost_in: number
      cost_out: number
    }>
    transactions: Array<{
      id: string
      transaction_date: string
      transaction_type: 'nhap' | 'xuat'
      item_code: string
      item_name: string
      unit: string
      quantity: number
      cost: number
      notes: string | null
    }>
  }

  const kindLabel = k === 'medicine' ? 'THUỐC' : 'THỨC ĂN'
  const kindShort = k === 'medicine' ? 'thuoc' : 'thuc-an'
  const periodLabel = `${fmtDate(from)} → ${fmtDate(to)}`

  let meta: ReportMeta
  let sections: ReportSection[]
  let filenameBase: string

  if (mode === 'detail') {
    const direction = searchParams.get('direction') as 'nhap' | 'xuat' | null
    const itemNoun = k === 'medicine' ? 'thuốc' : 'thức ăn'

    // Filter by direction if specified
    const allTxs = direction
      ? data.transactions.filter((t) => t.transaction_type === direction)
      : data.transactions
    const nhapTxs = allTxs.filter((t) => t.transaction_type === 'nhap')
    const xuatTxs = allTxs.filter((t) => t.transaction_type === 'xuat')

    const totalNhapCost = nhapTxs.reduce((s, t) => s + t.cost, 0)
    const totalXuatCost = xuatTxs.reduce((s, t) => s + t.cost, 0)
    const totalNhapQty = nhapTxs.reduce((s, t) => s + t.quantity, 0)
    const totalXuatQty = xuatTxs.reduce((s, t) => s + t.quantity, 0)

    // Aggregate per item for the active direction
    function aggByItem(txs: typeof allTxs) {
      const m = new Map<string, { code: string; name: string; unit: string; count: number; qty: number; cost: number }>()
      for (const t of txs) {
        const cur = m.get(t.item_code) ?? {
          code: t.item_code,
          name: t.item_name,
          unit: t.unit,
          count: 0,
          qty: 0,
          cost: 0,
        }
        cur.count += 1
        cur.qty += t.quantity
        cur.cost += t.cost
        m.set(t.item_code, cur)
      }
      return [...m.values()].sort((a, b) => b.cost - a.cost)
    }

    const titleSuffix =
      direction === 'nhap'
        ? `NHẬP KHO ${kindLabel}`
        : direction === 'xuat'
          ? `XUẤT KHO ${kindLabel}`
          : `NHẬP XUẤT KHO ${kindLabel}`

    if (direction === 'nhap') {
      meta = {
        title: `BÁO CÁO CHI TIẾT ${titleSuffix}`,
        period: periodLabel,
        summary: [
          ['Số lần nhập', `${nhapTxs.length}`],
          ['Số loại có giao dịch', `${aggByItem(nhapTxs).length}`],
          ['Tổng SL nhập', `${totalNhapQty.toLocaleString('vi-VN')}`],
          ['Tổng chi nhập', fmtVnd(totalNhapCost)],
        ],
      }
      const summaryRows = aggByItem(nhapTxs)
      sections = [
        {
          title: `1. TỔNG HỢP NHẬP THEO LOẠI ${itemNoun.toUpperCase()}`,
          headers: ['Mã', 'Tên', 'Đơn vị', 'Số lần', 'SL', 'Chi phí (đ)'],
          rows: summaryRows.map((r) => [r.code, r.name, r.unit, r.count, r.qty, r.cost]),
          footer: [
            'TỔNG',
            '',
            '',
            nhapTxs.length,
            totalNhapQty,
            totalNhapCost,
          ],
          rightAlign: [3, 4, 5],
        },
        {
          title: '2. CHI TIẾT TỪNG GIAO DỊCH NHẬP',
          headers: ['Ngày', 'Mã', `Tên ${itemNoun}`, 'Đơn vị', 'Số lượng', 'Chi phí (đ)', 'Ghi chú'],
          rows: nhapTxs.map((t) => [
            fmtDate(t.transaction_date),
            t.item_code,
            t.item_name,
            t.unit,
            t.quantity,
            t.cost,
            t.notes ?? '',
          ]),
          footer: ['TỔNG', '', '', '', totalNhapQty, totalNhapCost, ''],
          rightAlign: [4, 5],
        },
      ]
      filenameBase = `nxt-${kindShort}-chi-tiet-nhap_${from}_${to}`
    } else if (direction === 'xuat') {
      meta = {
        title: `BÁO CÁO CHI TIẾT ${titleSuffix}`,
        period: periodLabel,
        summary: [
          ['Số lần xuất', `${xuatTxs.length}`],
          ['Số loại có giao dịch', `${aggByItem(xuatTxs).length}`],
          ['Tổng SL xuất', `${totalXuatQty.toLocaleString('vi-VN')}`],
          ['Tổng giá trị xuất', fmtVnd(totalXuatCost)],
        ],
      }
      const summaryRows = aggByItem(xuatTxs)
      sections = [
        {
          title: `1. TỔNG HỢP XUẤT THEO LOẠI ${itemNoun.toUpperCase()}`,
          headers: ['Mã', 'Tên', 'Đơn vị', 'Số lần', 'SL', 'Giá trị (đ)'],
          rows: summaryRows.map((r) => [r.code, r.name, r.unit, r.count, r.qty, r.cost]),
          footer: [
            'TỔNG',
            '',
            '',
            xuatTxs.length,
            totalXuatQty,
            totalXuatCost,
          ],
          rightAlign: [3, 4, 5],
        },
        {
          title: '2. CHI TIẾT TỪNG GIAO DỊCH XUẤT',
          headers: ['Ngày', 'Mã', `Tên ${itemNoun}`, 'Đơn vị', 'Số lượng', 'Giá trị (đ)', 'Ghi chú'],
          rows: xuatTxs.map((t) => [
            fmtDate(t.transaction_date),
            t.item_code,
            t.item_name,
            t.unit,
            t.quantity,
            t.cost,
            t.notes ?? '',
          ]),
          footer: ['TỔNG', '', '', '', totalXuatQty, totalXuatCost, ''],
          rightAlign: [4, 5],
        },
      ]
      filenameBase = `nxt-${kindShort}-chi-tiet-xuat_${from}_${to}`
    } else {
      // Both directions (legacy)
      meta = {
        title: `BÁO CÁO CHI TIẾT ${titleSuffix}`,
        period: periodLabel,
        summary: [
          ['Số giao dịch trong kỳ', `${data.transactions.length}`],
          ['Lần nhập', `${nhapTxs.length}`],
          ['Lần xuất', `${xuatTxs.length}`],
          ['Tổng chi nhập', fmtVnd(totalNhapCost)],
          ['Tổng xuất (giá trị)', fmtVnd(totalXuatCost)],
        ],
      }
      sections = []
      if (nhapTxs.length > 0) {
        sections.push({
          title: '1. CHI TIẾT NHẬP KHO',
          headers: ['Ngày', 'Mã', `Tên ${itemNoun}`, 'Đơn vị', 'Số lượng', 'Chi phí (đ)', 'Ghi chú'],
          rows: nhapTxs.map((t) => [
            fmtDate(t.transaction_date),
            t.item_code,
            t.item_name,
            t.unit,
            t.quantity,
            t.cost,
            t.notes ?? '',
          ]),
          footer: ['TỔNG NHẬP', '', '', '', totalNhapQty, totalNhapCost, ''],
          rightAlign: [4, 5],
        })
      }
      if (xuatTxs.length > 0) {
        sections.push({
          title: '2. CHI TIẾT XUẤT KHO',
          headers: ['Ngày', 'Mã', `Tên ${itemNoun}`, 'Đơn vị', 'Số lượng', 'Giá trị (đ)', 'Ghi chú'],
          rows: xuatTxs.map((t) => [
            fmtDate(t.transaction_date),
            t.item_code,
            t.item_name,
            t.unit,
            t.quantity,
            t.cost,
            t.notes ?? '',
          ]),
          footer: ['TỔNG XUẤT', '', '', '', totalXuatQty, totalXuatCost, ''],
          rightAlign: [4, 5],
        })
      }
      filenameBase = `nxt-${kindShort}-chi-tiet_${from}_${to}`
    }
  } else {
    // SUMMARY
    const itemsWithActivity = data.items.filter((x) => x.nhap + x.xuat > 0 || x.closing > 0)

    meta = {
      title: `BÁO CÁO TỔNG HỢP NHẬP XUẤT TỒN KHO ${kindLabel}`,
      period: periodLabel,
      summary: [
        ['Tổng số loại', `${data.summary.total_items}`],
        ['Có phát sinh trong kỳ', `${data.summary.active_items}`],
        ['Tổng nhập (chi phí)', fmtVnd(data.summary.total_cost_in)],
        ['Tổng xuất (giá trị)', fmtVnd(data.summary.total_cost_out)],
        ['Giá trị tồn cuối kỳ', fmtVnd(data.summary.current_total_value)],
      ],
    }

    sections = [
      {
        title: `TỔNG HỢP NHẬP XUẤT TỒN TỪNG LOẠI ${kindLabel}`,
        headers: [
          'Mã',
          'Tên',
          'Đơn vị',
          'Tồn đầu kỳ',
          'Nhập trong kỳ',
          'Xuất trong kỳ',
          'Tồn cuối kỳ',
          'Chi phí nhập (đ)',
        ],
        rows: itemsWithActivity.map((x) => [
          x.code,
          x.name_vi,
          x.unit,
          Math.round(x.opening * 100) / 100,
          Math.round(x.nhap * 100) / 100,
          Math.round(x.xuat * 100) / 100,
          Math.round(x.closing * 100) / 100,
          x.cost_in,
        ]),
        footer: [
          'TỔNG',
          '',
          '',
          Math.round(itemsWithActivity.reduce((s, x) => s + x.opening, 0) * 100) / 100,
          Math.round(data.summary.total_nhap * 100) / 100,
          Math.round(data.summary.total_xuat * 100) / 100,
          Math.round(itemsWithActivity.reduce((s, x) => s + x.closing, 0) * 100) / 100,
          data.summary.total_cost_in,
        ],
        rightAlign: [3, 4, 5, 6, 7],
      },
    ]

    filenameBase = `nxt-${kindShort}-tong-hop_${from}_${to}`
  }

  if (format === 'pdf') {
    const buf = buildPdf(meta, sections, farm)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
      },
    })
  }
  const buf = await buildExcel(meta, sections, farm)
  return new NextResponse(buf, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
    },
  })
}
