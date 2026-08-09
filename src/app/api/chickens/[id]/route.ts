import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePublicChickens } from '@/lib/cache/revalidate-public'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chickens_with_details')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: media } = await supabase
    .from('chicken_media')
    .select('*')
    .eq('chicken_id', id)
    .order('display_order')

  return NextResponse.json({ data: { ...(data as object), media: media ?? [] } })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data: oldData } = await supabase
    .from('chickens')
    .select('*')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('chickens')
    .update(body as never)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'update',
    entity_type: 'chickens',
    entity_id: id,
    before_data: oldData,
    after_data: data,
  } as never)

  revalidatePublicChickens()
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile as { role?: string } | null)?.role

  if (role === 'chu_trai') {
    // Guard: chặn xóa nếu gà là bố/mẹ trong gia phả của con khác
    const { count: childCount } = await supabase
      .from('chickens')
      .select('id', { count: 'exact', head: true })
      .or(`parent_male_id.eq.${id},parent_female_id.eq.${id}`)
    if ((childCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `Không thể xóa: gà này là bố/mẹ của ${childCount} con khác trong gia phả. Đánh dấu "loại thải" thay vì xóa để giữ cây gia phả.`,
        },
        { status: 400 }
      )
    }
    const { error } = await supabase.from('chickens').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('chickens')
      .update({ status: 'loai_thai', status_date: new Date().toISOString() } as never)
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePublicChickens()
  return NextResponse.json({ success: true })
}
