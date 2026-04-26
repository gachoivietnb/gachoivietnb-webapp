import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function requireChuTrai() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, supabase }
  const { data: p } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (p?.role !== 'chu_trai') return { error: 'Chỉ chủ trại', status: 403, supabase }
  return { supabase, user }
}

export async function PATCH(request: Request) {
  const auth = await requireChuTrai()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json()) as {
    staff_id: string
    base_salary_monthly?: number
    standard_work_days?: number
    salary_notes?: string
  }

  if (!body.staff_id) {
    return NextResponse.json({ error: 'staff_id bắt buộc' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.base_salary_monthly != null) updates.base_salary_monthly = body.base_salary_monthly
  if (body.standard_work_days != null) updates.standard_work_days = body.standard_work_days
  if (body.salary_notes !== undefined) updates.salary_notes = body.salary_notes

  const { error } = await auth.supabase
    .from('profiles')
    .update(updates as never)
    .eq('id', body.staff_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
