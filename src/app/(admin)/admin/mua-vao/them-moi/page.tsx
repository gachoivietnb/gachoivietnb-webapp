import { createClient } from '@/lib/supabase/server'
import { NewPurchaseForm } from '@/components/admin/purchases/NewPurchaseForm'
import { SupplyPurchaseForm } from '@/components/admin/purchases/SupplyPurchaseForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const revalidate = 0

type Kind = 'ga' | 'thuc_an' | 'thuoc' | 'vat_tu'
const KINDS: Array<{ key: Kind; label: string; hint: string }> = [
  { key: 'ga', label: '🐓 Gà', hint: 'Mỗi con tạo hồ sơ riêng, xếp vào khu cách ly' },
  { key: 'thuc_an', label: '🌾 Thức ăn', hint: 'Nhập cám từ NCC — tự cộng tồn kho' },
  { key: 'thuoc', label: '💊 Thuốc', hint: 'Nhập thuốc thú y — tự cộng tồn kho' },
  { key: 'vat_tu', label: '📦 Vật tư', hint: 'Máng, khay úm, dụng cụ… (không đụng kho)' },
]

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string; kind?: string }>
}) {
  const params = await searchParams
  const kind: Kind = (['ga', 'thuc_an', 'thuoc', 'vat_tu'].includes(params.kind ?? '')
    ? params.kind
    : 'ga') as Kind
  const supplierParam = params.supplier
  const supabase = await createClient()
  const current = KINDS.find((k) => k.key === kind)!

  const suffix = (k: Kind) => `?kind=${k}${supplierParam ? `&supplier=${supplierParam}` : ''}`

  // Suppliers luôn cần
  const suppliersRes = await supabase
    .from('suppliers')
    .select('id, name, phone, supplier_category, code')
    .eq('is_active', true)
    .order('name')
  const suppliers = (suppliersRes.data ?? []) as never

  // Dữ liệu riêng theo loại
  let breeds: never = [] as never
  let stockItems: never = [] as never
  if (kind === 'ga') {
    const breedsRes = await supabase
      .from('breeds')
      .select('id, code, name_vi, tier')
      .eq('is_active', true)
      .order('display_order')
    breeds = (breedsRes.data ?? []) as never
  } else if (kind === 'thuc_an') {
    const r = await supabase
      .from('feeds')
      .select('id, name_vi, unit, current_stock, cost_per_unit')
      .eq('is_active', true)
      .order('name_vi')
    stockItems = (r.data ?? []) as never
  } else if (kind === 'thuoc') {
    const r = await supabase
      .from('medicines')
      .select('id, name_vi, unit, current_stock, cost_per_unit')
      .eq('is_active', true)
      .order('name_vi')
    stockItems = (r.data ?? []) as never
  }

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/admin/mua-vao"
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Mua vào
        </Link>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          📥 Phiếu nhập mới
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{current.hint}</p>
      </div>

      {/* Bộ chọn loại phiếu */}
      <div className="flex flex-wrap gap-2 mb-5">
        {KINDS.map((k) => (
          <Link
            key={k.key}
            href={`/admin/mua-vao/them-moi${suffix(k.key)}`}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold border transition ${
              k.key === kind
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-400'
            }`}
          >
            {k.label}
          </Link>
        ))}
      </div>

      {kind === 'ga' ? (
        <NewPurchaseForm breeds={breeds} suppliers={suppliers} defaultSupplierId={supplierParam} />
      ) : (
        <SupplyPurchaseForm
          kind={kind}
          suppliers={suppliers}
          stockItems={stockItems}
          defaultSupplierId={supplierParam}
        />
      )}
    </div>
  )
}
