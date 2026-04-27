import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac/guard'

const Schema = z.object({
  category_id: z.string().uuid(),
  amount: z.number().positive(),
  expense_date: z.string(),
  description: z.string().optional(),
  related_area_id: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const categoryId = searchParams.get('category_id')

  const supabase = await createClient()
  let query = supabase
    .from('expenses')
    .select('*, category:expense_categories(code, name_vi)')
    .order('expense_date', { ascending: false })

  if (from) query = query.gte('expense_date', from)
  if (to) query = query.lte('expense_date', to)
  if (categoryId) query = query.eq('category_id', categoryId)

  const { data } = await query.limit(200)
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const ctx = await requirePermission('quy', 'write')
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const supabase = await createClient()
  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...parsed.data, performed_by: ctx.userId } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
