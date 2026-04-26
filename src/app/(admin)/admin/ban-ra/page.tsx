import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BanRaIndexClient, type OrderRow } from '@/components/admin/sales/BanRaIndexClient'

export const revalidate = 0

export default async function BanRaListPage() {
  const supabase = await createClient()

  const { data: rawOrders } = await supabase
    .from('sales_orders')
    .select(
      `
      id, order_code, order_date, status, total_amount, deposit_amount, paid_amount,
      delivered_date, payment_method, notes,
      customer:customers (id, name, phone, tier),
      items:sales_items (
        unit_price,
        chicken:chickens (
          chicken_code, name,
          breed:breeds(code, name_vi)
        )
      )
      `
    )
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500)

  type Raw = {
    id: string
    order_code: string
    order_date: string
    status: string
    total_amount: number
    deposit_amount: number | null
    paid_amount: number | null
    delivered_date: string | null
    payment_method: string | null
    notes: string | null
    customer: { id: string; name: string; phone: string | null; tier: string | null } | null
    items: Array<{
      unit_price: number
      chicken: {
        chicken_code: string
        name: string | null
        breed: { code: string | null; name_vi: string } | null
      } | null
    }>
  }

  const rawList = (rawOrders ?? []) as Raw[]

  const orders: OrderRow[] = rawList.map((o) => {
    const breeds = new Set<string>()
    const breedNames = new Set<string>()
    for (const it of o.items) {
      if (it.chicken?.breed?.code) breeds.add(it.chicken.breed.code)
      if (it.chicken?.breed?.name_vi) breedNames.add(it.chicken.breed.name_vi)
    }
    const total = Number(o.total_amount)
    const paid = Number(o.paid_amount ?? 0)
    const deposit = Number(o.deposit_amount ?? 0)
    const remaining = Math.max(0, total - paid)
    return {
      id: o.id,
      order_code: o.order_code,
      order_date: o.order_date,
      status: o.status,
      total_amount: total,
      paid_amount: paid,
      deposit_amount: deposit,
      remaining,
      delivered_date: o.delivered_date,
      payment_method: o.payment_method,
      notes: o.notes,
      customer_id: o.customer?.id ?? null,
      customer_name: o.customer?.name ?? null,
      customer_phone: o.customer?.phone ?? null,
      customer_tier: o.customer?.tier ?? null,
      breed_codes: [...breeds],
      breed_names: [...breedNames],
      item_count: o.items.length,
      chicken_codes: o.items.map((it) => it.chicken?.chicken_code ?? '').filter(Boolean),
      chicken_names: o.items.map((it) => it.chicken?.name ?? '').filter(Boolean),
    }
  })

  // Distinct customers + breeds
  const customerMap = new Map<string, { id: string; name: string; tier: string | null }>()
  for (const o of orders) {
    if (o.customer_id && o.customer_name) {
      customerMap.set(o.customer_id, { id: o.customer_id, name: o.customer_name, tier: o.customer_tier })
    }
  }
  const breedMap = new Map<string, string>()
  for (const o of orders) {
    o.breed_codes.forEach((c, i) => {
      const name = o.breed_names[i] ?? c
      breedMap.set(c, name)
    })
  }

  const customers = [...customerMap.values()]
  const breeds = [...breedMap.entries()].map(([code, name]) => ({ code, name }))

  return (
    <div>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            💵 Bán ra
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý đơn bán · Theo dõi cọc / công nợ · Lọc theo khách, giống, trạng thái
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/ban-ra/bao-cao"
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-4 py-2 text-sm font-medium"
          >
            📊 Báo cáo
          </Link>
          <Link
            href="/admin/ban-ra/them-moi"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            + Tạo đơn mới
          </Link>
        </div>
      </div>

      <BanRaIndexClient orders={orders} customers={customers} breeds={breeds} />
    </div>
  )
}
