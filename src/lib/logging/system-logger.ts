import 'server-only'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Centralized server-side logger.
 *
 * Usage:
 *   import { logSystem } from '@/lib/logging/system-logger'
 *   await logSystem({ level: 'error', category: 'auth', message: 'Login failed: wrong password', context: { email } })
 *
 * Designed to NEVER throw — failed log writes are swallowed so they don't
 * break the calling code path. Super admin views logs at /admin/super-admin/logs.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

export type LogCategory =
  | 'auth' | 'api' | 'db' | 'security' | 'push' | 'ai'
  | 'payment' | 'signup' | 'middleware' | 'storage' | 'cron' | 'other'

export type LogEntry = {
  level: LogLevel
  category: LogCategory
  message: string
  context?: Record<string, unknown>
  user_id?: string | null
  user_email?: string | null
  farm_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  path?: string | null
  http_status?: number | null
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function logSystem(entry: LogEntry): Promise<void> {
  try {
    const admin = getAdminClient()
    if (!admin) return
    await admin.from('system_logs').insert({
      level: entry.level,
      category: entry.category,
      message: entry.message.slice(0, 1000),
      context: entry.context ?? {},
      user_id: entry.user_id ?? null,
      user_email: entry.user_email ?? null,
      farm_id: entry.farm_id ?? null,
      ip_address: entry.ip_address ?? null,
      user_agent: entry.user_agent?.slice(0, 500) ?? null,
      path: entry.path?.slice(0, 500) ?? null,
      http_status: entry.http_status ?? null,
    })
  } catch {
    // Never let logging errors propagate
  }
}

/** Convenience helpers */
export const logError = (category: LogCategory, message: string, ctx?: Partial<LogEntry>) =>
  logSystem({ level: 'error', category, message, ...ctx })

export const logWarn = (category: LogCategory, message: string, ctx?: Partial<LogEntry>) =>
  logSystem({ level: 'warn', category, message, ...ctx })

export const logCritical = (category: LogCategory, message: string, ctx?: Partial<LogEntry>) =>
  logSystem({ level: 'critical', category, message, ...ctx })

export const logInfo = (category: LogCategory, message: string, ctx?: Partial<LogEntry>) =>
  logSystem({ level: 'info', category, message, ...ctx })

/** Extract IP + user-agent from a Request — for use in API routes */
export function extractRequestMeta(req: Request): {
  ip_address: string | null
  user_agent: string | null
  path: string
} {
  const url = new URL(req.url)
  return {
    ip_address:
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null,
    user_agent: req.headers.get('user-agent'),
    path: url.pathname + url.search,
  }
}
