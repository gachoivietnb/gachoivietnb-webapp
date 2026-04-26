import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const range = searchParams.get('range') ?? 'today'

  const supabase = await createClient()
  let query = supabase.from('vaccinations_due').select('*')

  const today = new Date().toISOString().split('T')[0]
  if (range === 'today') query = query.eq('scheduled_date', today)
  else if (range === 'week') {
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() + 7)
    query = query.lte('scheduled_date', weekEnd.toISOString().split('T')[0])
  } else if (range === 'overdue') {
    query = query.lt('scheduled_date', today)
  }

  const { data, error } = await query.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
