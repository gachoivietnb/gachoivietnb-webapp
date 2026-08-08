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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const format = (searchParams.get('format') ?? 'excel').toLowerCase()
  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const defaultTo = today.toISOString().slice(0, 10)
  const from = searchParams.get('from') || defaultFrom
  const to = searchParams.get('to') || defaultTo
  const supplierId = searchParams.get('supplier_id') || ''
  const breedCode = searchParams.get('breed_code') || ''
  const q = (searchParams.get('q') || '').trim().toLowerCase()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Farm info
  const { data: farmRow } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'farm_info')
    .maybeSingle()
  const farm =
    ((farmRow as { value?: FarmInfo } | null)?.value as FarmInfo) ?? { name: 'Gà Chọi Việt NB' }

  // Fetch purchases within date range
  let query = supabase
    .from('purchases')
    .select(
      `
      id, purchase_code, purchase_date, total_quantity, total_amount, notes,
      supplier:suppliers (id, name, phone),
      items:purchase_items (
        id, unit_price,
        chicken:chickens (
          chicken_code, name,
          breed:breeds (code, name_vi)
        )
      )
      `
    )
    .gte('purchase_date', from)
    .lte('purchase_date', to)
    .order('purchase_date', { ascending: false })

  if (supplierId) query = query.eq('supplier_id', supplierId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = {
    id: string
    purchase_code: string
    purchase_date: string
    total_quantity: number
    total_amount: number
    notes: string | null
    supplier: { id: string; name: string; phone: string | null } | null
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

  // Apply breed + search filters (client-side since requires join)
  if (breedCode) {
    rows = rows.filter((r) => r.items.some((it) => it.chicken?.breed?.code === breedCode))
  }
  if (q) {
    rows = rows.filter((r) => {
      const hay = [
        r.purchase_code,
        r.notes ?? '',
        r.supplier?.name ?? '',
        ...r.items.map((it) => `${it.chicken?.chicken_code ?? ''} ${it.chicken?.name ?? ''}`),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }

  // ===== Aggregates =====
  const totalPurchases = rows.length
  const totalQty = rows.reduce((s, r) => s + n(r.total_quantity), 0)
  const totalAmount = rows.reduce((s, r) => s + n(r.total_amount), 0)
  const avgPrice = totalQty > 0 ? totalAmount / totalQty : 0

  // By supplier
  const bySupplier = new Map<string, { name: string; purchases: number; qty: number; amount: number }>()
  for (const r of rows) {
    const key = r.supplier?.id ?? 'no_supplier'
    const name = r.supplier?.name ?? '— Không có NCC —'
    const cur = bySupplier.get(key) ?? { name, purchases: 0, qty: 0, amount: 0 }
    cur.purchases += 1
    cur.qty += n(r.total_quantity)
    cur.amount += n(r.total_amount)
    bySupplier.set(key, cur)
  }
  const supplierRows = [...bySupplier.values()].sort((a, b) => b.amount - a.amount)

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
  const byMonth = new Map<string, { label: string; purchases: number; qty: number; amount: number }>()
  for (const r of rows) {
    const d = new Date(r.purchase_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `T${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    const cur = byMonth.get(key) ?? { label, purchases: 0, qty: 0, amount: 0 }
    cur.purchases += 1
    cur.qty += n(r.total_quantity)
    cur.amount += n(r.total_amount)
    byMonth.set(key, cur)
  }
  const monthRows = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)

  // ===== Build report =====
  const meta: ReportMeta = {
    title: 'BÁO CÁO MUA VÀO',
    period: `${fmtDate(from)} → ${fmtDate(to)}`,
    summary: [
      ['Số phiếu nhập', `${totalPurchases}`],
      ['Tổng gà nhập (con)', `${totalQty.toLocaleString('vi-VN')}`],
      ['Tổng chi mua', fmtVnd(totalAmount)],
      ['Giá TB / con', fmtVnd(avgPrice)],
      ['Số nhà cung cấp', `${bySupplier.size}`],
      ['Số giống', `${breedRows.length}`],
    ],
  }

  const sections: ReportSection[] = [
    {
      title: '1. Chi tiết phiếu mua vào',
      headers: ['Mã phiếu', 'Ngày', 'Nhà cung cấp', 'SL (con)', 'Tổng tiền', 'Giá TB/con', 'Ghi chú'],
      rows: rows.map((r) => [
        r.purchase_code,
        fmtDate(r.purchase_date),
        r.supplier?.name ?? '—',
        n(r.total_quantity),
        n(r.total_amount),
        n(r.total_quantity) > 0 ? Math.round(n(r.total_amount) / n(r.total_quantity)) : 0,
        r.notes ?? '',
      ]),
      footer: [
        'TỔNG',
        '',
        '',
        totalQty,
        totalAmount,
        avgPrice > 0 ? Math.round(avgPrice) : 0,
        '',
      ],
      rightAlign: [3, 4, 5],
    },
    {
      title: '2. Tổng hợp theo nhà cung cấp',
      headers: ['Nhà cung cấp', 'Số phiếu', 'SL (con)', 'Tổng tiền', '% tổng'],
      rows: supplierRows.map((r) => [
        r.name,
        r.purchases,
        r.qty,
        r.amount,
        totalAmount > 0 ? Math.round((r.amount / totalAmount) * 100 * 10) / 10 : 0,
      ]),
      footer: ['TỔNG', totalPurchases, totalQty, totalAmount, 100],
      rightAlign: [1, 2, 3, 4],
    },
    {
      title: '3. Tổng hợp theo giống gà',
      headers: ['Giống', 'Số con', 'Tổng tiền', 'Giá TB/con', '% chi'],
      rows: breedRows.map((r) => [
        r.name,
        r.qty,
        r.amount,
        r.qty > 0 ? Math.round(r.amount / r.qty) : 0,
        totalAmount > 0 ? Math.round((r.amount / totalAmount) * 100 * 10) / 10 : 0,
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
      headers: ['Tháng', 'Số phiếu', 'SL gà', 'Tổng tiền', 'Giá TB/con'],
      rows: monthRows.map((r) => [
        r.label,
        r.purchases,
        r.qty,
        r.amount,
        r.qty > 0 ? Math.round(r.amount / r.qty) : 0,
      ]),
      footer: ['TỔNG', totalPurchases, totalQty, totalAmount, avgPrice > 0 ? Math.round(avgPrice) : 0],
      rightAlign: [1, 2, 3, 4],
    },
  ]

  const filenameBase = `bao-cao-mua-vao_${from}_${to}`

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
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
    },
  })
}
