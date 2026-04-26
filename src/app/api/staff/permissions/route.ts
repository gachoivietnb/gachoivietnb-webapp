import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { MODULES, type PermissionsMap } from '@/lib/rbac/modules'

async function requireChuTrai() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, supabase }
  const { data: p } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (p?.role !== 'chu_trai') return { error: 'Chỉ chủ trại', status: 403, supabase }
  return { supabase, user }
}

export async function PATCH(request: Request) {
  const auth = await requireChuTrai()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json()) as {
    staff_id: string
    permissions: PermissionsMap
  }

  if (!body.staff_id || !body.permissions) {
    return NextResponse.json({ error: 'Thiếu staff_id hoặc permissions' }, { status: 400 })
  }

  // Sanitize: chỉ giữ key nằm trong MODULES
  const moduleKeys = new Set(MODULES.map((m) => m.key))
  const clean: PermissionsMap = {}
  for (const [k, v] of Object.entries(body.permissions)) {
    if (!moduleKeys.has(k)) continue
    if (!v || typeof v !== 'object') continue
    clean[k] = {
      read: Boolean(v.read),
      write: Boolean(v.write),
      delete: Boolean(v.delete),
    }
  }

  const { error } = await auth.supabase
    .from('profiles')
    .update({ permissions: clean, updated_at: new Date().toISOString() } as never)
    .eq('id', body.staff_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
