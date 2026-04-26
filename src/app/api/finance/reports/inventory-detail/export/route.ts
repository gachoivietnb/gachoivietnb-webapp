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

function n(v: unknown): number {
  if (v == null) return 0
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

const TYPE_ORDER: Record<string, number> = {
  purchased: 1,
  hatched: 2,
  sold: 3,
  died: 4,
  culled: 5,
  current: 6,
}

const INFLOW = new Set(['purchased', 'hatched'])
const OUTFLOW = new Set(['sold', 'died', 'culled'])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const mode = (searchParams.get('mode') ?? 'summary').toLowerCase() // summary | detail
  const format = (searchParams.get('format') ?? 'excel').toLowerCase()
  const breedCode = searchParams.get('breed_code') || ''
  const typeFilter = searchParams.get('type') || ''
  const q = (searchParams.get('q') || '').trim().toLowerCase()

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to' }, { status: 400 })
  }

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

  // Fetch detail events via same query as detail route by hitting that endpoint logic
  // Inline fetch for simplicity:
  const origin = new URL(request.url).origin
  const detailRes = await fetch(
    `${origin}/api/finance/reports/inventory-detail?from=${from}&to=${to}`,
    { headers: { cookie: request.headers.get('cookie') ?? '' }, cache: 'no-store' }
  )
  if (!detailRes.ok) {
    return NextResponse.json({ error: 'Cannot load detail data' }, { status: 500 })
  }
  const detailJson = (await detailRes.json()) as {
    data: Array<{
      event_date: string
      event_type: string
      event_label: string
      chicken_code: string
      name: string | null
      breed_name: string | null
      breed_code: string | null
      amount: number | null
      counterparty: string | null
      reference: string | null
      notes: string | null
    }>
  }
  let events = detailJson.data ?? []
  if (breedCode) events = events.filter((e) => e.breed_code === breedCode)
  if (typeFilter) events = events.filter((e) => e.event_type === typeFilter)
  if (q) {
    events = events.filter((e) =>
      [e.chicken_code, e.name ?? '', e.breed_name ?? '', e.counterparty ?? '', e.reference ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }

  // Also fetch summary (SQL RPC already does this)
  const { data: summaryRows } = await supabase.rpc('inventory_report' as never, {
    p_from_date: from,
    p_to_date: to,
  } as never)

  type SumRow = { category: string; count: number | string; description: string }
  const summary = ((summaryRows ?? []) as SumRow[]).map((r) => ({
    ...r,
    count: Number(r.count),
  }))

  const periodLabel = `${fmtDate(from)} → ${fmtDate(to)}`

  let meta: ReportMeta
  let sections: ReportSection[]
  let filenameBase: string

  if (mode === 'detail') {
    // ====== DETAIL REPORT ======
    const inflow = events.filter((e) => INFLOW.has(e.event_type))
    const outflow = events.filter((e) => OUTFLOW.has(e.event_type))
    const current = events.filter((e) => e.event_type === 'current')

    const inflowAmount = inflow.reduce((s, e) => s + n(e.amount), 0)
    const outflowAmount = outflow.reduce((s, e) => s + n(e.amount), 0)

    meta = {
      title: 'BÁO CÁO CHI TIẾT NHẬP XUẤT TỒN',
      period: periodLabel,
      summary: [
        ['Tổng sự kiện', `${events.length}`],
        ['Nhập trong kỳ', `${inflow.length} con`],
        ['Xuất trong kỳ', `${outflow.length} con`],
        ['Tồn cuối kỳ', `${current.length} con`],
        ['Tổng chi mua vào', `${Math.round(inflowAmount).toLocaleString('vi-VN')} đ`],
        ['Tổng doanh thu bán', `${Math.round(outflowAmount).toLocaleString('vi-VN')} đ`],
      ],
    }

    const rowsInflow = [...inflow].sort((a, b) => {
      const d = b.event_date.localeCompare(a.event_date)
      return d !== 0 ? d : (TYPE_ORDER[a.event_type] ?? 0) - (TYPE_ORDER[b.event_type] ?? 0)
    })
    const rowsOutflow = [...outflow].sort((a, b) => b.event_date.localeCompare(a.event_date))

    sections = []

    if (rowsInflow.length > 0) {
      sections.push({
        title: '1. CHI TIẾT NHẬP (Mua vào + Nở tại trại)',
        headers: ['Ngày', 'Loại', 'Mã gà', 'Tên', 'Giống', 'NCC / Phiếu', 'Giá mua (đ)', 'Ghi chú'],
        rows: rowsInflow.map((e) => [
          fmtDate(e.event_date),
          e.event_label,
          e.chicken_code,
          e.name ?? '',
          e.breed_name ?? '',
          `${e.counterparty ?? ''}${e.reference ? ` / ${e.reference}` : ''}`.trim(),
          e.amount ?? '',
          e.notes ?? '',
        ]),
        footer: [
          'TỔNG NHẬP',
          '',
          '',
          '',
          '',
          `${rowsInflow.length} con`,
          inflowAmount,
          '',
        ],
        rightAlign: [6],
      })
    }

    if (rowsOutflow.length > 0) {
      sections.push({
        title: '2. CHI TIẾT XUẤT (Bán + Chết + Loại thải)',
        headers: ['Ngày', 'Loại', 'Mã gà', 'Tên', 'Giống', 'Khách / Mã đơn / Lý do', 'Giá bán (đ)', 'Ghi chú'],
        rows: rowsOutflow.map((e) => [
          fmtDate(e.event_date),
          e.event_label,
          e.chicken_code,
          e.name ?? '',
          e.breed_name ?? '',
          e.event_type === 'sold'
            ? `${e.counterparty ?? ''}${e.reference ? ` / ${e.reference}` : ''}`.trim()
            : e.notes ?? '',
          e.amount ?? '',
          e.event_type === 'sold' ? (e.notes ?? '') : '',
        ]),
        footer: [
          'TỔNG XUẤT',
          '',
          '',
          '',
          '',
          `${rowsOutflow.length} con`,
          outflowAmount,
          '',
        ],
        rightAlign: [6],
      })
    }

    if (current.length > 0) {
      // By breed for "current" section
      const byBreed = new Map<string, { name: string; count: number; totalCost: number }>()
      for (const c of current) {
        const key = c.breed_code ?? 'unknown'
        const name = c.breed_name ?? '—'
        const cur = byBreed.get(key) ?? { name, count: 0, totalCost: 0 }
        cur.count += 1
        cur.totalCost += n(c.amount)
        byBreed.set(key, cur)
      }
      const breedRows = [...byBreed.values()].sort((a, b) => b.count - a.count)

      sections.push({
        title: '3. TỒN CUỐI KỲ (theo giống)',
        headers: ['Giống', 'Số lượng (con)', 'Giá vốn luỹ kế (đ)'],
        rows: breedRows.map((b) => [b.name, b.count, b.totalCost]),
        footer: [
          'TỔNG TỒN',
          current.length,
          breedRows.reduce((s, b) => s + b.totalCost, 0),
        ],
        rightAlign: [1, 2],
      })
    }

    filenameBase = `nhap-xuat-ton-chi-tiet_${from}_${to}`
  } else {
    // ====== SUMMARY REPORT ======
    const opening = summary.find((r) => r.category === 'opening_stock')?.count ?? 0
    const purchased = summary.find((r) => r.category === 'purchased')?.count ?? 0
    const hatched = summary.find((r) => r.category === 'hatched')?.count ?? 0
    const sold = summary.find((r) => r.category === 'sold')?.count ?? 0
    const died = summary.find((r) => r.category === 'died')?.count ?? 0
    const culled = summary.find((r) => r.category === 'culled')?.count ?? 0
    const closing = summary.find((r) => r.category === 'closing_stock')?.count ?? opening + purchased + hatched - sold - died - culled

    const totalIn = purchased + hatched
    const totalOut = sold + died + culled
    const mortality = opening + totalIn > 0 ? ((died + culled) / (opening + totalIn)) * 100 : 0

    meta = {
      title: 'BÁO CÁO TỔNG HỢP NHẬP XUẤT TỒN',
      period: periodLabel,
      summary: [
        ['Tồn đầu kỳ', `${opening} con`],
        ['Tổng nhập', `${totalIn} con (mua ${purchased} · nở ${hatched})`],
        ['Tổng xuất', `${totalOut} con`],
        ['Tồn cuối kỳ', `${closing} con`],
        ['Tỉ lệ hao hụt', `${mortality.toFixed(1)}%`],
      ],
    }

    sections = [
      {
        title: 'Biến động đàn gà trong kỳ',
        headers: ['Hạng mục', 'Số lượng (con)', 'Ghi chú'],
        rows: [
          ['Tồn đầu kỳ', opening, 'Đang nuôi + cách ly trước ngày đầu kỳ'],
          ['Mua vào', purchased, 'Nhập từ nhà cung cấp bên ngoài'],
          ['Nở tại trại', hatched, 'Gà con nở từ lứa ấp'],
          ['TỔNG NHẬP', totalIn, 'Mua + Nở'],
          ['Đã bán', sold, 'Giao thành công cho khách'],
          ['Chết', died, 'Do bệnh / tai nạn'],
          ['Loại thải', culled, 'Không đạt chuẩn / già / thanh lý'],
          ['TỔNG XUẤT', totalOut, 'Bán + Chết + Loại'],
          ['Tồn cuối kỳ', closing, `Công thức: ${opening} + ${totalIn} − ${totalOut} = ${closing}`],
        ],
        rightAlign: [1],
      },
    ]

    filenameBase = `nhap-xuat-ton-tong-hop_${from}_${to}`
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
