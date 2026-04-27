import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const MatchSchema = z.object({
  id: z.string().uuid().optional(),
  chicken_id: z.string().uuid(),
  tournament_id: z.string().uuid().nullable().optional(),
  match_date: z.string(),
  match_time: z.string().nullable().optional(),

  opponent_name: z.string().min(1),
  opponent_owner: z.string().nullable().optional(),
  opponent_owner_phone: z.string().nullable().optional(),
  opponent_breed: z.string().nullable().optional(),
  opponent_origin: z.string().nullable().optional(),
  opponent_weight_kg: z.number().nullable().optional(),
  opponent_age_months: z.number().int().nullable().optional(),
  opponent_color: z.string().nullable().optional(),
  opponent_photo_url: z.string().nullable().optional(),

  self_weight_kg: z.number().nullable().optional(),

  rules: z.enum(['don', 'cua']).default('don'),
  spurs_type: z.enum(['khong', 'sat', 'dao', 'tron']).default('khong'),
  weight_class: z.string().nullable().optional(),
  rounds_planned: z.number().int().nullable().optional(),
  is_ho_doc: z.boolean().default(false),

  result: z.enum(['thang','thua','hoa','be_tran_minh','be_tran_doi','chet','bi_thuong','huy']).nullable().optional(),
  result_method: z.enum(['ko_doi','ko_minh','quyet_dinh','het_gio','bo_chay_doi','bo_chay_minh','chet_tran','khac']).nullable().optional(),
  result_round: z.number().int().nullable().optional(),
  rounds_actual: z.number().int().default(0),
  total_duration_minutes: z.number().int().nullable().optional(),

  injury_self: z.enum(['khong','nhe','nang','chi_mang']).default('khong'),
  injury_notes: z.string().nullable().optional(),
  recovery_days: z.number().int().nullable().optional(),

  prize_money: z.number().default(0),
  betting_amount: z.number().default(0),
  betting_won: z.number().default(0),

  photo_urls: z.array(z.string()).default([]),
  video_url: z.string().nullable().optional(),
  referee_name: z.string().nullable().optional(),
  witnesses: z.array(z.string()).default([]),

  match_quality: z.number().int().min(1).max(5).nullable().optional(),
  highlight_moments: z.array(z.string()).default([]),

  internal_notes: z.string().nullable().optional(),
  public_notes: z.string().nullable().optional(),
  is_public: z.boolean().default(true),
  is_pinned: z.boolean().default(false),
})

export async function GET(request: Request) {
  const ctx = await requirePermission('thi_dau', 'read')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const url = new URL(request.url)
  const chickenId = url.searchParams.get('chicken_id')
  const tournamentId = url.searchParams.get('tournament_id')
  const result = url.searchParams.get('result')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 500), 2000)

  const supabase = await createClient()
  let q = supabase
    .from('matches')
    .select(
      'id, match_code, match_date, match_time, chicken_id, tournament_id, opponent_name, opponent_owner, opponent_breed, opponent_origin, opponent_weight_kg, opponent_photo_url, self_weight_kg, rules, spurs_type, rounds_planned, is_ho_doc, result, result_method, result_round, rounds_actual, total_duration_minutes, injury_self, prize_money, betting_amount, betting_won, photo_urls, video_url, match_quality, is_public, is_pinned, created_at, chicken:chickens(id, chicken_code, name, breed_id, breeds(name_vi)), tournament:tournaments(id, name, type)'
    )
    .order('match_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (chickenId) q = q.eq('chicken_id', chickenId)
  if (tournamentId) q = q.eq('tournament_id', tournamentId)
  if (result) q = q.eq('result', result)
  if (from) q = q.gte('match_date', from)
  if (to) q = q.lte('match_date', to)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ matches: data ?? [] })
}

export async function POST(request: Request) {
  const ctx = await requirePermission('thi_dau', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = MatchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const body = parsed.data

  if (body.id) {
    const { id, ...patch } = body
    const { data, error } = await supabase
      .from('matches')
      .update(patch as never)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ match: data })
  }

  const { data, error } = await supabase
    .from('matches')
    .insert({ ...body, created_by: ctx.userId } as never)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ match: data })
}

export async function DELETE(request: Request) {
  const ctx = await requirePermission('thi_dau', 'delete')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from('matches').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
