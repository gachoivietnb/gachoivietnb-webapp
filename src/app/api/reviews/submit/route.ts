import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/security/rate-limit'
import { publicError, rateLimitResponse } from '@/lib/security/errors'

const Schema = z.object({
  token: z.string().min(10),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
})

export async function POST(request: Request) {
  // Chặn brute-force token: 20 attempts/IP/phút
  const rl = rateLimit(request, { namespace: 'review-submit', limit: 20, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })

  const supabase = await createClient()
  const ip = getClientIp(request)

  const { data: review } = await supabase
    .from('customer_reviews')
    .select('*')
    .eq('review_token', parsed.data.token)
    .maybeSingle()

  // Trả generic error cho mọi lỗi token để không lộ thông tin token-state
  if (!review) return NextResponse.json({ error: 'Link đánh giá không hợp lệ hoặc đã hết hạn' }, { status: 404 })
  const r = review as { reviewed_at: string | null; token_expires_at: string }
  if (r.reviewed_at)
    return NextResponse.json({ error: 'Đánh giá đã được ghi nhận trước đó' }, { status: 400 })
  if (new Date(r.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link đánh giá không hợp lệ hoặc đã hết hạn' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('customer_reviews')
    .update({
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
      reviewed_at: new Date().toISOString(),
      ip_address: ip,
    } as never)
    .eq('review_token', parsed.data.token)
    .select()
    .single()

  if (error) return publicError(500, 'Không lưu được đánh giá', error)
  return NextResponse.json({ data })
}
