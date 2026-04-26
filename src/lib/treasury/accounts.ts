import 'server-only'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type {
  AccountType,
  CashAccount,
  CashAccountBalance,
} from './types'

export const AccountCreateSchema = z.object({
  name: z.string().min(1).max(80),
  account_type: z.enum(['cash', 'bank', 'ewallet', 'other']).default('cash'),
  bank_name: z.string().max(80).nullable().optional(),
  account_number: z.string().max(60).nullable().optional(),
  initial_balance: z.number().int().min(0).default(0),
  initial_balance_date: z.string().optional(),
  is_default: z.boolean().default(false),
  color: z.string().max(80).default('from-emerald-500 to-teal-500'),
  icon: z.string().max(8).default('💵'),
  display_order: z.number().int().min(0).default(0),
  notes: z.string().max(500).nullable().optional(),
})

export const AccountUpdateSchema = AccountCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
})

export type AccountCreateInput = z.infer<typeof AccountCreateSchema>
export type AccountUpdateInput = z.infer<typeof AccountUpdateSchema>

export async function listAccounts(opts?: { activeOnly?: boolean }): Promise<CashAccountBalance[]> {
  const supabase = await createClient()
  let q = supabase
    .from('cash_account_balances')
    .select('*')
    .order('display_order', { ascending: true })
  if (opts?.activeOnly) q = q.eq('is_active', true)
  const { data } = await q
  return ((data as CashAccountBalance[] | null) ?? [])
}

/**
 * Trả về { ready: true, accounts } nếu DB đã sẵn sàng, hoặc
 * { ready: false, reason } để page render hướng dẫn thay vì trang trống.
 */
export async function listAccountsWithStatus(opts?: { activeOnly?: boolean }): Promise<
  | { ready: true; accounts: CashAccountBalance[] }
  | { ready: false; reason: 'table_missing' | 'unknown'; message: string }
> {
  try {
    const supabase = await createClient()
    let q = supabase
      .from('cash_account_balances')
      .select('*')
      .order('display_order', { ascending: true })
    if (opts?.activeOnly) q = q.eq('is_active', true)
    const { data, error } = await q
    if (error) {
      // PGRST205 = view/table không tồn tại
      if (error.code === 'PGRST205' || /could not find the table/i.test(error.message)) {
        return { ready: false, reason: 'table_missing', message: error.message }
      }
      return { ready: false, reason: 'unknown', message: error.message }
    }
    return { ready: true, accounts: (data as CashAccountBalance[] | null) ?? [] }
  } catch (e) {
    return {
      ready: false,
      reason: 'unknown',
      message: e instanceof Error ? e.message : 'unknown',
    }
  }
}

export async function getAccount(id: string): Promise<CashAccount | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cash_accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data as unknown as CashAccount | null) ?? null
}

export async function getDefaultAccount(): Promise<CashAccountBalance | null> {
  const accounts = await listAccounts({ activeOnly: true })
  return accounts.find((a) => a.is_default) ?? accounts[0] ?? null
}

export async function createAccount(input: AccountCreateInput): Promise<CashAccount> {
  const supabase = await createClient()

  // Nếu set is_default → unset all others trong cùng farm
  if (input.is_default) {
    await supabase
      .from('cash_accounts')
      .update({ is_default: false } as never)
      .eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('cash_accounts')
    .insert(input as never)
    .select('*')
    .single()
  if (error || !data) {
    throw new Error('Lỗi tạo tài khoản: ' + (error?.message ?? 'unknown'))
  }

  // Nếu có initial_balance > 0 → tạo opening transaction
  const acc = data as CashAccount
  if (acc.initial_balance > 0) {
    await supabase.from('cash_transactions').insert({
      account_id: acc.id,
      direction: 'in',
      amount: acc.initial_balance,
      transaction_date: acc.initial_balance_date,
      category: 'opening',
      ref_type: 'manual',
      description: `Số dư đầu kỳ — ${acc.name}`,
    } as never)

    // Cập nhật initial_balance về 0 để tránh tính 2 lần (vì opening tx đã ghi rồi)
    // Note: không reset, vì view balance dùng initial_balance + tx. Nếu reset thì
    // user xoá opening tx sẽ bay luôn → giữ initial_balance ổn định, KHÔNG tạo opening tx.
    // → Refactor: bỏ block tạo opening tx, chỉ giữ initial_balance.
    // Nhưng sẽ mất history → giữ cách hiện tại (initial_balance trong view + opening tx riêng):
    // ... cần giải quyết double count.
    // Giải pháp đơn giản: SAU KHI tạo opening tx, set initial_balance = 0.
    await supabase
      .from('cash_accounts')
      .update({ initial_balance: 0 } as never)
      .eq('id', acc.id)
    acc.initial_balance = 0
  }

  return acc
}

export async function updateAccount(id: string, patch: AccountUpdateInput): Promise<CashAccount> {
  const supabase = await createClient()

  if (patch.is_default === true) {
    await supabase
      .from('cash_accounts')
      .update({ is_default: false } as never)
      .eq('is_default', true)
      .neq('id', id)
  }

  const { data, error } = await supabase
    .from('cash_accounts')
    .update(patch as never)
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) {
    throw new Error('Lỗi cập nhật tài khoản: ' + (error?.message ?? 'unknown'))
  }
  return data as CashAccount
}

export async function deleteAccount(id: string): Promise<void> {
  const supabase = await createClient()

  // Check còn transaction nào không
  const { data: txs } = await supabase
    .from('cash_transactions')
    .select('id')
    .eq('account_id', id)
    .limit(1)
  if (txs && txs.length > 0) {
    throw new Error(
      'Không thể xoá tài khoản vì còn giao dịch. Hãy ẩn tài khoản (đặt is_active=false) thay vì xoá.'
    )
  }

  const { error } = await supabase.from('cash_accounts').delete().eq('id', id)
  if (error) throw new Error('Lỗi xoá tài khoản: ' + error.message)
}

/**
 * Đảm bảo farm hiện tại có ít nhất 1 cash_account default.
 * Migration đã seed sẵn 2 default account cho farm tồn tại tại thời điểm
 * apply migration. Function này dùng cho farm tạo mới SAU đó.
 */
export async function ensureDefaultAccountsExist(): Promise<void> {
  const accounts = await listAccounts()
  if (accounts.length > 0) return
  const supabase = await createClient()
  await supabase.from('cash_accounts').insert([
    {
      name: 'Két tiền mặt',
      account_type: 'cash' as AccountType,
      is_default: true,
      color: 'from-emerald-500 to-teal-500',
      icon: '💵',
      display_order: 0,
    },
    {
      name: 'Vietcombank',
      account_type: 'bank' as AccountType,
      bank_name: 'Vietcombank',
      color: 'from-green-600 to-emerald-700',
      icon: '🏦',
      display_order: 1,
    },
  ] as never)
}
