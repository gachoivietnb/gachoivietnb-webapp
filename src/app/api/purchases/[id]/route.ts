import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: purchase } = await supabase
    .from('purchases')
    .select('*, supplier:suppliers(*)')
    .eq('id', id)
    .maybeSingle()

  if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: items } = await supabase
    .from('purchase_items')
    .select('*, chicken:chickens!inner(id, chicken_code, name, status, breeds(name_vi))')
    .eq('purchase_id', id)

  return NextResponse.json({ data: { ...(purchase as object), items: items ?? [] } })
}
