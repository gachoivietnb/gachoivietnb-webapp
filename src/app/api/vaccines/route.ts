import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const VaccineSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(40),
  name_vi: z.string().min(1).max(120),
  default_age_days: z.number().int().min(0),
  is_required: z.boolean().default(false),
  display_order: z.number().int().default(0),
  description: z.string().nullable().optional(),
  target_disease: z.string().nullable().optional(),
  target_disease_code: z.string().nullable().optional(),
  vaccine_type: z.enum(['song_nhuoc_doc','vo_hoat','tai_to_hop','sub_unit','thuoc_phong']).nullable().optional(),
  route: z.enum(['mat','mui','da','bap','xuyen_canh','nuoc_uong','phun_suong','tron_cam','khac']).default('bap'),
  dose: z.string().nullable().optional(),
  recommended_brands: z.array(z.string()).default([]),
  minimum_age_days: z.number().int().nullable().optional(),
  maximum_age_days: z.number().int().nullable().optional(),
  repeat_interval_days: z.number().int().nullable().optional(),
  protection_duration_days: z.number().int().nullable().optional(),
  contraindications: z.string().nullable().optional(),
  side_effects: z.string().nullable().optional(),
  storage_temp: z.string().nullable().optional(),
  color_hex: z.string().nullable().optional(),
  emoji: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
})

export async function GET() {
  const ctx = await requirePermission('tiem_phong', 'read')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const supabase = await createClient()
  const { data, error } = await supabase.from('vaccines').select('*').order('display_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vaccines: data ?? [] })
}

export async function POST(request: Request) {
  const ctx = await requirePermission('tiem_phong', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const parsed = VaccineSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  const supabase = await createClient()
  const body = parsed.data
  if (body.id) {
    const { id, ...patch } = body
    const { data, error } = await supabase.from('vaccines').update(patch as never).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ vaccine: data })
  }
  const { data, error } = await supabase.from('vaccines').insert(body as never).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vaccine: data })
}

export async function DELETE(request: Request) {
  const ctx = await requirePermission('tiem_phong', 'delete')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  const supabase = await createClient()
  const { error } = await supabase.from('vaccines').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
