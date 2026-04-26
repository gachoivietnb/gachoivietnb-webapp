/* ============================================================
 * Treasury types & constants — CLIENT-SAFE.
 * KHÔNG có 'server-only' — import file này từ client component OK.
 * ============================================================ */

export type AccountType = 'cash' | 'bank' | 'ewallet' | 'other'

export type CashAccount = {
  id: string
  farm_id: string
  name: string
  account_type: AccountType
  bank_name: string | null
  account_number: string | null
  initial_balance: number
  initial_balance_date: string
  is_default: boolean
  is_active: boolean
  display_order: number
  color: string
  icon: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type CashAccountBalance = {
  account_id: string
  farm_id: string
  name: string
  account_type: AccountType
  bank_name: string | null
  account_number: string | null
  is_default: boolean
  is_active: boolean
  display_order: number
  color: string
  icon: string
  initial_balance: number
  total_in: number
  total_out: number
  current_balance: number
  transaction_count: number
  last_transaction_date: string | null
}

export type Direction = 'in' | 'out'

export type TransactionCategory =
  | 'sale'
  | 'purchase'
  | 'expense'
  | 'payroll'
  | 'transfer_in'
  | 'transfer_out'
  | 'transfer_fee'
  | 'opening'
  | 'adjustment'
  | 'capital_in'
  | 'capital_out'
  | 'loan_in'
  | 'loan_out'
  | 'other'

export type RefType =
  | 'sales_order'
  | 'purchase'
  | 'expense'
  | 'payroll_payment'
  | 'cash_transfer'
  | 'manual'

export type CashTransaction = {
  id: string
  farm_id: string
  account_id: string
  direction: Direction
  amount: number
  transaction_date: string
  category: TransactionCategory
  ref_type: RefType | null
  ref_id: string | null
  expense_category_id: string | null
  description: string | null
  reconciled: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CashTransfer = {
  id: string
  farm_id: string
  from_account_id: string
  to_account_id: string
  amount: number
  fee: number
  transfer_date: string
  description: string | null
  out_transaction_id: string | null
  in_transaction_id: string | null
  fee_transaction_id: string | null
  created_by: string | null
  created_at: string
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

export function formatVndSigned(n: number): string {
  if (n > 0) return '+' + formatVnd(n)
  if (n < 0) return '-' + formatVnd(Math.abs(n))
  return formatVnd(0)
}

/* ============================================================
 * Display meta
 * ============================================================ */

export const ACCOUNT_TYPE_META: Record<
  AccountType,
  { label: string; emoji: string; cls: string }
> = {
  cash: {
    label: 'Tiền mặt',
    emoji: '💵',
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  bank: {
    label: 'Ngân hàng',
    emoji: '🏦',
    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
  },
  ewallet: {
    label: 'Ví điện tử',
    emoji: '📱',
    cls: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300',
  },
  other: {
    label: 'Khác',
    emoji: '🔖',
    cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300',
  },
}

export const CATEGORY_META: Record<
  TransactionCategory,
  { label: string; emoji: string; direction: Direction | 'both'; group: string }
> = {
  sale: { label: 'Bán hàng', emoji: '🐓', direction: 'in', group: 'Hoạt động kinh doanh' },
  purchase: { label: 'Mua hàng', emoji: '📥', direction: 'out', group: 'Hoạt động kinh doanh' },
  expense: { label: 'Chi phí', emoji: '🧾', direction: 'out', group: 'Hoạt động kinh doanh' },
  payroll: { label: 'Lương / Thưởng', emoji: '👔', direction: 'out', group: 'Hoạt động kinh doanh' },
  transfer_in: { label: 'Nhận chuyển khoản nội bộ', emoji: '↩️', direction: 'in', group: 'Chuyển khoản' },
  transfer_out: { label: 'Gửi chuyển khoản nội bộ', emoji: '↪️', direction: 'out', group: 'Chuyển khoản' },
  transfer_fee: { label: 'Phí chuyển khoản', emoji: '💸', direction: 'out', group: 'Chuyển khoản' },
  opening: { label: 'Số dư đầu kỳ', emoji: '🔓', direction: 'both', group: 'Khác' },
  adjustment: { label: 'Điều chỉnh đối soát', emoji: '🛠', direction: 'both', group: 'Khác' },
  capital_in: { label: 'Nạp vốn', emoji: '💰', direction: 'in', group: 'Vốn' },
  capital_out: { label: 'Rút vốn', emoji: '🏃', direction: 'out', group: 'Vốn' },
  loan_in: { label: 'Nhận vay', emoji: '🤝', direction: 'in', group: 'Vốn' },
  loan_out: { label: 'Trả nợ vay', emoji: '🏷', direction: 'out', group: 'Vốn' },
  other: { label: 'Khác', emoji: '✏️', direction: 'both', group: 'Khác' },
}

export const DIRECTION_META: Record<Direction, { label: string; emoji: string; cls: string; bar: string }> = {
  in: {
    label: 'Thu',
    emoji: '📥',
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    bar: 'from-emerald-500 to-teal-500',
  },
  out: {
    label: 'Chi',
    emoji: '📤',
    cls: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
    bar: 'from-rose-500 to-red-500',
  },
}

/* ============================================================
 * Quick-pick categories cho UI form (chia theo direction)
 * ============================================================ */

export const QUICK_INCOME_CATEGORIES: Array<{
  value: TransactionCategory
  label: string
  emoji: string
}> = [
  { value: 'sale', label: 'Bán gà', emoji: '🐓' },
  { value: 'capital_in', label: 'Nạp vốn', emoji: '💰' },
  { value: 'loan_in', label: 'Vay tiền', emoji: '🤝' },
  { value: 'other', label: 'Khác', emoji: '✏️' },
]

export const QUICK_EXPENSE_CATEGORIES: Array<{
  value: TransactionCategory
  label: string
  emoji: string
}> = [
  { value: 'purchase', label: 'Mua gà / nhập', emoji: '📥' },
  { value: 'expense', label: 'Chi phí khác', emoji: '🧾' },
  { value: 'payroll', label: 'Trả lương', emoji: '👔' },
  { value: 'capital_out', label: 'Rút vốn', emoji: '🏃' },
  { value: 'loan_out', label: 'Trả nợ', emoji: '🏷' },
  { value: 'other', label: 'Khác', emoji: '✏️' },
]

/* ============================================================
 * Color presets cho account
 * ============================================================ */

export const ACCOUNT_COLOR_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Xanh ngọc', value: 'from-emerald-500 to-teal-500' },
  { label: 'Xanh dương', value: 'from-blue-500 to-indigo-500' },
  { label: 'Cam đỏ', value: 'from-orange-500 to-red-500' },
  { label: 'Tím', value: 'from-violet-500 to-purple-600' },
  { label: 'Hồng', value: 'from-pink-500 to-rose-500' },
  { label: 'Vàng', value: 'from-amber-500 to-orange-500' },
  { label: 'Xanh lá đậm', value: 'from-green-600 to-emerald-700' },
  { label: 'Xám', value: 'from-slate-500 to-gray-600' },
]

export const ACCOUNT_ICON_PRESETS = [
  '💵', '🏦', '📱', '💳', '💰', '🪙', '💴', '💶', '💷',
  '🟢', '🟦', '🟧', '🟪', '🟨', '⭐', '🔖', '📦', '👛',
]
