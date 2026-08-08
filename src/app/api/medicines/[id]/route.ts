import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const UpdateSchema = z.object({
  code: z.string().min(1).max(30).optional(),
  name_vi: z.string().min(1).max(100).optional(),
  unit: z.string().min(1).max(20).optional(),
  current_stock: z.number().min(0).optional(),
  min_stock_alert: z.number().min(0).optional(),
  expiry_date: z.string().nullable().optional(),
  cost_per_unit: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePermission('kho_thuoc', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const supabase = await createClient()
  const parsed = UpdateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Không có trường nào để cập nhật' }, { status: 400 })
  }

  // RLS tự giới hạn theo farm_id của user → không sửa được thuốc của trại khác
  const { data, error } = await supabase
    .from('medicines')
    .update(parsed.data as never)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Không tìm thấy thuốc (hoặc không có quyền)' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePermission('kho_thuoc', 'delete')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const supabase = await createClient()
  // Xóa MỀM: giữ lịch sử medicine_transactions (FK), chỉ ẩn khỏi danh sách (GET lọc is_active=true)
  const { error } = await supabase
    .from('medicines')
    .update({ is_active: false } as never)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
