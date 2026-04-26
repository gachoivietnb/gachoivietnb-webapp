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
  if (p?.role !== 'chu_trai') return { error: 'Chỉ chủ trại mới có quyền', status: 403, supabase }
  return { supabase }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireChuTrai()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params

  const body = (await request.json()) as Record<string, unknown>
  const ALLOWED = new Set(['code', 'capacity', 'status', 'notes', 'row_id'])
  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) if (ALLOWED.has(k)) updates[k] = v

  const { data, error } = await auth.supabase
    .from('cages')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireChuTrai()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params

  // Block delete if cage has chickens
  const { count } = await auth.supabase
    .from('chickens')
    .select('id', { count: 'exact', head: true })
    .eq('cage_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Không thể xóa: chuồng còn ${count} con gà. Chuyển gà đi trước.` },
      { status: 400 }
    )
  }

  const { error } = await auth.supabase.from('cages').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
