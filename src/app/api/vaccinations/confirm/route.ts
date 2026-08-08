import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const Schema = z.object({
  vaccination_ids: z.array(z.string().uuid()).min(1).max(200),
  actual_date: z.string().optional(),
  batch_number: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  const perm = await requirePermission('tiem_phong', 'write')
  if ('error' in perm) return NextResponse.json({ error: perm.error }, { status: perm.status })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { vaccination_ids, actual_date, batch_number, notes } = parsed.data

  const { data, error } = await supabase
    .from('vaccinations')
    .update({
      status: 'da_tiem',
      actual_date: actual_date ?? new Date().toISOString().split('T')[0],
      performed_by: user.id,
      batch_number: batch_number ?? null,
      notes: notes ?? null,
    } as never)
    .in('id', vaccination_ids)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count: data?.length ?? 0 })
}
