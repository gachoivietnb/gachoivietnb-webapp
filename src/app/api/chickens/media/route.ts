import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { applyWatermark, getWatermarkConfig } from '@/lib/media/watermark'

const BUCKET = 'chicken-media'
const MAX_BYTES = 100 * 1024 * 1024 // 100 MB

// MIME whitelist → extension map. File có MIME không nằm trong list sẽ bị reject.
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const chickenId = formData.get('chicken_id') as string | null
  const isMain = formData.get('is_main') === 'true'
  const caption = (formData.get('caption') as string | null) ?? null
  const trainingSessionIdRaw = (formData.get('training_session_id') as string | null) ?? null
  const trainingSessionId =
    trainingSessionIdRaw && /^[0-9a-f-]{36}$/i.test(trainingSessionIdRaw)
      ? trainingSessionIdRaw
      : null
  // is_public field; default TRUE if missing for backward compat
  const isPublicRaw = formData.get('is_public')
  const isPublic = isPublicRaw == null ? true : isPublicRaw === 'true'

  if (!file || !chickenId) {
    return NextResponse.json({ error: 'Thiếu file hoặc chicken_id' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB > 100 MB)` },
      { status: 413 }
    )
  }

  // MIME whitelist — chặn upload file thực thi (.php, .exe, .html…)
  if (!(file.type in MIME_TO_EXT)) {
    return NextResponse.json(
      { error: `Định dạng không hỗ trợ: ${file.type}. Chỉ nhận JPG/PNG/WEBP/GIF/MP4/WEBM/MOV.` },
      { status: 415 }
    )
  }

  const { data: chicken } = await supabase
    .from('chickens')
    .select('id, chicken_code')
    .eq('id', chickenId)
    .single<{ id: string; chicken_code: string }>()

  if (!chicken) return NextResponse.json({ error: 'Không tìm thấy gà' }, { status: 404 })

  const isImage = file.type.startsWith('image/')
  // Ảnh sau watermark luôn là jpeg; video giữ ext từ MIME whitelist (không trust file.name)
  const ext = isImage ? 'jpg' : MIME_TO_EXT[file.type]
  // path chỉ chứa UUID + timestamp + random — không chứa filename user
  const path = `${chicken.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`

  let buffer = Buffer.from(await file.arrayBuffer())
  let contentType = file.type

  if (isImage) {
    const wmConfig = await getWatermarkConfig(async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'farm_info')
        .maybeSingle()
      return (data as { value?: Record<string, string> } | null)?.value ?? null
    })
    buffer = await applyWatermark(buffer, wmConfig)
    contentType = 'image/jpeg'
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false })

  if (uploadError) {
    return NextResponse.json(
      { error: `Lỗi upload: ${uploadError.message}` },
      { status: 500 }
    )
  }

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = publicUrl.publicUrl

  const mediaType = file.type.startsWith('video') ? 'video' : 'anh'

  const { data: inserted, error: insertError } = await supabase
    .from('chicken_media')
    .insert({
      chicken_id: chickenId,
      media_type: mediaType,
      drive_file_id: path,
      drive_url: url,
      thumbnail_url: mediaType === 'anh' ? url : null,
      caption,
      taken_at: new Date().toISOString().slice(0, 10),
      is_main: isMain,
      uploaded_by: user.id,
      training_session_id: trainingSessionId,
      is_public: isPublic,
    } as never)
    .select('id, drive_url, thumbnail_url, media_type, is_public, training_session_id')
    .single()

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path])
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  if (isMain && mediaType === 'anh') {
    await supabase
      .from('chickens')
      .update({ main_photo_url: url } as never)
      .eq('id', chickenId)
  }

  return NextResponse.json({ data: inserted })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const { data: media } = await supabase
    .from('chicken_media')
    .select('chicken_id, drive_file_id, drive_url')
    .eq('id', id)
    .single<{ chicken_id: string; drive_file_id: string | null; drive_url: string }>()

  if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (media.drive_file_id) {
    await supabase.storage.from(BUCKET).remove([media.drive_file_id])
  }
  await supabase.from('chicken_media').delete().eq('id', id)

  // Nếu xóa ảnh đại diện thì clear main_photo_url
  const { data: chicken } = await supabase
    .from('chickens')
    .select('main_photo_url')
    .eq('id', media.chicken_id)
    .single<{ main_photo_url: string | null }>()

  if (chicken?.main_photo_url === media.drive_url) {
    await supabase
      .from('chickens')
      .update({ main_photo_url: null } as never)
      .eq('id', media.chicken_id)
  }

  return NextResponse.json({ success: true })
}
