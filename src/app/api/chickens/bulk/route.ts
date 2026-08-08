import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const BulkChickenSchema = z.object({
  chickens: z.array(z.object({
    name: z.string().optional(),
    breed_id: z.string().uuid(),
    qr_tag_id: z.string().uuid().optional(),
    cage_id: z.string().uuid().optional(),
    gender: z.enum(['trong', 'mai', 'chua_xac_dinh']).default('chua_xac_dinh'),
    birth_date: z.string().optional(),
    source: z.enum(['mua', 'no_tai_trai']),
    weight_kg: z.number().optional(),
    color: z.string().optional(),
    cost_purchase: z.number().optional(),
    notes: z.string().optional(),
  })).min(1).max(200),
  auto_assign_cage: z.boolean().default(true),
})

export async function POST(request: Request) {
  const perm = await requirePermission('ho_so_ga', 'write')
  if ('error' in perm) return NextResponse.json({ error: perm.error }, { status: perm.status })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = BulkChickenSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { chickens, auto_assign_cage } = parsed.data

  const processedChickens = []
  for (const c of chickens) {
    let cageId = c.cage_id
    if (!cageId && auto_assign_cage) {
      const targetAreaType = c.source === 'mua' ? 'cach_ly' : 'trong'
      const { data } = await supabase.rpc('find_available_cage' as never, {
        p_area_type: targetAreaType,
      } as never)
      cageId = (data as unknown as string | null | undefined) ?? undefined
    }
    processedChickens.push({ ...c, cage_id: cageId, created_by: user.id })
  }

  const { data, error } = await supabase
    .from('chickens')
    .insert(processedChickens as never)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (data && data.length > 0) {
    await supabase.from('activity_logs').insert(
      data.map((c) => ({
        user_id: user.id,
        action: 'create',
        entity_type: 'chickens',
        entity_id: (c as { id: string }).id,
        after_data: c,
      })) as never
    )
  }

  return NextResponse.json({ data, count: data?.length || 0 })
}
