import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'females'

  const supabase = await createClient()

  if (type === 'females') {
    const { data, error } = await supabase
      .from('breeding_female_stats')
      .select('*')
      .gt('total_litters', 0)
      .order('fertile_rate', { ascending: false })
      .limit(50)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (type === 'males') {
    const { data, error } = await supabase
      .from('breeding_male_stats')
      .select('*')
      .gt('total_litters', 0)
      .order('fertile_rate_accurate', { ascending: false })
      .limit(50)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid type (females | males)' }, { status: 400 })
}
