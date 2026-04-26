import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  alive_count: z.number().int().min(0).optional(),
  dead_count: z.number().int().min(0).optional(),
  sick_count: z.number().int().min(0).optional(),
  notes: z.string().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { data: current } = await supabase
    .from('chick_groups')
    .select('hatched_count, alive_count, dead_count, sick_count')
    .eq('id', id)
    .single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const curr = current as { hatched_count: number; alive_count: number; dead_count: number; sick_count: number }
  const next = {
    alive_count: parsed.data.alive_count ?? curr.alive_count,
    dead_count: parsed.data.dead_count ?? curr.dead_count,
    sick_count: parsed.data.sick_count ?? curr.sick_count,
    ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    updated_at: new Date().toISOString(),
  }

  // validation: alive + dead <= hatched
  if (next.alive_count + next.dead_count > curr.hatched_count) {
    return NextResponse.json(
      { error: `Sống + chết (${next.alive_count + next.dead_count}) > tổng nở (${curr.hatched_count})` },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('chick_groups')
    .update(next as never)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
