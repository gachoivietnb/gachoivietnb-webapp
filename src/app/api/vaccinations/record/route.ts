import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const RecordSchema = z.object({
  vaccination_id: z.string().uuid().optional(),  // nếu có thì update từ pending
  chicken_id: z.string().uuid(),
  vaccine_id: z.string().uuid(),
  scheduled_date: z.string().optional(),
  actual_date: z.string(),
  vaccine_lot_number: z.string().nullable().optional(),
  vaccine_expiry: z.string().nullable().optional(),
  dose_actual: z.string().nullable().optional(),
  route_actual: z.enum(['mat','mui','da','bap','xuyen_canh','nuoc_uong','phun_suong','tron_cam','khac']).nullable().optional(),
  performed_by: z.string().uuid().nullable().optional(),
  result: z.enum(['thanh_cong','co_phan_ung','phan_ung_nang','that_bai','chua_xac_dinh']).default('thanh_cong'),
  side_effects: z.string().nullable().optional(),
  post_observations: z.string().nullable().optional(),
  weight_at_vaccination: z.number().nullable().optional(),
  cost: z.number().default(0),
  next_due_date: z.string().nullable().optional(),
  linked_medicine_id: z.string().uuid().nullable().optional(),
  batch_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function POST(request: Request) {
  const ctx = await requirePermission('tiem_phong', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = RecordSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const body = parsed.data

  const status = body.result === 'phan_ung_nang' ? 'bi_phan_ung'
              : body.result === 'thanh_cong' || body.result === 'co_phan_ung' ? 'da_tiem'
              : 'da_tiem'

  // Tự tính next_due_date nếu vaccine có repeat_interval_days và user chưa nhập
  let nextDue = body.next_due_date
  if (!nextDue) {
    const { data: vacRow } = await supabase
      .from('vaccines')
      .select('repeat_interval_days')
      .eq('id', body.vaccine_id)
      .single<{ repeat_interval_days: number | null }>()
    if (vacRow?.repeat_interval_days) {
      const d = new Date(body.actual_date)
      d.setDate(d.getDate() + vacRow.repeat_interval_days)
      nextDue = d.toISOString().slice(0, 10)
    }
  }

  const update = {
    actual_date: body.actual_date,
    status,
    result: body.result,
    vaccine_lot_number: body.vaccine_lot_number ?? null,
    vaccine_expiry: body.vaccine_expiry ?? null,
    dose_actual: body.dose_actual ?? null,
    route_actual: body.route_actual ?? null,
    performed_by: body.performed_by ?? ctx.userId,
    side_effects: body.side_effects ?? null,
    post_observations: body.post_observations ?? null,
    weight_at_vaccination: body.weight_at_vaccination ?? null,
    cost: body.cost,
    next_due_date: nextDue ?? null,
    linked_medicine_id: body.linked_medicine_id ?? null,
    batch_id: body.batch_id ?? null,
    notes: body.notes ?? null,
  }

  if (body.vaccination_id) {
    const { data, error } = await supabase
      .from('vaccinations')
      .update(update as never)
      .eq('id', body.vaccination_id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Nếu có repeat → tạo bản ghi pending cho đợt sau
    if (nextDue && update.status === 'da_tiem') {
      await supabase.from('vaccinations').insert({
        chicken_id: body.chicken_id,
        vaccine_id: body.vaccine_id,
        scheduled_date: nextDue,
        status: 'cho_tiem',
      } as never)
    }
    return NextResponse.json({ vaccination: data })
  }

  // Insert mới (không có vaccination_id)
  const { data, error } = await supabase
    .from('vaccinations')
    .insert({
      chicken_id: body.chicken_id,
      vaccine_id: body.vaccine_id,
      scheduled_date: body.scheduled_date ?? body.actual_date,
      ...update,
    } as never)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Tạo bản ghi nhắc tiếp theo nếu có repeat
  if (nextDue && update.status === 'da_tiem') {
    await supabase.from('vaccinations').insert({
      chicken_id: body.chicken_id,
      vaccine_id: body.vaccine_id,
      scheduled_date: nextDue,
      status: 'cho_tiem',
    } as never)
  }

  return NextResponse.json({ vaccination: data })
}
