/**
 * Rate limit in-memory đơn giản (ok cho single-instance hoặc local).
 * Sản phẩm ở scale cloud nên dùng Upstash Redis hoặc Vercel KV.
 *
 * Key = `<namespace>:<ip>` để track từng IP riêng theo endpoint.
 * Nếu chưa có Redis, đây vẫn là lớp chống brute-force + DDoS basic ở app layer.
 */

type Entry = { count: number; resetAt: number }
const buckets = new Map<string, Entry>()

// Clean stale entries mỗi 5 phút (tránh memory leak)
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 5 * 60_000) return
  lastCleanup = now
  for (const [k, v] of buckets.entries()) {
    if (v.resetAt < now) buckets.delete(k)
  }
}

export function getClientIp(request: Request): string {
  const h = request.headers
  const fwd = h.get('x-forwarded-for') ?? ''
  // Chỉ lấy IP đầu tiên (client gốc) — phần sau có thể là proxy chain spoof được
  const first = fwd.split(',')[0]?.trim()
  return first || h.get('x-real-ip') || h.get('cf-connecting-ip') || 'unknown'
}

export type RateLimitOptions = {
  /** tên endpoint để phân biệt bucket */
  namespace: string
  /** số request cho phép trong cửa sổ */
  limit: number
  /** cửa sổ ms */
  windowMs: number
}

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number; retryAfterSec: number }

export function rateLimit(request: Request, opts: RateLimitOptions): RateLimitResult {
  cleanup()
  const ip = getClientIp(request)
  const key = `${opts.namespace}:${ip}`
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || entry.resetAt < now) {
    const resetAt = now + opts.windowMs
    buckets.set(key, { count: 1, resetAt })
    return { ok: true, remaining: opts.limit - 1, resetAt }
  }

  if (entry.count >= opts.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count += 1
  return { ok: true, remaining: opts.limit - entry.count, resetAt: entry.resetAt }
}
