import 'server-only'
import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Request-cached auth user.
 *
 * `auth.getUser()` validates the JWT against Supabase Auth (a network
 * round-trip). It's invoked by the middleware, the admin layout,
 * getFarmContext() and requirePermission() — several times within a single
 * request. React cache() is request-scoped, so wrapping here collapses all
 * those calls into ONE per request (no cross-request/cross-user leakage).
 */
export const getCachedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
