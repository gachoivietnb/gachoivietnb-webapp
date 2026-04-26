import 'server-only'
import { z } from 'zod'
import { createAdminClient } from '@/lib/multitenancy/super-admin'
import {
  computeAmount,
  tierLimits,
  type SubscriptionOrder,
  type PaidTier,
} from './shared'

// Re-export client-safe symbols cho code cũ chỉ import từ '@/lib/payment/orders'
export {
  computeAmount,
  discountForMonths,
  tierLimits,
  formatVnd,
  ORDER_STATUS_META,
} from './shared'
export type { SubscriptionOrder, PaidTier } from './shared'

/* ============================================================
 * Subscription orders — đơn nâng gói qua chuyển khoản.
 *
 * Flow:
 *   1) user gọi createOrder(farmId, userId, tier, months)
 *   2) hệ thống tạo row pending + payment_note unique
 *   3) hiển thị QR + thông tin TK cho user
 *   4) user chuyển khoản
 *   5a) super-admin manual: confirmOrder(orderId, adminUserId)
 *   5b) Casso webhook (Phase 3): confirmOrderByCasso(payload)
 *   6) confirm trigger setFarmTier() → activate subscription
 * ============================================================ */

export const CreateOrderSchema = z.object({
  tier: z.enum(['basic', 'pro', 'enterprise']),
  months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
  payment_method: z.enum(['bank_transfer', 'momo']).default('bank_transfer'),
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>

/* ============================================================
 * Generate payment note: <prefix><yymmdd><6-digit-random>
 * Ví dụ: GCV260426847291
 * Phải unique trong bảng — retry tối đa 5 lần.
 * ============================================================ */
async function generateUniquePaymentNote(prefix: string): Promise<string> {
  const admin = createAdminClient()
  const now = new Date()
  const yy = String(now.getFullYear() % 100).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  for (let i = 0; i < 5; i++) {
    const rand = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0')
    const candidate = `${prefix}${yy}${mm}${dd}${rand}`
    const { data } = await admin
      .from('subscription_orders')
      .select('id')
      .eq('payment_note', candidate)
      .maybeSingle()
    if (!data) return candidate
  }
  throw new Error('Không tạo được payment_note unique sau 5 lần thử')
}

/* ============================================================
 * Create order
 * ============================================================ */

export async function createOrder(args: {
  farmId: string
  userId: string
  tier: PaidTier
  months: 1 | 3 | 6 | 12
  paymentMethod?: 'bank_transfer' | 'momo'
  notePrefix?: string
}): Promise<SubscriptionOrder> {
  const admin = createAdminClient()
  const amount = computeAmount(args.tier, args.months)
  if (amount <= 0) {
    throw new Error('Giá tiền không hợp lệ')
  }

  const note = await generateUniquePaymentNote(args.notePrefix || 'GCV')

  // Đơn pending hết hạn sau 24h
  const expires = new Date()
  expires.setHours(expires.getHours() + 24)

  const { data, error } = await admin
    .from('subscription_orders')
    .insert({
      farm_id: args.farmId,
      user_id: args.userId,
      tier: args.tier,
      months: args.months,
      amount_vnd: amount,
      payment_method: args.paymentMethod ?? 'bank_transfer',
      payment_note: note,
      status: 'pending',
      expires_at: expires.toISOString(),
    } as never)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error('Lỗi tạo đơn: ' + (error?.message ?? 'unknown'))
  }
  return data as SubscriptionOrder
}

/* ============================================================
 * Get / List
 * ============================================================ */

export async function getOrder(orderId: string): Promise<SubscriptionOrder | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subscription_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()
  return (data as SubscriptionOrder) ?? null
}

export async function listOrdersByFarm(farmId: string): Promise<SubscriptionOrder[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subscription_orders')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
    .limit(50)
  return ((data as SubscriptionOrder[] | null) ?? [])
}

