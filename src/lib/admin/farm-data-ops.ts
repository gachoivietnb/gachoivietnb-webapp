import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Wipe + seed demo helpers — used by Super Admin page to switch a farm
 * between "demo data" and "empty data" states.
 *
 * Caller is responsible for passing a service-role Supabase client
 * (createAdminClient()) so RLS doesn't block these batch operations.
 */

const dayOffset = (d: number) => {
  const dt = new Date()
  dt.setDate(dt.getDate() - d)
  return dt.toISOString().slice(0, 10)
}
const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randInt = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a
const pic = (id: string) => `https://picsum.photos/seed/${id}/800/600`

/* ============================================================
 * WIPE — xoá toàn bộ data của 1 farm, GIỮ structural seed
 * ============================================================ */

export async function wipeFarmData(admin: SupabaseClient, farmId: string) {
  // Order matters: delete child tables first to satisfy FK constraints
  const deletions: Array<[string, string]> = [
    ['diary_comments', 'farm_id'],
    ['diary_entries', 'farm_id'],
    ['customer_reviews', 'farm_id'],
    ['sales_items', 'farm_id'],
    ['sales_orders', 'farm_id'],
    ['purchase_items', 'farm_id'],
    ['purchases', 'farm_id'],
    ['training_sessions', 'farm_id'],
    ['breeding_litters', 'farm_id'],
    ['medicine_transactions', 'farm_id'],
    ['feed_transactions', 'farm_id'],
    ['cash_transactions', 'farm_id'],
    ['cash_transfers', 'farm_id'],
    ['expenses', 'farm_id'],
    ['payroll_payments', 'farm_id'],
    ['staff_attendance', 'farm_id'],
    ['staff_assignments', 'farm_id'],
    ['vaccinations', 'farm_id'],
    ['chicken_media', 'farm_id'],
    ['chick_groups', 'farm_id'],
  ]
  for (const [table, col] of deletions) {
    await admin.from(table).delete().eq(col, farmId)
  }

  // Reset qr_tags to unused
  await admin
    .from('qr_tags')
    .update({ chicken_id: null, status: 'chua_su_dung', assigned_at: null })
    .eq('farm_id', farmId)

  // Now delete chickens (qr_tags FK cleared above)
  await admin.from('chickens').delete().eq('farm_id', farmId)

  // Independent tables
  const moreDeletions: Array<[string, string]> = [
    ['customer_alerts', 'farm_id'],
    ['customers', 'farm_id'],
    ['suppliers', 'farm_id'],
    ['medicines', 'farm_id'],
    ['feeds', 'farm_id'],
    ['news_articles', 'farm_id'],
    ['alerts', 'farm_id'],
    ['asset_events', 'farm_id'],
    ['assets', 'farm_id'],
    ['activity_logs', 'farm_id'],
    ['ai_generations', 'farm_id'],
    ['farm_media', 'farm_id'],
    ['contact_inquiries', 'farm_id'],
  ]
  for (const [table, col] of moreDeletions) {
    await admin.from(table).delete().eq(col, farmId)
  }

  // Reset cash_account balances to 0 (but keep accounts so user has something to log into)
  await admin.from('cash_accounts').update({ initial_balance: 0 }).eq('farm_id', farmId)
}

/* ============================================================
 * SEED — populate demo data cho 1 farm (đã có structural seed)
 * ============================================================ */

