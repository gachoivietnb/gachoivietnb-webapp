import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const Schema = z.object({
  vaccination_id: z.string().uuid(),
  reason: z.string().min(3),
})

export async function POST(request: Request) {
  const ctx = await requirePermission('tiem_phong', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from('vaccinations')
    .update({
      status: 'bo_qua',
      skip_reason: parsed.data.reason,
      performed_by: ctx.userId,
    } as never)
    .eq('id', parsed.data.vaccination_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
