import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  buildExcel,
  buildPdf,
  type FarmInfo,
  type ReportMeta,
  type ReportSection,
} from '@/lib/reports/finance-export'

function n(v: unknown): number {
  if (v == null) return 0
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('vi-VN')
}

function fmtVnd(v: number): string {
  return `${Math.round(v).toLocaleString('vi-VN')} đ`
}

const STATUS_LABELS: Record<string, string> = {
  hoi_mua: 'Hỏi mua',
  dat_coc: 'Đặt cọc',
  da_giao: 'Đã giao',
  huy: 'Hủy',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const format = (searchParams.get('format') ?? 'excel').toLowerCase()
  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const defaultTo = today.toISOString().slice(0, 10)
  const from = searchParams.get('from') || defaultFrom
  const to = searchParams.get('to') || defaultTo
  const customerId = searchParams.get('customer_id') || ''
  const breedCode = searchParams.get('breed_code') || ''
  const status = searchParams.get('status') || ''
  const q = (searchParams.get('q') || '').trim().toLowerCase()

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

  let query = supabase
    .from('sales_orders')
    .select(
      `
      id, order_code, order_date, status, deposit_amount, total_amount, delivered_date, notes,
      customer:customers (id, name, tier, phone),
      items:sales_items (
        id, unit_price,
        chicken:chickens (
          chicken_code, name,
          breed:breeds (code, name_vi)
        )
      )
      `
    )
    .gte('order_date', from)
    .lte('order_date', to)
    .order('order_date', { ascending: false })

  if (customerId) query = query.eq('customer_id', customerId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = {
    id: string
    order_code: string
    order_date: string
    status: string
    deposit_amount: number | null
    total_amount: number
    delivered_date: string | null
    notes: string | null
    customer: { id: string; name: string; tier: string | null; phone: string | null } | null
    items: Array<{
      id: string
      unit_price: number
      chicken: {
        chicken_code: string
        name: string | null
        breed: { code: string | null; name_vi: string } | null
      } | null
    }>
  }

  let rows = (data ?? []) as Row[]

  if (breedCode) {
    rows = rows.filter((r) => r.items.some((it) => it.chicken?.breed?.code === breedCode))
  }
  if (q) {
    rows = rows.filter((r) => {
      const hay = [
        r.order_code,
        r.notes ?? '',
        r.customer?.name ?? '',
        ...r.items.map((it) => `${it.chicken?.chicken_code ?? ''} ${it.chicken?.name ?? ''}`),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }

  const totalOrders = rows.length
  const totalQty = rows.reduce((s, r) => s + r.items.length, 0)
  const totalAmount = rows.reduce((s, r) => s + n(r.total_amount), 0)
  const totalDeposit = rows.reduce((s, r) => s + n(r.deposit_amount), 0)
  const avgPrice = totalQty > 0 ? totalAmount / totalQty : 0
  const deliveredRevenue = rows
    .filter((r) => r.status === 'da_giao')
    .reduce((s, r) => s + n(r.total_amount), 0)
  const pendingAmount = rows
    .filter((r) => r.status === 'dat_coc' || r.status === 'hoi_mua')
    .reduce((s, r) => s + n(r.total_amount), 0)

  // By customer
  const byCustomer = new Map<
    string,
    { name: string; tier: string | null; orders: number; qty: number; amount: number }
  >()
  for (const r of rows) {
    const key = r.customer?.id ?? 'anon'
    const name = r.customer?.name ?? '— Khách lẻ —'
    const cur = byCustomer.get(key) ?? {
      name,
      tier: r.customer?.tier ?? null,
      orders: 0,
      qty: 0,
      amount: 0,
    }
    cur.orders += 1
    cur.qty += r.items.length
    cur.amount += n(r.total_amount)
    byCustomer.set(key, cur)
  }
  const customerRows = [...byCustomer.values()].sort((a, b) => b.amount - a.amount)

  // By breed
  const byBreed = new Map<string, { name: string; qty: number; amount: number }>()
  for (const r of rows) {
    for (const it of r.items) {
      const code = it.chicken?.breed?.code ?? 'unknown'
      const name = it.chicken?.breed?.name_vi ?? '— Chưa rõ giống —'
      const cur = byBreed.get(code) ?? { name, qty: 0, amount: 0 }
      cur.qty += 1
      cur.amount += n(it.unit_price)
      byBreed.set(code, cur)
    }
  }
  const breedRows = [...byBreed.values()].sort((a, b) => b.amount - a.amount)

  // By month
  const byMonth = new Map<
    string,
    { label: string; orders: number; qty: number; amount: number }
  >()
  for (const r of rows) {
    const d = new Date(r.order_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `T${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    const cur = byMonth.get(key) ?? { label, orders: 0, qty: 0, amount: 0 }
    cur.orders += 1
    cur.qty += r.items.length
    cur.amount += n(r.total_amount)
    byMonth.set(key, cur)
  }
  const monthRows = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)

  // By status
  const byStatus = new Map<string, { label: string; orders: number; amount: number }>()
  for (const r of rows) {
    const cur = byStatus.get(r.status) ?? {
      label: STATUS_LABELS[r.status] ?? r.status,
      orders: 0,
      amount: 0,
    }
    cur.orders += 1
    cur.amount += n(r.total_amount)
    byStatus.set(r.status, cur)
  }
  const statusRows = [...byStatus.values()].sort((a, b) => b.amount - a.amount)

  const meta: ReportMeta = {
    title: 'BÁO CÁO BÁN RA',
    period: `${fmtDate(from)} → ${fmtDate(to)}`,
    summary: [
      ['Số đơn bán', `${totalOrders}`],
      ['Tổng gà bán (con)', `${totalQty.toLocaleString('vi-VN')}`],
      ['Tổng doanh thu', fmtVnd(totalAmount)],
      ['Doanh thu đã giao', fmtVnd(deliveredRevenue)],
      ['Giá TB / con', fmtVnd(avgPrice)],
      ['Đặt cọc đang nắm', fmtVnd(totalDeposit)],
      ['Doanh thu chờ giao', fmtVnd(pendingAmount)],
      ['Số khách hàng', `${byCustomer.size}`],
    ],
  }

  const sections: ReportSection[] = [
    {
      title: '1. Chi tiết đơn bán',
      headers: [
        'Mã đơn',
        'Ngày',
        'Khách hàng',
        'SL',
        'Tổng tiền',
        'Đặt cọc',
        'Trạng thái',
        'Ghi chú',
      ],
      rows: rows.map((r) => [
        r.order_code,
        fmtDate(r.order_date),
        `${r.customer?.name ?? '—'}${r.customer?.tier === 'vip' ? ' (VIP)' : ''}`,
        r.items.length,
        n(r.total_amount),
        n(r.deposit_amount),
        STATUS_LABELS[r.status] ?? r.status,
        r.notes ?? '',
      ]),
      footer: ['TỔNG', '', '', totalQty, totalAmount, totalDeposit, '', ''],
      rightAlign: [3, 4, 5],
    },
    {
      title: '2. Tổng hợp theo khách hàng',
      headers: ['Khách hàng', 'Hạng', 'Số đơn', 'SL', 'Doanh thu', '% tổng'],
      rows: customerRows.map((c) => [
        c.name,
        c.tier === 'vip' ? '★ VIP' : c.tier === 'thuong_xuyen' ? 'Thường xuyên' : 'Mới',
        c.orders,
        c.qty,
        c.amount,
        totalAmount > 0 ? Math.round((c.amount / totalAmount) * 100 * 10) / 10 : 0,
      ]),
      footer: ['TỔNG', '', totalOrders, totalQty, totalAmount, 100],
      rightAlign: [2, 3, 4, 5],
    },
    {
      title: '3. Tổng hợp theo giống gà',
      headers: ['Giống', 'Số con', 'Doanh thu', 'Giá TB/con', '% DT'],
      rows: breedRows.map((b) => [
        b.name,
        b.qty,
        b.amount,
        b.qty > 0 ? Math.round(b.amount / b.qty) : 0,
        totalAmount > 0 ? Math.round((b.amount / totalAmount) * 100 * 10) / 10 : 0,
      ]),
      footer: [
        'TỔNG',
        breedRows.reduce((s, r) => s + r.qty, 0),
        breedRows.reduce((s, r) => s + r.amount, 0),
        '',
        100,
      ],
      rightAlign: [1, 2, 3, 4],
    },
    {
      title: '4. Tổng hợp theo tháng',
      headers: ['Tháng', 'Số đơn', 'SL gà', 'Doanh thu', 'Giá TB/con'],
      rows: monthRows.map((m) => [
        m.label,
        m.orders,
        m.qty,
        m.amount,
        m.qty > 0 ? Math.round(m.amount / m.qty) : 0,
      ]),
      footer: [
        'TỔNG',
        totalOrders,
        totalQty,
        totalAmount,
        avgPrice > 0 ? Math.round(avgPrice) : 0,
      ],
      rightAlign: [1, 2, 3, 4],
    },
    {
      title: '5. Tổng hợp theo trạng thái',
      headers: ['Trạng thái', 'Số đơn', 'Giá trị', '% tổng'],
      rows: statusRows.map((s) => [
        s.label,
        s.orders,
        s.amount,
        totalAmount > 0 ? Math.round((s.amount / totalAmount) * 100 * 10) / 10 : 0,
      ]),
      footer: ['TỔNG', totalOrders, totalAmount, 100],
      rightAlign: [1, 2, 3],
    },
  ]

  const filenameBase = `bao-cao-ban-ra_${from}_${to}`

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
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
    },
  })
}
