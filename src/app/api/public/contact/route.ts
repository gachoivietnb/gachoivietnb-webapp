import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/security/rate-limit'
import { publicError, rateLimitResponse } from '@/lib/security/errors'

const Schema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional().or(z.literal('')),
  message: z.string().max(2000).optional(),
  interested_in_chicken_id: z.string().uuid().optional(),
  interested_in_breed_id: z.string().uuid().optional(),
  honeypot: z.string().optional(),
})

export async function POST(request: Request) {
  // Rate limit app-layer 10 lần/IP/phút — chặn flood trước khi chạm DB
  const rl = rateLimit(request, { namespace: 'public-contact', limit: 10, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request không hợp lệ' }, { status: 400 })
  }
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
  }

  // Anti-spam honeypot
  if (parsed.data.honeypot && parsed.data.honeypot.length > 0) {
    return NextResponse.json({ success: true })
  }

  const supabase = await createClient()
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent')

  // Simple rate limit: 5 submissions per IP per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  if (ip) {
    const { count } = await supabase
      .from('contact_inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', oneHourAgo)
    if (count && count >= 5) {
      return NextResponse.json({ error: 'Quá nhiều lần gửi, vui lòng thử lại sau' }, { status: 429 })
    }
  }

  const { honeypot, ...inquiryData } = parsed.data
  const { data, error } = await supabase
    .from('contact_inquiries')
    .insert({
      ...inquiryData,
      email: inquiryData.email || null,
      ip_address: ip ?? null,
      user_agent: userAgent ?? null,
    } as never)
    .select()
    .single()

  if (error) return publicError(500, 'Không gửi được liên hệ. Vui lòng thử lại.', error)

  // Create/find customer by phone
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', inquiryData.phone)
    .maybeSingle()

  let customerId = (existingCustomer as { id: string } | null)?.id
  if (!customerId) {
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({
        name: inquiryData.name,
        phone: inquiryData.phone,
        email: inquiryData.email || null,
        source: 'website',
      } as never)
      .select('id')
      .single()
    customerId = (newCustomer as { id: string } | null)?.id
  }

  if (customerId) {
    await supabase
      .from('contact_inquiries')
      .update({ customer_id: customerId } as never)
      .eq('id', (data as { id: string }).id)
  }

  return NextResponse.json({ success: true, data })
}