export async function listAllOrders(filter: {
  status?: SubscriptionOrder['status']
  limit?: number
}): Promise<(SubscriptionOrder & { farm_name?: string; farm_slug?: string })[]> {
  const admin = createAdminClient()
  let q = admin
    .from('subscription_orders')
    .select('*, farms(name, slug)')
    .order('created_at', { ascending: false })
    .limit(filter.limit ?? 100)
  if (filter.status) {
    q = q.eq('status', filter.status)
  }
  const { data } = await q
  type Row = SubscriptionOrder & { farms: { name: string; slug: string } | null }
  return ((data as Row[] | null) ?? []).map((r) => ({
    ...r,
    farm_name: r.farms?.name,
    farm_slug: r.farms?.slug,
  }))
}

/* ============================================================
 * Confirm order — set status='paid' + activate farm tier
 * Atomic: nếu activate fail thì rollback status.
 * ============================================================ */

export async function confirmOrder(args: {
  orderId: string
  confirmedBy: string
  adminNote?: string
  cassoTxnId?: string
  cassoPayload?: unknown
}): Promise<SubscriptionOrder> {
  const admin = createAdminClient()

  const order = await getOrder(args.orderId)
  if (!order) throw new Error('Không tìm thấy đơn')
  if (order.status !== 'pending') {
    throw new Error(`Đơn đang ở trạng thái "${order.status}", không thể xác nhận`)
  }

  const limits = tierLimits(order.tier)

  // 1) Cập nhật farm: tier + extend subscription
  // Logic gia hạn: nếu subscription_expires_at còn trong tương lai → cộng dồn,
  // ngược lại → tính từ hôm nay.
  const { data: farm, error: farmGetErr } = await admin
    .from('farms')
    .select('subscription_expires_at')
    .eq('id', order.farm_id)
    .single()
  if (farmGetErr || !farm) {
    throw new Error('Không tìm thấy farm: ' + (farmGetErr?.message ?? 'unknown'))
  }

  const now = new Date()
  const baseDate =
    farm.subscription_expires_at && new Date(farm.subscription_expires_at) > now
      ? new Date(farm.subscription_expires_at)
      : now
  const newExpiry = new Date(baseDate)
  newExpiry.setMonth(newExpiry.getMonth() + order.months)

  const { error: farmErr } = await admin
    .from('farms')
    .update({
      tier: order.tier,
      subscription_active: true,
      subscription_expires_at: newExpiry.toISOString(),
      max_chickens: limits.max_chickens,
      max_users: limits.max_users,
    } as never)
    .eq('id', order.farm_id)

  if (farmErr) {
    throw new Error('Lỗi activate farm: ' + farmErr.message)
  }

  // 2) Cập nhật order
  const { data: updated, error: updErr } = await admin
    .from('subscription_orders')
    .update({
      status: 'paid',
      paid_at: now.toISOString(),
      confirmed_by: args.confirmedBy,
      admin_note: args.adminNote ?? null,
      casso_txn_id: args.cassoTxnId ?? null,
      casso_payload: (args.cassoPayload as never) ?? null,
    } as never)
    .eq('id', args.orderId)
    .select('*')
    .single()

  if (updErr || !updated) {
    // Khả năng farm đã activate xong mà order update fail — báo lỗi,
    // super-admin có thể vào DB sửa tay nếu cần.
    throw new Error('Đã activate farm nhưng update order lỗi: ' + (updErr?.message ?? 'unknown'))
  }

  return updated as SubscriptionOrder
}

/* ============================================================
 * Cancel order
 * ============================================================ */

export async function cancelOrder(args: {
  orderId: string
  reason?: string
  by?: string
}): Promise<SubscriptionOrder> {
  const admin = createAdminClient()
  const order = await getOrder(args.orderId)
  if (!order) throw new Error('Không tìm thấy đơn')
  if (order.status !== 'pending') {
    throw new Error(`Đơn ở trạng thái "${order.status}", không thể huỷ`)
  }
  const { data, error } = await admin
    .from('subscription_orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: args.reason ?? null,
      confirmed_by: args.by ?? null,
    } as never)
    .eq('id', args.orderId)
    .select('*')
    .single()
  if (error || !data) {
    throw new Error('Lỗi huỷ đơn: ' + (error?.message ?? 'unknown'))
  }
  return data as SubscriptionOrder
}
