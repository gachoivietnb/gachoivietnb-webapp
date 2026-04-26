import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { MuaVaoIndexClient, type PurchaseRow } from '@/components/admin/purchases/MuaVaoIndexClient'

export default async function MuaVaoPage() {
  const supabase = await createClient()
  const { data: rawPurchases } = await supabase
    .from('purchases')
    .select(
      `
      id, purchase_code, purchase_date, total_quantity, total_amount, notes,
      supplier:suppliers (id, name, phone),
      items:purchase_items (
        unit_price,
        chicken:chickens (
          chicken_code, name,
          breed:breeds(code, name_vi)
        )
      )
      `
    )
    .order('purchase_date', { ascending: false })
    .limit(500)

  type Raw = {
    id: string
    purchase_code: string
    purchase_date: string
    total_quantity: number
    total_amount: number
    notes: string | null
    supplier: { id: string; name: string; phone: string | null } | null
    items: Array<{
      unit_price: number
      chicken: {
        chicken_code: string
        name: string | null
        breed: { code: string | null; name_vi: string } | null
      } | null
    }>
  }

  const rawList = (rawPurchases ?? []) as Raw[]

  const purchases: PurchaseRow[] = rawList.map((p) => {
    const breeds = new Set<string>()
    const breedNames = new Set<string>()
    for (const it of p.items) {
      if (it.chicken?.breed?.code) breeds.add(it.chicken.breed.code)
      if (it.chicken?.breed?.name_vi) breedNames.add(it.chicken.breed.name_vi)
    }
    const avgPrice = p.total_quantity > 0 ? p.total_amount / p.total_quantity : 0
    return {
      id: p.id,
      purchase_code: p.purchase_code,
      purchase_date: p.purchase_date,
      total_quantity: p.total_quantity,
      total_amount: Number(p.total_amount),
      avg_price: avgPrice,
      notes: p.notes,
      supplier_id: p.supplier?.id ?? null,
      supplier_name: p.supplier?.name ?? null,
      supplier_phone: p.supplier?.phone ?? null,
      breed_codes: [...breeds],
      breed_names: [...breedNames],
      item_count: p.items.length,
      chicken_codes: p.items.map((it) => it.chicken?.chicken_code ?? '').filter(Boolean),
      chicken_names: p.items.map((it) => it.chicken?.name ?? '').filter(Boolean),
    }
  })

  // Distinct suppliers + breeds for filter
  const supplierMap = new Map<string, string>()
  for (const p of purchases) {
    if (p.supplier_id && p.supplier_name) supplierMap.set(p.supplier_id, p.supplier_name)
  }
  const breedMap = new Map<string, string>()
  for (const p of purchases) {
    p.breed_codes.forEach((c, i) => {
      const name = p.breed_names[i] ?? c
      breedMap.set(c, name)
    })
  }

  const suppliers = [...supplierMap.entries()].map(([id, name]) => ({ id, name }))
  const breeds = [...breedMap.entries()].map(([code, name]) => ({ code, name }))

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5 gap-3">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            📥 Mua vào
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý phiếu nhập gà · Lọc thông minh · Theo dõi NCC, giống, chi phí
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/mua-vao/bao-cao"
            className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-lg text-sm font-medium"
          >
            📊 Báo cáo
          </Link>
          <Link
            href="/admin/mua-vao/them-moi"
            className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nhập gà mới
          </Link>
        </div>
      </div>

      <MuaVaoIndexClient purchases={purchases} suppliers={suppliers} breeds={breeds} />
    </div>
  )
}