export async function seedDemoData(
  admin: SupabaseClient,
  farmId: string,
  ownerId: string
) {
  const SUFFIX = '_' + farmId.slice(-4)

  // Structural data — create if missing
  let { data: areas } = await admin.from('areas').select('id, code').eq('farm_id', farmId).order('display_order')
  if (!areas?.length) {
    const newAreas = [
      { code: 'A', name_vi: 'Khu A - Trống chiến', type: 'duc', display_order: 1 },
      { code: 'B', name_vi: 'Khu B - Mái giống', type: 'mai', display_order: 2 },
      { code: 'C', name_vi: 'Khu C - Choai', type: 'trong', display_order: 3 },
      { code: 'D', name_vi: 'Khu D - Ghép đôi', type: 'ghep_doi', display_order: 4 },
      { code: 'E', name_vi: 'Khu E - Cách ly', type: 'cach_ly', display_order: 5 },
    ]
    const { data } = await admin
      .from('areas')
      .insert(newAreas.map((a) => ({ ...a, farm_id: farmId, is_active: true })))
      .select()
    areas = data
  }
  if (!areas?.length) throw new Error('Không tạo được areas')

  let { data: cats } = await admin.from('expense_categories').select('id, code').eq('farm_id', farmId)
  if (!cats?.length) {
    const newCats = [
      { code: 'thuc_an' + SUFFIX, name_vi: 'Thức ăn', display_order: 1 },
      { code: 'nhan_cong' + SUFFIX, name_vi: 'Nhân công', display_order: 2 },
      { code: 'thuoc_thu_y' + SUFFIX, name_vi: 'Thuốc thú y', display_order: 3 },
      { code: 'dien_nuoc' + SUFFIX, name_vi: 'Điện nước', display_order: 4 },
      { code: 'khau_hao' + SUFFIX, name_vi: 'Khấu hao', display_order: 5 },
      { code: 'van_chuyen' + SUFFIX, name_vi: 'Vận chuyển', display_order: 6 },
      { code: 'marketing' + SUFFIX, name_vi: 'Marketing', display_order: 7 },
      { code: 'du_phong' + SUFFIX, name_vi: 'Dự phòng', display_order: 8 },
    ]
    const { data } = await admin
      .from('expense_categories')
      .insert(newCats.map((c) => ({ ...c, farm_id: farmId, is_active: true })))
      .select()
    cats = data
  }
  const catByCode: Record<string, string> = {}
  for (const c of cats ?? []) {
    const key = (c.code as string).replace(SUFFIX, '')
    catByCode[key] = c.id as string
  }

  const { count: vCount } = await admin
    .from('vaccines')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', farmId)
  if (!vCount) {
    const v = [
      { code: 'NEW7' + SUFFIX, name_vi: 'Newcastle - lần 1', default_age_days: 7, display_order: 1 },
      { code: 'GUM14' + SUFFIX, name_vi: 'Gumboro - lần 1', default_age_days: 14, display_order: 2 },
      { code: 'NEW21' + SUFFIX, name_vi: 'Newcastle - lần 2', default_age_days: 21, display_order: 3 },
      { code: 'GUM28' + SUFFIX, name_vi: 'Gumboro - lần 2', default_age_days: 28, display_order: 4 },
      { code: 'CRD60' + SUFFIX, name_vi: 'CRD - 2 tháng', default_age_days: 60, display_order: 5 },
      { code: 'NEW90' + SUFFIX, name_vi: 'Newcastle - tăng cường', default_age_days: 90, display_order: 6 },
    ]
    await admin.from('vaccines').insert(v.map((x) => ({ ...x, farm_id: farmId, is_active: true, is_required: true })))
  }

  const { count: qCount } = await admin
    .from('qr_tags')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', farmId)
  if (!qCount) {
    const { data: maxTag } = await admin
      .from('qr_tags')
      .select('tag_number')
      .order('tag_number', { ascending: false })
      .limit(1)
    let start = ((maxTag?.[0]?.tag_number as number) ?? 0) + 1
    const tags: Array<{ farm_id: string; tag_number: number; status: string }> = []
    for (let i = 0; i < 200; i++) {
      tags.push({ farm_id: farmId, tag_number: start + i, status: 'chua_su_dung' })
    }
    for (let i = 0; i < tags.length; i += 100) {
      await admin.from('qr_tags').insert(tags.slice(i, i + 100))
    }
  }

  // Cage rows + cages
  let { data: cageRows } = await admin.from('cage_rows').select('id, area_id, code').eq('farm_id', farmId)
  if (!cageRows?.length) {
    const rows = areas.map((a) => ({
      farm_id: farmId,
      area_id: a.id,
      code: '01',
      name_vi: `Hàng 01 - Khu ${a.code}`,
      is_active: true,
    }))
    const { data } = await admin.from('cage_rows').insert(rows).select()
    cageRows = data
  }

  let { data: cages } = await admin.from('cages').select('id').eq('farm_id', farmId)
  if (!cages?.length && cageRows) {
    const newCages: Array<Record<string, unknown>> = []
    for (const cr of cageRows) {
      const areaCode = areas.find((a) => a.id === cr.area_id)?.code
      for (let i = 1; i <= 12; i++) {
        newCages.push({
          farm_id: farmId,
          row_id: cr.id,
          code: String(i).padStart(2, '0'),
          full_code: `${areaCode}-${cr.code}-${String(i).padStart(2, '0')}`,
          capacity: 2,
          status: 'trong',
        })
      }
    }
    const { data } = await admin.from('cages').insert(newCages).select()
    cages = data
  }
  if (!cages?.length) throw new Error('Không tạo được cages')

  // Chickens
  const { data: breeds } = await admin.from('breeds').select('id, code')
  const { count: cCount } = await admin
    .from('chickens')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', farmId)
  if (!cCount) {
    const { data: tags } = await admin
      .from('qr_tags')
      .select('id, tag_number')
      .eq('farm_id', farmId)
      .is('chicken_id', null)
      .order('tag_number')
      .limit(80)
    const NAMES = [
      'Hắc Long', 'Bạch Hổ', 'Kim Kê', 'Phong Vân', 'Vô Địch', 'Sấm Sét', 'Ngọc Long',
      'Phượng Hoàng', 'Thiên Lôi', 'Bão Tố', 'Chiến Thần', 'Hoả Long', 'Thanh Long',
      'Tướng Quân', 'Đại Bàng', 'Thần Kê', 'Vạn Thắng', 'Bá Vương', 'Hồng Hà', 'Lôi Kim',
      'Mãnh Hổ', 'Thiết Kê', 'Phi Long', 'Hắc Phụng', 'Tử Vi', 'Hỏa Phụng', 'Kim Long',
      'Bạch Phụng', 'Thanh Vân', 'Vũ Long', 'Thiên Mã', 'Long Vương', 'Bích Vũ', 'Hoàng Kim',
      'Thiên Tướng', 'Thiết Quyền', 'Vô Song', 'Hùng Bá', 'Tử Long', 'Tuyết Sư',
    ]
    const colors = ['đen', 'điều', 'xám', 'tía', 'ô', 'nhạn', 'xanh']
    const today = new Date()
    const rows: Array<Record<string, unknown>> = []
    for (let i = 0; i < (tags?.length ?? 0); i++) {
      const isMale = Math.random() > 0.45
      const ageMonths = randInt(2, 24)
      const birth = new Date(today)
      birth.setMonth(birth.getMonth() - ageMonths)
      const num = String((tags![i].tag_number as number)).padStart(4, '0')
      const r = Math.random()
      const status = r < 0.04 ? 'chet' : r < 0.08 ? 'loai_thai' : 'dang_nuoi'
      rows.push({
        farm_id: farmId,
        chicken_code: `GA${num}`,
        name: NAMES[i] ?? `Chiến Kê #${i + 1}`,
        breed_id: rand(breeds ?? []).id,
        qr_tag_id: tags![i].id,
        cage_id: status === 'dang_nuoi' ? rand(cages).id : null,
        gender: isMale ? 'trong' : 'mai',
        birth_date: birth.toISOString().slice(0, 10),
        source: Math.random() < 0.7 ? 'no_tai_trai' : 'mua',
        weight_kg: isMale ? 2.5 + Math.random() * 1.0 : 2.0 + Math.random() * 0.6,
        color: rand(colors),
        status,
        is_for_sale: status === 'dang_nuoi' && Math.random() < 0.25,
        listed_price:
          status === 'dang_nuoi' && Math.random() < 0.25 ? randInt(3000000, 15000000) : null,
        created_by: ownerId,
      })
    }
    for (let i = 0; i < rows.length; i += 30) {
      const batch = rows.slice(i, i + 30)
      const { data } = await admin.from('chickens').insert(batch).select('id, qr_tag_id')
      if (data) {
        for (const c of data) {
          await admin
            .from('qr_tags')
            .update({ chicken_id: c.id, status: 'dang_su_dung', assigned_at: new Date().toISOString() })
            .eq('id', c.qr_tag_id)
        }
      }
    }
  }

  // Assign random parents (depth 2-3)
  const { data: allChickens } = await admin
    .from('chickens')
    .select('id, gender, birth_date, parent_male_id, parent_female_id')
    .eq('farm_id', farmId)
    .order('birth_date', { ascending: true })
  if (allChickens) {
    const monthsBetween = (a: string, b: string) =>
      (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24 * 30)
    for (const c of allChickens) {
      if (c.parent_male_id || c.parent_female_id) continue
      const fathers = allChickens.filter(
        (x) => x.id !== c.id && x.gender === 'trong' && monthsBetween(c.birth_date, x.birth_date) < -3
      )
      const mothers = allChickens.filter(
        (x) => x.id !== c.id && x.gender === 'mai' && monthsBetween(c.birth_date, x.birth_date) < -3
      )
      if (!fathers.length || !mothers.length) continue
      await admin
        .from('chickens')
        .update({ parent_male_id: rand(fathers).id, parent_female_id: rand(mothers).id })
        .eq('id', c.id)
    }
  }

  // Customers
  const { count: custC } = await admin
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', farmId)
  if (!custC) {
    await admin.from('customers').insert(
      [
        { name: 'Anh Nam', phone: '0912345678', zalo: '0912345678', address: 'Bình Định', tier: 'vip' },
        { name: 'Cô Lan', phone: '0987654321', zalo: '0987654321', address: 'Đồng Tháp', tier: 'thuong' },
        { name: 'Chú Hùng', phone: '0901112233', zalo: '0901112233', address: 'Tây Ninh', tier: 'thuong' },
        { name: 'Anh Tuấn', phone: '0978889999', zalo: '0978889999', address: 'Long An', tier: 'vip' },
        { name: 'Chị Mai', phone: '0945678901', zalo: '0945678901', address: 'Cần Thơ', tier: 'thuong' },
      ].map((c) => ({ ...c, farm_id: farmId }))
    )
  }

  // Suppliers
  const { count: supC } = await admin
    .from('suppliers')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', farmId)
  if (!supC) {
    await admin.from('suppliers').insert(
      [
        { name: 'Trại Asil Long Phụng', phone: '0901234567', address: 'Bình Dương', supplier_type: 'gà giống' },
        { name: 'Cám Con Cò', phone: '0987655443', address: 'Long An', supplier_type: 'thức ăn' },
        { name: 'Thuốc Thú y Minh Trâm', phone: '0934567890', address: 'TP HCM', supplier_type: 'thuốc' },
      ].map((s) => ({ ...s, farm_id: farmId, is_active: true }))
    )
  }

  // Medicines + feeds
  if (!(await admin.from('medicines').select('id', { count: 'exact', head: true }).eq('farm_id', farmId)).count) {
    await admin.from('medicines').insert(
      [
        { code: 'AMOX' + SUFFIX, name_vi: 'Amoxicillin 250mg', unit: 'viên', current_stock: 200, min_stock_alert: 50, cost_per_unit: 1500 },
        { code: 'VITC' + SUFFIX, name_vi: 'Vitamin C tổng hợp', unit: 'gói', current_stock: 30, min_stock_alert: 5, cost_per_unit: 25000 },
        { code: 'TYL' + SUFFIX, name_vi: 'Tylosin 100ml', unit: 'chai', current_stock: 8, min_stock_alert: 3, cost_per_unit: 180000 },
        { code: 'TET' + SUFFIX, name_vi: 'Tetracycline', unit: 'gói', current_stock: 2, min_stock_alert: 5, cost_per_unit: 35000 },
      ].map((m) => ({ ...m, farm_id: farmId, is_active: true }))
    )
  }
  if (!(await admin.from('feeds').select('id', { count: 'exact', head: true }).eq('farm_id', farmId)).count) {
    await admin.from('feeds').insert(
      [
        { code: 'CC1' + SUFFIX, name_vi: 'Cám gà tăng trọng', unit: 'kg', current_stock: 250, min_stock_alert: 50, cost_per_unit: 14000 },
        { code: 'LUA' + SUFFIX, name_vi: 'Lúa', unit: 'kg', current_stock: 500, min_stock_alert: 100, cost_per_unit: 9500 },
        { code: 'NGO' + SUFFIX, name_vi: 'Ngô vàng', unit: 'kg', current_stock: 200, min_stock_alert: 50, cost_per_unit: 11000 },
      ].map((f) => ({ ...f, farm_id: farmId, is_active: true }))
    )
  }

  // Cash accounts
  const { data: existAcc } = await admin
    .from('cash_accounts')
    .select('id, account_type, is_default')
    .eq('farm_id', farmId)
  let accs = existAcc ?? []
  if (!accs.length) {
    const { data } = await admin
      .from('cash_accounts')
      .insert([
        { farm_id: farmId, name: 'Két tiền mặt', account_type: 'cash', initial_balance: 10000000, is_default: true, is_active: true, color: 'from-emerald-500 to-teal-500', icon: '💵' },
        { farm_id: farmId, name: 'Vietcombank', account_type: 'bank', bank_name: 'Vietcombank', account_number: '0123456789', initial_balance: 25000000, is_active: true, color: 'from-green-600 to-emerald-700', icon: '🏦', display_order: 1 },
      ])
      .select()
    accs = data ?? []
  } else {
    // Restore initial balances if they were wiped to 0
    await admin
      .from('cash_accounts')
      .update({ initial_balance: 10000000 })
      .eq('farm_id', farmId)
      .eq('is_default', true)
  }

  // Expenses
  if (!(await admin.from('expenses').select('id', { count: 'exact', head: true }).eq('farm_id', farmId)).count) {
    const exps = [
      { d: 1, code: 'thuc_an', amount: 2500000, desc: 'Mua cám gà 50kg' },
      { d: 3, code: 'thuoc_thu_y', amount: 850000, desc: 'Mua thuốc phòng bệnh' },
      { d: 5, code: 'dien_nuoc', amount: 320000, desc: 'Tiền điện tháng' },
      { d: 7, code: 'thuc_an', amount: 2700000, desc: 'Mua cám đợt 2' },
      { d: 14, code: 'nhan_cong', amount: 5000000, desc: 'Lương nhân viên' },
      { d: 18, code: 'du_phong', amount: 450000, desc: 'Sửa chuồng' },
      { d: 22, code: 'thuoc_thu_y', amount: 620000, desc: 'Vitamin tổng hợp' },
      { d: 25, code: 'marketing', amount: 800000, desc: 'Quảng cáo Zalo' },
      { d: 28, code: 'van_chuyen', amount: 350000, desc: 'Ship gà' },
    ]
    await admin.from('expenses').insert(
      exps
        .filter((e) => catByCode[e.code])
        .map((e) => ({
          farm_id: farmId,
          expense_date: dayOffset(e.d),
          category_id: catByCode[e.code],
          amount: e.amount,
          description: e.desc,
          performed_by: ownerId,
        }))
    )
  }

  // Cash transactions
  if (
    !(await admin.from('cash_transactions').select('id', { count: 'exact', head: true }).eq('farm_id', farmId)).count
  ) {
    const cashAcc = accs.find((a) => a.is_default) ?? accs[0]
    const bankAcc = accs.find((a) => a.account_type === 'bank') ?? cashAcc
    if (cashAcc && bankAcc) {
      const tx = [
        { d: 28, dir: 'in', amount: 8500000, cat: 'sale', desc: 'Bán gà chiến cho anh Nam', acc: cashAcc.id },
        { d: 25, dir: 'out', amount: 2700000, cat: 'expense', desc: 'Mua cám', acc: cashAcc.id },
        { d: 21, dir: 'in', amount: 12000000, cat: 'sale', desc: 'Bán cặp Asil cho anh Tuấn', acc: bankAcc.id },
        { d: 14, dir: 'out', amount: 5000000, cat: 'payroll', desc: 'Trả lương nhân viên', acc: bankAcc.id },
        { d: 5, dir: 'in', amount: 30000000, cat: 'capital_in', desc: 'Vốn ban đầu', acc: bankAcc.id },
      ]
      await admin.from('cash_transactions').insert(
        tx.map((t) => ({
          farm_id: farmId,
          account_id: t.acc,
          direction: t.dir,
          amount: t.amount,
          category: t.cat,
          transaction_date: dayOffset(t.d),
          description: t.desc,
          created_by: ownerId,
        }))
      )
    }
  }

  // Sales orders (with chicken FK)
  if (
    !(await admin.from('sales_orders').select('id', { count: 'exact', head: true }).eq('farm_id', farmId)).count
  ) {
    const { data: forSale } = await admin
      .from('chickens')
      .select('id, name')
      .eq('farm_id', farmId)
      .eq('status', 'dang_nuoi')
      .eq('gender', 'trong')
      .limit(8)
    const { data: customers } = await admin.from('customers').select('id, name').eq('farm_id', farmId).limit(5)
    if (forSale && customers && forSale.length >= 4 && customers.length >= 4) {
      const tpl = [
        { d: 30, status: 'da_giao', cust: 0, items: 2, payment: 'tien_mat' },
        { d: 25, status: 'da_giao', cust: 1, items: 1, payment: 'chuyen_khoan' },
        { d: 15, status: 'dat_coc', cust: 2, items: 1, payment: 'tien_mat' },
        { d: 5, status: 'hoi_mua', cust: 3, items: 1, payment: null },
      ]
      let idx = 0
      for (let i = 0; i < tpl.length; i++) {
        const o = tpl[i]
        if (idx + o.items > forSale.length) break
        const items = forSale.slice(idx, idx + o.items)
        idx += o.items
        const total = items.reduce((s, _, k) => s + (3500000 + k * 1500000), 0)
        const code = `SO-${dayOffset(o.d).replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`
        const { data: order } = await admin
          .from('sales_orders')
          .insert([
            {
              farm_id: farmId,
              order_code: code,
              customer_id: customers[o.cust].id,
              order_date: dayOffset(o.d),
              status: o.status,
              deposit_amount: o.status === 'dat_coc' ? Math.floor(total * 0.3) : 0,
              total_amount: total,
              paid_amount:
                o.status === 'da_giao' ? total : o.status === 'dat_coc' ? Math.floor(total * 0.3) : 0,
              payment_method: o.payment,
              delivered_date: o.status === 'da_giao' ? dayOffset(o.d) : null,
              notes: `Đơn cho ${customers[o.cust].name}`,
              performed_by: ownerId,
            },
          ])
          .select()
          .single()
        if (!order) continue
        await admin.from('sales_items').insert(
          items.map((c, k) => ({
            farm_id: farmId,
            sales_order_id: order.id,
            chicken_id: c.id,
            unit_price: 3500000 + k * 1500000,
            notes: c.name,
          }))
        )
        if (o.status === 'da_giao') {
          await admin
            .from('chickens')
            .update({
              status: 'da_ban',
              sale_date: dayOffset(o.d),
              customer_id: customers[o.cust].id,
              sale_price: total / o.items,
            })
            .in(
              'id',
              items.map((c) => c.id)
            )
        }
      }
    }
  }

  // News
  if (!(await admin.from('news_articles').select('id', { count: 'exact', head: true }).eq('farm_id', farmId)).count) {
    const news = [
      { slug: 'cach-cham-soc-mua-mua-' + farmId.slice(-4), title: 'Cách chăm sóc gà chọi mùa mưa', cat: 'kinh-nghiem', body: '# Mùa mưa\n\nGiữ chuồng khô, bổ sung vitamin C, B1.', d: 5, views: 234 },
      { slug: 'top-5-giong-' + farmId.slice(-4), title: 'Top 5 giống gà chọi nổi tiếng', cat: 'giong-ga', body: '# 5 giống top\n\n1. Asil\n2. Mã Lai\n3. Nòi\n4. Tre\n5. Pedigree', d: 12, views: 567 },
      { slug: 'huong-dan-newcastle-' + farmId.slice(-4), title: 'Hướng dẫn tiêm Newcastle', cat: 'cham-soc', body: '# Lịch tiêm\n\n7d: nhỏ mắt\n21d: nhỏ lần 2', d: 20, views: 1234 },
    ]
    await admin.from('news_articles').insert(
      news.map((n) => ({
        farm_id: farmId,
        slug: n.slug,
        title: n.title,
        excerpt: n.body.split('\n').filter((l) => l && !l.startsWith('#'))[0]?.slice(0, 150) ?? '',
        body_markdown: n.body,
        category: n.cat,
        status: 'published',
        tags: ['demo'],
        view_count: n.views,
        published_at: dayOffset(n.d) + 'T08:00:00Z',
      }))
    )
  }

  // Assets
  if (!(await admin.from('assets').select('id', { count: 'exact', head: true }).eq('farm_id', farmId)).count) {
    await admin.from('assets').insert(
      [
        { kind: 'tscd', code: 'TSCD-001', name: 'Hệ thống camera', category: 'electronic', quantity: 1, unit: 'bộ', purchase_date: dayOffset(180), purchase_price: 25000000, useful_life_months: 60, salvage_value: 2000000, status: 'dang_dung' },
        { kind: 'tscd', code: 'TSCD-002', name: 'Quạt thông gió', category: 'machine', quantity: 4, unit: 'cái', purchase_date: dayOffset(90), purchase_price: 12000000, useful_life_months: 60, salvage_value: 1000000, status: 'dang_dung' },
        { kind: 'ccdc', code: 'CCDC-001', name: 'Cân điện tử', category: 'tool', quantity: 2, unit: 'cái', purchase_date: dayOffset(60), purchase_price: 850000, useful_life_months: 24, salvage_value: 0, status: 'dang_dung' },
        { kind: 'ccdc', code: 'CCDC-002', name: 'Bộ tiêm phòng', category: 'tool', quantity: 3, unit: 'bộ', purchase_date: dayOffset(120), purchase_price: 1200000, useful_life_months: 36, salvage_value: 0, status: 'dang_dung' },
      ].map((a) => ({ ...a, farm_id: farmId }))
    )
  }

  // Diary
  if (!(await admin.from('diary_entries').select('id', { count: 'exact', head: true }).eq('farm_id', farmId)).count) {
    const entries = [
      { d: 0, cat: 'cho_an', mood: 'binh_thuong', title: 'Cho ăn sáng', content: 'Cho cám trộn rau, gà ăn ngon miệng. Nước sạch đã thay.', tags: ['#cho-an'], weather: 'nắng', imgs: 1 },
      { d: 2, cat: 'huan_luyen', mood: 'tot', title: 'Vần gà sáng - Hắc Long phong độ đỉnh', content: 'Vần 5 con trống chiến lúc 6h sáng. **Hắc Long** thể lực vượt trội.', tags: ['#luyện-tập'], weather: 'nắng', imgs: 2 },
      { d: 5, cat: 've_sinh', mood: 'binh_thuong', title: 'Tổng vệ sinh khu A', content: 'Dọn sạch tất cả lồng. Phun thuốc sát trùng Bencocid 1:200.', tags: ['#vệ-sinh'], weather: 'nắng', imgs: 1 },
      { d: 7, cat: 'kinh_doanh', mood: 'rat_tot', title: 'Bán cặp Asil cho khách Bình Định', content: 'Bán 1 cặp gà Asil cho **Anh Tuấn** giá 12.000.000đ.\n\nKhách hài lòng.', tags: ['#bán-hàng', '#asil'], weather: 'nắng', imgs: 1 },
      { d: 10, cat: 'cham_soc', mood: 'tot', title: 'Bổ sung vitamin tổng hợp', content: 'Trộn vitamin ADE-B-Complex vào nước uống 3 ngày liên tiếp.', tags: ['#vitamin'], weather: 'nắng', imgs: 0 },
      { d: 14, cat: 'sinh_san', mood: 'rat_tot', title: 'Mái Bạch Hổ đẻ trứng đầu', content: '**Bạch Hổ** đẻ 8 trứng đầu tiên! Trứng to đều, đã chuyển vào máy ấp.', tags: ['#sinh-sản'], weather: 'nắng', imgs: 2 },
      { d: 20, cat: 'su_co', mood: 'rat_xau', title: 'Mất điện 4 tiếng', content: 'Khu vực mất điện 11h-15h. Nhiệt độ chuồng tăng 38°C. May không có gà sốc nhiệt.', tags: ['#sự-cố'], weather: 'nắng', imgs: 1 },
    ]
    await admin.from('diary_entries').insert(
      entries.map((e) => ({
        farm_id: farmId,
        author_id: ownerId,
        diary_date: dayOffset(e.d),
        category: e.cat,
        mood: e.mood,
        title: e.title,
        content: e.content,
        tags: e.tags,
        attachments: Array.from({ length: e.imgs }, (_, i) => pic(`${farmId.slice(-4)}-${e.d}-${i}`)),
        weather: e.weather,
        is_pinned: e.d === 7 || e.d === 14,
      }))
    )
  }
}

/* ============================================================
 * Counts — đọc tóm tắt cho UI
 * ============================================================ */

export type FarmDataCounts = {
  chickens: number
  customers: number
  sales_orders: number
  expenses: number
  diary_entries: number
  cash_transactions: number
  news_articles: number
  assets: number
  alerts: number
}

export async function readFarmDataCounts(
  admin: SupabaseClient,
  farmId: string
): Promise<FarmDataCounts> {
  const tables: Array<keyof FarmDataCounts> = [
    'chickens', 'customers', 'sales_orders', 'expenses', 'diary_entries',
    'cash_transactions', 'news_articles', 'assets', 'alerts',
  ]
  const result = {} as FarmDataCounts
  await Promise.all(
    tables.map(async (t) => {
      const { count } = await admin.from(t).select('id', { count: 'exact', head: true }).eq('farm_id', farmId)
      result[t] = count ?? 0
    })
  )
  return result
}
