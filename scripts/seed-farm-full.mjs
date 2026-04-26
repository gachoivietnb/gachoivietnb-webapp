#!/usr/bin/env node
/**
 * Seed full data cho 1 farm (any farm_id + owner_id).
 * Tạo từ ZERO: areas, qr_tags, expense_categories, vaccines, cage_rows,
 * cages, chickens, customers, suppliers, medicines, feeds, sales, purchases,
 * training, breeding, news, alerts, assets, diary, cash, expenses, reviews.
 *
 * Chạy: FARM_ID=... OWNER_ID=... node scripts/seed-farm-full.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const FARM_ID = process.env.FARM_ID
const OWNER_ID = process.env.OWNER_ID
if (!url || !key || !FARM_ID || !OWNER_ID) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FARM_ID, OWNER_ID')
  process.exit(1)
}
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const dayOffset = (d) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString().slice(0,10) }
const rand = (a) => a[Math.floor(Math.random() * a.length)]
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a

async function main() {
  console.log(`🌱 Seeding farm ${FARM_ID}...`)
  const SUFFIX = '_' + FARM_ID.slice(-4)

  // ===== 1. AREAS =====
  let { data: areas } = await sb.from('areas').select('id, code').eq('farm_id', FARM_ID)
  if (!areas?.length) {
    const newAreas = [
      { code: 'A', name_vi: 'Khu A - Trống chiến', type: 'duc', display_order: 1 },
      { code: 'B', name_vi: 'Khu B - Mái giống', type: 'mai', display_order: 2 },
      { code: 'C', name_vi: 'Khu C - Choai', type: 'trong', display_order: 3 },
      { code: 'D', name_vi: 'Khu D - Ghép đôi', type: 'ghep_doi', display_order: 4 },
      { code: 'E', name_vi: 'Khu E - Cách ly', type: 'cach_ly', display_order: 5 },
    ]
    const { data, error } = await sb.from('areas').insert(newAreas.map((a) => ({ ...a, farm_id: FARM_ID, is_active: true }))).select()
    if (error) { console.error('areas:', error.message); return }
    areas = data
  }
  console.log(`✓ ${areas.length} areas`)

  // ===== 2. EXPENSE_CATEGORIES =====
  let { data: cats } = await sb.from('expense_categories').select('id, code').eq('farm_id', FARM_ID)
  if (!cats?.length) {
    const newCats = [
      { code: 'thuc_an' + SUFFIX, short: 'thuc_an', name_vi: 'Thức ăn', display_order: 1 },
      { code: 'nhan_cong' + SUFFIX, short: 'nhan_cong', name_vi: 'Nhân công', display_order: 2 },
      { code: 'thuoc_thu_y' + SUFFIX, short: 'thuoc_thu_y', name_vi: 'Thuốc thú y', display_order: 3 },
      { code: 'dien_nuoc' + SUFFIX, short: 'dien_nuoc', name_vi: 'Điện nước', display_order: 4 },
      { code: 'khau_hao' + SUFFIX, short: 'khau_hao', name_vi: 'Khấu hao', display_order: 5 },
      { code: 'van_chuyen' + SUFFIX, short: 'van_chuyen', name_vi: 'Vận chuyển', display_order: 6 },
      { code: 'marketing' + SUFFIX, short: 'marketing', name_vi: 'Marketing', display_order: 7 },
      { code: 'du_phong' + SUFFIX, short: 'du_phong', name_vi: 'Dự phòng', display_order: 8 },
    ]
    const { data, error } = await sb.from('expense_categories').insert(newCats.map(({ short, ...c }) => ({ ...c, farm_id: FARM_ID, is_active: true }))).select()
    if (error) { console.error('cats:', error.message); return }
    cats = data
  }
  const catByCode = Object.fromEntries(cats.map((c) => [c.code.replace(SUFFIX, ''), c.id]))
  console.log(`✓ ${cats.length} expense categories`)

  // ===== 3. VACCINES =====
  const { count: vCount } = await sb.from('vaccines').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!vCount) {
    const v = [
      { code: 'NEW7' + SUFFIX, name_vi: 'Newcastle - lần 1', default_age_days: 7, is_required: true, display_order: 1 },
      { code: 'GUM14' + SUFFIX, name_vi: 'Gumboro - lần 1', default_age_days: 14, is_required: true, display_order: 2 },
      { code: 'NEW21' + SUFFIX, name_vi: 'Newcastle - lần 2', default_age_days: 21, is_required: true, display_order: 3 },
      { code: 'GUM28' + SUFFIX, name_vi: 'Gumboro - lần 2', default_age_days: 28, is_required: true, display_order: 4 },
      { code: 'CRD60' + SUFFIX, name_vi: 'CRD - 2 tháng', default_age_days: 60, is_required: true, display_order: 5 },
      { code: 'NEW90' + SUFFIX, name_vi: 'Newcastle - tăng cường', default_age_days: 90, is_required: true, display_order: 6 },
      { code: 'TUONG120' + SUFFIX, name_vi: 'Tụ huyết trùng', default_age_days: 120, is_required: false, display_order: 7 },
      { code: 'EDS180' + SUFFIX, name_vi: 'EDS - mái sinh sản', default_age_days: 180, is_required: false, display_order: 8 },
    ]
    await sb.from('vaccines').insert(v.map((x) => ({ ...x, farm_id: FARM_ID, is_active: true })))
    console.log(`✓ Created 8 vaccines`)
  } else console.log(`✓ ${vCount} vaccines`)

  // ===== 4. QR_TAGS =====
  const { count: qCount } = await sb.from('qr_tags').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!qCount) {
    // Find max tag_number to avoid collision globally
    const { data: maxTag } = await sb.from('qr_tags').select('tag_number').order('tag_number', { ascending: false }).limit(1)
    let start = (maxTag?.[0]?.tag_number ?? 0) + 1
    const tags = []
    for (let i = 0; i < 200; i++) {
      tags.push({ farm_id: FARM_ID, tag_number: start + i, status: 'chua_su_dung' })
    }
    // Insert in batches of 100
    for (let i = 0; i < tags.length; i += 100) {
      const batch = tags.slice(i, i + 100)
      const { error } = await sb.from('qr_tags').insert(batch)
      if (error) { console.error('qr_tags:', error.message); break }
    }
    console.log(`✓ Created 200 qr_tags`)
  } else console.log(`✓ ${qCount} qr_tags`)

  // ===== 5. CAGE_ROWS + CAGES =====
  let { data: cageRows } = await sb.from('cage_rows').select('id, area_id, code').eq('farm_id', FARM_ID)
  if (!cageRows?.length) {
    const rows = areas.map((a) => ({ farm_id: FARM_ID, area_id: a.id, code: '01', name_vi: `Hàng 01 - Khu ${a.code}`, is_active: true }))
    const { data } = await sb.from('cage_rows').insert(rows).select()
    cageRows = data
  }
  console.log(`✓ ${cageRows.length} cage_rows`)

  let { data: cages } = await sb.from('cages').select('id').eq('farm_id', FARM_ID)
  if (!cages?.length) {
    const newCages = []
    for (const cr of cageRows) {
      const areaCode = areas.find((a) => a.id === cr.area_id)?.code
      for (let i = 1; i <= 12; i++) {
        newCages.push({
          farm_id: FARM_ID,
          row_id: cr.id,
          code: String(i).padStart(2, '0'),
          full_code: `${areaCode}-${cr.code}-${String(i).padStart(2, '0')}`,
          capacity: 2,
          status: 'trong',
        })
      }
    }
    const { data, error } = await sb.from('cages').insert(newCages).select()
    if (error) { console.error('cages:', error.message); return }
    cages = data
  }
  console.log(`✓ ${cages.length} cages`)

  // ===== 6. CHICKENS =====
  const { data: breeds } = await sb.from('breeds').select('id, code')
  const { count: cCount } = await sb.from('chickens').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!cCount) {
    const { data: tags } = await sb.from('qr_tags').select('id, tag_number').eq('farm_id', FARM_ID).is('chicken_id', null).order('tag_number').limit(120)
    const NAMES = ['Hắc Long','Bạch Hổ','Kim Kê','Phong Vân','Vô Địch','Sấm Sét','Ngọc Long','Phượng Hoàng','Thiên Lôi','Bão Tố','Chiến Thần','Hoả Long','Thanh Long','Tướng Quân','Đại Bàng','Thần Kê','Vạn Thắng','Bá Vương','Hồng Hà','Lôi Kim','Mãnh Hổ','Thiết Kê','Phi Long','Hắc Phụng','Tử Vi','Hỏa Phụng','Kim Long','Bạch Phụng','Thanh Vân','Vũ Long','Thiên Mã','Long Vương','Bích Vũ','Hoàng Kim','Thiên Tướng','Thiết Quyền','Vô Song','Hùng Bá','Tử Long','Tuyết Sư','Bão Phong','Thần Tốc','Hoả Diệm','Vũ Ngọc','Bạch Vũ','Kim Ưng','Thiết Diện','Lục Sa','Mộc Thiên','Hỏa Thiên','Thuỷ Long','Hoàng Hôn','Lôi Long','Phong Lôi','Sương Mù','Hắc Diện','Bích Phụng','Vạn Tuế','Cuồng Phong','Tinh Vũ','Bão Lôi','Lưu Tinh','Hắc Sa','Vũ Phong','Thiên Vũ','Kim Sa','Hắc Tổ','Thanh Sa','Bạch Đạt','Tế Thiên']
    const colors = ['đen','điều','xám','tía','ô','nhạn','xanh','cú','khét','vàng']
    const today = new Date()
    const rows = []
    for (let i = 0; i < tags.length; i++) {
      const isMale = Math.random() > 0.45
      const ageMonths = randInt(2, 24)
      const birth = new Date(today)
      birth.setMonth(birth.getMonth() - ageMonths)
      const num = String(tags[i].tag_number).padStart(4, '0')
      const r = Math.random()
      const status = r < 0.04 ? 'chet' : r < 0.08 ? 'loai_thai' : 'dang_nuoi'
      rows.push({
        farm_id: FARM_ID,
        chicken_code: `GA${num}`,
        name: NAMES[i] ?? `Chiến Kê #${i + 1}`,
        breed_id: rand(breeds).id,
        qr_tag_id: tags[i].id,
        cage_id: status === 'dang_nuoi' ? rand(cages).id : null,
        gender: isMale ? 'trong' : 'mai',
        birth_date: birth.toISOString().slice(0, 10),
        source: Math.random() < 0.7 ? 'no_tai_trai' : 'mua',
        weight_kg: isMale ? 2.5 + Math.random() * 1.0 : 2.0 + Math.random() * 0.6,
        color: rand(colors),
        status,
        is_for_sale: status === 'dang_nuoi' && Math.random() < 0.25,
        listed_price: status === 'dang_nuoi' && Math.random() < 0.25 ? randInt(3000000, 15000000) : null,
        cost_purchase: Math.random() < 0.3 ? randInt(2000000, 5000000) : null,
        created_by: OWNER_ID,
      })
    }
    // batch insert
    for (let i = 0; i < rows.length; i += 30) {
      const batch = rows.slice(i, i + 30)
      const { data, error } = await sb.from('chickens').insert(batch).select('id, qr_tag_id')
      if (error) { console.error('chickens:', error.message); break }
      for (const c of data) {
        await sb.from('qr_tags').update({ chicken_id: c.id, status: 'dang_su_dung', assigned_at: new Date().toISOString() }).eq('id', c.qr_tag_id)
      }
    }
    console.log(`✓ Created ${rows.length} chickens`)
  } else console.log(`✓ ${cCount} chickens`)

  // ===== 7. CUSTOMERS =====
  const { count: custC } = await sb.from('customers').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  let customers = []
  if (!custC) {
    const list = [
      { name: 'Anh Nam', phone: '0912345678', zalo: '0912345678', address: 'Bình Định', tier: 'vip' },
      { name: 'Cô Lan', phone: '0987654321', zalo: '0987654321', address: 'Đồng Tháp', tier: 'thuong' },
      { name: 'Chú Hùng', phone: '0901112233', zalo: '0901112233', address: 'Tây Ninh', tier: 'thuong' },
      { name: 'Anh Tuấn', phone: '0978889999', zalo: '0978889999', address: 'Long An', tier: 'vip' },
      { name: 'Chị Mai', phone: '0945678901', zalo: '0945678901', address: 'Cần Thơ', tier: 'thuong' },
      { name: 'Anh Phương', phone: '0934445566', zalo: '0934445566', address: 'Vĩnh Long', tier: 'vip' },
      { name: 'Cô Yến', phone: '0967778899', zalo: '0967778899', address: 'Bến Tre', tier: 'thuong' },
    ].map((c) => ({ ...c, farm_id: FARM_ID }))
    const { data } = await sb.from('customers').insert(list).select()
    customers = data
  } else {
    customers = (await sb.from('customers').select('id, name').eq('farm_id', FARM_ID)).data
  }
  console.log(`✓ ${customers.length} customers`)

  // ===== 8. SUPPLIERS =====
  const { count: supC } = await sb.from('suppliers').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!supC) {
    await sb.from('suppliers').insert([
      { name: 'Trại Asil Long Phụng', contact_person: 'Anh Phụng', phone: '0901234567', address: 'Bình Dương', supplier_type: 'gà giống' },
      { name: 'Cám Con Cò', contact_person: 'Chị Hoa', phone: '0987655443', address: 'Long An', supplier_type: 'thức ăn' },
      { name: 'Thuốc Thú y Minh Trâm', contact_person: 'Anh Minh', phone: '0934567890', address: 'TP HCM', supplier_type: 'thuốc' },
      { name: 'Trại gà Mã Lai Tân Châu', contact_person: 'Cô Lan', phone: '0912345677', address: 'Đồng Tháp', supplier_type: 'gà giống' },
    ].map((s) => ({ ...s, farm_id: FARM_ID, is_active: true })))
    console.log(`✓ Created 4 suppliers`)
  }

  // ===== 9. MEDICINES =====
  if (!(await sb.from('medicines').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) {
    await sb.from('medicines').insert([
      { code: 'AMOX' + SUFFIX, name_vi: 'Amoxicillin 250mg', unit: 'viên', current_stock: 200, min_stock_alert: 50, cost_per_unit: 1500 },
      { code: 'VITC' + SUFFIX, name_vi: 'Vitamin C tổng hợp', unit: 'gói', current_stock: 30, min_stock_alert: 5, cost_per_unit: 25000 },
      { code: 'TYL' + SUFFIX, name_vi: 'Tylosin 100ml', unit: 'chai', current_stock: 8, min_stock_alert: 3, cost_per_unit: 180000 },
      { code: 'NEW' + SUFFIX, name_vi: 'Vaccine Newcastle', unit: 'liều', current_stock: 50, min_stock_alert: 20, cost_per_unit: 5000, expiry_date: dayOffset(-180) },
      { code: 'GUM' + SUFFIX, name_vi: 'Vaccine Gumboro', unit: 'liều', current_stock: 40, min_stock_alert: 20, cost_per_unit: 4500 },
      { code: 'TET' + SUFFIX, name_vi: 'Tetracycline', unit: 'gói', current_stock: 2, min_stock_alert: 5, cost_per_unit: 35000 },
      { code: 'ANTI' + SUFFIX, name_vi: 'Anti CRD-LK', unit: 'gói', current_stock: 15, min_stock_alert: 5, cost_per_unit: 45000 },
    ].map((m) => ({ ...m, farm_id: FARM_ID, is_active: true })))
    console.log(`✓ Created 7 medicines`)
  }

  // ===== 10. FEEDS =====
  if (!(await sb.from('feeds').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) {
    await sb.from('feeds').insert([
      { code: 'CC1' + SUFFIX, name_vi: 'Cám gà tăng trọng', unit: 'kg', current_stock: 250, min_stock_alert: 50, cost_per_unit: 14000 },
      { code: 'CC2' + SUFFIX, name_vi: 'Cám gà đẻ', unit: 'kg', current_stock: 150, min_stock_alert: 30, cost_per_unit: 13500 },
      { code: 'LUA' + SUFFIX, name_vi: 'Lúa', unit: 'kg', current_stock: 500, min_stock_alert: 100, cost_per_unit: 9500 },
      { code: 'NGO' + SUFFIX, name_vi: 'Ngô vàng', unit: 'kg', current_stock: 200, min_stock_alert: 50, cost_per_unit: 11000 },
      { code: 'RAU' + SUFFIX, name_vi: 'Rau xanh tươi', unit: 'kg', current_stock: 30, min_stock_alert: 10, cost_per_unit: 8000 },
    ].map((f) => ({ ...f, farm_id: FARM_ID, is_active: true })))
    console.log(`✓ Created 5 feeds`)
  }

  // ===== 11. CASH ACCOUNTS =====
  let { data: cashAccs } = await sb.from('cash_accounts').select('id, account_type, is_default').eq('farm_id', FARM_ID)
  if (!cashAccs?.length) {
    const { data } = await sb.from('cash_accounts').insert([
      { farm_id: FARM_ID, name: 'Két tiền mặt', account_type: 'cash', initial_balance: 10000000, is_default: true, is_active: true, color: 'from-emerald-500 to-teal-500', icon: '💵' },
      { farm_id: FARM_ID, name: 'Vietcombank', account_type: 'bank', bank_name: 'Vietcombank', account_number: '0123456789', initial_balance: 25000000, is_active: true, color: 'from-green-600 to-emerald-700', icon: '🏦', display_order: 1 },
    ]).select()
    cashAccs = data
    console.log(`✓ Created 2 cash accounts`)
  } else console.log(`✓ ${cashAccs.length} cash accounts`)

  // ===== 12. EXPENSES =====
  if (!(await sb.from('expenses').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) {
    const exps = [
      { d: 1, code: 'thuc_an', amount: 2500000, desc: 'Mua cám gà 50kg' },
      { d: 3, code: 'thuoc_thu_y', amount: 850000, desc: 'Mua thuốc phòng bệnh' },
      { d: 5, code: 'dien_nuoc', amount: 320000, desc: 'Tiền điện tháng' },
      { d: 7, code: 'thuc_an', amount: 2700000, desc: 'Mua cám đợt 2' },
      { d: 10, code: 'dien_nuoc', amount: 180000, desc: 'Tiền nước' },
      { d: 14, code: 'nhan_cong', amount: 5000000, desc: 'Lương nhân viên' },
      { d: 18, code: 'du_phong', amount: 450000, desc: 'Sửa chuồng' },
      { d: 22, code: 'thuoc_thu_y', amount: 620000, desc: 'Vitamin tổng hợp' },
      { d: 25, code: 'marketing', amount: 800000, desc: 'Quảng cáo Zalo' },
      { d: 28, code: 'van_chuyen', amount: 350000, desc: 'Ship gà' },
    ]
    await sb.from('expenses').insert(exps.map((e) => ({
      farm_id: FARM_ID, expense_date: dayOffset(e.d), category_id: catByCode[e.code], amount: e.amount, description: e.desc, performed_by: OWNER_ID,
    })))
    console.log(`✓ Created 10 expenses`)
  }

  // ===== 13. CASH TRANSACTIONS =====
  await (async () => {
    if ((await sb.from('cash_transactions').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) return
    const accs = (await sb.from('cash_accounts').select('id, account_type, is_default').eq('farm_id', FARM_ID)).data ?? []
    if (!accs.length) { console.log('⚠ no cash accounts, skip tx'); return }
    const cashAcc = accs.find((a) => a.is_default) ?? accs[0]
    const bankAcc = accs.find((a) => a.account_type === 'bank') ?? cashAcc
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
    await sb.from('cash_transactions').insert(tx.map((t) => ({
      farm_id: FARM_ID, account_id: t.acc, direction: t.dir, amount: t.amount, category: t.cat,
      transaction_date: dayOffset(t.d), description: t.desc, created_by: OWNER_ID,
    })))
    console.log(`✓ Created 8 cash transactions`)
  })()

  // ===== 14. SALES ORDERS =====
  if (!(await sb.from('sales_orders').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) {
    const { data: forSale } = await sb.from('chickens').select('id, name').eq('farm_id', FARM_ID).eq('status', 'dang_nuoi').eq('gender', 'trong').limit(15)
    const tpl = [
      { d: 30, status: 'da_giao', cust: 0, items: 2, payment: 'tien_mat' },
      { d: 25, status: 'da_giao', cust: 1, items: 1, payment: 'chuyen_khoan' },
      { d: 20, status: 'da_giao', cust: 3, items: 2, payment: 'tien_mat' },
      { d: 15, status: 'dat_coc', cust: 2, items: 1, payment: 'tien_mat' },
      { d: 10, status: 'da_giao', cust: 4, items: 1, payment: 'chuyen_khoan' },
      { d: 5, status: 'hoi_mua', cust: 0, items: 1, payment: null },
    ]
    let idx = 0
    for (let i = 0; i < tpl.length; i++) {
      const o = tpl[i]
      if (idx + o.items > forSale.length) break
      const items = forSale.slice(idx, idx + o.items); idx += o.items
      const total = items.reduce((s, _, k) => s + (3500000 + k * 1500000), 0)
      const code = `SO-${dayOffset(o.d).replace(/-/g,'')}-${String(i+1).padStart(3,'0')}`
      const { data: order } = await sb.from('sales_orders').insert([{
        farm_id: FARM_ID, order_code: code, customer_id: customers[o.cust].id,
        order_date: dayOffset(o.d), status: o.status,
        deposit_amount: o.status === 'dat_coc' ? Math.floor(total * 0.3) : 0,
        total_amount: total, paid_amount: o.status === 'da_giao' ? total : (o.status === 'dat_coc' ? Math.floor(total * 0.3) : 0),
        payment_method: o.payment, delivered_date: o.status === 'da_giao' ? dayOffset(o.d) : null,
        notes: `Đơn cho ${customers[o.cust].name}`, performed_by: OWNER_ID,
      }]).select().single()
      if (!order) continue
      await sb.from('sales_items').insert(items.map((c, k) => ({
        farm_id: FARM_ID, sales_order_id: order.id, chicken_id: c.id, unit_price: 3500000 + k * 1500000, notes: c.name,
      })))
      if (o.status === 'da_giao') {
        await sb.from('chickens').update({ status: 'da_ban', sale_date: dayOffset(o.d), customer_id: customers[o.cust].id, sale_price: total / o.items }).in('id', items.map((c) => c.id))
      }
    }
    console.log(`✓ Created sales orders + items`)
  }

  // ===== 15. TRAINING SESSIONS =====
  if (!(await sb.from('training_sessions').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) {
    const { data: roosters } = await sb.from('chickens').select('id').eq('farm_id', FARM_ID).eq('gender', 'trong').eq('status', 'dang_nuoi').limit(15)
    const sessions = []
    for (const r of roosters) {
      const n = randInt(1, 4)
      for (let s = 1; s <= n; s++) {
        const opp = rand(roosters.filter((x) => x.id !== r.id))
        sessions.push({
          farm_id: FARM_ID, chicken_id: r.id, session_date: dayOffset(randInt(1, 60)),
          session_number: s,
          opponent_chicken_id: Math.random() < 0.5 ? opp.id : null,
          opponent_name: Math.random() < 0.5 ? null : `Đối thủ ${rand(['Trại A','Trại B','Hùng Tăng'])}`,
          duration_minutes: randInt(10, 30),
          score_strength: randInt(6, 10),
          score_appearance: randInt(6, 10),
          score_aggression: randInt(6, 10),
          result: rand(['thang','thua','hoa']),
          notes: rand(['Phong độ tốt','Cần luyện thêm','Vào form đỉnh','Mệt vì thời tiết']),
          performed_by: OWNER_ID,
        })
      }
    }
    await sb.from('training_sessions').insert(sessions)
    console.log(`✓ Created ${sessions.length} training sessions`)
  }

  // ===== 16. BREEDING LITTERS =====
  if (!(await sb.from('breeding_litters').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) {
    const { data: F } = await sb.from('chickens').select('id').eq('farm_id', FARM_ID).eq('gender', 'mai').limit(3)
    const { data: M } = await sb.from('chickens').select('id').eq('farm_id', FARM_ID).eq('gender', 'trong').limit(3)
    if (F.length && M.length) {
      const lit = [
        { f: F[0].id, m: M[0].id, paired: 60, eggs: 12, fertile: 10, hatched: 9, status: 'da_no' },
        { f: F[1]?.id ?? F[0].id, m: M[1]?.id ?? M[0].id, paired: 30, eggs: 14, fertile: 12, hatched: null, status: 'dang_ap' },
        { f: F[2]?.id ?? F[0].id, m: M[2]?.id ?? M[0].id, paired: 90, eggs: 10, fertile: 6, hatched: 4, status: 'da_no' },
      ]
      await sb.from('breeding_litters').insert(lit.map((l, i) => ({
        farm_id: FARM_ID, litter_code: `LIT-${new Date().getFullYear()}-${String(i+1).padStart(3,'0')}`,
        female_id: l.f, male_ids: [l.m], paired_date: dayOffset(l.paired),
        expected_hatch_date: dayOffset(l.paired - 21), eggs_total: l.eggs, eggs_fertile: l.fertile,
        hatched_count: l.hatched, hatched_date: l.hatched ? dayOffset(l.paired - 21) : null,
        status: l.status, notes: `Lứa ấp #${i+1}`, created_by: OWNER_ID,
      })))
      console.log(`✓ Created 3 breeding litters`)
    }
  }

  // ===== 17. NEWS =====
  if (!(await sb.from('news_articles').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) {
    const news = [
      { slug: 'cach-cham-soc-ga-choi-mua-mua-'+FARM_ID.slice(-4), title: 'Cách chăm sóc gà chọi mùa mưa', cat: 'kinh-nghiem', body: '# Mùa mưa\n\nGà chọi dễ mắc bệnh hô hấp. Giữ chuồng khô, bổ sung vitamin C, B1.', d: 5, views: 234 },
      { slug: 'top-5-giong-ga-'+FARM_ID.slice(-4), title: 'Top 5 giống gà chọi nổi tiếng', cat: 'giong-ga', body: '# 5 giống top\n\n1. Asil\n2. Mã Lai\n3. Nòi\n4. Tre\n5. Pedigree', d: 12, views: 567 },
      { slug: 'huong-dan-vacxin-'+FARM_ID.slice(-4), title: 'Hướng dẫn tiêm Newcastle', cat: 'cham-soc', body: '# Lịch tiêm\n\n7d: nhỏ mắt\n21d: nhỏ lần 2\n3 tháng: tiêm dưới da', d: 20, views: 1234 },
      { slug: 'che-do-an-van-suc-'+FARM_ID.slice(-4), title: 'Chế độ vần sức 3 ngày', cat: 'kinh-nghiem', body: '# Vần sức\n\nNgày 1: cám + lúa\nNgày 2: thịt + rau\nNgày 3: nhịn ăn', d: 30, views: 890 },
      { slug: 'chon-ga-tu-choai-'+FARM_ID.slice(-4), title: 'Mẹo chọn gà tốt từ choai', cat: 'kinh-nghiem', body: '# 5 dấu hiệu\n\n1. Mỏ to\n2. Cổ dài\n3. Chân to\n4. Mắt sáng\n5. Hung hăng', d: 45, views: 1567 },
    ]
    await sb.from('news_articles').insert(news.map((n) => ({
      farm_id: FARM_ID, slug: n.slug, title: n.title,
      excerpt: n.body.split('\n').filter((l) => l && !l.startsWith('#'))[0]?.slice(0, 150) ?? '',
      body_markdown: n.body, category: n.cat, status: 'published',
      tags: ['demo'], view_count: n.views, published_at: dayOffset(n.d) + 'T08:00:00Z',
    })))
    console.log(`✓ Created 5 news articles`)
  }

  // ===== 18. ASSETS =====
  if (!(await sb.from('assets').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) {
    await sb.from('assets').insert([
      { kind: 'tscd', code: 'TSCD-001', name: 'Hệ thống camera giám sát', category: 'electronic', quantity: 1, unit: 'bộ', purchase_date: dayOffset(180), purchase_price: 25000000, useful_life_months: 60, salvage_value: 2000000, brand: 'Hikvision', status: 'dang_dung' },
      { kind: 'tscd', code: 'TSCD-002', name: 'Quạt thông gió công nghiệp', category: 'machine', quantity: 4, unit: 'cái', purchase_date: dayOffset(90), purchase_price: 12000000, useful_life_months: 60, salvage_value: 1000000, status: 'dang_dung' },
      { kind: 'tscd', code: 'TSCD-003', name: 'Lưới chắn chuồng inox', category: 'building', quantity: 1, unit: 'lô', purchase_date: dayOffset(365), purchase_price: 18000000, useful_life_months: 120, salvage_value: 0, status: 'dang_dung' },
      { kind: 'ccdc', code: 'CCDC-001', name: 'Cân điện tử', category: 'tool', quantity: 2, unit: 'cái', purchase_date: dayOffset(60), purchase_price: 850000, useful_life_months: 24, salvage_value: 0, status: 'dang_dung' },
      { kind: 'ccdc', code: 'CCDC-002', name: 'Bộ tiêm phòng', category: 'tool', quantity: 3, unit: 'bộ', purchase_date: dayOffset(120), purchase_price: 1200000, useful_life_months: 36, salvage_value: 0, status: 'dang_dung' },
      { kind: 'ccdc', code: 'CCDC-003', name: 'Máng ăn tự động', category: 'tool', quantity: 20, unit: 'cái', purchase_date: dayOffset(45), purchase_price: 6000000, useful_life_months: 24, salvage_value: 0, status: 'dang_dung' },
    ].map((a) => ({ ...a, farm_id: FARM_ID })))
    console.log(`✓ Created 6 assets`)
  }

  // ===== 19. DIARY =====
  if (!(await sb.from('diary_entries').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) {
    const entries = [
      { d: 0, cat: 'cho_an', mood: 'binh_thuong', title: 'Cho ăn sáng', content: 'Cho cám trộn rau, gà ăn ngon miệng. Nước sạch đã thay.', tags: ['#cho-an'], weather: 'nắng' },
      { d: 1, cat: 'thu_y', mood: 'lo_lang', title: 'Phát hiện gà ho', content: 'Con #001 có dấu hiệu ho khan. Đã tách riêng và cho uống vitamin.', tags: ['#sức-khoẻ'], weather: 'mưa' },
      { d: 2, cat: 'huan_luyen', mood: 'tot', title: 'Vần gà sáng', content: 'Vần 5 con trống chiến. Hắc Long thể lực tốt, đá nhanh.', tags: ['#luyện-tập'], weather: 'nắng' },
      { d: 3, cat: 'thu_y', mood: 'binh_thuong', title: 'Tiêm Newcastle', content: 'Tiêm vaccine cho 15 con choai. Tất cả khoẻ.', tags: ['#vaccine'], weather: 'mát' },
      { d: 5, cat: 've_sinh', mood: 'binh_thuong', title: 'Dọn chuồng khu A', content: 'Rửa sạch lồng khu A. Phun thuốc khử trùng.', tags: ['#vệ-sinh'], weather: 'nắng' },
      { d: 7, cat: 'kinh_doanh', mood: 'rat_tot', title: 'Bán cặp Asil', content: 'Bán 1 cặp cho anh Tuấn 12tr. Khách hài lòng.', tags: ['#bán-hàng'], weather: 'nắng' },
      { d: 10, cat: 'cham_soc', mood: 'tot', title: 'Bổ sung vitamin', content: 'Trộn vitamin tổng hợp 3 ngày liên tiếp.', tags: ['#chăm-sóc'], weather: 'nắng' },
      { d: 14, cat: 'sinh_san', mood: 'rat_tot', title: 'Mái Asil đẻ trứng', content: 'Mái Bạch Hổ đẻ 8 trứng. Chuẩn bị ấp.', tags: ['#sinh-sản'], weather: 'nắng' },
    ]
    await sb.from('diary_entries').insert(entries.map((e) => ({
      farm_id: FARM_ID, author_id: OWNER_ID, diary_date: dayOffset(e.d),
      category: e.cat, mood: e.mood, title: e.title, content: e.content,
      tags: e.tags, attachments: [], weather: e.weather, is_pinned: false,
    })))
    console.log(`✓ Created 8 diary entries`)
  }

  // ===== 20. REVIEWS =====
  if (!(await sb.from('customer_reviews').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) {
    await sb.from('customer_reviews').insert([
      { customer_id: customers[0].id, rating: 5, comment: 'Gà đẹp, đá rất tốt. Sẽ ủng hộ tiếp!', is_public: true },
      { customer_id: customers[1].id, rating: 5, comment: 'Mua được mái Asil khoẻ, đẻ đều.', is_public: true },
      { customer_id: customers[3].id, rating: 4, comment: 'Cặp gà tốt. Giá hơi cao nhưng xứng đáng.', is_public: true },
    ].map((r) => ({ ...r, farm_id: FARM_ID, reviewed_at: new Date().toISOString() })))
    console.log(`✓ Created 3 reviews`)
  }

  // ===== 21. MEDICINE/FEED TRANSACTIONS =====
  const { data: meds } = await sb.from('medicines').select('id').eq('farm_id', FARM_ID)
  if (meds?.length && !(await sb.from('medicine_transactions').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) {
    const mtx = []
    for (const m of meds) {
      mtx.push({ farm_id: FARM_ID, medicine_id: m.id, transaction_type: 'nhap', quantity: 50, transaction_date: dayOffset(60), cost: 500000, notes: 'Nhập kho ban đầu', performed_by: OWNER_ID })
      mtx.push({ farm_id: FARM_ID, medicine_id: m.id, transaction_type: 'xuat', quantity: 5, transaction_date: dayOffset(15), cost: 50000, notes: 'Sử dụng cho đàn', performed_by: OWNER_ID })
    }
    await sb.from('medicine_transactions').insert(mtx)
    console.log(`✓ Created ${mtx.length} medicine_tx`)
  }
  const { data: fds } = await sb.from('feeds').select('id').eq('farm_id', FARM_ID)
  if (fds?.length && !(await sb.from('feed_transactions').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)).count) {
    const ftx = []
    for (const f of fds) {
      ftx.push({ farm_id: FARM_ID, feed_id: f.id, transaction_type: 'nhap', quantity: 100, transaction_date: dayOffset(30), cost: 1400000, notes: 'Nhập đợt 1', performed_by: OWNER_ID })
      ftx.push({ farm_id: FARM_ID, feed_id: f.id, transaction_type: 'xuat', quantity: 30, transaction_date: dayOffset(7), cost: 420000, notes: 'Cho ăn tuần', performed_by: OWNER_ID })
    }
    await sb.from('feed_transactions').insert(ftx)
    console.log(`✓ Created ${ftx.length} feed_tx`)
  }

  console.log('\n🎉 Done!')
}
main().catch((e) => { console.error(e); process.exit(1) })
