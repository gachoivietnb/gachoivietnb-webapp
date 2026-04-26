import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: litter } = await supabase
    .from('breeding_litters')
    .select(
      '*, female:chickens!breeding_litters_female_id_fkey(id, chicken_code, name, breed_id, breeds(name_vi)), cage:cages(id, full_code)'
    )
    .eq('id', id)
    .maybeSingle()

  if (!litter) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const litterRow = litter as { male_ids: string[] | null }

  const { data: males } = litterRow.male_ids && litterRow.male_ids.length > 0
    ? await supabase
        .from('chickens')
        .select('id, chicken_code, name, breeds(name_vi)')
        .in('id', litterRow.male_ids)
    : { data: [] }

  const { data: chickGroups } = await supabase
    .from('chick_groups')
    .select('*')
    .eq('litter_id', id)
    .order('created_at', { ascending: false })

  const { data: graduated } = await supabase
    .from('chickens')
    .select('id, chicken_code, name, gender, status')
    .eq('breeding_litter_id', id)

  return NextResponse.json({
    data: {
      ...(litter as object),
      males: males ?? [],
      chick_groups: chickGroups ?? [],
      graduated_chickens: graduated ?? [],
    },
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as Record<string, unknown>
  const ALLOWED = new Set([
    'paired_date',
    'expected_hatch_date',
    'eggs_total',
    'eggs_fertile',
    'hatched_count',
    'hatched_date',
    'status',
    'cage_id',
    'notes',
  ])
  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) if (ALLOWED.has(k)) updates[k] = v

  const { data, error } = await supabase
    .from('breeding_litters')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
