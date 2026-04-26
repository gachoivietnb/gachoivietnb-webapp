import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Row = { line_item: string; amount: number; category: string }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) return NextResponse.json({ error: 'Missing from/to dates' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('pnl_report' as never, {
    p_from_date: from,
    p_to_date: to,
  } as never)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data as unknown as Row[]) ?? []
  const revenue = rows.filter((r) => r.category === 'revenue')
  const cogs = rows.filter((r) => r.category === 'cogs')
  const opex = rows.filter((r) => r.category === 'opex')

  const sum = (arr: Row[]) => arr.reduce((s, r) => s + Number(r.amount), 0)
  const totalRevenue = sum(revenue)
  const totalCogs = sum(cogs)
  const totalOpex = sum(opex)

  return NextResponse.json({
    data: {
      revenue,
      cogs,
      opex,
      totals: {
        revenue: totalRevenue,
        cogs: totalCogs,
        gross_profit: totalRevenue - totalCogs,
        opex: totalOpex,
        net_profit: totalRevenue - totalCogs - totalOpex,
      },
    },
  })
}
