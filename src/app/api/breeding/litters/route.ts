import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const LitterSchema = z.object({
  female_id: z.string().uuid(),
  male_ids: z.array(z.string().uuid()).min(1).max(5),
  paired_date: z.string(),
  cage_id: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '20'), 100)

  const supabase = await createClient()
  let query = supabase
    .from('breeding_litters')
    .select(
      'id, litter_code, female_id, male_ids, paired_date, expected_hatch_date, eggs_total, eggs_fertile, hatched_count, hatched_date, status, cage_id, notes, created_at, female:chickens!breeding_litters_female_id_fkey(id, chicken_code, name), cage:cages(id, full_code)',
      { count: 'exact' }
    )
    .order('paired_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = LitterSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { data: existing } = await supabase
    .from('breeding_litters')
    .select('id')
    .eq('female_id', parsed.data.female_id)
    .eq('status', 'dang_ap')
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Gà mái này đang trong lứa ghép đôi khác' },
      { status: 400 }
    )
  }

  // Insert with retry: the DB trigger generate_litter_code() uses COUNT(*)+1
  // which collides if any older litter has been deleted. We pre-compute the next
  // sequence from MAX(seq)+1 and retry on unique-constraint conflict.
  const year = new Date(parsed.data.paired_date).getFullYear()
  let lastError: unknown = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const litterCode = await nextLitterCode(supabase, year, attempt)
    const { data, error } = await supabase
      .from('breeding_litters')
      .insert({ ...parsed.data, litter_code: litterCode, created_by: user.id } as never)
      .select()
      .single()

    if (!error) return NextResponse.json({ data })
    // 23505 = unique_violation in Postgres
    const isDup = error.code === '23505' || /duplicate key/i.test(error.message)
    if (!isDup) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    lastError = error
  }

  return NextResponse.json(
    {
      error:
        'Không tạo được mã lứa duy nhất sau nhiều lần thử: ' +
        (lastError instanceof Error ? lastError.message : String(lastError)),
    },
    { status: 500 }
  )
}

async function nextLitterCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  year: number,
  attemptOffset: number
): Promise<string> {
  const prefix = `L-${year}-`
  const { data } = await supabase
    .from('breeding_litters')
    .select('litter_code')
    .like('litter_code', `${prefix}%`)
    .order('litter_code', { ascending: false })
    .limit(1)
  let maxSeq = 0
  const top = (data ?? [])[0] as { litter_code?: string } | undefined
  if (top?.litter_code) {
    const m = top.litter_code.match(/-(\d+)$/)
    if (m) maxSeq = parseInt(m[1], 10) || 0
  }
  const next = maxSeq + 1 + attemptOffset
  return `${prefix}${String(next).padStart(3, '0')}`
}
