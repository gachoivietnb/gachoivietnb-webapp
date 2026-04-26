import { createClient } from '@/lib/supabase/server'
import { hasPermission, type PermissionsMap } from './modules'

export type CurrentUserPermissions = {
  userId: string
  role: string
  permissions: PermissionsMap
  can: (moduleKey: string, action: 'read' | 'write' | 'delete') => boolean
}

export async function getCurrentUserPermissions(): Promise<CurrentUserPermissions | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissions')
    .eq('id', user.id)
    .single<{ role: string; permissions: unknown }>()

  if (!profile) return null

  const permissions =
    (profile.permissions && typeof profile.permissions === 'object'
      ? (profile.permissions as PermissionsMap)
      : {}) ?? {}

  return {
    userId: user.id,
    role: profile.role,
    permissions,
    can: (moduleKey, action) => hasPermission(profile.role, permissions, moduleKey, action),
  }
}

export async function requirePermission(
  moduleKey: string,
  action: 'read' | 'write' | 'delete'
): Promise<CurrentUserPermissions | { error: string; status: number }> {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) return { error: 'Unauthorized', status: 401 }
  if (!ctx.can(moduleKey, action)) {
    return { error: `Không có quyền ${action} cho module ${moduleKey}`, status: 403 }
  }
  return ctx
}
