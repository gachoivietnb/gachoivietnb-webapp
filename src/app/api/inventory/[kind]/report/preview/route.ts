import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function n(v: unknown): number {
  if (v == null) return 0
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

type Kind = 'medicine' | 'feed'

function cfg(kind: Kind) {
  if (kind === 'medicine') {
    return {
      itemTable: 'medicines',
      txTable: 'medicine_transactions',
      itemFk: 'medicine_id',
    }
  }
  return {
    itemTable: 'feeds',
    txTable: 'feed_transactions',
    itemFk: 'feed_id',
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind: k } = await params
  if (k !== 'medicine' && k !== 'feed') {
    return NextResponse.json({ error: 'kind phải là medicine hoặc feed' }, { status: 400 })
  }
  const kind = k as Kind
  const c = cfg(kind)

  const { searchParams } = new URL(request.url)
  const today = new Date()
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const defaultTo = today.toISOString().slice(0, 10)
  const from = searchParams.get('from') || defaultFrom
  const to = searchParams.get('to') || defaultTo
  const itemId = searchParams.get('item_id') || ''
  const txType = searchParams.get('type') || ''
  const q = (searchParams.get('q') || '').trim().toLowerCase()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1) All items (for summary)
  const { data: itemsRaw } = await supabase.from(c.itemTable).select('*').eq('is_active', true)

  type Item = {
    id: string
    code: string
    name_vi: string
    unit: string
    current_stock: number
    min_stock_alert: number
    cost_per_unit: number | null
    expiry_date?: string | null
  }
  const items = (itemsRaw ?? []) as Item[]

  // 2) Transactions
  let txQuery = supabase
    .from(c.txTable)
    .select(`*, item:${c.itemTable}!inner(id, code, name_vi, unit)`)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (itemId) txQuery = txQuery.eq(c.itemFk, itemId)
  if (txType) txQuery = txQuery.eq('transaction_type', txType)

  const { data: txRaw, error } = await txQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Tx = {
    id: string
    transaction_type: 'nhap' | 'xuat'
    quantity: number
    transaction_date: string
    cost: number | null
    notes: string | null
    item: { id: string; code: string; name_vi: string; unit: string } | null
  }
  let txs = (txRaw ?? []) as Tx[]

  if (q) {
    txs = txs.filter((t) => {
      const hay = `${t.item?.code ?? ''} ${t.item?.name_vi ?? ''} ${t.notes ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }

  // Split by date range
  const inRange = txs.filter((t) => t.transaction_date >= from && t.transaction_date <= to)
  const beforeRange = txs.filter((t) => t.transaction_date < from)

  // === SUMMARY: per-item nhập/xuất/tồn ===
  // Opening = current_stock - (sum nhap - sum xuat) in range - (sum nhap - sum xuat) after range
  // Simplify: Opening = current_stock − net_change_from_`from` till now
  // We'll compute: net change from `from` till now = (in_range net) + (after_range net — but we don't have after_range because cursor stops at "now")
  // Actually current_stock reflects ALL history, so:
  //   opening = current_stock − (sum of nhap − sum of xuat from `from` to now)
  //   in-range nhap/xuat = reported directly
  //   closing = opening + nhap_in_range − xuat_in_range  (assuming end_date = to, but we approximate end as now)
  // For reports where to < today, we'd need after_range txs too. For now to ≤ today, closing ≈ opening + netInRange.

  type ItemAgg = {
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
  }

  const byItem = new Map<string, ItemAgg>()
  for (const it of items) {
    byItem.set(it.id, {
      item_id: it.id,
      code: it.code,
      name_vi: it.name_vi,
      unit: it.unit,
      opening: 0,
      nhap: 0,
      xuat: 0,
      closing: 0,
      cost_in: 0,
      cost_out: 0,
    })
  }

  // Compute in-range aggregates
  for (const t of inRange) {
    if (!t.item) continue
    const agg = byItem.get(t.item.id)
    if (!agg) continue
    if (t.transaction_type === 'nhap') {
      agg.nhap += n(t.quantity)
      agg.cost_in += n(t.cost)
    } else {
      agg.xuat += n(t.quantity)
      agg.cost_out += n(t.cost)
    }
  }

  // Compute opening for each item: current - (net changes from `from` onward, all txs)
  const netFromOn = new Map<string, number>()
  for (const t of txs) {
    if (!t.item) continue
    if (t.transaction_date < from) continue
    const cur = netFromOn.get(t.item.id) ?? 0
    const delta = t.transaction_type === 'nhap' ? n(t.quantity) : -n(t.quantity)
    netFromOn.set(t.item.id, cur + delta)
  }

  for (const it of items) {
    const agg = byItem.get(it.id)
    if (!agg) continue
    const netForward = netFromOn.get(it.id) ?? 0
    agg.opening = n(it.current_stock) - netForward
    // Closing at end of range: opening + nhap - xuat
    agg.closing = agg.opening + agg.nhap - agg.xuat
  }

  const itemAggregates = [...byItem.values()].sort((a, b) => {
    // Priority: items with activity first
    const aAct = a.nhap + a.xuat > 0 ? 0 : 1
    const bAct = b.nhap + b.xuat > 0 ? 0 : 1
    if (aAct !== bAct) return aAct - bAct
    return a.name_vi.localeCompare(b.name_vi, 'vi')
  })

  // Totals
  const totalNhap = itemAggregates.reduce((s, x) => s + x.nhap, 0)
  const totalXuat = itemAggregates.reduce((s, x) => s + x.xuat, 0)
  const totalCostIn = itemAggregates.reduce((s, x) => s + x.cost_in, 0)
  const totalCostOut = itemAggregates.reduce((s, x) => s + x.cost_out, 0)
  const currentTotalValue = items.reduce(
    (s, it) => s + n(it.current_stock) * n(it.cost_per_unit ?? 0),
    0
  )

  return NextResponse.json({
    kind,
    summary: {
      total_items: items.length,
      active_items: itemAggregates.filter((a) => a.nhap + a.xuat > 0).length,
      total_nhap: totalNhap,
      total_xuat: totalXuat,
      total_cost_in: totalCostIn,
      total_cost_out: totalCostOut,
      current_total_value: currentTotalValue,
    },
    items: itemAggregates,
    transactions: inRange.map((t) => ({
      id: t.id,
      transaction_date: t.transaction_date,
      transaction_type: t.transaction_type,
      item_id: t.item?.id ?? null,
      item_code: t.item?.code ?? '',
      item_name: t.item?.name_vi ?? '',
      unit: t.item?.unit ?? '',
      quantity: n(t.quantity),
      cost: n(t.cost),
      notes: t.notes,
    })),
  })
}
