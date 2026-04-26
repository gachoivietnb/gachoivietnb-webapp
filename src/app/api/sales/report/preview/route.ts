import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function n(v: unknown): number {
  if (v == null) return 0
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

const STATUS_LABELS: Record<string, string> = {
  hoi_mua: 'Hỏi mua',
  dat_coc: 'Đặt cọc',
  da_giao: 'Đã giao',
  huy: 'Hủy',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
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

  let query = supabase
    .from('sales_orders')
    .select(
      `
      id, order_code, order_date, status, deposit_amount, total_amount, delivered_date, notes,
      customer:customers (id, name, tier),
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
    customer: { id: string; name: string; tier: string | null } | null
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

  const total_orders = rows.length
  const total_qty = rows.reduce((s, r) => s + r.items.length, 0)
  const total_amount = rows.reduce((s, r) => s + n(r.total_amount), 0)
  const total_deposit = rows.reduce((s, r) => s + n(r.deposit_amount), 0)
  const avg_price = total_qty > 0 ? total_amount / total_qty : 0
  const delivered_revenue = rows
    .filter((r) => r.status === 'da_giao')
    .reduce((s, r) => s + n(r.total_amount), 0)
  const pending_amount = rows
    .filter((r) => r.status === 'dat_coc' || r.status === 'hoi_mua')
    .reduce((s, r) => s + n(r.total_amount), 0)

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

  return NextResponse.json({
    total_orders,
    total_qty,
    total_amount,
    total_deposit,
    delivered_revenue,
    pending_amount,
    avg_price,
    by_customer: [...byCustomer.values()].sort((a, b) => b.amount - a.amount),
    by_breed: [...byBreed.values()].sort((a, b) => b.amount - a.amount),
    by_month: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
    by_status: [...byStatus.values()].sort((a, b) => b.amount - a.amount),
    sample_rows: rows.slice(0, 10).map((r) => ({
      id: r.id,
      order_code: r.order_code,
      order_date: r.order_date,
      status: r.status,
      status_label: STATUS_LABELS[r.status] ?? r.status,
      customer_name: r.customer?.name ?? '—',
      customer_tier: r.customer?.tier,
      qty: r.items.length,
      total_amount: r.total_amount,
      deposit_amount: r.deposit_amount ?? 0,
    })),
  })
}
