export type SupplierCategory = 'ga' | 'thuoc_thu_y' | 'thuc_an' | 'vat_lieu' | 'thiet_bi' | 'dich_vu' | 'khac'

export const CATEGORY_META: Record<SupplierCategory, {
  label: string
  emoji: string
  desc: string
  gradient: string
  borderCls: string
  textCls: string
}> = {
  ga:          { label: 'Gà giống / thịt',  emoji: '🐓', desc: 'Cung cấp gà bố mẹ, gà giống, gà thịt', gradient: 'from-amber-400 to-orange-500',  borderCls: 'border-amber-300',  textCls: 'text-amber-700' },
  thuoc_thu_y: { label: 'Thuốc thú y',      emoji: '💊', desc: 'Vaccine, thuốc, dụng cụ thú y',         gradient: 'from-rose-400 to-pink-500',     borderCls: 'border-rose-300',   textCls: 'text-rose-700' },
  thuc_an:     { label: 'Thức ăn',          emoji: '🌾', desc: 'Cám, ngô, premix, rau xanh',           gradient: 'from-emerald-400 to-green-500', borderCls: 'border-emerald-300',textCls: 'text-emerald-700' },
  vat_lieu:    { label: 'Vật liệu',         emoji: '🧱', desc: 'Lưới, gỗ, tôn, vật tư xây chuồng',     gradient: 'from-stone-400 to-amber-600',   borderCls: 'border-stone-300',  textCls: 'text-stone-700' },
  thiet_bi:    { label: 'Thiết bị',         emoji: '⚙️', desc: 'Máy ấp, đèn sưởi, máng ăn',           gradient: 'from-slate-400 to-blue-500',    borderCls: 'border-slate-300',  textCls: 'text-slate-700' },
  dich_vu:     { label: 'Dịch vụ',          emoji: '🛠', desc: 'Vận chuyển, thú y, tư vấn',            gradient: 'from-violet-400 to-fuchsia-500',borderCls: 'border-violet-300', textCls: 'text-violet-700' },
  khac:        { label: 'Khác',             emoji: '📦', desc: 'NCC khác',                              gradient: 'from-gray-400 to-gray-500',     borderCls: 'border-gray-300',   textCls: 'text-gray-700' },
}

export type SupplierStat = {
  id: string
  code: string
  name: string
  supplier_category: SupplierCategory | null
  contact_person: string | null
  phone: string | null
  zalo: string | null
  email: string | null
  address: string | null
  province: string | null
  tax_code: string | null
  products_summary: string | null
  payment_terms: string | null
  credit_limit: number
  rating: number | null
  tags: string[]
  avatar_url: string | null
  is_active: boolean
  notes: string | null
  total_orders: number
  total_amount: number
  last_order_date: string | null
  avg_order_amount: number
  orders_30d: number
  orders_ytd: number
  created_at: string
  updated_at: string
}
