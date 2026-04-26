#!/usr/bin/env node
/**
 * Seed 12 TSCD + 12 CCDC + ~10 events demo cho default farm.
 * Idempotent: skip nếu farm đã có asset.
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
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq < 0) continue
      const key = t.slice(0, eq).trim()
      const val = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {}
}
loadDotEnv(resolve(__dirname, '..', '.env.local'))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const FARM_ID = '00000000-0000-0000-0000-000000000001'

// Skip if exists
const { count } = await admin
  .from('assets')
  .select('id', { count: 'exact', head: true })
  .eq('farm_id', FARM_ID)
if (count && count > 0) {
  console.log(`ℹ️  Đã có ${count} tài sản — skip seed.`)
  process.exit(0)
}

// Get area + profile to ref
const { data: areas } = await admin.from('areas').select('id, code').eq('farm_id', FARM_ID).limit(5)
const { data: profiles } = await admin
  .from('profiles')
  .select('id, full_name')
  .eq('farm_id', FARM_ID)
  .eq('is_active', true)
  .limit(5)

const a = (i) => areas?.[i % (areas?.length || 1)]?.id ?? null
const p = (i) => profiles?.[i % (profiles?.length || 1)]?.id ?? null

function dateOffset(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

// 12 TSCĐ
const tscd = [
  {
    code: 'TSCD-001', name: 'Máy ấp trứng GreenTech 200',
    category: 'may_ap_no', quantity: 1, unit: 'cái',
    purchase_date: dateOffset(540), purchase_price: 18_500_000,
    supplier_name: 'Công ty GreenTech', invoice_number: 'HD-2024-0156',
    warranty_until: dateOffset(180), useful_life_months: 60,
    salvage_value: 1_500_000, brand: 'GreenTech', model: 'GT-200',
    serial_number: 'GT200-2024-1234', area_id: a(0), responsible_user_id: p(0),
    status: 'dang_dung',
    last_maintenance_date: dateOffset(60), next_maintenance_date: dateOffset(-30),
    maintenance_interval_months: 3, location_note: 'Khu A — phòng ấp 1',
  },
  {
    code: 'TSCD-002', name: 'Máy nở trứng GreenTech 100',
    category: 'may_ap_no', quantity: 1, unit: 'cái',
    purchase_date: dateOffset(540), purchase_price: 9_800_000,
    supplier_name: 'Công ty GreenTech', useful_life_months: 60,
    salvage_value: 800_000, brand: 'GreenTech', model: 'GTN-100',
    area_id: a(0), responsible_user_id: p(0),
    status: 'dang_dung',
    last_maintenance_date: dateOffset(45), next_maintenance_date: dateOffset(45),
    maintenance_interval_months: 3,
  },
  {
    code: 'TSCD-003', name: 'Lò sưởi gas Eco-Heat 2000',
    category: 'lo_suoi', quantity: 4, unit: 'cái',
    purchase_date: dateOffset(420), purchase_price: 6_400_000,
    supplier_name: 'Trại Hùng Cường', useful_life_months: 60,
    brand: 'Eco-Heat', model: 'EH-2000',
    area_id: a(1), responsible_user_id: p(1),
    status: 'dang_dung',
    next_maintenance_date: dateOffset(-7),
    maintenance_interval_months: 6, location_note: 'Phân bổ 4 chuồng úm',
  },
  {
    code: 'TSCD-004', name: 'Máy phát điện Honda EM5000',
    category: 'may_phat_dien', quantity: 1, unit: 'cái',
    purchase_date: dateOffset(720), purchase_price: 28_500_000,
    supplier_name: 'Honda VN', invoice_number: 'HD-2023-0987',
    warranty_until: dateOffset(-360), useful_life_months: 84,
    salvage_value: 3_000_000, brand: 'Honda', model: 'EM5000',
    serial_number: 'EM5000-2023-7788',
    responsible_user_id: p(0), status: 'dang_dung',
    last_maintenance_date: dateOffset(120), next_maintenance_date: dateOffset(60),
    maintenance_interval_months: 6,
  },
  {
    code: 'TSCD-005', name: 'Tủ đông trữ vaccine Sanaky 600L',
    category: 'tu_lanh_thuoc', quantity: 1, unit: 'cái',
    purchase_date: dateOffset(300), purchase_price: 12_500_000,
    supplier_name: 'Sanaky', useful_life_months: 96,
    salvage_value: 1_000_000, brand: 'Sanaky', model: 'SNK-600',
    area_id: a(2), responsible_user_id: p(2),
    status: 'dang_dung',
  },
  {
    code: 'TSCD-006', name: 'Hệ thống camera 8 mắt + đầu ghi',
    category: 'camera', quantity: 1, unit: 'bộ',
    purchase_date: dateOffset(180), purchase_price: 14_500_000,
    supplier_name: 'Camera Hikvision', useful_life_months: 60,
    brand: 'Hikvision', model: 'DS-7208',
    responsible_user_id: p(0), status: 'dang_dung',
    last_maintenance_date: dateOffset(20), maintenance_interval_months: 12,
    next_maintenance_date: dateOffset(-345),
  },
  {
    code: 'TSCD-007', name: 'Hệ thống cấp nước tự động 4 chuồng',
    category: 'he_thong_nuoc', quantity: 1, unit: 'hệ',
    purchase_date: dateOffset(900), purchase_price: 22_000_000,
    useful_life_months: 120, brand: 'Plasson',
    area_id: a(1), status: 'dang_dung',
    notes: 'Bao gồm bồn 1000L + ống dẫn + núm uống',
  },
  {
    code: 'TSCD-008', name: 'Máy nghiền cám CN90',
    category: 'may_moc', quantity: 1, unit: 'cái',
    purchase_date: dateOffset(450), purchase_price: 11_200_000,
    useful_life_months: 84, brand: 'Việt Nhật', model: 'CN-90',
    responsible_user_id: p(1), status: 'cho_sua',
    notes: 'Mô-tơ kêu, đang chờ thay bạc',
  },
  {
    code: 'TSCD-009', name: 'Máy bơm nước Pentax 1.5HP',
    category: 'may_moc', quantity: 1, unit: 'cái',
    purchase_date: dateOffset(150), purchase_price: 3_800_000,
    useful_life_months: 60, brand: 'Pentax',
    status: 'dang_dung',
  },
  {
    code: 'TSCD-010', name: 'Xe máy Honda Wave Alpha (đi giao gà)',
    category: 'phuong_tien', quantity: 1, unit: 'chiếc',
    purchase_date: dateOffset(280), purchase_price: 18_500_000,
    useful_life_months: 84, brand: 'Honda', model: 'Wave Alpha',
    serial_number: '29-AB-12345', responsible_user_id: p(0),
    status: 'dang_dung', salvage_value: 4_000_000,
  },
  {
    code: 'TSCD-011', name: 'Máy tính bàn Dell + máy in HP',
    category: 'thiet_bi_van_phong', quantity: 1, unit: 'bộ',
    purchase_date: dateOffset(600), purchase_price: 14_800_000,
    useful_life_months: 36, salvage_value: 1_000_000,
    brand: 'Dell + HP', responsible_user_id: p(0),
    status: 'dang_dung', notes: 'Dùng văn phòng + in tem QR',
  },
  {
    code: 'TSCD-012', name: 'Máy phun sương khử khuẩn 25L',
    category: 'may_moc', quantity: 1, unit: 'cái',
    purchase_date: dateOffset(180), purchase_price: 4_200_000,
    useful_life_months: 48,
    area_id: a(2), status: 'hong',
    notes: 'Bị tắc đầu phun, cần thay đầu mới',
  },
]

// 12 CCDC
const ccdc = [
  {
    code: 'CCDC-001', name: 'Cân điện tử 30kg',
    category: 'thiet_bi_can_do', quantity: 2, unit: 'cái',
    purchase_date: dateOffset(120), purchase_price: 1_400_000,
    supplier_name: 'Cân Việt Á', useful_life_months: 36,
    brand: 'Việt Á', responsible_user_id: p(0), status: 'dang_dung',
  },
  {
    code: 'CCDC-002', name: 'Cân tay treo 5kg',
    category: 'thiet_bi_can_do', quantity: 5, unit: 'cái',
    purchase_date: dateOffset(60), purchase_price: 850_000,
    useful_life_months: 24, status: 'dang_dung',
  },
  {
    code: 'CCDC-003', name: 'Kéo cắt cánh / cắt mỏ',
    category: 'dung_cu_chan_nuoi', quantity: 8, unit: 'cái',
    purchase_date: dateOffset(90), purchase_price: 480_000,
    useful_life_months: 24, status: 'dang_dung',
    location_note: 'Thùng dụng cụ phòng úm',
  },
  {
    code: 'CCDC-004', name: 'Bộ kẹp QR đeo chân (chì + bấm)',
    category: 'dung_cu_chan_nuoi', quantity: 3, unit: 'bộ',
    purchase_date: dateOffset(180), purchase_price: 1_350_000,
    useful_life_months: 36, status: 'dang_dung',
  },
  {
    code: 'CCDC-005', name: 'Găng tay y tế (hộp 100)',
    category: 'do_bao_ho', quantity: 12, unit: 'hộp',
    purchase_date: dateOffset(30), purchase_price: 1_200_000,
    useful_life_months: 12, status: 'dang_dung',
  },
  {
    code: 'CCDC-006', name: 'Ủng cao su + áo mưa',
    category: 'do_bao_ho', quantity: 6, unit: 'bộ',
    purchase_date: dateOffset(60), purchase_price: 720_000,
    useful_life_months: 12, status: 'dang_dung',
  },
  {
    code: 'CCDC-007', name: 'Ống tiêm + kim tiêm 10ml',
    category: 'dung_cu_thu_y', quantity: 100, unit: 'cái',
    purchase_date: dateOffset(45), purchase_price: 1_500_000,
    useful_life_months: 6, status: 'dang_dung',
  },
  {
    code: 'CCDC-008', name: 'Đèn úm hồng ngoại 250W',
    category: 'thiet_bi_chieu_sang', quantity: 8, unit: 'cái',
    purchase_date: dateOffset(280), purchase_price: 1_120_000,
    useful_life_months: 24, brand: 'Philips',
    area_id: a(0), status: 'dang_dung',
    next_maintenance_date: dateOffset(15), maintenance_interval_months: 6,
  },
  {
    code: 'CCDC-009', name: 'Máy bơm xịt vai 16L',
    category: 'dung_cu_ve_sinh', quantity: 2, unit: 'cái',
    purchase_date: dateOffset(150), purchase_price: 980_000,
    useful_life_months: 36, status: 'dang_dung',
  },
  {
    code: 'CCDC-010', name: 'Xô + chậu + xẻng dọn chuồng',
    category: 'dung_cu_ve_sinh', quantity: 15, unit: 'bộ',
    purchase_date: dateOffset(90), purchase_price: 600_000,
    useful_life_months: 12, status: 'dang_dung',
  },
  {
    code: 'CCDC-011', name: 'Đèn pin LED chiến đấu 3W',
    category: 'thiet_bi_chieu_sang', quantity: 4, unit: 'cái',
    purchase_date: dateOffset(180), purchase_price: 320_000,
    useful_life_months: 24, status: 'dang_dung',
  },
  {
    code: 'CCDC-012', name: 'Bình nước trà cho gà 2L',
    category: 'dung_cu_chan_nuoi', quantity: 30, unit: 'cái',
    purchase_date: dateOffset(240), purchase_price: 540_000,
    useful_life_months: 18, area_id: a(1), status: 'cho_ban',
    notes: 'Đã thay loại tốt hơn — chuẩn bị bán thanh lý',
  },
]

const allAssets = [
  ...tscd.map((x) => ({
    salvage_value: 0, quantity: 1, unit: 'cái', status: 'dang_dung',
    ...x, kind: 'tscd', farm_id: FARM_ID,
  })),
  ...ccdc.map((x) => ({
    salvage_value: 0, quantity: 1, unit: 'cái', status: 'dang_dung',
    ...x, kind: 'ccdc', farm_id: FARM_ID,
  })),
]

console.log(`📥 Seeding ${allAssets.length} tài sản...`)
const { data: insertedAssets, error: aErr } = await admin
  .from('assets')
  .insert(allAssets)
  .select('id, code, name, kind, purchase_price, purchase_date, supplier_name')
if (aErr) {
  console.error('❌ Lỗi insert assets:', aErr.message)
  process.exit(1)
}

// Map code → id
const idByCode = new Map(insertedAssets.map((a) => [a.code, a.id]))

// Events demo
const events = []
// Purchase events đã được auto-tạo bởi createAsset() lib? Không — ta insert trực tiếp DB nên không qua lib.
// Thêm purchase events thủ công cho tất cả assets có purchase_date + price
for (const a of insertedAssets) {
  if (a.purchase_price > 0 && a.purchase_date) {
    events.push({
      farm_id: FARM_ID,
      asset_id: a.id,
      event_type: 'purchase',
      event_date: a.purchase_date,
      cost: a.purchase_price,
      description: `Ghi nhận mua mới · ${a.supplier_name ?? 'Nguồn cung cấp'}`,
      performed_by: profiles?.[0]?.id ?? null,
    })
  }
}

// Maintenance events cho TSCD-001 (máy ấp)
const t001 = idByCode.get('TSCD-001')
if (t001) {
  events.push(
    {
      farm_id: FARM_ID, asset_id: t001, event_type: 'maintenance',
      event_date: dateOffset(150), cost: 200_000,
      description: 'Vệ sinh khay trứng, thay băng tải nhỏ',
      next_due_date: dateOffset(60), performed_by: profiles?.[0]?.id ?? null,
    },
    {
      farm_id: FARM_ID, asset_id: t001, event_type: 'maintenance',
      event_date: dateOffset(60), cost: 150_000,
      description: 'Vệ sinh định kỳ, hiệu chỉnh nhiệt độ',
      next_due_date: dateOffset(-30), performed_by: profiles?.[0]?.id ?? null,
    },
    {
      farm_id: FARM_ID, asset_id: t001, event_type: 'incident',
      event_date: dateOffset(80), cost: 0,
      description: 'Nhiệt độ tăng đột ngột do quạt gió yếu — đã khắc phục, không hỏng trứng',
      performed_by: profiles?.[0]?.id ?? null,
    }
  )
}

// Repair cho TSCD-008 (máy nghiền) đang cho_sua
const t008 = idByCode.get('TSCD-008')
if (t008) {
  events.push({
    farm_id: FARM_ID, asset_id: t008, event_type: 'repair',
    event_date: dateOffset(5), cost: 850_000,
    description: 'Mô-tơ phát ra tiếng kêu lạ, đem ra tiệm thay bạc đạn',
    performed_by: profiles?.[1]?.id ?? null,
  })
}

// Maintenance cho TSCD-004 (máy phát điện)
const t004 = idByCode.get('TSCD-004')
if (t004) {
  events.push({
    farm_id: FARM_ID, asset_id: t004, event_type: 'maintenance',
    event_date: dateOffset(120), cost: 350_000,
    description: 'Thay dầu, lọc gió, vệ sinh bugi',
    next_due_date: dateOffset(60), performed_by: profiles?.[0]?.id ?? null,
  })
}

// Incident cho TSCD-012
const t012 = idByCode.get('TSCD-012')
if (t012) {
  events.push({
    farm_id: FARM_ID, asset_id: t012, event_type: 'incident',
    event_date: dateOffset(15), cost: 0,
    description: 'Đầu phun bị tắc do cặn vôi nước — chưa khắc phục',
    performed_by: profiles?.[0]?.id ?? null,
  })
}

// Inspection (kiểm kê) tổng
events.push({
  farm_id: FARM_ID, asset_id: insertedAssets[0].id, event_type: 'inspection',
  event_date: dateOffset(7), cost: 0,
  description: 'Kiểm kê toàn bộ TSCĐ + CCDC quý — đối chiếu thực tế OK',
  performed_by: profiles?.[0]?.id ?? null,
})

console.log(`📥 Seeding ${events.length} sự kiện...`)
const { error: eErr } = await admin.from('asset_events').insert(events)
if (eErr) {
  console.error('❌ Lỗi insert events:', eErr.message)
  process.exit(1)
}

console.log('')
console.log('═══════════════════════════════════════════')
console.log('✅ ĐÃ SEED ASSETS DEMO')
console.log('═══════════════════════════════════════════')
console.log(`  TSCĐ:      ${tscd.length} mục`)
console.log(`  CCDC:      ${ccdc.length} mục`)
console.log(`  Events:    ${events.length} sự kiện (purchase + maintenance + repair + incident + inspection)`)
const totalValue = allAssets.reduce((s, a) => s + a.purchase_price, 0)
console.log(`  Tổng giá mua:  ${totalValue.toLocaleString('vi-VN')}đ`)
console.log('')
console.log('Vào: http://localhost:3000/admin/tai-san')
console.log('═══════════════════════════════════════════')
