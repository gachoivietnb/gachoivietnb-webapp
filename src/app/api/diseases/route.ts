import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  chicken_id: z.string().uuid(),
  symptoms: z.string().min(3),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  outcome: z.string().optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { data, error } = await supabase
    .from('diseases')
    .insert({ ...parsed.data, performed_by: user.id } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
