#!/usr/bin/env node
/**
 * Seed demo data lên Supabase Cloud cho default farm.
 * Chạy: node scripts/seed-cloud-demo.mjs
 *
 * Yêu cầu env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const FARM_ID = '00000000-0000-0000-0000-000000000001'
const OWNER_ID = 'c7678bc4-7ed3-4caf-ba31-74161673abbc'

function dayOffset(d) {
  const dt = new Date()
  dt.setDate(dt.getDate() - d)
  return dt.toISOString().slice(0, 10)
}

async function main() {
  console.log('🌱 Seeding cloud demo data...')

  const { data: areas } = await sb
    .from('areas')
    .select('id, code')
    .eq('farm_id', FARM_ID)
    .order('display_order')
  const { data: breeds } = await sb.from('breeds').select('id, code').limit(20)
  console.log(`✓ Found ${areas?.length ?? 0} areas, ${breeds?.length ?? 0} breeds`)

  // ===== 1. CAGE_ROWS — 1 row per area =====
  let { data: cageRows } = await sb
    .from('cage_rows')
    .select('id, area_id, code')
    .eq('farm_id', FARM_ID)
  if (!cageRows?.length) {
    const rows = (areas ?? []).map((a) => ({
      farm_id: FARM_ID,
      area_id: a.id,
      code: '01',
      name_vi: `Hàng 01 - Khu ${a.code}`,
      is_active: true,
    }))
    const { data, error } = await sb.from('cage_rows').insert(rows).select()
    if (error) {
      console.error('cage_rows:', error.message)
      return
    }
    cageRows = data
    console.log(`✓ Created ${data.length} cage_rows`)
  } else {
    console.log(`✓ Skip cage_rows (${cageRows.length} exist)`)
  }

  // ===== 2. CAGES — 6 cages per row =====
  let { data: cages, count: cageCount } = await sb
    .from('cages')
    .select('id, code, row_id', { count: 'exact' })
    .eq('farm_id', FARM_ID)
  if (!cageCount) {
    const newCages = []
    for (const cr of cageRows) {
      for (let i = 1; i <= 6; i++) {
        newCages.push({
          farm_id: FARM_ID,
          row_id: cr.id,
          code: String(i).padStart(2, '0'),
          full_code: `${areas.find((a) => a.id === cr.area_id)?.code}-${cr.code}-${String(i).padStart(2, '0')}`,
          capacity: 1,
          status: 'trong',
        })
      }
    }
    const { data, error } = await sb.from('cages').insert(newCages).select()
    if (error) {
      console.error('cages:', error.message)
      return
    }
    cages = data
    console.log(`✓ Created ${data.length} cages`)
  } else {
    console.log(`✓ Skip cages (${cageCount} exist)`)
  }

  // ===== 3. CHICKENS =====
  const { count: chickenCount } = await sb
    .from('chickens')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', FARM_ID)
  if (!chickenCount) {
    const { data: tags } = await sb
      .from('qr_tags')
      .select('id, tag_number')
      .eq('farm_id', FARM_ID)
      .is('chicken_id', null)
      .order('tag_number')
      .limit(30)
    const NAMES = [
      'Hắc Long', 'Bạch Hổ', 'Kim Kê', 'Phong Vân', 'Vô Địch',
      'Sấm Sét', 'Ngọc Long', 'Phượng Hoàng', 'Thiên Lôi', 'Bão Tố',
      'Chiến Thần', 'Hoả Long', 'Thanh Long', 'Tướng Quân', 'Đại Bàng',
      'Thần Kê', 'Vạn Thắng', 'Bá Vương', 'Hồng Hà', 'Lôi Kim',
      'Mãnh Hổ', 'Thiết Kê', 'Phi Long', 'Hắc Phụng', 'Tử Vi',
      'Hỏa Phụng', 'Kim Long', 'Bạch Phụng', 'Thanh Vân', 'Vũ Long',
    ]
    const colors = ['đen', 'điều', 'xám', 'tía', 'ô', 'nhạn', 'xanh']
    const today = new Date()
    const rows = []
    for (let i = 0; i < Math.min(30, tags?.length ?? 0); i++) {
      const isMale = Math.random() > 0.4
      const ageMonths = Math.floor(Math.random() * 18) + 3
      const birth = new Date(today)
      birth.setMonth(birth.getMonth() - ageMonths)
      const breed = breeds[Math.floor(Math.random() * breeds.length)]
      const cage = cages[i % cages.length]
      const num = String(tags[i].tag_number).padStart(4, '0')
      rows.push({
        farm_id: FARM_ID,
        chicken_code: `GA${num}`,
        name: NAMES[i] ?? `Chiến Kê #${i + 1}`,
        breed_id: breed.id,
        qr_tag_id: tags[i].id,
        cage_id: cage.id,
        gender: isMale ? 'trong' : 'mai',
        birth_date: birth.toISOString().slice(0, 10),
        source: 'no_tai_trai',
        weight_kg: isMale ? 2.8 + Math.random() * 0.6 : 2.2 + Math.random() * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        status: 'dang_nuoi',
        created_by: OWNER_ID,
      })
    }
    const { data, error } = await sb.from('chickens').insert(rows).select('id, qr_tag_id, cage_id')
    if (error) {
      console.error('chickens:', error.message)
    } else {
      console.log(`✓ Created ${data.length} chickens`)
      for (const c of data) {
        await sb
          .from('qr_tags')
          .update({ chicken_id: c.id, status: 'used', assigned_at: new Date().toISOString() })
          .eq('id', c.qr_tag_id)
      }
      console.log(`✓ Marked ${data.length} qr_tags as used`)
    }
  } else {
    console.log(`✓ Skip chickens (${chickenCount} exist)`)
  }

  // ===== 4. CUSTOMERS =====
  const { count: custCount } = await sb
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', FARM_ID)
  if (!custCount) {
    const customers = [
      { name: 'Anh Nam', phone: '0912345678', zalo: '0912345678', address: 'Bình Định', tier: 'vip' },
      { name: 'Cô Lan', phone: '0987654321', zalo: '0987654321', address: 'Đồng Tháp', tier: 'thuong' },
      { name: 'Chú Hùng', phone: '0901112233', zalo: '0901112233', address: 'Tây Ninh', tier: 'thuong' },
      { name: 'Anh Tuấn', phone: '0978889999', zalo: '0978889999', address: 'Long An', tier: 'vip' },
      { name: 'Chị Mai', phone: '0945678901', zalo: '0945678901', address: 'Cần Thơ', tier: 'thuong' },
    ].map((c) => ({ ...c, farm_id: FARM_ID }))
    const { error } = await sb.from('customers').insert(customers)
    if (error) console.error('customers:', error.message)
    else console.log(`✓ Created ${customers.length} customers`)
  } else {
    console.log(`✓ Skip customers (${custCount} exist)`)
  }

  // ===== 5. EXPENSES =====
  const { count: expCount } = await sb
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', FARM_ID)
  if (!expCount) {
    const { data: cats } = await sb
      .from('expense_categories')
      .select('id, code')
      .eq('farm_id', FARM_ID)
    const catByCode = Object.fromEntries(cats.map((c) => [c.code, c.id]))
    const expenses = [
      { d: 1, code: 'thuc_an', amount: 2500000, desc: 'Mua cám gà 50kg' },
      { d: 3, code: 'thuoc_thu_y', amount: 850000, desc: 'Mua thuốc phòng bệnh' },
      { d: 5, code: 'dien_nuoc', amount: 320000, desc: 'Tiền điện tháng' },
      { d: 7, code: 'thuc_an', amount: 2700000, desc: 'Mua cám đợt 2' },
      { d: 10, code: 'dien_nuoc', amount: 180000, desc: 'Tiền nước' },
      { d: 14, code: 'nhan_cong', amount: 5000000, desc: 'Lương nhân viên' },
      { d: 18, code: 'du_phong', amount: 450000, desc: 'Sửa chuồng' },
      { d: 22, code: 'thuoc_thu_y', amount: 620000, desc: 'Vitamin tổng hợp' },
      { d: 25, code: 'marketing', amount: 800000, desc: 'Quảng cáo Zalo' },
      { d: 28, code: 'van_chuyen', amount: 350000, desc: 'Ship gà cho khách Bình Định' },
    ]
    const rows = expenses.map((e) => ({
      farm_id: FARM_ID,
      expense_date: dayOffset(e.d),
      category_id: catByCode[e.code],
      amount: e.amount,
      description: e.desc,
      performed_by: OWNER_ID,
    }))
    const { error } = await sb.from('expenses').insert(rows)
    if (error) console.error('expenses:', error.message)
    else console.log(`✓ Created ${rows.length} expenses`)
  } else {
    console.log(`✓ Skip expenses (${expCount} exist)`)
  }

  // ===== 6. CASH TRANSACTIONS =====
  const { data: accs } = await sb
    .from('cash_accounts')
    .select('id, account_type, is_default')
    .eq('farm_id', FARM_ID)
  const cashAcc = accs?.find((a) => a.is_default) ?? accs?.[0]
  const bankAcc = accs?.find((a) => a.account_type === 'bank') ?? cashAcc
  const { count: txCount } = await sb
    .from('cash_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', FARM_ID)
  if (!txCount && cashAcc && bankAcc) {
    const tx = [
      { d: 28, dir: 'in', amount: 8500000, cat: 'sale', desc: 'Bán gà chiến cho anh Nam', acc: cashAcc.id },
      { d: 25, dir: 'out', amount: 2700000, cat: 'expense', desc: 'Mua cám', acc: cashAcc.id },
      { d: 21, dir: 'in', amount: 12000000, cat: 'sale', desc: 'Bán cặp Asil cho anh Tuấn', acc: bankAcc.id },
      { d: 18, dir: 'out', amount: 850000, cat: 'expense', desc: 'Mua thuốc thú y', acc: cashAcc.id },
      { d: 15, dir: 'in', amount: 6000000, cat: 'sale', desc: 'Bán gà mái giống', acc: bankAcc.id },
      { d: 14, dir: 'out', amount: 5000000, cat: 'payroll', desc: 'Trả lương nhân viên', acc: bankAcc.id },
      { d: 10, dir: 'out', amount: 320000, cat: 'expense', desc: 'Tiền điện', acc: cashAcc.id },
      { d: 5, dir: 'in', amount: 30000000, cat: 'capital_in', desc: 'Vốn ban đầu', acc: bankAcc.id },
    ]
    const rows = tx.map((t) => ({
      farm_id: FARM_ID,
      account_id: t.acc,
      direction: t.dir,
      amount: t.amount,
      category: t.cat,
      transaction_date: dayOffset(t.d),
      description: t.desc,
      created_by: OWNER_ID,
    }))
    const { error } = await sb.from('cash_transactions').insert(rows)
    if (error) console.error('cash_transactions:', error.message)
    else console.log(`✓ Created ${rows.length} cash transactions`)
  } else {
    console.log(`✓ Skip cash_transactions (${txCount} exist)`)
  }

  // ===== 7. DIARY ENTRIES =====
  const { count: diaryCount } = await sb
    .from('diary_entries')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', FARM_ID)
  if (!diaryCount) {
    const entries = [
      { d: 0, cat: 'cho_an', mood: 'binh_thuong', title: 'Cho ăn sáng', content: 'Cho cám trộn rau, gà ăn ngon miệng. Nước sạch đã thay.', tags: ['#cho-an'], weather: 'nắng' },
      { d: 1, cat: 'thu_y', mood: 'lo_lang', title: 'Phát hiện gà ho', content: 'Con #001 có dấu hiệu ho khan. Đã tách riêng và cho uống vitamin.', tags: ['#sức-khoẻ', '#cách-ly'], weather: 'mưa' },
      { d: 2, cat: 'huan_luyen', mood: 'tot', title: 'Vần gà sáng', content: 'Vần 5 con trống chiến. Hắc Long thể lực tốt, đá nhanh.', tags: ['#luyện-tập'], weather: 'nắng' },
      { d: 3, cat: 'thu_y', mood: 'binh_thuong', title: 'Tiêm phòng Newcastle', content: 'Tiêm vaccine Newcastle cho 15 con choai. Tất cả khoẻ mạnh.', tags: ['#vaccine'], weather: 'mát' },
      { d: 5, cat: 've_sinh', mood: 'binh_thuong', title: 'Dọn chuồng khu A', content: 'Rửa sạch tất cả lồng khu A. Phun thuốc khử trùng.', tags: ['#vệ-sinh'], weather: 'nắng' },
      { d: 7, cat: 'kinh_doanh', mood: 'rat_tot', title: 'Bán cặp Asil cho khách Bình Định', content: 'Bán 1 cặp cho anh Tuấn 12tr. Khách hài lòng, hứa giới thiệu thêm.', tags: ['#bán-hàng'], weather: 'nắng' },
      { d: 10, cat: 'cham_soc', mood: 'tot', title: 'Bổ sung vitamin', content: 'Trộn vitamin tổng hợp vào nước uống cho cả đàn 3 ngày liên tiếp.', tags: ['#chăm-sóc'], weather: 'nắng' },
      { d: 14, cat: 'sinh_san', mood: 'rat_tot', title: 'Mái Asil đẻ trứng', content: 'Mái Bạch Hổ đẻ 8 trứng đầu tiên. Chuẩn bị ấp.', tags: ['#sinh-sản', '#trứng'], weather: 'nắng' },
    ]
    const rows = entries.map((e) => ({
      farm_id: FARM_ID,
      author_id: OWNER_ID,
      diary_date: dayOffset(e.d),
      category: e.cat,
      mood: e.mood,
      title: e.title,
      content: e.content,
      tags: e.tags,
      attachments: [],
      weather: e.weather,
      is_pinned: false,
    }))
    const { error } = await sb.from('diary_entries').insert(rows)
    if (error) console.error('diary:', error.message)
    else console.log(`✓ Created ${rows.length} diary entries`)
  } else {
    console.log(`✓ Skip diary (${diaryCount} exist)`)
  }

  console.log('\n🎉 Seed cloud demo done. Login & xem /admin')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
