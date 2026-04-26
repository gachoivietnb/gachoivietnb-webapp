import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { rateLimitResponse } from '@/lib/security/errors'

// Feed JSON cho module render + upload MXH bên ngoài (Google Sheets / Apps Script).
// Auth bằng header `x-marketing-key` = env MARKETING_FEED_KEY, hoặc session chu_trai.

export async function GET(request: Request) {
  // Chặn brute-force key
  const rl = rateLimit(request, { namespace: 'marketing-feed-get', limit: 30, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  const key = request.headers.get('x-marketing-key')
  const envKey = process.env.MARKETING_FEED_KEY
  let authorized = envKey && key === envKey

  const supabase = await createClient()
  if (!authorized) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single<{ role: string }>()
      if (p?.role === 'chu_trai') authorized = true
    }
  }

  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('render_status') ?? 'pending'

  const { data: rows } = await supabase
    .from('chicken_media')
    .select(
      'id, chicken_id, media_type, drive_url, thumbnail_url, caption, social_caption, ' +
        'approved_for_render, approved_at, render_status, published_urls, created_at, taken_at'
    )
    .eq('approved_for_render', true)
    .eq('render_status', status)
    .order('approved_at', { ascending: false })
    .limit(500)

  const chickenIds = Array.from(
    new Set((rows ?? []).map((r) => (r as { chicken_id: string }).chicken_id))
  )

  let chickenMap: Record<string, unknown> = {}
  if (chickenIds.length > 0) {
    const { data: chickens } = await supabase
      .from('chickens_with_details')
      .select(
        'id, chicken_code, name, breed_name, gender, age_months, weight_kg, color, listed_price, is_for_sale'
      )
      .in('id', chickenIds)
    chickenMap = Object.fromEntries(
      ((chickens ?? []) as Array<{ id: string }>).map((c) => [c.id, c])
    )
  }

  const feed = (rows ?? []).map((row) => {
    const r = row as {
      id: string
      chicken_id: string
      media_type: string
      drive_url: string
      thumbnail_url: string | null
      caption: string | null
      social_caption: string | null
      approved_at: string
      render_status: string
      created_at: string
      taken_at: string | null
    }
    return {
      media_id: r.id,
      chicken: chickenMap[r.chicken_id] ?? { id: r.chicken_id },
      media_type: r.media_type,
      url: r.drive_url,
      thumbnail_url: r.thumbnail_url,
      caption: r.social_caption ?? r.caption,
      approved_at: r.approved_at,
      render_status: r.render_status,
      taken_at: r.taken_at,
      created_at: r.created_at,
    }
  })

  return NextResponse.json({ count: feed.length, data: feed })
}

// Callback từ module render để update trạng thái sau khi publish
export async function POST(request: Request) {
  const rl = rateLimit(request, { namespace: 'marketing-feed-post', limit: 60, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  const key = request.headers.get('x-marketing-key')
  const envKey = process.env.MARKETING_FEED_KEY
  if (!envKey || key !== envKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    media_id: string
    render_status?: 'rendering' | 'published' | 'error'
    published_urls?: Record<string, string>
  }

  if (!body.media_id) return NextResponse.json({ error: 'Thiếu media_id' }, { status: 400 })

  const supabase = await createClient()
  const updates: Record<string, unknown> = {}
  if (body.render_status) updates.render_status = body.render_status
  if (body.published_urls) updates.published_urls = body.published_urls

  const { error } = await supabase
    .from('chicken_media')
    .update(updates as never)
    .eq('id', body.media_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
