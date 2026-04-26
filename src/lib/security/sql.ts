/**
 * Escape user input cho PostgREST .or() filter.
 * PostgREST dùng comma để tách filters + paren để group → phải strip cả 2.
 * Giữ lại unicode cho search tiếng Việt.
 */
export function escapeOrFilter(raw: string): string {
  return raw
    .replace(/[,()*]/g, '') // strip comma, paren, wildcard
    .replace(/[%_]/g, '\\$&') // escape LIKE wildcards
    .trim()
    .slice(0, 100) // hard cap 100 ký tự tránh DoS
}

/**
 * Validate UUID — chặn input không phải UUID đi vào query string
 */
export function isValidUuid(s: string | null | undefined): boolean {
  if (!s) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}
