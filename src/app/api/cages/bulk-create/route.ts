import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  row_id: z.string().uuid(),
  start_num: z.number().int().min(1).max(999),
  count: z.number().int().min(1).max(100),
  capacity: z.number().int().min(1).default(1),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { row_id, start_num, count, capacity } = parsed.data

  const { data, error } = await supabase.rpc('bulk_create_cages' as never, {
    p_row_id: row_id,
    p_start_num: start_num,
    p_count: count,
    p_capacity: capacity,
  } as never)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: data })
}
