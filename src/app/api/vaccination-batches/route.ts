import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const BatchCreateSchema = z.object({
  vaccine_id: z.string().uuid(),
  batch_date: z.string(),
  vaccine_lot_number: z.string().nullable().optional(),
  vaccine_expiry: z.string().nullable().optional(),
  vet_name: z.string().nullable().optional(),
  total_cost: z.number().default(0),
  notes: z.string().nullable().optional(),
  // Targeting
  target_chicken_ids: z.array(z.string().uuid()).default([]),
  target_filter: z.record(z.string(), z.unknown()).optional(),
})

const BatchCompleteSchema = z.object({
  batch_id: z.string().uuid(),
  records: z.array(z.object({
    chicken_id: z.string().uuid(),
    result: z.enum(['thanh_cong','co_phan_ung','phan_ung_nang','that_bai','chua_xac_dinh']).default('thanh_cong'),
    side_effects: z.string().nullable().optional(),
    weight_at_vaccination: z.number().nullable().optional(),
  })),
})

export async function GET() {
  const ctx = await requirePermission('tiem_phong', 'read')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vaccination_batches')
    .select('*')
    .order('batch_date', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ batches: data ?? [] })
}

export async function POST(request: Request) {
  const ctx = await requirePermission('tiem_phong', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = BatchCreateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const body = parsed.data

  // Tạo batch
  const { data: batch, error: batchErr } = await supabase
    .from('vaccination_batches')
    .insert({
      vaccine_id: body.vaccine_id,
      batch_date: body.batch_date,
      vaccine_lot_number: body.vaccine_lot_number ?? null,
      vaccine_expiry: body.vaccine_expiry ?? null,
      vet_name: body.vet_name ?? null,
      total_cost: body.total_cost,
      notes: body.notes ?? null,
      target_count: body.target_chicken_ids.length,
      target_filter: body.target_filter ?? {},
      performed_by: ctx.userId,
      status: 'chuan_bi',
    } as never)
    .select()
    .single<{ id: string }>()

  if (batchErr || !batch) {
    return NextResponse.json({ error: batchErr?.message || 'Lỗi tạo batch' }, { status: 500 })
  }

  // Tạo placeholder records cho từng gà
  if (body.target_chicken_ids.length > 0) {
    const records = body.target_chicken_ids.map((chickenId) => ({
      chicken_id: chickenId,
      vaccine_id: body.vaccine_id,
      scheduled_date: body.batch_date,
      batch_id: batch.id,
      vaccine_lot_number: body.vaccine_lot_number ?? null,
      vaccine_expiry: body.vaccine_expiry ?? null,
      status: 'cho_tiem' as const,
    }))
    await supabase.from('vaccinations').insert(records as never)
  }

  return NextResponse.json({ batch })
}

export async function PATCH(request: Request) {
  const ctx = await requirePermission('tiem_phong', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = BatchCompleteSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const { batch_id, records } = parsed.data

  const { data: batch } = await supabase
    .from('vaccination_batches')
    .select('vaccine_id, batch_date, vaccine_lot_number')
    .eq('id', batch_id)
    .single<{ vaccine_id: string; batch_date: string; vaccine_lot_number: string | null }>()

  if (!batch) return NextResponse.json({ error: 'Batch không tồn tại' }, { status: 404 })

  let reactionCount = 0
  let failedCount = 0

  for (const r of records) {
    const status = r.result === 'phan_ung_nang' ? 'bi_phan_ung'
                : r.result === 'that_bai' ? 'huy_bo'
                : 'da_tiem'
    if (r.result === 'co_phan_ung' || r.result === 'phan_ung_nang') reactionCount++
    if (r.result === 'that_bai') failedCount++

    await supabase
      .from('vaccinations')
      .update({
        status,
        actual_date: batch.batch_date,
        result: r.result,
        side_effects: r.side_effects ?? null,
        weight_at_vaccination: r.weight_at_vaccination ?? null,
        performed_by: ctx.userId,
      } as never)
      .eq('batch_id', batch_id)
      .eq('chicken_id', r.chicken_id)
  }

  await supabase
    .from('vaccination_batches')
    .update({
      status: 'hoan_tat',
      completed_count: records.length,
      reaction_count: reactionCount,
      failed_count: failedCount,
    } as never)
    .eq('id', batch_id)

  return NextResponse.json({ success: true, completed: records.length })
}

export async function DELETE(request: Request) {
  const ctx = await requirePermission('tiem_phong', 'delete')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  const supabase = await createClient()
  // Cleanup pending records
  await supabase.from('vaccinations').delete().eq('batch_id', id).eq('status', 'cho_tiem')
  const { error } = await supabase.from('vaccination_batches').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
