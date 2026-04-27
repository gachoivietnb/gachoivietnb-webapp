import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const Schema = z.object({
  code: z.string().min(1).max(30),
  name_vi: z.string().min(1).max(100),
  unit: z.string().default('kg'),
  current_stock: z.number().min(0).default(0),
  min_stock_alert: z.number().min(0).default(0),
  cost_per_unit: z.number().optional(),
  description: z.string().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('feeds')
    .select('*')
    .eq('is_active', true)
    .order('name_vi')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const ctx = await requirePermission('kho_thuc_an', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const supabase = await createClient()
  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { data, error } = await supabase
    .from('feeds')
    .insert(parsed.data as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
