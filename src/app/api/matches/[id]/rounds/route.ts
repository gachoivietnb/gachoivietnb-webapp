import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const RoundSchema = z.object({
  round_number: z.number().int().min(1),
  duration_seconds: z.number().int().nullable().optional(),
  self_strikes: z.number().int().default(0),
  opp_strikes: z.number().int().default(0),
  self_knockdowns: z.number().int().default(0),
  opp_knockdowns: z.number().int().default(0),
  self_blood_level: z.number().int().min(0).max(3).default(0),
  opp_blood_level: z.number().int().min(0).max(3).default(0),
  notable_strikes: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
})

const BulkSchema = z.object({ rounds: z.array(RoundSchema) })

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission('thi_dau', 'read')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('match_rounds')
    .select('*')
    .eq('match_id', id)
    .order('round_number')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rounds: data ?? [] })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission('thi_dau', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = await params
  const parsed = BulkSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  // Replace strategy
  await supabase.from('match_rounds').delete().eq('match_id', id)
  if (parsed.data.rounds.length > 0) {
    const rows = parsed.data.rounds.map((r) => ({ ...r, match_id: id }))
    const { error } = await supabase.from('match_rounds').insert(rows as never)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, count: parsed.data.rounds.length })
}
