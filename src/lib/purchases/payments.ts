import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getDefaultAccount } from '@/lib/treasury/accounts'
import { createTransaction } from '@/lib/treasury/transactions'

export type PaymentStatus = 'chua_tra' | 'tra_mot_phan' | 'da_tra'

export function paymentStatusOf(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return 'chua_tra'
  if (paid >= total) return 'da_tra'
  return 'tra_mot_phan'
}

/**
 * Ghi 1 lần chi trả NCC cho một phiếu mua:
 *   1) sổ supplier_payments
 *   2) cập nhật purchases.paid_amount + payment_status
 *   3) chi quỹ (cash_transactions 'out', category 'purchase') — best-effort,
 *      nếu trại chưa có tài khoản quỹ thì bỏ qua (công nợ vẫn được ghi nhận).
 * Chặn nếu số tiền vượt công nợ còn lại.
 */
export async function recordSupplierPayment(opts: {
  purchaseId: string
  amount: number
  paymentDate: string
  paymentMethod?: string | null
  notes?: string | null
  userId: string
}): Promise<{ paid_amount: number; payment_status: PaymentStatus; remaining: number }> {
  const supabase = await createClient()

  const { data: pr } = await supabase
    .from('purchases')
    .select('total_amount, paid_amount, supplier_id, purchase_code')
    .eq('id', opts.purchaseId)
    .single()
  const purchase = pr as
    | { total_amount: number; paid_amount: number; supplier_id: string | null; purchase_code: string }
    | null
  if (!purchase) throw new Error('Không tìm thấy phiếu mua')

  const total = Number(purchase.total_amount)
  const already = Number(purchase.paid_amount)
  const remaining = total - already
  if (opts.amount <= 0) throw new Error('Số tiền trả phải lớn hơn 0')
  if (opts.amount > remaining) {
    throw new Error(`Số tiền vượt công nợ còn lại (${remaining.toLocaleString('vi-VN')}đ)`)
  }

  // 1) Sổ chi trả NCC
  await supabase.from('supplier_payments').insert({
    supplier_id: purchase.supplier_id,
    purchase_id: opts.purchaseId,
    amount: opts.amount,
    payment_date: opts.paymentDate,
    payment_method: opts.paymentMethod ?? null,
    notes: opts.notes ?? null,
    performed_by: opts.userId,
  } as never)

  // 2) Cập nhật công nợ trên phiếu
  const newPaid = already + opts.amount
  const status = paymentStatusOf(total, newPaid)
  await supabase
    .from('purchases')
    .update({ paid_amount: newPaid, payment_status: status } as never)
    .eq('id', opts.purchaseId)

  // 3) Chi quỹ (best-effort)
  try {
    const acc = await getDefaultAccount()
    if (acc) {
      await createTransaction(
        {
          account_id: acc.account_id,
          direction: 'out',
          amount: opts.amount,
          transaction_date: opts.paymentDate,
          category: 'purchase',
          ref_type: 'purchase',
          ref_id: opts.purchaseId,
          description: `Trả NCC — phiếu ${purchase.purchase_code}`,
        },
        opts.userId
      )
    }
  } catch {
    // Quỹ chưa cấu hình / lỗi tạo giao dịch → công nợ vẫn ghi nhận, chỉ không phản ánh vào quỹ
  }

  return { paid_amount: newPaid, payment_status: status, remaining: total - newPaid }
}
