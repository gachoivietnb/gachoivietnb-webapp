import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const supabase = await createClient()
  const { data } = await supabase
    .from('staff_attendance')
    .select('*, staff:profiles(id, full_name, role)')
    .eq('attendance_date', date)
    .order('check_in_time')

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = (await request.json()) as { action?: 'check_in' | 'check_out' }
  if (action !== 'check_in' && action !== 'check_out') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('staff_attendance')
    .select('*')
    .eq('staff_id', user.id)
    .eq('attendance_date', today)
    .maybeSingle()

  if (action === 'check_in') {
    if (existing) {
      return NextResponse.json({ error: 'Đã check-in hôm nay rồi' }, { status: 400 })
    }
    const { data } = await supabase
      .from('staff_attendance')
      .insert({ staff_id: user.id, attendance_date: today, check_in_time: now } as never)
      .select()
      .single()
    return NextResponse.json({ data })
  }

  // check_out
  if (!existing) {
    return NextResponse.json({ error: 'Chưa check-in' }, { status: 400 })
  }
  const row = existing as { check_in_time: string; id: string }
  const hours = (Date.now() - new Date(row.check_in_time).getTime()) / 3600000
  const { data } = await supabase
    .from('staff_attendance')
    .update({ check_out_time: now, total_hours: parseFloat(hours.toFixed(2)) } as never)
    .eq('id', row.id)
    .select()
    .single()
  return NextResponse.json({ data })
}
