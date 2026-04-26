import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function n(v: unknown): number {
  if (v == null) return 0
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
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

  let query = supabase
    .from('purchases')
    .select(
      `
      id, purchase_code, purchase_date, total_quantity, total_amount, notes,
      supplier:suppliers (id, name),
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
    supplier: { id: string; name: string } | null
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

  const total_purchases = rows.length
  const total_qty = rows.reduce((s, r) => s + n(r.total_quantity), 0)
  const total_amount = rows.reduce((s, r) => s + n(r.total_amount), 0)
  const avg_price = total_qty > 0 ? total_amount / total_qty : 0

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

  return NextResponse.json({
    total_purchases,
    total_qty,
    total_amount,
    avg_price,
    by_supplier: [...bySupplier.values()].sort((a, b) => b.amount - a.amount),
    by_breed: [...byBreed.values()].sort((a, b) => b.amount - a.amount),
    by_month: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v),
    sample_rows: rows.slice(0, 10).map((r) => ({
      id: r.id,
      purchase_code: r.purchase_code,
      purchase_date: r.purchase_date,
      total_quantity: r.total_quantity,
      total_amount: r.total_amount,
      supplier_name: r.supplier?.name ?? '—',
    })),
  })
}
