import 'server-only'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { CashTransfer } from './types'

export const TransferCreateSchema = z.object({
  from_account_id: z.string().uuid(),
  to_account_id: z.string().uuid(),
  amount: z.number().int().min(1),
  fee: z.number().int().min(0).default(0),
  transfer_date: z.string(),
  description: z.string().max(500).nullable().optional(),
})

export type TransferCreateInput = z.infer<typeof TransferCreateSchema>

/**
 * Tạo chuyển khoản nội bộ. Sinh ra cặp transactions:
 *   - OUT từ from_account (category=transfer_out)
 *   - IN vào to_account (category=transfer_in)
 *   - (option) OUT phí từ from_account (category=transfer_fee) nếu fee > 0
 * Cả 3 transactions đều có ref_type='cash_transfer' + ref_id=transfer.id
 *
 * Note: KHÔNG dùng atomic transaction (Supabase JS không support tx chính
 * thức). Nếu fail giữa chừng, super-admin có thể xoá tay.
 */
export async function createTransfer(
  input: TransferCreateInput,
  userId: string
): Promise<CashTransfer> {
  if (input.from_account_id === input.to_account_id) {
    throw new Error('Tài khoản nguồn và đích phải khác nhau')
  }

  const supabase = await createClient()

  // 1) Verify both accounts thuộc cùng farm hiện tại (RLS sẽ enforce nhưng check thêm cho rõ)
  type AccRow = { id: string; name: string }
  const { data: accountsRaw } = await supabase
    .from('cash_accounts')
    .select('id, name')
    .in('id', [input.from_account_id, input.to_account_id])
  const accounts = (accountsRaw as AccRow[] | null) ?? []
  if (accounts.length !== 2) {
    throw new Error('Không tìm thấy tài khoản hợp lệ')
  }
  const fromAcc = accounts.find((a) => a.id === input.from_account_id)
  const toAcc = accounts.find((a) => a.id === input.to_account_id)

  // 2) Tạo transfer record (ref tx ids set sau)
  const { data: transferRow, error: tErr } = await supabase
    .from('cash_transfers')
    .insert({
      from_account_id: input.from_account_id,
      to_account_id: input.to_account_id,
      amount: input.amount,
      fee: input.fee,
      transfer_date: input.transfer_date,
      description: input.description ?? null,
      created_by: userId,
    } as never)
    .select('*')
    .single()
  if (tErr || !transferRow) {
    throw new Error('Lỗi tạo chuyển khoản: ' + (tErr?.message ?? 'unknown'))
  }
  const transfer = transferRow as CashTransfer

  const desc = input.description ?? `Chuyển khoản ${fromAcc?.name} → ${toAcc?.name}`

  // 3) Tạo OUT tx
  const { data: outTx, error: outErr } = await supabase
    .from('cash_transactions')
    .insert({
      account_id: input.from_account_id,
      direction: 'out',
      amount: input.amount,
      transaction_date: input.transfer_date,
      category: 'transfer_out',
      ref_type: 'cash_transfer',
      ref_id: transfer.id,
      description: desc,
      created_by: userId,
    } as never)
    .select('id')
    .single()
  if (outErr || !outTx) {
    await supabase.from('cash_transfers').delete().eq('id', transfer.id)
    throw new Error('Lỗi tạo bút toán OUT: ' + (outErr?.message ?? 'unknown'))
  }

  // 4) Tạo IN tx
  const { data: inTx, error: inErr } = await supabase
    .from('cash_transactions')
    .insert({
      account_id: input.to_account_id,
      direction: 'in',
      amount: input.amount,
      transaction_date: input.transfer_date,
      category: 'transfer_in',
      ref_type: 'cash_transfer',
      ref_id: transfer.id,
      description: desc,
      created_by: userId,
    } as never)
    .select('id')
    .single()
  if (inErr || !inTx) {
    await supabase.from('cash_transactions').delete().eq('id', (outTx as { id: string }).id)
    await supabase.from('cash_transfers').delete().eq('id', transfer.id)
    throw new Error('Lỗi tạo bút toán IN: ' + (inErr?.message ?? 'unknown'))
  }

  // 5) Tạo fee tx (nếu có)
  let feeTxId: string | null = null
  if (input.fee > 0) {
    const { data: feeTx, error: feeErr } = await supabase
      .from('cash_transactions')
      .insert({
        account_id: input.from_account_id,
        direction: 'out',
        amount: input.fee,
        transaction_date: input.transfer_date,
        category: 'transfer_fee',
        ref_type: 'cash_transfer',
        ref_id: transfer.id,
        description: `Phí chuyển khoản — ${desc}`,
        created_by: userId,
      } as never)
      .select('id')
      .single()
    if (feeErr || !feeTx) {
      await supabase.from('cash_transactions').delete().eq('id', (outTx as { id: string }).id)
      await supabase.from('cash_transactions').delete().eq('id', (inTx as { id: string }).id)
      await supabase.from('cash_transfers').delete().eq('id', transfer.id)
      throw new Error('Lỗi tạo bút toán fee: ' + (feeErr?.message ?? 'unknown'))
    }
    feeTxId = (feeTx as { id: string }).id
  }

  // 6) Cập nhật transfer với tx ids
  await supabase
    .from('cash_transfers')
    .update({
      out_transaction_id: (outTx as { id: string }).id,
      in_transaction_id: (inTx as { id: string }).id,
      fee_transaction_id: feeTxId,
    } as never)
    .eq('id', transfer.id)

  return {
    ...transfer,
    out_transaction_id: (outTx as { id: string }).id,
    in_transaction_id: (inTx as { id: string }).id,
    fee_transaction_id: feeTxId,
  }
}

export async function deleteTransfer(id: string): Promise<void> {
  const supabase = await createClient()
  // Xoá các tx liên quan rồi xoá transfer
  const { data: t } = await supabase
    .from('cash_transfers')
    .select('out_transaction_id, in_transaction_id, fee_transaction_id')
    .eq('id', id)
    .maybeSingle<{
      out_transaction_id: string | null
      in_transaction_id: string | null
      fee_transaction_id: string | null
    }>()
  if (t) {
    const ids = [t.out_transaction_id, t.in_transaction_id, t.fee_transaction_id].filter(
      (x): x is string => x !== null
    )
    if (ids.length > 0) {
      await supabase.from('cash_transactions').delete().in('id', ids)
    }
  }
  const { error } = await supabase.from('cash_transfers').delete().eq('id', id)
  if (error) throw new Error('Lỗi xoá chuyển khoản: ' + error.message)
}

export async function listTransfers(opts?: { limit?: number }): Promise<
  Array<
    CashTransfer & {
      from_account_name?: string
      to_account_name?: string
    }
  >
> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cash_transfers')
    .select(
      '*, from:from_account_id(name), to:to_account_id(name)'
    )
    .order('transfer_date', { ascending: false })
    .limit(opts?.limit ?? 100)

  type Row = CashTransfer & {
    from: { name: string } | null
    to: { name: string } | null
  }
  return ((data as Row[] | null) ?? []).map((r) => ({
    ...r,
    from_account_name: r.from?.name,
    to_account_name: r.to?.name,
  }))
}
