import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const UpdateSchema = z.object({
  session_date: z.string().optional(),
  opponent_chicken_id: z.string().uuid().nullable().optional(),
  opponent_name: z.string().nullable().optional(),
  duration_minutes: z.number().int().nullable().optional(),
  score_strength: z.number().min(0).max(10).optional(),
  score_appearance: z.number().min(0).max(10).optional(),
  score_aggression: z.number().min(0).max(10).optional(),
  result: z.enum(['thang', 'thua', 'hoa']).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePermission('van_ga', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const supabase = await createClient()
  const parsed = UpdateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Không có trường nào để cập nhật' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('training_sessions')
    .update(parsed.data as never)
    .eq('id', id)
    .select('chicken_id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Không tìm thấy buổi vần (hoặc không có quyền)' }, { status: 404 })

  // Cho AI mô tả lại (điểm thay đổi)
  await supabase
    .from('chickens')
    .update({ ai_description_updated_at: null } as never)
    .eq('id', (data as { chicken_id: string }).chicken_id)

  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePermission('van_ga', 'delete')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const supabase = await createClient()
  // Xóa cứng: training_sessions là bản ghi log, không có FK con phụ thuộc.
  const { error } = await supabase.from('training_sessions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
