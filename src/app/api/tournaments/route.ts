import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const TournamentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  type: z.enum(['van_trai', 'hoi_xom', 'giai_tinh', 'khu_vuc', 'quoc_gia']).default('hoi_xom'),
  status: z.enum(['sap_dien_ra', 'dang_dien_ra', 'da_ket_thuc', 'huy_bo']).default('sap_dien_ra'),
  venue: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  weight_class_min: z.number().nullable().optional(),
  weight_class_max: z.number().nullable().optional(),
  rules: z.enum(['don', 'cua']).default('don'),
  spurs_type: z.enum(['khong', 'sat', 'dao', 'tron']).default('khong'),
  prize_pool: z.number().default(0),
  entry_fee: z.number().default(0),
  organizer: z.string().nullable().optional(),
  organizer_phone: z.string().nullable().optional(),
  banner_url: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET() {
  const ctx = await requirePermission('giai_dau', 'read')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tournaments: data ?? [] })
}

export async function POST(request: Request) {
  const ctx = await requirePermission('giai_dau', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = TournamentSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const body = parsed.data

  if (body.id) {
    const { id, ...patch } = body
    const { data, error } = await supabase
      .from('tournaments')
      .update(patch as never)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tournament: data })
  }

  const { data, error } = await supabase
    .from('tournaments')
    .insert({ ...body, created_by: ctx.userId } as never)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tournament: data })
}

export async function DELETE(request: Request) {
  const ctx = await requirePermission('giai_dau', 'delete')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
