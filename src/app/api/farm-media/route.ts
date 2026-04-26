import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { applyWatermark, getWatermarkConfig } from '@/lib/media/watermark'

const BUCKET = 'farm-media'
const MAX_BYTES = 100 * 1024 * 1024

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

const CATEGORIES = ['chuong_trai', 'hoat_dong', 'su_kien', 'san_pham', 'khac'] as const

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const category = (formData.get('category') as string | null) ?? 'khac'
  const title = (formData.get('title') as string | null) ?? null
  const description = (formData.get('description') as string | null) ?? null
  const isFeatured = formData.get('is_featured') === 'true'

  if (!file) return NextResponse.json({ error: 'Thiếu file' }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB)` },
      { status: 413 }
    )
  }
  if (!(file.type in MIME_TO_EXT)) {
    return NextResponse.json(
      { error: `Định dạng không hỗ trợ: ${file.type}` },
      { status: 415 }
    )
  }
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: 'Category không hợp lệ' }, { status: 400 })
  }

  const isImage = file.type.startsWith('image/')
  const ext = isImage ? 'jpg' : MIME_TO_EXT[file.type]
  const path = `${category}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`

  let buffer = Buffer.from(await file.arrayBuffer())
  let contentType = file.type

  if (isImage) {
    const wm = await getWatermarkConfig(async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'farm_info')
        .maybeSingle()
      return (data as { value?: Record<string, string> } | null)?.value ?? null
    })
    buffer = await applyWatermark(buffer, wm)
    contentType = 'image/jpeg'
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false })

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload lỗi: ${uploadError.message}` },
      { status: 500 }
    )
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = pub.publicUrl

  const { data: inserted, error: insertError } = await supabase
    .from('farm_media')
    .insert({
      media_type: isImage ? 'anh' : 'video',
      storage_path: path,
      url,
      thumbnail_url: isImage ? url : null,
      category,
      title,
      description,
      is_featured: isFeatured,
      uploaded_by: user.id,
    } as never)
    .select()
    .single()

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path])
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ data: inserted })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as {
    id: string
    category?: string
    title?: string
    description?: string
    is_featured?: boolean
    display_order?: number
  }
  if (!body.id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.category && (CATEGORIES as readonly string[]).includes(body.category)) updates.category = body.category
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.is_featured !== undefined) updates.is_featured = body.is_featured
  if (body.display_order !== undefined) updates.display_order = body.display_order

  const { error } = await supabase
    .from('farm_media')
    .update(updates as never)
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const { data: m } = await supabase
    .from('farm_media')
    .select('storage_path')
    .eq('id', id)
    .single<{ storage_path: string }>()

  if (m?.storage_path) {
    await supabase.storage.from(BUCKET).remove([m.storage_path])
  }
  await supabase.from('farm_media').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
