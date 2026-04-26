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
  return { supabase }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireChuTrai()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json()) as Record<string, unknown>
  const updates: Record<string, unknown> = {}
  for (const k of [
    'code',
    'name_vi',
    'origin',
    'description',
    'characteristics',
    'tier',
    'default_avatar_url',
    'is_active',
    'display_order',
  ]) {
    if (k in body) updates[k] = body[k]
  }
  updates.updated_at = new Date().toISOString()

  const { data, error } = await auth.supabase
    .from('breeds')
    .update(updates as never)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireChuTrai()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { count } = await auth.supabase
    .from('chickens')
    .select('id', { count: 'exact', head: true })
    .eq('breed_id', params.id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Không thể xóa: còn ${count} con gà thuộc giống này. Vô hiệu hóa thay vì xóa.` },
      { status: 400 }
    )
  }

  const { error } = await auth.supabase.from('breeds').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
