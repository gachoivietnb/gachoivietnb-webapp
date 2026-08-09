import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const ItemSchema = z.object({
  unit_price: z.number().positive(),
  breed_id: z.string().uuid(),
  gender: z.enum(['trong', 'mai', 'chua_xac_dinh']).default('chua_xac_dinh'),
  qr_tag_id: z.string().uuid().optional(),
  birth_date: z.string().optional(),
  weight_kg: z.number().optional(),
  color: z.string().optional(),
  name: z.string().optional(),
})

// Dòng hàng cám / thuốc / vật tư (Đợt A) — chọn từ kho có sẵn
const SupplyItemSchema = z.object({
  item_type: z.enum(['thuc_an', 'thuoc', 'khac']),
  feed_id: z.string().uuid().optional(),
  medicine_id: z.string().uuid().optional(),
  item_name: z.string().optional(),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
})

const PurchaseSchema = z.object({
  kind: z.enum(['ga', 'thuc_an', 'thuoc', 'vat_tu', 'khac']).default('ga'),
  supplier_id: z.string().uuid().optional(),
  supplier_name: z.string().optional(),
  purchase_date: z.string(),
  items: z.array(ItemSchema).max(200).optional(),
  supply_items: z.array(SupplyItemSchema).max(200).optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 20

  const supabase = await createClient()
  const { data, count, error } = await supabase
    .from('purchases')
    .select('*, supplier:suppliers(id, name), purchase_items(count)', { count: 'exact' })
    .order('purchase_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(request: Request) {
  const ctx = await requirePermission('mua_vao', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const supabase = await createClient()
  const parsed = PurchaseSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { kind, supplier_id, supplier_name, purchase_date, items, supply_items, notes } = parsed.data

  let finalSupplierId = supplier_id
  if (!finalSupplierId && supplier_name) {
    const { data: newSupplier } = await supabase
      .from('suppliers')
      .insert({ name: supplier_name, supplier_type: 'ga_giong' } as never)
      .select('id')
      .single()
    finalSupplierId = (newSupplier as { id: string } | null)?.id
  }

  // ===== Nhánh cám / thuốc / vật tư (Đợt A) — tạo phiếu + cộng tồn kho =====
  if (kind !== 'ga') {
    const supplyItems = supply_items ?? []
    if (supplyItems.length === 0) {
      return NextResponse.json({ error: 'Thiếu danh sách hàng nhập' }, { status: 400 })
    }
    const total = supplyItems.reduce((s, it) => s + it.quantity * it.unit_price, 0)

    const { data: purchase, error: pErr } = await supabase
      .from('purchases')
      .insert({
        kind,
        supplier_id: finalSupplierId,
        purchase_date,
        total_quantity: supplyItems.length,
        total_amount: Math.round(total),
        notes: notes ?? null,
        performed_by: ctx.userId,
      } as never)
      .select()
      .single()
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    const pid = (purchase as { id: string }).id

    const piRows = supplyItems.map((it) => ({
      purchase_id: pid,
      item_type: it.item_type,
      feed_id: it.item_type === 'thuc_an' ? (it.feed_id ?? null) : null,
      medicine_id: it.item_type === 'thuoc' ? (it.medicine_id ?? null) : null,
      item_name: it.item_name ?? null,
      quantity: it.quantity,
      unit_price: it.unit_price,
    }))
    const { error: piErr } = await supabase.from('purchase_items').insert(piRows as never)
    if (piErr) {
      await supabase.from('purchases').delete().eq('id', pid)
      return NextResponse.json({ error: `Lỗi tạo chi tiết nhập: ${piErr.message}` }, { status: 500 })
    }

    // Cộng tồn kho qua transaction 'nhap' (trigger update_feed_stock/update_medicine_stock tự cộng current_stock)
    const feedTx = supplyItems
      .filter((it) => it.item_type === 'thuc_an' && it.feed_id)
      .map((it) => ({
        feed_id: it.feed_id,
        transaction_type: 'nhap' as const,
        quantity: it.quantity,
        cost: Math.round(it.quantity * it.unit_price),
        transaction_date: purchase_date,
        performed_by: ctx.userId,
        purchase_id: pid,
        notes: 'Nhập từ phiếu mua NCC',
      }))
    const medTx = supplyItems
      .filter((it) => it.item_type === 'thuoc' && it.medicine_id)
      .map((it) => ({
        medicine_id: it.medicine_id,
        transaction_type: 'nhap' as const,
        quantity: it.quantity,
        cost: Math.round(it.quantity * it.unit_price),
        transaction_date: purchase_date,
        performed_by: ctx.userId,
        purchase_id: pid,
        notes: 'Nhập từ phiếu mua NCC',
      }))
    if (feedTx.length) await supabase.from('feed_transactions').insert(feedTx as never)
    if (medTx.length) await supabase.from('medicine_transactions').insert(medTx as never)

    return NextResponse.json({ data: purchase, count: supplyItems.length })
  }

  // ===== Nhánh gà (giữ nguyên) =====
  const chickenItems = items ?? []
  if (chickenItems.length === 0) {
    return NextResponse.json({ error: 'Thiếu danh sách gà' }, { status: 400 })
  }
  const totalAmount = chickenItems.reduce((sum, i) => sum + i.unit_price, 0)

  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      supplier_id: finalSupplierId,
      purchase_date,
      total_quantity: chickenItems.length,
      total_amount: totalAmount,
      notes: notes ?? null,
      performed_by: ctx.userId,
    } as never)
    .select()
    .single()

  if (purchaseError) return NextResponse.json({ error: purchaseError.message }, { status: 500 })
  const purchaseRow = purchase as { id: string }

  const { data: cageId } = await supabase.rpc('find_available_cage' as never, { p_area_type: 'cach_ly' } as never)

  const chickensToInsert = chickenItems.map((item) => ({
    breed_id: item.breed_id,
    qr_tag_id: item.qr_tag_id ?? null,
    cage_id: cageId ?? null,
    gender: item.gender,
    birth_date: item.birth_date ?? null,
    weight_kg: item.weight_kg ?? null,
    color: item.color ?? null,
    name: item.name ?? null,
    source: 'mua' as const,
    cost_purchase: item.unit_price,
    status: 'dang_cach_ly' as const,
    created_by: ctx.userId,
  }))

  const { data: createdChickens, error: chickensError } = await supabase
    .from('chickens')
    .insert(chickensToInsert as never)
    .select('id')

  if (chickensError) {
    await supabase.from('purchases').delete().eq('id', purchaseRow.id)
    return NextResponse.json({ error: chickensError.message }, { status: 500 })
  }

  if (createdChickens && createdChickens.length > 0) {
    const purchaseItems = (createdChickens as Array<{ id: string }>).map((c, i) => ({
      purchase_id: purchaseRow.id,
      chicken_id: c.id,
      unit_price: chickenItems[i].unit_price,
    }))
    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(purchaseItems as never)
    if (itemsError) {
      // Rollback: xóa chickens + purchase vừa tạo
      await supabase
        .from('chickens')
        .delete()
        .in('id', (createdChickens as Array<{ id: string }>).map((c) => c.id))
      await supabase.from('purchases').delete().eq('id', purchaseRow.id)
      return NextResponse.json(
        { error: `Lỗi tạo chi tiết nhập: ${itemsError.message}` },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    data: { ...(purchase as object), items: createdChickens },
    count: createdChickens?.length ?? 0,
  })
}
