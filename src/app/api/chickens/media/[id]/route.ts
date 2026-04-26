import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as {
    approved_for_render?: boolean
    social_caption?: string | null
    is_main?: boolean
  }

  const updates: Record<string, unknown> = {}
  if (body.approved_for_render !== undefined) {
    updates.approved_for_render = body.approved_for_render
    updates.approved_at = body.approved_for_render ? new Date().toISOString() : null
    updates.approved_by = body.approved_for_render ? user.id : null
    if (body.approved_for_render) updates.render_status = 'pending'
  }
  if (body.social_caption !== undefined) updates.social_caption = body.social_caption
  if (body.is_main !== undefined) updates.is_main = body.is_main

  const { data, error } = await supabase
    .from('chicken_media')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Nếu set is_main cho ảnh này → clear is_main các media khác cùng chicken + update chickens.main_photo_url
  if (body.is_main === true) {
    const row = data as {
      chicken_id: string
      drive_url: string
      media_type: string
    }
    await supabase
      .from('chicken_media')
      .update({ is_main: false } as never)
      .eq('chicken_id', row.chicken_id)
      .neq('id', id)

    if (row.media_type === 'anh') {
      await supabase
        .from('chickens')
        .update({ main_photo_url: row.drive_url } as never)
        .eq('id', row.chicken_id)
    }
  }

  return NextResponse.json({ data })
}
