import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  checkSignupAllowed,
  extractIp,
  recordSignupAttempt,
  validateSignupInput,
} from '@/lib/security/signup-rate-limit'

/**
 * POST /api/auth/farm-signup
 *
 * Atomic signup: create auth user → create farm → create profile linked to farm
 * with role='chu_trai'. Uses service_role to bypass RLS during bootstrap.
 *
 * Có 4 lớp bảo vệ chống abuse:
 *  1. Honeypot field (website_url) — bot tự động fill → reject
 *  2. Disposable email blacklist (mailinator, tempmail, ...)
 *  3. Strict input validation (mật khẩu phức tạp, tên có chữ)
 *  4. Rate limit theo IP + email (xem signup-rate-limit.ts)
 *
 * Body:
 *   { email, password, full_name, farm_name, farm_phone?, farm_address?,
 *     website_url? (honeypot — phải là chuỗi rỗng) }
 *
 * Response:
 *   { ok: true, farm_id, user_id, slug } | { error, retryAfter? }
 */

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  full_name: z.string().min(2).max(100),
  farm_name: z.string().min(2).max(100),
  farm_phone: z.string().max(20).optional(),
  farm_address: z.string().max(200).optional(),
  // Honeypot — field ẩn trên form. User thật KHÔNG fill (vì không thấy).
  // Bot tự động thường fill mọi field. Nếu có giá trị → reject.
  website_url: z.string().optional(),
})

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const ip = extractIp(request.headers)
  const userAgent = request.headers.get('user-agent') ?? null

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  const { email, password, full_name, farm_name, farm_phone, farm_address, website_url } = parsed.data

  // ========== LỚP 1: HONEYPOT ==========
  // Bot tự động thường fill mọi text input. Field này hidden trên UI nên
  // user thật không bao giờ điền. Có giá trị = chắc chắn bot.
  if (website_url && website_url.trim().length > 0) {
    await recordSignupAttempt({
      ip,
      email,
      userAgent,
      success: false,
      honeypotTriggered: true,
      blockedReason: 'honeypot',
    })
    // Trả 200 OK với message giả thành công để bot tin → không retry.
    // Nhưng KHÔNG tạo gì trong DB.
    return NextResponse.json({
      ok: true,
      farm_id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000000',
      slug: 'pending',
    })
  }

  // ========== LỚP 2 + 3: VALIDATE STRICT (disposable + complexity) ==========
  const validateErr = validateSignupInput({ email, password, full_name, farm_name })
  if (validateErr) {
    await recordSignupAttempt({
      ip,
      email,
      userAgent,
      success: false,
      blockedReason: 'validation: ' + validateErr.slice(0, 80),
    })
    return NextResponse.json({ error: validateErr }, { status: 400 })
  }

  // ========== LỚP 4: RATE LIMIT theo IP + email ==========
  const decision = await checkSignupAllowed({ ip, email })
  if (!decision.allowed) {
    await recordSignupAttempt({
      ip,
      email,
      userAgent,
      success: false,
      blockedReason: 'rate_limit: ' + decision.reason.slice(0, 80),
    })
    return NextResponse.json(
      { error: decision.reason, retryAfter: decision.retryAfterSec },
      {
        status: 429,
        headers: { 'Retry-After': String(decision.retryAfterSec) },
      }
    )
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) Create auth user
  const { data: authResult, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })
  if (authErr || !authResult.user) {
    await recordSignupAttempt({
      ip, email, userAgent, success: false,
      blockedReason: 'auth_create: ' + (authErr?.message ?? 'unknown').slice(0, 80),
    })
    return NextResponse.json(
      { error: 'Lỗi tạo tài khoản: ' + (authErr?.message ?? 'không rõ') },
      { status: 400 }
    )
  }
  const userId = authResult.user.id

  // 2) Compute unique farm slug
  const baseSlug = slugify(farm_name) || 'farm'
  let slug = baseSlug
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`
    const { data: exists } = await admin
      .from('farms')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!exists) {
      slug = candidate
      break
    }
  }

  // 3) Create farm (trial 14 days)
  const trialEnds = new Date()
  trialEnds.setDate(trialEnds.getDate() + 14)
  const { data: farm, error: farmErr } = await admin
    .from('farms')
    .insert({
      slug,
      name: farm_name,
      tier: 'trial',
      trial_ends_at: trialEnds.toISOString(),
      subscription_active: true,
      max_chickens: 50,
      max_users: 1,
      owner_id: userId,
      display_name: farm_name,
      phone: farm_phone ?? null,
      address: farm_address ?? null,
    } as never)
    .select()
    .single()
  if (farmErr || !farm) {
    // Rollback auth user
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    return NextResponse.json(
      { error: 'Lỗi tạo trại: ' + (farmErr?.message ?? 'không rõ') },
      { status: 500 }
    )
  }

  // 4) Create / update profile linked to farm.
  //
  // Trigger `handle_new_user` (migration 16) tự động insert 1 row profile
  // ngay khi auth.users được tạo (với role='nhan_vien' và farm_id default).
  // Vì vậy ở đây phải UPSERT để override role='chu_trai' và set farm_id chính
  // xác = farm vừa tạo. Nếu insert sẽ bị duplicate-key violation.
  const { error: profileErr } = await admin
    .from('profiles')
    .upsert(
      {
        id: userId,
        full_name,
        role: 'chu_trai',
        is_active: true,
        farm_id: (farm as { id: string }).id,
      } as never,
      { onConflict: 'id' }
    )
  if (profileErr) {
    // Rollback farm + user
    await admin
      .from('farms')
      .delete()
      .eq('id', (farm as { id: string }).id)
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    return NextResponse.json(
      { error: 'Lỗi tạo profile: ' + profileErr.message },
      { status: 500 }
    )
  }

  // 5) Record success
  await recordSignupAttempt({
    ip, email, userAgent,
    success: true,
    userId,
    farmId: (farm as { id: string }).id,
  })

  return NextResponse.json({
    ok: true,
    farm_id: (farm as { id: string }).id,
    user_id: userId,
    slug,
    trial_ends_at: trialEnds.toISOString(),
  })
}
