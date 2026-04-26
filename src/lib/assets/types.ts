/* ============================================================
 * Assets types & meta — CLIENT-SAFE.
 * ============================================================ */

export type AssetKind = 'tscd' | 'ccdc'

export type AssetStatus =
  | 'dang_dung'
  | 'cho_sua'
  | 'hong'
  | 'cho_ban'
  | 'da_thanh_ly'

export type AssetEventType =
  | 'purchase'
  | 'maintenance'
  | 'repair'
  | 'incident'
  | 'transfer'
  | 'status_change'
  | 'inspection'
  | 'liquidation'
  | 'note'

export type Asset = {
  id: string
  farm_id: string
  kind: AssetKind
  code: string
  name: string
  category: string | null
  quantity: number
  unit: string
  area_id: string | null
  responsible_user_id: string | null
  location_note: string | null
  purchase_date: string | null
  purchase_price: number
  supplier_name: string | null
  invoice_number: string | null
  warranty_until: string | null
  useful_life_months: number | null
  salvage_value: number
  brand: string | null
  model: string | null
  serial_number: string | null
  image_url: string | null
  status: AssetStatus
  last_maintenance_date: string | null
  next_maintenance_date: string | null
  maintenance_interval_months: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type AssetWithValue = Asset & {
  months_used: number
  current_value: number
  accumulated_depreciation: number
  responsible_name: string | null
  area_code: string | null
  area_name: string | null
  maintenance_status: 'ok' | 'due_soon' | 'overdue' | null
}

export type AssetEvent = {
  id: string
  farm_id: string
  asset_id: string
  event_type: AssetEventType
  event_date: string
  cost: number
  description: string | null
  next_due_date: string | null
  performed_by: string | null
  created_at: string
}

/* ============================================================
 * Meta — labels, colors, emojis
 * ============================================================ */

export const KIND_META: Record<
  AssetKind,
  { label: string; emoji: string; cls: string; bar: string; description: string }
> = {
  tscd: {
    label: 'TSCĐ',
    emoji: '🏭',
    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    bar: 'from-blue-500 to-indigo-600',
    description: 'Tài sản cố định — máy móc, công trình giá trị lớn, có khấu hao',
  },
  ccdc: {
    label: 'CCDC',
    emoji: '🛠',
    cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    bar: 'from-amber-500 to-orange-600',
    description: 'Công cụ dụng cụ — đồ dùng nhỏ, hao mòn nhanh',
  },
}

export const STATUS_META: Record<
  AssetStatus,
  { label: string; emoji: string; cls: string }
> = {
  dang_dung: {
    label: 'Đang dùng',
    emoji: '✅',
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  cho_sua: {
    label: 'Đang sửa',
    emoji: '🔧',
    cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  },
  hong: {
    label: 'Hỏng',
    emoji: '❌',
    cls: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
  },
  cho_ban: {
    label: 'Chờ thanh lý',
    emoji: '🏷',
    cls: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300',
  },
  da_thanh_ly: {
    label: 'Đã thanh lý',
    emoji: '⚫',
    cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300',
  },
}

export const EVENT_TYPE_META: Record<
  AssetEventType,
  { label: string; emoji: string; tone: string }
> = {
  purchase: { label: 'Mua mới', emoji: '🛒', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  maintenance: { label: 'Bảo trì định kỳ', emoji: '🔧', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  repair: { label: 'Sửa chữa', emoji: '🛠', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  incident: { label: 'Sự cố', emoji: '⚠️', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  transfer: { label: 'Chuyển vị trí', emoji: '🔄', tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  status_change: { label: 'Đổi trạng thái', emoji: '🔁', tone: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300' },
  inspection: { label: 'Kiểm kê', emoji: '🔍', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  liquidation: { label: 'Thanh lý', emoji: '🏷', tone: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300' },
  note: { label: 'Ghi chú', emoji: '📝', tone: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300' },
}

/* ============================================================
 * Categories — phân loại nhỏ trong từng kind
 * ============================================================ */

export type CategoryDef = {
  key: string
  label: string
  emoji: string
  kinds: AssetKind[]
  defaultLifeMonths?: number  // gợi ý khấu hao
}

export const ASSET_CATEGORIES: CategoryDef[] = [
  // TSCĐ
  { key: 'may_ap_no', label: 'Máy ấp / nở trứng', emoji: '🥚', kinds: ['tscd'], defaultLifeMonths: 60 },
  { key: 'lo_suoi', label: 'Lò sưởi / úm', emoji: '🔥', kinds: ['tscd'], defaultLifeMonths: 60 },
  { key: 'may_phat_dien', label: 'Máy phát điện', emoji: '⚡', kinds: ['tscd'], defaultLifeMonths: 84 },
  { key: 'tu_lanh_thuoc', label: 'Tủ lạnh / tủ đông', emoji: '🧊', kinds: ['tscd'], defaultLifeMonths: 96 },
  { key: 'camera', label: 'Camera / giám sát', emoji: '📹', kinds: ['tscd'], defaultLifeMonths: 60 },
  { key: 'he_thong_nuoc', label: 'Hệ thống cấp nước', emoji: '🚿', kinds: ['tscd'], defaultLifeMonths: 120 },
  { key: 'cong_trinh', label: 'Công trình xây dựng', emoji: '🏗', kinds: ['tscd'], defaultLifeMonths: 240 },
  { key: 'phuong_tien', label: 'Phương tiện vận tải', emoji: '🚚', kinds: ['tscd'], defaultLifeMonths: 84 },
  { key: 'thiet_bi_van_phong', label: 'Thiết bị văn phòng', emoji: '🖥', kinds: ['tscd', 'ccdc'], defaultLifeMonths: 36 },
  // CCDC
  { key: 'dung_cu_chan_nuoi', label: 'Dụng cụ chăn nuôi', emoji: '🐔', kinds: ['ccdc'], defaultLifeMonths: 24 },
  { key: 'do_bao_ho', label: 'Đồ bảo hộ', emoji: '🥽', kinds: ['ccdc'], defaultLifeMonths: 12 },
  { key: 'dung_cu_thu_y', label: 'Dụng cụ thú y', emoji: '💉', kinds: ['ccdc'], defaultLifeMonths: 24 },
  { key: 'dung_cu_ve_sinh', label: 'Dụng cụ vệ sinh', emoji: '🧽', kinds: ['ccdc'], defaultLifeMonths: 12 },
  { key: 'thiet_bi_can_do', label: 'Thiết bị cân đo', emoji: '⚖️', kinds: ['ccdc'], defaultLifeMonths: 36 },
  { key: 'thiet_bi_chieu_sang', label: 'Đèn / chiếu sáng', emoji: '💡', kinds: ['ccdc'], defaultLifeMonths: 24 },
  { key: 'khac', label: 'Khác', emoji: '📦', kinds: ['tscd', 'ccdc'] },
]

export function categoryMeta(key: string | null | undefined): CategoryDef {
  if (!key) return ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1]
  return ASSET_CATEGORIES.find((c) => c.key === key) ?? ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1]
}

/* ============================================================
 * Format helpers
 * ============================================================ */

export function formatVnd(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ'
}

export function formatVndShort(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'tỷ'
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'tr'
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return n.toLocaleString('vi-VN')
}

export function depreciationPct(months_used: number, useful_life_months: number | null): number {
  if (!useful_life_months || useful_life_months === 0) return 0
  return Math.min(100, Math.round((months_used / useful_life_months) * 100))
}
