import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { hatched_count, hatched_date } = (await request.json()) as {
    hatched_count?: number
    hatched_date?: string
  }

  if (hatched_count == null || hatched_count < 0) {
    return NextResponse.json({ error: 'Invalid hatched_count' }, { status: 400 })
  }

  const { data: litter } = await supabase
    .from('breeding_litters')
    .select('eggs_fertile')
    .eq('id', id)
    .single<{ eggs_fertile: number | null }>()

  if (litter?.eggs_fertile != null && hatched_count > litter.eggs_fertile) {
    return NextResponse.json(
      { error: `hatched_count (${hatched_count}) không được lớn hơn eggs_fertile (${litter.eggs_fertile})` },
      { status: 400 }
    )
  }
  const { data, error } = await supabase
    .from('breeding_litters')
    .update({
      status: hatched_count > 0 ? 'da_no' : 'that_bai',
      hatched_count,
      hatched_date: hatched_date ?? new Date().toISOString().split('T')[0],
    } as never)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
