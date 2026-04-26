import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  const supabase = await createClient()
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(
    'payroll_preview',
    { p_year: year, p_month: month }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, year, month })
}

export async function POST(request: Request) {
  const auth = await requireChuTrai()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json()) as {
    staff_id: string
    period_year: number
    period_month: number
    base_salary: number
    standard_days: number
    days_worked: number
    bonus?: number
    deduction?: number
    notes?: string
  }

  if (!body.staff_id || !body.period_year || !body.period_month) {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
  }

  // Guard: tránh chốt lương 2 lần cùng tháng
  const { data: existing } = await auth.supabase
    .from('payroll_payments')
    .select('id')
    .eq('staff_id', body.staff_id)
    .eq('period_year', body.period_year)
    .eq('period_month', body.period_month)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: `Đã chốt lương tháng ${body.period_month}/${body.period_year} cho nhân viên này rồi. Hủy trước nếu muốn chốt lại.` },
      { status: 409 }
    )
  }

  const bonus = body.bonus ?? 0
  const deduction = body.deduction ?? 0
  const computedBase =
    body.standard_days > 0
      ? Math.round((body.base_salary * body.days_worked) / body.standard_days)
      : 0
  const netPaid = Math.max(0, computedBase + bonus - deduction)

  const { data: staff } = await auth.supabase
    .from('profiles')
    .select('full_name')
    .eq('id', body.staff_id)
    .single<{ full_name: string }>()

  const { data: category } = await auth.supabase
    .from('expense_categories')
    .select('id')
    .eq('code', 'nhan_cong')
    .single<{ id: string }>()

  if (!category?.id) {
    return NextResponse.json(
      { error: 'Chưa có hạng mục chi phí nhân công' },
      { status: 500 }
    )
  }

  const paidDate = new Date(body.period_year, body.period_month - 1, 28).toISOString().slice(0, 10)

  const { data: expense, error: expErr } = await auth.supabase
    .from('expenses')
    .insert({
      category_id: category.id,
      amount: netPaid,
      expense_date: paidDate,
      description: `Lương tháng ${body.period_month}/${body.period_year} - ${staff?.full_name ?? ''}`,
      performed_by: auth.user.id,
    } as never)
    .select('id')
    .single<{ id: string }>()

  if (expErr) return NextResponse.json({ error: expErr.message }, { status: 500 })

  const { error: payErr } = await auth.supabase.from('payroll_payments').insert({
    staff_id: body.staff_id,
    period_year: body.period_year,
    period_month: body.period_month,
    base_salary: body.base_salary,
    standard_days: body.standard_days,
    days_worked: body.days_worked,
    bonus,
    deduction,
    net_paid: netPaid,
    paid_date: paidDate,
    expense_id: expense?.id,
    notes: body.notes ?? null,
    created_by: auth.user.id,
  } as never)

  if (payErr) {
    await auth.supabase.from('expenses').delete().eq('id', expense?.id)
    return NextResponse.json({ error: payErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, net_paid: netPaid, expense_id: expense?.id })
}

export async function DELETE(request: Request) {
  const auth = await requireChuTrai()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const { data: pay } = await auth.supabase
    .from('payroll_payments')
    .select('expense_id')
    .eq('id', id)
    .single<{ expense_id: string | null }>()

  await auth.supabase.from('payroll_payments').delete().eq('id', id)
  if (pay?.expense_id) {
    await auth.supabase.from('expenses').delete().eq('id', pay.expense_id)
  }

  return NextResponse.json({ success: true })
}
