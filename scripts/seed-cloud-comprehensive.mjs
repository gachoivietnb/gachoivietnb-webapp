#!/usr/bin/env node
/**
 * Comprehensive demo data seed cho cloud — chạy SAU seed-cloud-demo.mjs.
 * Bổ sung: thêm gà, sales orders, purchases, suppliers, medicines, feeds,
 * training sessions, breeding litters, news articles, alerts, assets.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing env')
  process.exit(1)
}
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const FARM_ID = '00000000-0000-0000-0000-000000000001'
const OWNER_ID = 'c7678bc4-7ed3-4caf-ba31-74161673abbc'

const dayOffset = (d) => {
  const dt = new Date()
  dt.setDate(dt.getDate() - d)
  return dt.toISOString().slice(0, 10)
}
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a

async function main() {
  console.log('🌱 Comprehensive seed...')

  const { data: areas } = await sb.from('areas').select('id, code').eq('farm_id', FARM_ID)
  const { data: breeds } = await sb.from('breeds').select('id, code')
  const { data: cages } = await sb.from('cages').select('id').eq('farm_id', FARM_ID)
  const { data: customers } = await sb.from('customers').select('id, name').eq('farm_id', FARM_ID)
  const { data: chickens } = await sb.from('chickens').select('id, gender, status').eq('farm_id', FARM_ID)

  // ===== 1. THÊM GÀ — bổ sung lên 80 con =====
  if ((chickens?.length ?? 0) < 80) {
    const need = 80 - (chickens?.length ?? 0)
    const { data: tags } = await sb
      .from('qr_tags')
      .select('id, tag_number')
      .eq('farm_id', FARM_ID)
      .is('chicken_id', null)
      .order('tag_number')
      .limit(need)
    const NAMES = [
      'Hắc Long', 'Bạch Hổ', 'Kim Kê', 'Phong Vân', 'Vô Địch', 'Sấm Sét', 'Ngọc Long',
      'Phượng Hoàng', 'Thiên Lôi', 'Bão Tố', 'Chiến Thần', 'Hoả Long', 'Thanh Long',
      'Tướng Quân', 'Đại Bàng', 'Thần Kê', 'Vạn Thắng', 'Bá Vương', 'Hồng Hà', 'Lôi Kim',
      'Mãnh Hổ', 'Thiết Kê', 'Phi Long', 'Hắc Phụng', 'Tử Vi', 'Hỏa Phụng', 'Kim Long',
      'Bạch Phụng', 'Thanh Vân', 'Vũ Long', 'Thiên Mã', 'Long Vương', 'Bích Vũ', 'Hoàng Kim',
      'Thiên Tướng', 'Thiết Quyền', 'Vô Song', 'Hùng Bá', 'Tử Long', 'Tuyết Sư',
      'Bão Phong', 'Thần Tốc', 'Hoả Diệm', 'Vũ Ngọc', 'Bạch Vũ', 'Kim Ưng', 'Thiết Diện',
      'Lục Sa', 'Mộc Thiên', 'Hỏa Thiên',
    ]
    const colors = ['đen', 'điều', 'xám', 'tía', 'ô', 'nhạn', 'xanh', 'cú', 'khét']
    const today = new Date()
    const rows = []
    for (let i = 0; i < (tags?.length ?? 0); i++) {
      const isMale = Math.random() > 0.45
      const ageMonths = randInt(2, 24)
      const birth = new Date(today)
      birth.setMonth(birth.getMonth() - ageMonths)
      const num = String(tags[i].tag_number).padStart(4, '0')
      // 5% gà đã chết / loại
      const r = Math.random()
      const status = r < 0.04 ? 'chet' : r < 0.08 ? 'loai_thai' : 'dang_nuoi'
      rows.push({
        farm_id: FARM_ID,
        chicken_code: `GA${num}`,
        name: rand(NAMES),
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
        created_by: OWNER_ID,
      })
    }
    const { data, error } = await sb.from('chickens').insert(rows).select('id, qr_tag_id')
    if (error) console.error('chickens+:', error.message)
    else {
      console.log(`✓ Added ${data.length} chickens (total ~80)`)
      for (const c of data) {
        await sb.from('qr_tags').update({ chicken_id: c.id, status: 'used', assigned_at: new Date().toISOString() }).eq('id', c.qr_tag_id)
      }
    }
  } else {
    console.log(`✓ Skip chickens (${chickens.length} >= 80)`)
  }

  // ===== 2. SUPPLIERS =====
  const { count: supCount } = await sb.from('suppliers').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!supCount) {
    const sup = [
      { name: 'Trại Asil Long Phụng', contact_person: 'Anh Phụng', phone: '0901234567', address: 'Bình Dương', supplier_type: 'gà giống' },
      { name: 'Cám Con Cò', contact_person: 'Chị Hoa', phone: '0987655443', address: 'Long An', supplier_type: 'thức ăn' },
      { name: 'Thuốc Thú y Minh Trâm', contact_person: 'Anh Minh', phone: '0934567890', address: 'TP HCM', supplier_type: 'thuốc' },
      { name: 'Trại gà Mã Lai Tân Châu', contact_person: 'Cô Lan', phone: '0912345677', address: 'Đồng Tháp', supplier_type: 'gà giống' },
    ].map((s) => ({ ...s, farm_id: FARM_ID, is_active: true }))
    const { error } = await sb.from('suppliers').insert(sup)
    if (error) console.error('suppliers:', error.message)
    else console.log(`✓ Created ${sup.length} suppliers`)
  } else console.log(`✓ Skip suppliers (${supCount} exist)`)

  // ===== 3. MEDICINES =====
  const { count: medCount } = await sb.from('medicines').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!medCount) {
    const meds = [
      { code: 'AMOX', name_vi: 'Amoxicillin 250mg', unit: 'viên', current_stock: 200, min_stock_alert: 50, cost_per_unit: 1500 },
      { code: 'VITC', name_vi: 'Vitamin C tổng hợp', unit: 'gói', current_stock: 30, min_stock_alert: 5, cost_per_unit: 25000 },
      { code: 'TYL', name_vi: 'Tylosin 100ml', unit: 'chai', current_stock: 8, min_stock_alert: 3, cost_per_unit: 180000 },
      { code: 'NEW', name_vi: 'Vaccine Newcastle', unit: 'liều', current_stock: 50, min_stock_alert: 20, cost_per_unit: 5000, expiry_date: dayOffset(-180) },
      { code: 'GUM', name_vi: 'Vaccine Gumboro', unit: 'liều', current_stock: 40, min_stock_alert: 20, cost_per_unit: 4500, expiry_date: dayOffset(-120) },
      { code: 'TET', name_vi: 'Tetracycline', unit: 'gói', current_stock: 2, min_stock_alert: 5, cost_per_unit: 35000 },
      { code: 'ANTI', name_vi: 'Anti CRD-LK', unit: 'gói', current_stock: 15, min_stock_alert: 5, cost_per_unit: 45000 },
    ].map((m) => ({ ...m, farm_id: FARM_ID, is_active: true }))
    const { error } = await sb.from('medicines').insert(meds)
    if (error) console.error('medicines:', error.message)
    else console.log(`✓ Created ${meds.length} medicines`)
  } else console.log(`✓ Skip medicines (${medCount} exist)`)

  // ===== 4. FEEDS =====
  const { count: feedCount } = await sb.from('feeds').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!feedCount) {
    const feeds = [
      { code: 'CC1', name_vi: 'Cám gà tăng trọng', unit: 'kg', current_stock: 250, min_stock_alert: 50, cost_per_unit: 14000 },
      { code: 'CC2', name_vi: 'Cám gà đẻ', unit: 'kg', current_stock: 150, min_stock_alert: 30, cost_per_unit: 13500 },
      { code: 'LUA', name_vi: 'Lúa', unit: 'kg', current_stock: 500, min_stock_alert: 100, cost_per_unit: 9500 },
      { code: 'NGO', name_vi: 'Ngô vàng', unit: 'kg', current_stock: 200, min_stock_alert: 50, cost_per_unit: 11000 },
      { code: 'RAU', name_vi: 'Rau xanh tươi', unit: 'kg', current_stock: 30, min_stock_alert: 10, cost_per_unit: 8000 },
    ].map((f) => ({ ...f, farm_id: FARM_ID, is_active: true }))
    const { error } = await sb.from('feeds').insert(feeds)
    if (error) console.error('feeds:', error.message)
    else console.log(`✓ Created ${feeds.length} feeds`)
  } else console.log(`✓ Skip feeds (${feedCount} exist)`)

  // ===== 5. SALES ORDERS =====
  const { count: ordCount } = await sb.from('sales_orders').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!ordCount && customers?.length) {
    // Pick chickens that are alive + male (more saleable)
    const { data: forSale } = await sb
      .from('chickens')
      .select('id, name')
      .eq('farm_id', FARM_ID)
      .eq('status', 'dang_nuoi')
      .eq('gender', 'trong')
      .limit(15)
    const orderTpl = [
      { d: 30, status: 'da_giao', customer_idx: 0, items: 2, payment: 'tien_mat' },
      { d: 25, status: 'da_giao', customer_idx: 1, items: 1, payment: 'chuyen_khoan' },
      { d: 20, status: 'da_giao', customer_idx: 3, items: 2, payment: 'tien_mat' },
      { d: 15, status: 'dat_coc', customer_idx: 2, items: 1, payment: 'tien_mat' },
      { d: 10, status: 'da_giao', customer_idx: 4, items: 1, payment: 'chuyen_khoan' },
      { d: 5, status: 'hoi_mua', customer_idx: 0, items: 1, payment: null },
    ]
    let chickenIdx = 0
    for (let i = 0; i < orderTpl.length; i++) {
      const o = orderTpl[i]
      if (chickenIdx + o.items > forSale.length) break
      const items = forSale.slice(chickenIdx, chickenIdx + o.items)
      chickenIdx += o.items
      const itemTotal = items.reduce((sum, _, idx) => sum + (3500000 + idx * 1500000), 0)
      const code = `SO-${dayOffset(o.d).replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`
      const { data: order, error } = await sb.from('sales_orders').insert([{
        farm_id: FARM_ID,
        order_code: code,
        customer_id: customers[o.customer_idx].id,
        order_date: dayOffset(o.d),
        status: o.status,
        deposit_amount: o.status === 'dat_coc' ? Math.floor(itemTotal * 0.3) : 0,
        total_amount: itemTotal,
        paid_amount: o.status === 'da_giao' ? itemTotal : (o.status === 'dat_coc' ? Math.floor(itemTotal * 0.3) : 0),
        payment_method: o.payment,
        delivered_date: o.status === 'da_giao' ? dayOffset(o.d) : null,
        notes: `Đơn hàng demo cho ${customers[o.customer_idx].name}`,
        performed_by: OWNER_ID,
      }]).select().single()
      if (error) {
        console.error(`order ${i}:`, error.message)
        continue
      }
      const itemRows = items.map((c, idx) => ({
        farm_id: FARM_ID,
        sales_order_id: order.id,
        chicken_id: c.id,
        unit_price: 3500000 + idx * 1500000,
        notes: c.name,
      }))
      await sb.from('sales_items').insert(itemRows)
      // Mark sold
      if (o.status === 'da_giao') {
        await sb.from('chickens').update({
          status: 'da_ban',
          sale_date: dayOffset(o.d),
          customer_id: customers[o.customer_idx].id,
          sale_price: itemTotal / o.items,
        }).in('id', items.map((c) => c.id))
      }
    }
    console.log(`✓ Created ${orderTpl.length} sales orders + items`)
  } else console.log(`✓ Skip sales orders (${ordCount} exist)`)

  // ===== 6. PURCHASES =====
  const { count: purCount } = await sb.from('purchases').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  const { data: suppliers } = await sb.from('suppliers').select('id, name').eq('farm_id', FARM_ID).limit(2)
  if (!purCount && suppliers?.length) {
    // Get bought chickens (source = 'mua') for purchase items
    const { data: bought } = await sb
      .from('chickens')
      .select('id, name, cost_purchase')
      .eq('farm_id', FARM_ID)
      .eq('source', 'mua')
      .limit(6)
    if (bought.length >= 2) {
      const purchases = [
        { d: 60, items: bought.slice(0, 3), supplier: suppliers[0] },
        { d: 45, items: bought.slice(3, 5), supplier: suppliers[1] ?? suppliers[0] },
      ]
      for (let i = 0; i < purchases.length; i++) {
        const p = purchases[i]
        if (p.items.length === 0) continue
        const totalAmount = p.items.length * 2500000
        const code = `PO-${dayOffset(p.d).replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`
        const { data: po, error } = await sb.from('purchases').insert([{
          farm_id: FARM_ID,
          purchase_code: code,
          supplier_id: p.supplier.id,
          purchase_date: dayOffset(p.d),
          total_quantity: p.items.length,
          total_amount: totalAmount,
          notes: `Mua gà từ ${p.supplier.name}`,
          performed_by: OWNER_ID,
        }]).select().single()
        if (error) { console.error(`purchase ${i}:`, error.message); continue }
        await sb.from('purchase_items').insert(p.items.map((c) => ({
          farm_id: FARM_ID,
          purchase_id: po.id,
          chicken_id: c.id,
          unit_price: 2500000,
          notes: c.name,
        })))
      }
      console.log(`✓ Created ${purchases.length} purchases + items`)
    }
  } else console.log(`✓ Skip purchases`)

  // ===== 7. TRAINING SESSIONS =====
  const { count: trCount } = await sb.from('training_sessions').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!trCount) {
    const { data: roosters } = await sb
      .from('chickens')
      .select('id, name')
      .eq('farm_id', FARM_ID)
      .eq('gender', 'trong')
      .eq('status', 'dang_nuoi')
      .limit(10)
    const sessions = []
    for (const r of roosters) {
      const numSessions = randInt(1, 4)
      for (let n = 1; n <= numSessions; n++) {
        const opp = rand(roosters.filter((x) => x.id !== r.id))
        const strength = randInt(6, 10)
        const appearance = randInt(6, 10)
        const aggression = randInt(6, 10)
        sessions.push({
          farm_id: FARM_ID,
          chicken_id: r.id,
          session_date: dayOffset(randInt(1, 60)),
          session_number: n,
          opponent_chicken_id: Math.random() < 0.5 ? opp.id : null,
          opponent_name: Math.random() < 0.5 ? null : `Đối thủ ${rand(['Trại A', 'Trại B', 'Hùng Tăng'])}`,
          duration_minutes: randInt(10, 30),
          score_strength: strength,
          score_appearance: appearance,
          score_aggression: aggression,
          result: rand(['thang', 'thua', 'hoa']),
          notes: rand(['Phong độ tốt', 'Cần luyện thêm', 'Vào form đỉnh', 'Mệt vì thời tiết']),
          performed_by: OWNER_ID,
        })
      }
    }
    const { error } = await sb.from('training_sessions').insert(sessions)
    if (error) console.error('training:', error.message)
    else console.log(`✓ Created ${sessions.length} training sessions`)
  } else console.log(`✓ Skip training (${trCount} exist)`)

  // ===== 8. BREEDING LITTERS =====
  const { count: lit } = await sb.from('breeding_litters').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!lit) {
    const { data: females } = await sb.from('chickens').select('id').eq('farm_id', FARM_ID).eq('gender', 'mai').limit(3)
    const { data: males } = await sb.from('chickens').select('id').eq('farm_id', FARM_ID).eq('gender', 'trong').limit(3)
    if (females.length && males.length) {
      const litters = [
        { female_id: females[0].id, male_id: males[0].id, paired: 60, eggs: 12, fertile: 10, hatched: 9, status: 'da_no' },
        { female_id: females[1]?.id ?? females[0].id, male_id: males[1]?.id ?? males[0].id, paired: 30, eggs: 14, fertile: 12, hatched: null, status: 'dang_ap' },
        { female_id: females[2]?.id ?? females[0].id, male_id: males[2]?.id ?? males[0].id, paired: 90, eggs: 10, fertile: 6, hatched: 4, status: 'da_no' },
      ]
      const rows = litters.map((l, i) => ({
        farm_id: FARM_ID,
        litter_code: `LIT-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`,
        female_id: l.female_id,
        male_ids: [l.male_id],
        paired_date: dayOffset(l.paired),
        expected_hatch_date: dayOffset(l.paired - 21),
        eggs_total: l.eggs,
        eggs_fertile: l.fertile,
        hatched_count: l.hatched,
        hatched_date: l.hatched ? dayOffset(l.paired - 21) : null,
        status: l.status,
        notes: `Lứa ấp #${i + 1} demo`,
        created_by: OWNER_ID,
      }))
      const { error } = await sb.from('breeding_litters').insert(rows)
      if (error) console.error('litters:', error.message)
      else console.log(`✓ Created ${rows.length} breeding litters`)
    }
  } else console.log(`✓ Skip litters`)

  // ===== 9. NEWS ARTICLES =====
  const { count: nwCount } = await sb.from('news_articles').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!nwCount) {
    const news = [
      { slug: 'cach-cham-soc-ga-choi-mua-mua', title: 'Cách chăm sóc gà chọi mùa mưa', cat: 'kinh-nghiem', body: '# Mùa mưa và sức khỏe gà chọi\n\nVào mùa mưa, gà chọi dễ mắc bệnh hô hấp, sởi, cầu trùng. Cách chăm sóc:\n\n1. Giữ chuồng khô ráo\n2. Bổ sung vitamin C, B1\n3. Phun khử trùng định kỳ\n\nNguồn: kinh nghiệm trại gà chọi miền Trung.', d: 5, views: 234 },
      { slug: 'top-5-giong-ga-choi-noi-tieng', title: 'Top 5 giống gà chọi nổi tiếng Việt Nam', cat: 'giong-ga', body: '# 5 giống gà chọi top\n\n1. **Asil** — sức bền cao, nguồn gốc Ấn Độ\n2. **Mã Lai** — đá nhanh, lì\n3. **Nòi** — giống thuần Việt, đá đẹp\n4. **Tre** — nhỏ con, máu chiến\n5. **Pedigree** — lai cao cấp\n\nMỗi giống có đặc điểm riêng — chọn theo phong cách bạn muốn.', d: 12, views: 567 },
      { slug: 'huong-dan-vacxin-newcastle', title: 'Hướng dẫn tiêm phòng Newcastle cho gà chọi', cat: 'cham-soc', body: '# Lịch tiêm Newcastle\n\n- **7 ngày tuổi**: nhỏ mắt, mũi\n- **21 ngày tuổi**: nhỏ lần 2\n- **3 tháng**: tiêm dưới da\n\nVắc xin Newcastle là quan trọng nhất. Bỏ qua = mất đàn.', d: 20, views: 1234 },
      { slug: 'che-do-an-cho-ga-vung-suc', title: 'Chế độ ăn vần sức cho gà chọi đỉnh form', cat: 'kinh-nghiem', body: '# Vần sức 3 ngày\n\nNgày 1: cám + lúa\nNgày 2: thịt nạc + rau\nNgày 3: nhịn ăn\n\nKết hợp tập đá nhẹ, gà sẽ đạt đỉnh form sau 3-5 lần vần.', d: 30, views: 890 },
      { slug: 'kinh-nghiem-chon-ga-tot', title: 'Mẹo chọn gà chọi tốt từ con choai', cat: 'kinh-nghiem', body: '# 5 dấu hiệu gà choai sẽ là chiến kê\n\n1. Mỏ to, dày\n2. Cổ dài, săn chắc\n3. Chân to, vảy đều\n4. Mắt sáng, không lờ đờ\n5. Hung hăng từ nhỏ\n\nGiá gà choai 2-3 tháng tuổi: 500k-2tr.', d: 45, views: 1567 },
    ]
    const rows = news.map((n) => ({
      farm_id: FARM_ID,
      slug: n.slug,
      title: n.title,
      excerpt: n.body.split('\n').filter((l) => l && !l.startsWith('#'))[0]?.slice(0, 150) ?? '',
      body_markdown: n.body,
      category: n.cat,
      status: 'published',
      tags: ['demo', 'kinh-nghiem'],
      view_count: n.views,
      published_at: dayOffset(n.d) + 'T08:00:00Z',
    }))
    const { error } = await sb.from('news_articles').insert(rows)
    if (error) console.error('news:', error.message)
    else console.log(`✓ Created ${rows.length} news articles`)
  } else console.log(`✓ Skip news (${nwCount} exist)`)

  // ===== 10. ALERTS =====
  const { count: alCount } = await sb.from('alerts').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!alCount) {
    const alerts = [
      { alert_type: 'low_stock', priority: 'cao', title: 'Tetracycline sắp hết', message: 'Còn 2 gói (tối thiểu 5). Đặt mua thêm.', status: 'chua_doc' },
      { alert_type: 'vaccine_expiry', priority: 'trung_binh', title: 'Vaccine Newcastle gần hết hạn', message: 'Hết hạn trong 30 ngày. Sử dụng sớm.', status: 'chua_doc' },
      { alert_type: 'overdue_vaccination', priority: 'cao', title: '5 con gà quá hạn tiêm Gumboro', message: 'Nhắc nhở: 5 con choai chưa tiêm vaccine Gumboro lần 2.', status: 'chua_doc' },
      { alert_type: 'sale_received', priority: 'thap', title: 'Đơn hàng mới SO-001', message: 'Anh Nam vừa đặt 2 gà chiến tổng 8.500.000đ', status: 'da_doc' },
      { alert_type: 'cage_overflow', priority: 'trung_binh', title: 'Lồng A-01-03 quá tải', message: 'Có 2 con trong lồng (sức chứa 1).', status: 'chua_doc' },
    ].map((a) => ({ ...a, farm_id: FARM_ID, target_users: [OWNER_ID] }))
    const { error } = await sb.from('alerts').insert(alerts)
    if (error) console.error('alerts:', error.message)
    else console.log(`✓ Created ${alerts.length} alerts`)
  } else console.log(`✓ Skip alerts (${alCount} exist)`)

  // ===== 11. ASSETS =====
  const { count: asCount } = await sb.from('assets').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!asCount) {
    const assets = [
      { kind: 'tscd', code: 'TSCD-001', name: 'Hệ thống camera giám sát', category: 'electronic', quantity: 1, unit: 'bộ', purchase_date: dayOffset(180), purchase_price: 25000000, useful_life_months: 60, salvage_value: 2000000, brand: 'Hikvision', status: 'dang_dung' },
      { kind: 'tscd', code: 'TSCD-002', name: 'Quạt thông gió công nghiệp', category: 'machine', quantity: 4, unit: 'cái', purchase_date: dayOffset(90), purchase_price: 12000000, useful_life_months: 60, salvage_value: 1000000, status: 'dang_dung' },
      { kind: 'tscd', code: 'TSCD-003', name: 'Lưới chắn chuồng inox', category: 'building', quantity: 1, unit: 'lô', purchase_date: dayOffset(365), purchase_price: 18000000, useful_life_months: 120, salvage_value: 0, status: 'dang_dung' },
      { kind: 'ccdc', code: 'CCDC-001', name: 'Cân điện tử 0-5kg', category: 'tool', quantity: 2, unit: 'cái', purchase_date: dayOffset(60), purchase_price: 850000, useful_life_months: 24, salvage_value: 0, status: 'dang_dung' },
      { kind: 'ccdc', code: 'CCDC-002', name: 'Bộ dụng cụ tiêm phòng', category: 'tool', quantity: 3, unit: 'bộ', purchase_date: dayOffset(120), purchase_price: 1200000, useful_life_months: 36, salvage_value: 0, status: 'dang_dung' },
      { kind: 'ccdc', code: 'CCDC-003', name: 'Máng ăn tự động', category: 'tool', quantity: 20, unit: 'cái', purchase_date: dayOffset(45), purchase_price: 6000000, useful_life_months: 24, salvage_value: 0, status: 'dang_dung' },
    ].map((a) => ({ ...a, farm_id: FARM_ID }))
    const { error } = await sb.from('assets').insert(assets)
    if (error) console.error('assets:', error.message)
    else console.log(`✓ Created ${assets.length} assets`)
  } else console.log(`✓ Skip assets (${asCount} exist)`)

  // ===== 12. MEDICINE & FEED TRANSACTIONS =====
  const { data: mlist } = await sb.from('medicines').select('id, code').eq('farm_id', FARM_ID)
  const { data: flist } = await sb.from('feeds').select('id, code').eq('farm_id', FARM_ID)
  const { count: mtxCount } = await sb.from('medicine_transactions').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!mtxCount && mlist?.length) {
    const mtx = []
    for (const m of mlist) {
      mtx.push({ farm_id: FARM_ID, medicine_id: m.id, transaction_type: 'nhap', quantity: 50, transaction_date: dayOffset(60), cost: 500000, notes: 'Nhập kho ban đầu', performed_by: OWNER_ID })
      mtx.push({ farm_id: FARM_ID, medicine_id: m.id, transaction_type: 'xuat', quantity: 5, transaction_date: dayOffset(15), cost: 50000, notes: 'Sử dụng cho đàn', performed_by: OWNER_ID })
    }
    const { error } = await sb.from('medicine_transactions').insert(mtx)
    if (error) console.error('medicine_tx:', error.message)
    else console.log(`✓ Created ${mtx.length} medicine transactions`)
  } else console.log(`✓ Skip medicine_tx`)

  if (flist?.length) {
    const { count: ftxCount } = await sb.from('feed_transactions').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
    if (!ftxCount) {
      const ftx = []
      for (const f of flist) {
        ftx.push({ farm_id: FARM_ID, feed_id: f.id, transaction_type: 'nhap', quantity: 100, transaction_date: dayOffset(30), cost: 1400000, notes: 'Nhập đợt 1', performed_by: OWNER_ID })
        ftx.push({ farm_id: FARM_ID, feed_id: f.id, transaction_type: 'xuat', quantity: 30, transaction_date: dayOffset(7), cost: 420000, notes: 'Cho ăn tuần', performed_by: OWNER_ID })
      }
      const { error } = await sb.from('feed_transactions').insert(ftx)
      if (error) console.error('feed_tx:', error.message)
      else console.log(`✓ Created ${ftx.length} feed transactions`)
    } else console.log(`✓ Skip feed_tx`)
  }

  // ===== 13. CUSTOMER REVIEWS =====
  const { count: revCount } = await sb.from('customer_reviews').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  if (!revCount && customers?.length) {
    const reviews = [
      { customer_id: customers[0].id, rating: 5, comment: 'Gà đẹp, đá rất tốt. Anh chủ chu đáo, sẽ ủng hộ tiếp!', is_public: true },
      { customer_id: customers[1].id, rating: 5, comment: 'Mua được mái Asil khoẻ, đẻ trứng đều. Cảm ơn trại!', is_public: true },
      { customer_id: customers[3].id, rating: 4, comment: 'Cặp gà tốt, đá chiến hay. Giá hơi cao nhưng xứng đáng.', is_public: true },
    ].map((r) => ({ ...r, farm_id: FARM_ID, reviewed_at: new Date().toISOString() }))
    const { error } = await sb.from('customer_reviews').insert(reviews)
    if (error) console.error('reviews:', error.message)
    else console.log(`✓ Created ${reviews.length} customer reviews`)
  } else console.log(`✓ Skip reviews`)

  console.log('\n🎉 Comprehensive seed done!')
}

main().catch((e) => { console.error(e); process.exit(1) })
