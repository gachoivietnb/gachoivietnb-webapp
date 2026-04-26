#!/usr/bin/env node
/**
 * Seed 12 entry nhật ký demo cho default farm.
 * Idempotent: skip nếu đã có entries.
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

const { count } = await admin
  .from('diary_entries')
  .select('id', { count: 'exact', head: true })
  .eq('farm_id', FARM_ID)
if (count && count > 0) {
  console.log(`ℹ️  Đã có ${count} entries — skip seed.`)
  process.exit(0)
}

const { data: profiles } = await admin
  .from('profiles')
  .select('id, full_name, role')
  .eq('farm_id', FARM_ID)
  .eq('is_active', true)
  .limit(5)

const { data: areas } = await admin.from('areas').select('id, code').eq('farm_id', FARM_ID).limit(5)

const owner = profiles?.find((p) => p.role === 'chu_trai') ?? profiles?.[0]
const staff = profiles?.find((p) => p.role !== 'chu_trai') ?? profiles?.[0]
const a = (i) => areas?.[i % (areas?.length || 1)]?.id ?? null

function dayOffset(d) {
  const dt = new Date()
  dt.setDate(dt.getDate() - d)
  return dt.toISOString().slice(0, 10)
}

const entries = [
  {
    title: 'Phát hiện 1 con gà ốm khu A2',
    content:
      'Sáng nay khi cho ăn, phát hiện con QR-0042 ăn ít, lông xơ xác. Đã cách ly sang chuồng cách ly, theo dõi nhiệt độ. Cho uống điện giải + B-complex.',
    category: 'thu_y',
    mood: 'lo_lang',
    tags: ['QR-0042', 'cách ly', 'khu A2'],
    related_area_id: a(0),
    diary_date: dayOffset(0),
    weather: 'Mưa',
    is_pinned: true,
    author_id: staff?.id,
  },
  {
    title: 'Hoàn thành tiêm vaccine ND-IB lứa T4',
    content:
      'Đã tiêm xong 35 con gà mới nở. Quá trình êm, không có con nào phản ứng phụ. Đã ghi vào module Tiêm phòng.',
    category: 'thu_y',
    mood: 'tot',
    tags: ['tiêm phòng', 'vaccine', 'lứa T4'],
    diary_date: dayOffset(1),
    weather: 'Nắng',
    author_id: owner?.id,
  },
  {
    title: 'Khách Bình Định mua 3 con',
    content:
      'Anh Tùng từ Quy Nhơn ra mua 3 con: QR-0021 (Hùng Vương) · QR-0019 (Lan Phượng) · QR-0042 (Hổ Vương). Tổng 8.5tr. Đã chuyển khoản đủ. Khách rất ưng vì có gia phả 5 đời rõ ràng.',
    category: 'kinh_doanh',
    mood: 'rat_tot',
    tags: ['Anh Tùng', 'Bình Định', 'gia phả 5 đời'],
    diary_date: dayOffset(2),
    weather: 'Nắng',
    is_pinned: true,
    author_id: owner?.id,
  },
  {
    title: 'Sửa máy ấp trứng',
    content:
      'Máy ấp GreenTech 200 báo lỗi cảm biến nhiệt. Đã gọi anh Nam thợ điện đến sửa, thay cảm biến mới (giá 350k). Test 24h thấy ổn định, đã đưa lứa trứng mới vào ấp.',
    category: 'cong_viec',
    mood: 'binh_thuong',
    tags: ['sửa máy', 'máy ấp', 'TSCĐ-001'],
    diary_date: dayOffset(3),
    weather: 'Nắng',
    author_id: owner?.id,
  },
  {
    title: 'Vần buổi sáng 8 con',
    content:
      'Vần 8 con trống chiến 30 phút. Hổ Vương (QR-0042) thể lực tốt, đá nhanh. Hùng Vương hơi yếu, cần tăng cường thức ăn nhiều đạm hơn. Mai vần lại buổi chiều.',
    category: 'huan_luyen',
    mood: 'tot',
    tags: ['vần gà', 'Hổ Vương', 'Hùng Vương'],
    diary_date: dayOffset(4),
    weather: 'Có mây',
    author_id: staff?.id,
  },
  {
    title: 'Trộn cám lứa con 2 tuần tuổi',
    content:
      'Trộn 5kg cám gồm: ngô bột 2kg + đậu xanh xay 1kg + cám công nghiệp 21% protein 1.5kg + bột cá 0.5kg. Cho 35 con lứa T4. Theo dõi 2 ngày tới xem ăn có hết không.',
    category: 'cho_an',
    tags: ['trộn cám', 'lứa T4', 'protein 21%'],
    diary_date: dayOffset(5),
    weather: 'Nắng',
    author_id: staff?.id,
  },
  {
    title: 'Vệ sinh tổng quát chuồng B',
    content:
      'Vệ sinh xịt rửa toàn bộ chuồng B (12 ô). Phun thuốc sát trùng Bensus. Để chuồng phơi nắng 1 ngày trước khi đưa gà mới vào. Thay trấu mới.',
    category: 've_sinh',
    mood: 'tot',
    tags: ['vệ sinh', 'sát trùng', 'chuồng B'],
    related_area_id: a(1),
    diary_date: dayOffset(6),
    weather: 'Nắng',
    author_id: staff?.id,
  },
  {
    title: 'Lứa T4 nở thêm 8 con',
    content:
      'Sáng kiểm tra máy nở thấy thêm 8 con đã nở qua đêm. Tổng lứa T4 đã nở 35/40 trứng. Còn 5 trứng vẫn để trong máy thêm 24h. Tỷ lệ nở 87.5% — đạt mục tiêu.',
    category: 'sinh_san',
    mood: 'rat_tot',
    tags: ['lứa T4', 'tỷ lệ nở 87%', 'nở mới'],
    diary_date: dayOffset(8),
    weather: 'Nắng',
    author_id: owner?.id,
  },
  {
    title: 'Mất điện 3 tiếng — chạy máy phát',
    content:
      'Khu vực mất điện từ 13:00-16:00. Đã khởi động máy phát Honda kịp thời nên máy ấp + đèn úm vẫn hoạt động. Không thiệt hại. Tốn 8 lít xăng. Cần dự trữ thêm xăng 20 lít trong kho.',
    category: 'su_co',
    mood: 'lo_lang',
    tags: ['mất điện', 'máy phát', 'TSCĐ-004'],
    diary_date: dayOffset(10),
    weather: 'Mưa',
    is_pinned: true,
    author_id: owner?.id,
  },
  {
    title: 'Quan sát: thời tiết chuyển lạnh',
    content:
      'Mấy hôm nay chuyển lạnh đột ngột (đêm xuống còn 18°C). Đã bật thêm đèn úm cho gà con dưới 3 tuần. Theo dõi sức khỏe đàn — chưa có dấu hiệu bất thường.',
    category: 'quan_sat',
    tags: ['thời tiết', 'lạnh', 'đèn úm'],
    diary_date: dayOffset(12),
    weather: 'Lạnh',
    author_id: owner?.id,
  },
  {
    title: 'Tiếp đoàn khách tham quan',
    content:
      'Đoàn 5 anh em từ Đồng Tháp đến tham quan trại. Show 4 dòng (Nòi, Asil, Mã Lai, Tre). Khách rất ấn tượng với hệ thống QR + gia phả minh bạch. Có 2 anh đặt cọc 5 con trong tháng tới.',
    category: 'kinh_doanh',
    mood: 'rat_tot',
    tags: ['tham quan', 'Đồng Tháp', 'đặt cọc'],
    diary_date: dayOffset(15),
    weather: 'Nắng',
    author_id: owner?.id,
  },
  {
    title: 'Tổng kết tháng',
    content:
      'Tháng này: nở 35 con (lứa T4) · bán 8 con (~25tr) · chết 1 con · cách ly 1 con. Doanh thu tốt hơn tháng trước 18%. Cần tăng cường marketing FB tháng tới để bán hết 12 con đến tuổi.',
    category: 'cong_viec',
    mood: 'tot',
    tags: ['tổng kết tháng', 'doanh thu', 'kế hoạch'],
    diary_date: dayOffset(20),
    weather: 'Nắng',
    is_pinned: true,
    author_id: owner?.id,
  },
]

const rows = entries.map((e) => ({
  is_pinned: false, tags: [], attachments: [],
  ...e,
  farm_id: FARM_ID,
}))

console.log(`📥 Seeding ${rows.length} nhật ký...`)
const { error } = await admin.from('diary_entries').insert(rows)
if (error) {
  console.error('❌ Lỗi:', error.message)
  process.exit(1)
}

console.log('')
console.log('═══════════════════════════════════════════')
console.log('✅ ĐÃ SEED NHẬT KÝ DEMO')
console.log('═══════════════════════════════════════════')
console.log(`  Entries: ${rows.length}`)
console.log(`  Pinned:  ${rows.filter((e) => e.is_pinned).length}`)
console.log(`  Sự cố:   ${rows.filter((e) => e.category === 'su_co').length}`)
console.log('')
console.log('Vào: http://localhost:3000/admin/nhat-ky-cong-viec')
console.log('═══════════════════════════════════════════')
