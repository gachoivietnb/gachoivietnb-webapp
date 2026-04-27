import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const ChickenCreateSchema = z.object({
  name: z.string().optional(),
  breed_id: z.string().uuid(),
  qr_tag_id: z.string().uuid().optional(),
  cage_id: z.string().uuid().optional(),
  gender: z.enum(['trong', 'mai', 'chua_xac_dinh']).default('chua_xac_dinh'),
  birth_date: z.string().optional(),
  source: z.enum(['mua', 'no_tai_trai']),
  parent_male_id: z.string().uuid().optional(),
  parent_female_id: z.string().uuid().optional(),
  weight_kg: z.number().optional(),
  color: z.string().optional(),
  cost_purchase: z.number().optional(),
  notes: z.string().optional(),
  auto_assign_cage: z.boolean().default(true),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 200)
  const status = searchParams.get('status')
  const breed = searchParams.get('breed')
  const q = searchParams.get('q')
  const sort = searchParams.get('sort') || 'created_at'
  const order = searchParams.get('order') === 'asc' ? { ascending: true } : { ascending: false }

  const supabase = await createClient()
  let query = supabase
    .from('chickens_with_details')
    .select('*', { count: 'exact' })
    .order(sort, order)
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status)
  if (breed) query = query.eq('breed_code', breed)
  if (q) {
    const { escapeOrFilter } = await import('@/lib/security/sql')
    const safe = escapeOrFilter(q)
    if (safe) query = query.or(`chicken_code.ilike.%${safe}%,name.ilike.%${safe}%`)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize })
}

export async function POST(request: Request) {
  const ctx = await requirePermission('ho_so_ga', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const supabase = await createClient()
  const body = await request.json()
  const parsed = ChickenCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const data = parsed.data

  if (!data.cage_id && data.auto_assign_cage) {
    const targetAreaType = data.source === 'mua' ? 'cach_ly' : 'trong'
    const { data: cageId } = await supabase.rpc('find_available_cage' as never, {
      p_area_type: targetAreaType,
    } as never)
    if (cageId) data.cage_id = cageId as string
  }

  const { auto_assign_cage, ...insertData } = data
  const { data: chicken, error } = await supabase
    .from('chickens')
    .insert({ ...insertData, created_by: ctx.userId } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('activity_logs').insert({
    user_id: ctx.userId,
    action: 'create',
    entity_type: 'chickens',
    entity_id: (chicken as { id: string }).id,
    after_data: chicken,
  } as never)

  return NextResponse.json({ data: chicken })
}
