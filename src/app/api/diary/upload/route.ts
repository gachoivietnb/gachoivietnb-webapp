import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createAdminClient } from '@/lib/multitenancy/super-admin'
import { logSystem, extractRequestMeta } from '@/lib/logging/system-logger'

const MAX_SIZE = 5 * 1024 * 1024  // 5MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export async function POST(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Thiếu file' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    await logSystem({
      level: 'warn', category: 'storage',
      message: 'Diary upload rejected — file too large',
      ...extractRequestMeta(request), http_status: 400,
      user_id: ctx.user.id, user_email: ctx.user.email, farm_id: ctx.farm.id,
      context: { size_mb: (file.size / 1024 / 1024).toFixed(2), max_mb: 5, type: file.type },
    })
    return NextResponse.json({ error: 'File quá lớn (max 5MB)' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'Định dạng không hỗ trợ (PNG/JPEG/WEBP/GIF)' }, { status: 400 })
  }

  // Path: farm_id/yyyymm/timestamp_random.ext
  const ext = (file.type.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg')
  const ym = new Date().toISOString().slice(0, 7).replace('-', '')
  const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const path = `${ctx.farm.id}/${ym}/${fname}`

  const admin = createAdminClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage.from('diary-media').upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (upErr) {
    await logSystem({
      level: 'error', category: 'storage',
      message: 'Diary upload to storage failed',
      ...extractRequestMeta(request), http_status: 500,
      user_id: ctx.user.id, user_email: ctx.user.email, farm_id: ctx.farm.id,
      context: { error: upErr.message, path },
    })
    return NextResponse.json({ error: 'Lỗi upload: ' + upErr.message }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from('diary-media').getPublicUrl(path)
  return NextResponse.json({ data: { url: urlData.publicUrl, path } })
}
