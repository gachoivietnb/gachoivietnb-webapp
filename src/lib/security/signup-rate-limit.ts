import 'server-only'
import { createAdminClient } from '@/lib/multitenancy/super-admin'

/* ============================================================
 * Signup rate limit + abuse detection
 *
 * Lớp bảo vệ /api/auth/farm-signup chống:
 * - Bot tạo hàng loạt tài khoản tự động
 * - Đối thủ DDoS gây quá tải DB
 * - Email rác / disposable
 *
 * Tất cả check chạy TRƯỚC khi gọi auth.admin.createUser → tránh
 * burn quota Supabase auth + tránh ghi DB khi bị flood.
 * ============================================================ */

/* ====== RULES (có thể tinh chỉnh) ====== */
const RULES = {
  // Tổng số attempt (success + fail) từ 1 IP trong 1 giờ
  maxAttemptsPerIpPerHour: 5,
  // Số signup THÀNH CÔNG từ 1 IP trong 24 giờ — chặn 1 trại spam tạo nhiều
  maxSuccessPerIpPerDay: 2,
  // Số attempt với cùng email trong 24h
  maxAttemptsPerEmailPerDay: 3,
  // Số signup THÀNH CÔNG từ cùng email domain trong 24h (chặn bot dùng nhiều địa chỉ +alias)
  maxSuccessPerDomainPerDay: 5,
} as const

/* ====== Disposable / temp email blacklist ======
 * Domain phổ biến của các dịch vụ email tạm thời.
 * Không exhaustive — bot luôn tìm được domain mới — nhưng bắt được đa số. */
const DISPOSABLE_DOMAINS = new Set<string>([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.info',
  'sharklasers.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'maildrop.cc',
  'mintemail.com',
  'throwawaymail.com',
  'getnada.com',
  'inboxbear.com',
  'tempr.email',
  'fakeinbox.com',
  'trashmail.com',
  'trashmail.net',
  'dispostable.com',
  'mailcatch.com',
  'mvrht.com',
  'mvrht.net',
  'mytemp.email',
  'spambox.us',
  'spam4.me',
  'mailnesia.com',
  'emailondeck.com',
  'mohmal.com',
  'tempmailaddress.com',
  'fakemail.net',
  'burnermail.io',
  'mail-temp.com',
  'mail.tm',
  'tmpmail.org',
  'tmpmail.net',
  'tmpeml.com',
  'tmpeml.info',
  'minuteinbox.com',
  'discard.email',
  'cock.li',
  'fakemailgenerator.com',
  'lroid.com',
  'spam.la',
  'yandex.ru',
])

/* ====== Helpers ====== */

export function isDisposableEmail(email: string): boolean {
  const e = email.trim().toLowerCase()
  const at = e.indexOf('@')
  if (at < 0) return false
  const domain = e.slice(at + 1)
  if (!domain) return false
  if (DISPOSABLE_DOMAINS.has(domain)) return true
  // match suffix (vd "*.10minutemail.com")
  for (const bl of DISPOSABLE_DOMAINS) {
    if (domain.endsWith('.' + bl)) return true
  }
  return false
}

/* ====== Extract IP từ request headers (Next.js) ======
 * Vercel: x-forwarded-for, x-real-ip
 * Local: thường là ::1 hoặc 127.0.0.1
 */
export function extractIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) {
    // có thể là chuỗi "1.2.3.4, 5.6.7.8" (proxy chain) → lấy first
    return fwd.split(',')[0].trim()
  }
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  // Last resort
  return '0.0.0.0'
}

export type RateLimitDecision =
  | { allowed: true }
  | {
      allowed: false
      reason: string
      retryAfterSec: number
    }

