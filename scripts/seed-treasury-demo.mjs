#!/usr/bin/env node
/**
 * Seed một bộ giao dịch quỹ demo để dashboard + báo cáo dòng tiền
 * có data đẹp ngay khi user vào lần đầu.
 *
 * Idempotent: chỉ seed khi cash_transactions còn trống.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadDotEnv(file) {
  try {
    const raw = readFileSync(file, 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {}
}
loadDotEnv(resolve(__dirname, '..', '.env.local'))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('❌ Thiếu env')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const FARM_ID = '00000000-0000-0000-0000-000000000001'

// Get accounts
const { data: accounts } = await admin
  .from('cash_accounts')
  .select('id, name, account_type')
  .eq('farm_id', FARM_ID)

if (!accounts || accounts.length === 0) {
  console.error('❌ Không tìm thấy cash_accounts. Apply migration 18 trước.')
  process.exit(1)
}

const cashAcc = accounts.find((a) => a.account_type === 'cash')
const bankAcc = accounts.find((a) => a.account_type === 'bank')

if (!cashAcc || !bankAcc) {
  console.error('❌ Không có đủ 2 tài khoản (cash + bank)')
  process.exit(1)
}

// Skip if already has transactions
const { count } = await admin
  .from('cash_transactions')
  .select('id', { count: 'exact', head: true })
  .eq('farm_id', FARM_ID)
if (count && count > 0) {
  console.log(`ℹ️  Đã có ${count} giao dịch — skip seed.`)
  process.exit(0)
}

// Get expense_category cho 'thuoc' / 'thuc_an' / 'dien_nuoc' / 'luong'
const { data: cats } = await admin
  .from('expense_categories')
  .select('id, code, name_vi')
  .eq('farm_id', FARM_ID)
const catMap = new Map((cats ?? []).map((c) => [c.code, c.id]))

const today = new Date()
function dayOffset(n) {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// 1) Opening balance — 30 ngày trước
const seedTxs = [
  {
    account_id: cashAcc.id,
    direction: 'in',
    amount: 5_000_000,
    transaction_date: dayOffset(35),
    category: 'opening',
    ref_type: 'manual',
    description: 'Số dư ban đầu — két tiền mặt',
  },
  {
    account_id: bankAcc.id,
    direction: 'in',
    amount: 50_000_000,
    transaction_date: dayOffset(35),
    category: 'opening',
    ref_type: 'manual',
    description: 'Số dư ban đầu — Vietcombank',
  },

  // 2) Sales (in) — vài đợt bán gà
  { account_id: cashAcc.id, direction: 'in', amount: 1_500_000, transaction_date: dayOffset(28), category: 'sale', description: 'Bán 1 gà chọi tre cao cấp' },
  { account_id: bankAcc.id, direction: 'in', amount: 4_500_000, transaction_date: dayOffset(25), category: 'sale', description: 'Bán 3 gà nòi (chuyển khoản)' },
  { account_id: cashAcc.id, direction: 'in', amount: 800_000, transaction_date: dayOffset(22), category: 'sale', description: 'Bán 1 gà mái đẻ' },
  { account_id: bankAcc.id, direction: 'in', amount: 6_000_000, transaction_date: dayOffset(18), category: 'sale', description: 'Bán 2 gà chọi xuất khẩu' },
  { account_id: cashAcc.id, direction: 'in', amount: 2_200_000, transaction_date: dayOffset(15), category: 'sale', description: 'Bán 2 gà tre' },
  { account_id: bankAcc.id, direction: 'in', amount: 3_500_000, transaction_date: dayOffset(12), category: 'sale', description: 'Bán gà giống' },
  { account_id: cashAcc.id, direction: 'in', amount: 1_800_000, transaction_date: dayOffset(8), category: 'sale', description: 'Bán 1 gà nòi đỏ' },
  { account_id: bankAcc.id, direction: 'in', amount: 5_500_000, transaction_date: dayOffset(5), category: 'sale', description: 'Khách miền Tây — chuyển khoản' },
  { account_id: cashAcc.id, direction: 'in', amount: 1_200_000, transaction_date: dayOffset(2), category: 'sale', description: 'Bán gà mái đẻ' },
  { account_id: bankAcc.id, direction: 'in', amount: 7_500_000, transaction_date: dayOffset(1), category: 'sale', description: 'Bán 2 gà chọi giải' },

  // 3) Expenses (out) — chi phí thường xuyên
  { account_id: cashAcc.id, direction: 'out', amount: 320_000, transaction_date: dayOffset(28), category: 'expense', expense_category_id: catMap.get('thuc_an') ?? null, description: 'Mua cám gà' },
  { account_id: cashAcc.id, direction: 'out', amount: 180_000, transaction_date: dayOffset(26), category: 'expense', expense_category_id: catMap.get('thuoc') ?? null, description: 'Vaccine Newcastle' },
  { account_id: bankAcc.id, direction: 'out', amount: 850_000, transaction_date: dayOffset(24), category: 'expense', expense_category_id: catMap.get('dien_nuoc') ?? null, description: 'Tiền điện T9' },
  { account_id: cashAcc.id, direction: 'out', amount: 250_000, transaction_date: dayOffset(20), category: 'expense', expense_category_id: catMap.get('thuc_an') ?? null, description: 'Bổ sung thóc' },
  { account_id: cashAcc.id, direction: 'out', amount: 450_000, transaction_date: dayOffset(17), category: 'expense', expense_category_id: catMap.get('thuoc') ?? null, description: 'Thuốc tăng đề kháng' },
  { account_id: bankAcc.id, direction: 'out', amount: 1_200_000, transaction_date: dayOffset(14), category: 'expense', expense_category_id: catMap.get('sua_chua') ?? null, description: 'Sửa chuồng A2' },
  { account_id: cashAcc.id, direction: 'out', amount: 380_000, transaction_date: dayOffset(11), category: 'expense', expense_category_id: catMap.get('thuc_an') ?? null, description: 'Mua cám' },
  { account_id: cashAcc.id, direction: 'out', amount: 220_000, transaction_date: dayOffset(7), category: 'expense', expense_category_id: catMap.get('thuoc') ?? null, description: 'Thuốc tẩy giun' },
  { account_id: bankAcc.id, direction: 'out', amount: 950_000, transaction_date: dayOffset(4), category: 'expense', expense_category_id: catMap.get('dien_nuoc') ?? null, description: 'Tiền nước + điện T10' },
  { account_id: cashAcc.id, direction: 'out', amount: 150_000, transaction_date: dayOffset(2), category: 'expense', description: 'Vận chuyển khách miền Tây' },

  // 4) Purchase (out) — mua gà bố mẹ
  { account_id: bankAcc.id, direction: 'out', amount: 8_500_000, transaction_date: dayOffset(20), category: 'purchase', description: 'Mua gà bố mẹ Bình Định (3 con)' },
  { account_id: cashAcc.id, direction: 'out', amount: 2_500_000, transaction_date: dayOffset(10), category: 'purchase', description: 'Mua 1 gà nòi giống' },

  // 5) Payroll (out)
  { account_id: bankAcc.id, direction: 'out', amount: 6_500_000, transaction_date: dayOffset(15), category: 'payroll', expense_category_id: catMap.get('luong') ?? null, description: 'Lương T9 — Anh Tuấn' },
  { account_id: cashAcc.id, direction: 'out', amount: 4_000_000, transaction_date: dayOffset(15), category: 'payroll', expense_category_id: catMap.get('luong') ?? null, description: 'Lương T9 — Em Lan' },

  // 6) Transfer demo: rút từ bank về cash
  { account_id: bankAcc.id, direction: 'out', amount: 5_000_000, transaction_date: dayOffset(13), category: 'transfer_out', ref_type: 'cash_transfer', description: 'Rút tiền từ VCB về két' },
  { account_id: cashAcc.id, direction: 'in', amount: 5_000_000, transaction_date: dayOffset(13), category: 'transfer_in', ref_type: 'cash_transfer', description: 'Nhận từ VCB' },

  // 7) Capital_in
  { account_id: bankAcc.id, direction: 'in', amount: 20_000_000, transaction_date: dayOffset(30), category: 'capital_in', description: 'Góp vốn mở rộng quỹ giống' },
]

console.log(`📥 Seeding ${seedTxs.length} giao dịch demo...`)

const { error } = await admin
  .from('cash_transactions')
  .insert(seedTxs.map((t) => ({ ...t, farm_id: FARM_ID })))

if (error) {
  console.error('❌ Lỗi:', error.message)
  process.exit(1)
}

// Verify
const { data: balances } = await admin
  .from('cash_account_balances')
  .select('name, current_balance, total_in, total_out, transaction_count')
  .eq('farm_id', FARM_ID)
  .order('display_order')

console.log('')
console.log('═══════════════════════════════════════════')
console.log('✅ ĐÃ SEED DEMO TREASURY')
console.log('═══════════════════════════════════════════')
for (const b of balances ?? []) {
  console.log(
    `${b.name.padEnd(18)} balance: ${b.current_balance.toLocaleString('vi-VN').padStart(14)}đ` +
    `   (${b.transaction_count} giao dịch · +${b.total_in.toLocaleString('vi-VN')} / -${b.total_out.toLocaleString('vi-VN')})`
  )
}
console.log('═══════════════════════════════════════════')
console.log('Login: admin@gachoivietnb.com / SuperAdmin@2026')
console.log('Vào: http://localhost:3000/admin/tai-chinh/quy')
console.log('═══════════════════════════════════════════')
