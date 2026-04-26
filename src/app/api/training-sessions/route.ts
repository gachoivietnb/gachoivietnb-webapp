import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  chicken_id: z.string().uuid(),
  session_date: z.string(),
  opponent_chicken_id: z.string().uuid().optional(),
  opponent_name: z.string().optional(),
  duration_minutes: z.number().int().optional(),
  score_strength: z.number().min(0).max(10),
  score_appearance: z.number().min(0).max(10),
  score_aggression: z.number().min(0).max(10),
  result: z.enum(['thang', 'thua', 'hoa']).optional(),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { count } = await supabase
    .from('training_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('chicken_id', parsed.data.chicken_id)

  const { data, error } = await supabase
    .from('training_sessions')
    .insert({
      ...parsed.data,
      session_number: (count ?? 0) + 1,
      performed_by: user.id,
    } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('chickens')
    .update({ ai_description_updated_at: null } as never)
    .eq('id', parsed.data.chicken_id)

  return NextResponse.json({ data })
}
