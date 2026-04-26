import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createAdminClient } from '@/lib/multitenancy/super-admin'

export const dynamic = 'force-dynamic'

const MAX = 2 * 1024 * 1024
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function POST(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (ctx.profile.role !== 'chu_trai') {
    return NextResponse.json({ error: 'only_chu_trai' }, { status: 403 })
  }

  const fd = await request.formData()
  const file = fd.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 })
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: 'file_too_large_max_2mb' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'must_be_png_jpeg_webp' }, { status: 400 })
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const fname = `${ctx.farm.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from('staff-avatars')
    .upload(fname, buf, { contentType: file.type, upsert: false })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from('staff-avatars').getPublicUrl(fname)
  return NextResponse.json({ url: urlData.publicUrl })
}