export async function checkSignupAllowed(args: {
  ip: string
  email: string
}): Promise<RateLimitDecision> {
  const admin = createAdminClient()
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 3_600_000).toISOString()
  const oneDayAgo = new Date(now.getTime() - 86_400_000).toISOString()
  const emailLower = args.email.toLowerCase()
  const domain = emailLower.split('@')[1] ?? ''

  // 1) Tổng attempts từ IP trong 1 giờ
  const ipHour = await admin
    .from('signup_throttle')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', args.ip)
    .gte('created_at', oneHourAgo)
  if ((ipHour.count ?? 0) >= RULES.maxAttemptsPerIpPerHour) {
    return {
      allowed: false,
      reason:
        'Bạn đã thử đăng ký quá nhiều lần. Vui lòng đợi 1 giờ rồi thử lại.',
      retryAfterSec: 3600,
    }
  }

  // 2) Successful signup từ IP trong 24h
  const ipDaySuccess = await admin
    .from('signup_throttle')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', args.ip)
    .eq('success', true)
    .gte('created_at', oneDayAgo)
  if ((ipDaySuccess.count ?? 0) >= RULES.maxSuccessPerIpPerDay) {
    return {
      allowed: false,
      reason:
        'Đã có quá nhiều tài khoản được tạo từ địa chỉ mạng này trong 24 giờ qua. Liên hệ hotline nếu bạn cần hỗ trợ thêm.',
      retryAfterSec: 86400,
    }
  }

  // 3) Cùng email — bao gồm cả attempts thất bại
  const emailDay = await admin
    .from('signup_throttle')
    .select('id', { count: 'exact', head: true })
    .ilike('email', emailLower)
    .gte('created_at', oneDayAgo)
  if ((emailDay.count ?? 0) >= RULES.maxAttemptsPerEmailPerDay) {
    return {
      allowed: false,
      reason: 'Email này đã được thử nhiều lần. Vui lòng đợi 24h hoặc dùng email khác.',
      retryAfterSec: 86400,
    }
  }

  // 4) Cùng email domain — chặn bot dùng pattern emailX@same.com
  if (domain) {
    const domainDay = await admin
      .from('signup_throttle')
      .select('id', { count: 'exact', head: true })
      .ilike('email', `%@${domain}`)
      .eq('success', true)
      .gte('created_at', oneDayAgo)
    if ((domainDay.count ?? 0) >= RULES.maxSuccessPerDomainPerDay) {
      return {
        allowed: false,
        reason:
          'Đã có nhiều tài khoản đăng ký từ cùng nhà cung cấp email trong 24h. Liên hệ hotline nếu cần hỗ trợ.',
        retryAfterSec: 86400,
      }
    }
  }

  return { allowed: true }
}

export async function recordSignupAttempt(args: {
  ip: string
  email: string | null
  userAgent: string | null
  success: boolean
  userId?: string | null
  farmId?: string | null
  honeypotTriggered?: boolean
  blockedReason?: string | null
}): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('signup_throttle').insert({
      ip_address: args.ip,
      email: args.email ? args.email.toLowerCase() : null,
      user_agent: args.userAgent?.slice(0, 500) ?? null,
      success: args.success,
      user_id: args.userId ?? null,
      farm_id: args.farmId ?? null,
      honeypot_triggered: args.honeypotTriggered ?? false,
      blocked_reason: args.blockedReason?.slice(0, 200) ?? null,
    } as never)
  } catch {
    // Không throw — ghi log fail không nên break signup flow
  }
}

/* ====== Validate farm-signup body ======
 * Trả message lỗi đầu tiên gặp; null nếu OK.
 * Stricter validation hơn zod schema cơ bản.
 */
export function validateSignupInput(body: {
  email: string
  password: string
  full_name: string
  farm_name: string
}): string | null {
  // Email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email)) {
    return 'Email không hợp lệ.'
  }
  if (isDisposableEmail(body.email)) {
    return 'Vui lòng dùng email thật. Email tạm thời / dùng 1 lần không được chấp nhận.'
  }

  // Password complexity (min 8 + 1 letter + 1 digit)
  if (body.password.length < 8) {
    return 'Mật khẩu cần tối thiểu 8 ký tự.'
  }
  if (!/[A-Za-z]/.test(body.password) || !/\d/.test(body.password)) {
    return 'Mật khẩu cần có cả chữ và số.'
  }

  // Full name — không phải toàn ký tự đặc biệt / số
  const nameTrimmed = body.full_name.trim()
  if (nameTrimmed.length < 2) return 'Họ tên quá ngắn.'
  if (!/[a-zA-ZÀ-ỹ]/.test(nameTrimmed)) {
    return 'Họ tên cần có ít nhất một chữ cái.'
  }

  // Farm name
  const farmTrimmed = body.farm_name.trim()
  if (farmTrimmed.length < 2) return 'Tên trại quá ngắn.'
  if (!/[a-zA-ZÀ-ỹ]/.test(farmTrimmed)) {
    return 'Tên trại cần có ít nhất một chữ cái.'
  }

  return null
}
