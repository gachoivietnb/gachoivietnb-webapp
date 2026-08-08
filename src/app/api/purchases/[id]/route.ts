import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: purchase } = await supabase
    .from('purchases')
    .select('*, supplier:suppliers(*)')
    .eq('id', id)
    .maybeSingle()

  if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: items } = await supabase
    .from('purchase_items')
    .select('*, chicken:chickens!inner(id, chicken_code, name, status, breeds(name_vi))')
    .eq('purchase_id', id)

  return NextResponse.json({ data: { ...(purchase as object), items: items ?? [] } })
}

const UpdateSchema = z.object({
  supplier_id: z.string().uuid().nullable().optional(),
  purchase_date: z.string().optional(),
  notes: z.string().nullable().optional(),
})

// Sửa phần "header" của đơn (NCC / ngày / ghi chú). KHÔNG sửa line items —
// muốn đổi từng con gà thì sửa trực tiếp trong hồ sơ gà.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePermission('mua_vao', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const supabase = await createClient()
  const parsed = UpdateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Không có trường nào để cập nhật' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('purchases')
    .update(parsed.data as never)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Không tìm thấy đơn mua (hoặc không có quyền)' }, { status: 404 })
  return NextResponse.json({ data })
}

// Xóa đơn + xóa các gà tạo từ đơn (CÓ BẢO VỆ):
// chặn nếu có gà đã bán (status da_ban) hoặc đã nằm trong đơn bán (sales_items).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePermission('mua_vao', 'delete')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const supabase = await createClient()

  // 1. Các gà được tạo từ đơn này
  const { data: items } = await supabase
    .from('purchase_items')
    .select('chicken_id')
    .eq('purchase_id', id)
  const chickenIds = ((items ?? []) as Array<{ chicken_id: string | null }>)
    .map((it) => it.chicken_id)
    .filter((v): v is string => !!v)

  // 2. BẢO VỆ: chặn nếu có gà đã bán hoặc đã có giao dịch bán
  if (chickenIds.length > 0) {
    const { data: chks } = await supabase
      .from('chickens')
      .select('id, chicken_code, name, status')
      .in('id', chickenIds)
    const soldNames = ((chks ?? []) as Array<{ chicken_code: string; name: string | null; status: string }>)
      .filter((c) => c.status === 'da_ban')
      .map((c) => c.name ?? c.chicken_code)

    const { data: soldItems } = await supabase
      .from('sales_items')
      .select('chicken_id')
      .in('chicken_id', chickenIds)
      .limit(1)

    if (soldNames.length > 0 || (soldItems ?? []).length > 0) {
      return NextResponse.json(
        {
          error:
            'Không thể xóa: đơn này có gà đã bán / đã có trong đơn bán' +
            (soldNames.length ? ` (${soldNames.join(', ')})` : '') +
            '. Hãy xử lý/hủy đơn bán trước rồi thử lại.',
        },
        { status: 409 }
      )
    }

    // 3. Xóa dữ liệu con của các gà (thoả FK), tách thẻ QR
    await supabase.from('vaccinations').delete().in('chicken_id', chickenIds)
    await supabase.from('chicken_media').delete().in('chicken_id', chickenIds)
    await supabase.from('training_sessions').delete().in('chicken_id', chickenIds)
    await supabase.from('diseases').delete().in('chicken_id', chickenIds)
    await supabase
      .from('qr_tags')
      .update({ chicken_id: null, status: 'chua_su_dung', assigned_at: null } as never)
      .in('chicken_id', chickenIds)
  }

  // 4. Xóa line items → gà → giao dịch quỹ liên quan → đơn
  await supabase.from('purchase_items').delete().eq('purchase_id', id)
  if (chickenIds.length > 0) {
    const { error: chErr } = await supabase.from('chickens').delete().in('id', chickenIds)
    if (chErr) return NextResponse.json({ error: `Lỗi xóa gà: ${chErr.message}` }, { status: 500 })
  }
  await supabase.from('cash_transactions').delete().eq('ref_type', 'purchase').eq('ref_id', id)

  const { error } = await supabase.from('purchases').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted_chickens: chickenIds.length })
}
