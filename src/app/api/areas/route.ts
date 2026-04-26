import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  code: z.string().min(1).max(10),
  name_vi: z.string().min(1).max(100),
  type: z.enum(['trong', 'mai', 'duc', 'ghep_doi', 'cach_ly', 'gia_pho_tong']),
  description: z.string().optional(),
  display_order: z.number().int().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { data, error } = await supabase
    .from('areas')
    .insert({
      code: parsed.data.code,
      name_vi: parsed.data.name_vi,
      type: parsed.data.type,
      description: parsed.data.description ?? null,
      display_order: parsed.data.display_order ?? 0,
    } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
