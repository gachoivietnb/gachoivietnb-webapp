import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createClient } from '@/lib/supabase/server'

const PatchSchema = z.object({
  status: z.enum(['pending', 'done', 'snoozed', 'cancelled']).optional(),
  snoozed_until: z.string().nullable().optional(),
  completion_note: z.string().nullable().optional(),
  due_date: z.string().optional(),
  due_time: z.string().nullable().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).nullable().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = PatchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const update: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.status === 'done') {
    update.completed_by = ctx.user.id
  }
  const { data, error } = await supabase
    .from('diary_plans')
    .update(update as never)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('diary_plans').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
