import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac/guard'

export async function POST() {
  const ctx = await requirePermission('cai_dat', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const supabase = await createClient()
  await supabase.rpc('resolve_stock_alerts')
  const { data, error } = await supabase.rpc('generate_stock_alerts')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
