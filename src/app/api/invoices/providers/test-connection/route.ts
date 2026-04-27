import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/rbac/guard'
import { getProviderAdapter } from '@/lib/invoice-providers/registry'
import type { ProviderConfig } from '@/lib/invoice-providers/types'

export async function POST(request: Request) {
  const ctx = await requirePermission('hoa_don', 'read')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const { id } = (await request.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: 'Thiếu provider id' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('invoice_providers')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return NextResponse.json({ error: error?.message || 'Không tìm thấy NCC' }, { status: 404 })

  const adapter = getProviderAdapter(data as unknown as ProviderConfig)
  const result = await adapter.testConnection()
  return NextResponse.json(result)
}
