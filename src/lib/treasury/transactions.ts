import 'server-only'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { CashTransaction, Direction, TransactionCategory, RefType } from './types'

const CATEGORIES: TransactionCategory[] = [
  'sale', 'purchase', 'expense', 'payroll',
  'transfer_in', 'transfer_out', 'transfer_fee',
  'opening', 'adjustment',
  'capital_in', 'capital_out',
  'loan_in', 'loan_out',
  'other',
]

const REF_TYPES: RefType[] = [
  'sales_order', 'purchase', 'expense', 'payroll_payment', 'cash_transfer', 'manual',
]

export const TransactionCreateSchema = z.object({
  account_id: z.string().uuid(),
  direction: z.enum(['in', 'out']),
  amount: z.number().int().min(1),
  transaction_date: z.string(),
  category: z.enum(CATEGORIES as [TransactionCategory, ...TransactionCategory[]]).default('other'),
  ref_type: z.enum(REF_TYPES as [RefType, ...RefType[]]).nullable().optional(),
  ref_id: z.string().uuid().nullable().optional(),
  expense_category_id: z.string().uuid().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
})

export const TransactionUpdateSchema = TransactionCreateSchema.partial().extend({
  reconciled: z.boolean().optional(),
})

export type TransactionCreateInput = z.infer<typeof TransactionCreateSchema>
export type TransactionUpdateInput = z.infer<typeof TransactionUpdateSchema>

export type TransactionWithMeta = CashTransaction & {
  account_name?: string
  account_icon?: string
  account_color?: string
  expense_category_name?: string | null
}

export async function createTransaction(
  input: TransactionCreateInput,
  userId: string
): Promise<CashTransaction> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cash_transactions')
    .insert({ ...input, created_by: userId } as never)
    .select('*')
    .single()
  if (error || !data) {
    throw new Error('Lỗi tạo giao dịch: ' + (error?.message ?? 'unknown'))
  }
  return data as CashTransaction
}

export async function updateTransaction(
  id: string,
  patch: TransactionUpdateInput
): Promise<CashTransaction> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cash_transactions')
    .update(patch as never)
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) {
    throw new Error('Lỗi cập nhật giao dịch: ' + (error?.message ?? 'unknown'))
  }
  return data as CashTransaction
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient()

  // Không cho xoá tx của transfer (phải xoá transfer)
  const { data: tx } = await supabase
    .from('cash_transactions')
    .select('ref_type')
    .eq('id', id)
    .maybeSingle<{ ref_type: string | null }>()
  if (tx?.ref_type === 'cash_transfer') {
    throw new Error(
      'Đây là giao dịch của một bút toán chuyển khoản — vui lòng xoá ở phần Chuyển khoản.'
    )
  }

  const { error } = await supabase.from('cash_transactions').delete().eq('id', id)
  if (error) throw new Error('Lỗi xoá giao dịch: ' + error.message)
}

export async function listTransactions(filter: {
  accountId?: string
  direction?: Direction
  category?: TransactionCategory
  fromDate?: string
  toDate?: string
  search?: string
  limit?: number
}): Promise<TransactionWithMeta[]> {
  const supabase = await createClient()
  let q = supabase
    .from('cash_transactions')
    .select(
      'id, farm_id, account_id, direction, amount, transaction_date, category, ref_type, ref_id, expense_category_id, description, reconciled, created_by, created_at, updated_at, account:cash_accounts(name, icon, color), expense_category:expense_categories(name_vi)'
    )
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(filter.limit ?? 200)

  if (filter.accountId) q = q.eq('account_id', filter.accountId)
  if (filter.direction) q = q.eq('direction', filter.direction)
  if (filter.category) q = q.eq('category', filter.category)
  if (filter.fromDate) q = q.gte('transaction_date', filter.fromDate)
  if (filter.toDate) q = q.lte('transaction_date', filter.toDate)
  if (filter.search) q = q.ilike('description', `%${filter.search}%`)

  const { data } = await q
  type Row = CashTransaction & {
    account: { name: string; icon: string; color: string } | null
    expense_category: { name_vi: string } | null
  }
  return ((data as Row[] | null) ?? []).map((r) => ({
    ...r,
    account_name: r.account?.name,
    account_icon: r.account?.icon,
    account_color: r.account?.color,
    expense_category_name: r.expense_category?.name_vi ?? null,
  }))
}

/**
 * Tổng quan thu/chi theo khoảng thời gian.
 */
export async function getTreasurySummary(opts: {
  fromDate: string
  toDate: string
}): Promise<{
  totalIn: number
  totalOut: number
  netFlow: number
  txCount: number
  byCategory: Array<{ category: TransactionCategory; direction: Direction; amount: number; count: number }>
  byDay: Array<{ date: string; in: number; out: number }>
}> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cash_transactions')
    .select('direction, amount, category, transaction_date')
    .gte('transaction_date', opts.fromDate)
    .lte('transaction_date', opts.toDate)

  type Row = {
    direction: Direction
    amount: number
    category: TransactionCategory
    transaction_date: string
  }
  const rows = (data as Row[] | null) ?? []

  let totalIn = 0
  let totalOut = 0
  const catMap = new Map<string, { category: TransactionCategory; direction: Direction; amount: number; count: number }>()
  const dayMap = new Map<string, { in: number; out: number }>()

  for (const r of rows) {
    const amt = Number(r.amount)
    if (r.direction === 'in') totalIn += amt
    else totalOut += amt

    const ck = `${r.direction}-${r.category}`
    const cur = catMap.get(ck) ?? { category: r.category, direction: r.direction, amount: 0, count: 0 }
    cur.amount += amt
    cur.count += 1
    catMap.set(ck, cur)

    const day = dayMap.get(r.transaction_date) ?? { in: 0, out: 0 }
    if (r.direction === 'in') day.in += amt
    else day.out += amt
    dayMap.set(r.transaction_date, day)
  }

  return {
    totalIn,
    totalOut,
    netFlow: totalIn - totalOut,
    txCount: rows.length,
    byCategory: [...catMap.values()].sort((a, b) => b.amount - a.amount),
    byDay: [...dayMap.entries()]
      .map(([date, v]) => ({ date, in: v.in, out: v.out }))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
  }
}
