import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export type InventoryEvent = {
  event_date: string
  event_type: 'opening' | 'purchased' | 'hatched' | 'sold' | 'died' | 'culled' | 'current'
  event_label: string
  chicken_id: string
  chicken_code: string
  name: string | null
  breed_name: string | null
  breed_code: string | null
  source: string | null
  status: string
  amount: number | null // purchase cost / sale price
  counterparty: string | null // supplier name / customer name
  reference: string | null // purchase_code / order_code
  notes: string | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1) PURCHASED in range (with supplier + unit price)
  const { data: purchaseItems, error: pErr } = await supabase
    .from('purchase_items')
    .select(
      `
      unit_price, notes,
      purchase:purchases!inner (purchase_code, purchase_date, supplier:suppliers(name)),
      chicken:chickens (
        id, chicken_code, name, source, status, created_at,
        breed:breeds(code, name_vi)
      )
      `
    )
    .gte('purchase.purchase_date', from)
    .lte('purchase.purchase_date', to)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  // 2) HATCHED in range (source='no_tai_trai')
  const { data: hatched } = await supabase
    .from('chickens')
    .select(`
      id, chicken_code, name, source, status, created_at, birth_date,
      breed:breeds(code, name_vi),
      breeding_litter_id
    `)
    .eq('source', 'no_tai_trai')
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59')

  // 3) SOLD in range (via sales_items + orders)
  const { data: salesItems } = await supabase
    .from('sales_items')
    .select(
      `
      unit_price, notes,
      order:sales_orders!inner (order_code, order_date, delivered_date, status, customer:customers(name)),
      chicken:chickens (
        id, chicken_code, name, source, status, sale_date,
        breed:breeds(code, name_vi)
      )
      `
    )
    .gte('order.order_date', from)
    .lte('order.order_date', to)

  // 4) DIED / CULLED in range
  const { data: statusChanges } = await supabase
    .from('chickens')
    .select(`
      id, chicken_code, name, source, status, status_date, status_reason,
      breed:breeds(code, name_vi)
    `)
    .in('status', ['chet', 'loai_thai'])
    .gte('status_date', from)
    .lte('status_date', to)

  // 5) CURRENT STOCK (đang nuôi as of "to" date)
  const { data: currentStock } = await supabase
    .from('chickens')
    .select(`
      id, chicken_code, name, source, status, created_at, cost_purchase,
      breed:breeds(code, name_vi)
    `)
    .in('status', ['dang_nuoi', 'dang_cach_ly'])
    .lte('created_at', to + 'T23:59:59')
    .limit(2000)

  type PurchaseItem = {
    unit_price: number
    notes: string | null
    purchase: { purchase_code: string; purchase_date: string; supplier: { name: string } | null } | null
    chicken: {
      id: string
      chicken_code: string
      name: string | null
      source: string | null
      status: string
      breed: { code: string | null; name_vi: string } | null
    } | null
  }
  type HatchedRow = {
    id: string
    chicken_code: string
    name: string | null
    source: string | null
    status: string
    created_at: string
    birth_date: string | null
    breed: { code: string | null; name_vi: string } | null
  }
  type SalesItem = {
    unit_price: number
    notes: string | null
    order: {
      order_code: string
      order_date: string
      delivered_date: string | null
      status: string
      customer: { name: string } | null
    } | null
    chicken: {
      id: string
      chicken_code: string
      name: string | null
      source: string | null
      status: string
      sale_date: string | null
      breed: { code: string | null; name_vi: string } | null
    } | null
  }
  type StatusRow = {
    id: string
    chicken_code: string
    name: string | null
    source: string | null
    status: string
    status_date: string | null
    status_reason: string | null
    breed: { code: string | null; name_vi: string } | null
  }
  type CurrentRow = {
    id: string
    chicken_code: string
    name: string | null
    source: string | null
    status: string
    created_at: string
    cost_purchase: number | null
    breed: { code: string | null; name_vi: string } | null
  }

  const events: InventoryEvent[] = []

  for (const pi of (purchaseItems ?? []) as PurchaseItem[]) {
    if (!pi.chicken || !pi.purchase) continue
    events.push({
      event_date: pi.purchase.purchase_date,
      event_type: 'purchased',
      event_label: 'Mua vào',
      chicken_id: pi.chicken.id,
      chicken_code: pi.chicken.chicken_code,
      name: pi.chicken.name,
      breed_name: pi.chicken.breed?.name_vi ?? null,
      breed_code: pi.chicken.breed?.code ?? null,
      source: pi.chicken.source,
      status: pi.chicken.status,
      amount: Number(pi.unit_price),
      counterparty: pi.purchase.supplier?.name ?? null,
      reference: pi.purchase.purchase_code,
      notes: pi.notes,
    })
  }

  for (const h of (hatched ?? []) as HatchedRow[]) {
    events.push({
      event_date: h.birth_date ?? h.created_at.slice(0, 10),
      event_type: 'hatched',
      event_label: 'Nở tại trại',
      chicken_id: h.id,
      chicken_code: h.chicken_code,
      name: h.name,
      breed_name: h.breed?.name_vi ?? null,
      breed_code: h.breed?.code ?? null,
      source: h.source,
      status: h.status,
      amount: null,
      counterparty: null,
      reference: null,
      notes: null,
    })
  }

  for (const si of (salesItems ?? []) as SalesItem[]) {
    if (!si.chicken || !si.order) continue
    events.push({
      event_date: si.order.delivered_date ?? si.order.order_date,
      event_type: 'sold',
      event_label: 'Đã bán',
      chicken_id: si.chicken.id,
      chicken_code: si.chicken.chicken_code,
      name: si.chicken.name,
      breed_name: si.chicken.breed?.name_vi ?? null,
      breed_code: si.chicken.breed?.code ?? null,
      source: si.chicken.source,
      status: si.chicken.status,
      amount: Number(si.unit_price),
      counterparty: si.order.customer?.name ?? null,
      reference: si.order.order_code,
      notes: si.notes,
    })
  }

  for (const sc of (statusChanges ?? []) as StatusRow[]) {
    events.push({
      event_date: sc.status_date ?? '',
      event_type: sc.status === 'chet' ? 'died' : 'culled',
      event_label: sc.status === 'chet' ? 'Chết' : 'Loại thải',
      chicken_id: sc.id,
      chicken_code: sc.chicken_code,
      name: sc.name,
      breed_name: sc.breed?.name_vi ?? null,
      breed_code: sc.breed?.code ?? null,
      source: sc.source,
      status: sc.status,
      amount: null,
      counterparty: null,
      reference: null,
      notes: sc.status_reason,
    })
  }

  for (const c of (currentStock ?? []) as CurrentRow[]) {
    events.push({
      event_date: c.created_at.slice(0, 10),
      event_type: 'current',
      event_label: 'Tồn cuối kỳ',
      chicken_id: c.id,
      chicken_code: c.chicken_code,
      name: c.name,
      breed_name: c.breed?.name_vi ?? null,
      breed_code: c.breed?.code ?? null,
      source: c.source,
      status: c.status,
      amount: c.cost_purchase != null ? Number(c.cost_purchase) : null,
      counterparty: null,
      reference: null,
      notes: null,
    })
  }

  // Sort: event_date desc, then by type (nhập trước xuất)
  const typeOrder: Record<string, number> = {
    purchased: 1,
    hatched: 2,
    sold: 3,
    died: 4,
    culled: 5,
    current: 6,
    opening: 7,
  }
  events.sort((a, b) => {
    const d = b.event_date.localeCompare(a.event_date)
    if (d !== 0) return d
    return (typeOrder[a.event_type] ?? 99) - (typeOrder[b.event_type] ?? 99)
  })

  return NextResponse.json({ data: events })
}
