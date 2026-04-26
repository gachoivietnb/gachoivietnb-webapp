#!/usr/bin/env node
/**
 * Bổ sung dữ liệu demo phong phú cho cash_transactions + cash_transfers
 * trải đều 90 ngày, đa dạng category để dashboard quản lý quỹ có gì xem.
 *
 * Chạy: FARM_ID=... OWNER_ID=... node scripts/seed-treasury-rich.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const FARM_ID = process.env.FARM_ID
const OWNER_ID = process.env.OWNER_ID
if (!url || !key || !FARM_ID) { console.error('Missing env'); process.exit(1) }
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const dayOffset = (d) => {
  const dt = new Date()
  dt.setDate(dt.getDate() - d)
  return dt.toISOString().slice(0, 10)
}

async function main() {
  console.log(`💰 Seeding rich treasury data for ${FARM_ID}...`)

  // Ensure 2 accounts exist
  let { data: accs } = await sb.from('cash_accounts').select('id, account_type, is_default, name').eq('farm_id', FARM_ID)
  if (!accs?.length) {
    const { data } = await sb
      .from('cash_accounts')
      .insert([
        { farm_id: FARM_ID, name: 'Két tiền mặt', account_type: 'cash', initial_balance: 10000000, is_default: true, is_active: true, color: 'from-emerald-500 to-teal-500', icon: '💵' },
        { farm_id: FARM_ID, name: 'Vietcombank', account_type: 'bank', bank_name: 'Vietcombank', account_number: '0123456789', initial_balance: 25000000, is_active: true, color: 'from-green-600 to-emerald-700', icon: '🏦', display_order: 1 },
      ])
      .select()
    accs = data ?? []
  }
  const cashAcc = accs.find((a) => a.is_default) ?? accs.find((a) => a.account_type === 'cash') ?? accs[0]
  const bankAcc = accs.find((a) => a.account_type === 'bank') ?? cashAcc
  if (!cashAcc || !bankAcc) {
    console.error('No accounts found')
    return
  }
  console.log(`✓ Accounts: ${cashAcc.name} + ${bankAcc.name}`)

  // 40+ realistic transactions across 90 days
  const tx = [
    // ====== CAPITAL & OPENING (ngày 90+) ======
    { d: 90, dir: 'in', amt: 50000000, cat: 'capital_in', desc: 'Vốn góp ban đầu — chủ trại', acc: bankAcc.id },
    { d: 88, dir: 'in', amt: 20000000, cat: 'opening', desc: 'Số dư ngày khai trương', acc: cashAcc.id },

    // ====== T1 (60-90 ngày trước) ======
    { d: 85, dir: 'out', amt: 15000000, cat: 'purchase', desc: 'Mua 5 con Asil giống — anh Phụng Bình Dương', acc: bankAcc.id },
    { d: 82, dir: 'out', amt: 3500000, cat: 'expense', desc: 'Mua cám Con Cò + lúa', acc: cashAcc.id },
    { d: 80, dir: 'out', amt: 1200000, cat: 'expense', desc: 'Mua thuốc thú y đợt 1', acc: cashAcc.id },
    { d: 78, dir: 'out', amt: 2500000, cat: 'expense', desc: 'Lắp camera giám sát', acc: bankAcc.id },
    { d: 75, dir: 'in', amt: 8000000, cat: 'sale', desc: 'Bán cặp Asil cho anh Hùng Tây Ninh', acc: bankAcc.id },
    { d: 72, dir: 'out', amt: 450000, cat: 'expense', desc: 'Tiền điện tháng', acc: cashAcc.id },
    { d: 70, dir: 'out', amt: 5000000, cat: 'payroll', desc: 'Lương nhân viên tháng', acc: bankAcc.id },
    { d: 68, dir: 'in', amt: 4500000, cat: 'sale', desc: 'Bán mái Asil giống — cô Lan Đồng Tháp', acc: cashAcc.id },
    { d: 65, dir: 'out', amt: 800000, cat: 'expense', desc: 'Mua vitamin tổng hợp + men tiêu hoá', acc: cashAcc.id },
    { d: 62, dir: 'out', amt: 1500000, cat: 'expense', desc: 'Sửa chuồng — gia cố lưới', acc: cashAcc.id },

    // Transfer cash → bank (sau bán nhiều tiền mặt)
    { d: 60, dir: 'out', amt: 5000000, cat: 'transfer_out', desc: 'Chuyển tiền mặt vào ngân hàng', acc: cashAcc.id, transferPair: 'p1' },
    { d: 60, dir: 'in', amt: 5000000, cat: 'transfer_in', desc: 'Nhận chuyển từ Két tiền mặt', acc: bankAcc.id, transferPair: 'p1' },

    // ====== T2 (30-60 ngày) ======
    { d: 58, dir: 'out', amt: 3200000, cat: 'expense', desc: 'Mua cám đợt 2', acc: cashAcc.id },
    { d: 55, dir: 'in', amt: 12000000, cat: 'sale', desc: 'Bán cặp Asil + Mã Lai cho anh Tuấn Long An', acc: bankAcc.id },
    { d: 52, dir: 'out', amt: 350000, cat: 'expense', desc: 'Ship gà cho khách Bình Định', acc: cashAcc.id },
    { d: 50, dir: 'out', amt: 600000, cat: 'expense', desc: 'Mua thuốc tẩy giun + vaccine Newcastle', acc: cashAcc.id },
    { d: 48, dir: 'in', amt: 6000000, cat: 'sale', desc: 'Bán 3 mái giống — chị Mai Cần Thơ', acc: cashAcc.id },
    { d: 45, dir: 'out', amt: 250000, cat: 'expense', desc: 'Tiền nước', acc: cashAcc.id },
    { d: 42, dir: 'out', amt: 5000000, cat: 'payroll', desc: 'Lương nhân viên tháng', acc: bankAcc.id },
    { d: 40, dir: 'in', amt: 3500000, cat: 'sale', desc: 'Bán Mã Lai chiến — chú Hùng', acc: cashAcc.id },
    { d: 38, dir: 'out', amt: 800000, cat: 'expense', desc: 'Marketing — Quảng cáo Zalo + Facebook', acc: bankAcc.id },
    { d: 35, dir: 'out', amt: 1100000, cat: 'expense', desc: 'Mua bộ dụng cụ tiêm phòng', acc: cashAcc.id },
    { d: 32, dir: 'in', amt: 9500000, cat: 'sale', desc: 'Bán cặp F1 cao cấp — anh Phương Vĩnh Long', acc: bankAcc.id },

    // ====== T3 (10-30 ngày) ======
    { d: 28, dir: 'out', amt: 3800000, cat: 'expense', desc: 'Mua cám gà tăng trọng + ngô', acc: cashAcc.id },
    { d: 25, dir: 'in', amt: 2200000, cat: 'sale', desc: 'Bán 2 con choai — khách quen', acc: cashAcc.id },
    { d: 22, dir: 'out', amt: 480000, cat: 'expense', desc: 'Tiền điện', acc: cashAcc.id },
    { d: 20, dir: 'in', amt: 15000000, cat: 'sale', desc: 'Bán 1 trống chiến top — anh Tuấn (gà thắng 7/8)', acc: bankAcc.id },
    { d: 18, dir: 'out', amt: 5000000, cat: 'payroll', desc: 'Lương nhân viên tháng', acc: bankAcc.id },
    { d: 15, dir: 'out', amt: 950000, cat: 'expense', desc: 'Vitamin ADE-B + men tiêu hoá', acc: cashAcc.id },
    { d: 12, dir: 'out', amt: 600000, cat: 'expense', desc: 'Phun khử trùng định kỳ', acc: cashAcc.id },
    { d: 10, dir: 'in', amt: 5500000, cat: 'sale', desc: 'Bán mái Asil đẻ trứng — cô Yến Bến Tre', acc: bankAcc.id },

    // ====== T4 (1-10 ngày — tuần này) ======
    { d: 8, dir: 'out', amt: 2700000, cat: 'expense', desc: 'Mua cám cuối tháng', acc: cashAcc.id },
    { d: 7, dir: 'in', amt: 4200000, cat: 'sale', desc: 'Bán 1 trống Mã Lai — khách online Zalo', acc: cashAcc.id },
    { d: 5, dir: 'out', amt: 320000, cat: 'expense', desc: 'Tiền nước', acc: cashAcc.id },
    { d: 4, dir: 'out', amt: 1800000, cat: 'expense', desc: 'Sửa máy ấp — thay bóng đèn nhiệt', acc: bankAcc.id },
    { d: 3, dir: 'in', amt: 7800000, cat: 'sale', desc: 'Bán cặp Nòi cho anh Nam Bình Định (vip)', acc: bankAcc.id },
    { d: 2, dir: 'out', amt: 250000, cat: 'expense', desc: 'Mua thức ăn rau xanh chợ', acc: cashAcc.id },
    { d: 1, dir: 'out', amt: 480000, cat: 'expense', desc: 'Cây thuốc bổ (gừng, tỏi, nghệ)', acc: cashAcc.id },
    { d: 0, dir: 'in', amt: 3200000, cat: 'sale', desc: 'Bán 1 con choai — khách walk-in', acc: cashAcc.id },

    // Vài giao dịch loan + adjustment
    { d: 35, dir: 'in', amt: 10000000, cat: 'loan_in', desc: 'Vay thêm vốn từ anh trai (trả 6 tháng)', acc: bankAcc.id },
    { d: 5, dir: 'out', amt: 1500000, cat: 'loan_out', desc: 'Trả góp khoản vay anh trai (lần 1)', acc: bankAcc.id },
    { d: 2, dir: 'out', amt: 50000, cat: 'adjustment', desc: 'Chênh lệch kiểm kê két tiền mặt', acc: cashAcc.id },
  ]

  // Check existing — skip if already populated
  const { count: existing } = await sb
    .from('cash_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', FARM_ID)
  console.log(`Existing tx: ${existing}`)
  if (existing && existing > 30) {
    console.log(`✓ Skip — already ${existing} transactions`)
    return
  }

  // Insert tx (excluding the transfer pair entries — handled separately so we can capture IDs)
  const regular = tx.filter((t) => !t.transferPair)
  const transferPairs = tx.filter((t) => t.transferPair)

  const rows = regular.map((t) => ({
    farm_id: FARM_ID,
    account_id: t.acc,
    direction: t.dir,
    amount: t.amt,
    category: t.cat,
    transaction_date: dayOffset(t.d),
    description: t.desc,
    created_by: OWNER_ID ?? null,
  }))
  const { error } = await sb.from('cash_transactions').insert(rows)
  if (error) { console.error('regular tx:', error.message); return }
  console.log(`✓ Inserted ${rows.length} regular transactions`)

  // Insert transfer pair as actual transfer (creates linked tx via service)
  if (transferPairs.length === 2) {
    const pairOut = transferPairs.find((t) => t.dir === 'out')
    const pairIn = transferPairs.find((t) => t.dir === 'in')
    if (pairOut && pairIn) {
      // Insert both tx
      const { data: pairData } = await sb
        .from('cash_transactions')
        .insert([
          {
            farm_id: FARM_ID,
            account_id: pairOut.acc,
            direction: 'out',
            amount: pairOut.amt,
            category: 'transfer_out',
            transaction_date: dayOffset(pairOut.d),
            description: pairOut.desc,
            created_by: OWNER_ID ?? null,
            ref_type: 'cash_transfer',
          },
          {
            farm_id: FARM_ID,
            account_id: pairIn.acc,
            direction: 'in',
            amount: pairIn.amt,
            category: 'transfer_in',
            transaction_date: dayOffset(pairIn.d),
            description: pairIn.desc,
            created_by: OWNER_ID ?? null,
            ref_type: 'cash_transfer',
          },
        ])
        .select()
      if (pairData?.length === 2) {
        const outTx = pairData.find((p) => p.direction === 'out')
        const inTx = pairData.find((p) => p.direction === 'in')
        if (outTx && inTx) {
          await sb.from('cash_transfers').insert([
            {
              farm_id: FARM_ID,
              from_account_id: pairOut.acc,
              to_account_id: pairIn.acc,
              amount: pairOut.amt,
              fee: 0,
              transfer_date: dayOffset(pairOut.d),
              description: 'Chuyển tiền mặt → ngân hàng',
              out_transaction_id: outTx.id,
              in_transaction_id: inTx.id,
              created_by: OWNER_ID ?? null,
            },
          ])
          console.log(`✓ Inserted 1 cash transfer (with linked tx)`)
        }
      }
    }
  }

  // Final stats
  const { count: total } = await sb.from('cash_transactions').select('id', { count: 'exact', head: true }).eq('farm_id', FARM_ID)
  const { data: byCat } = await sb
    .from('cash_transactions')
    .select('category')
    .eq('farm_id', FARM_ID)
  const catCounts = {}
  for (const r of byCat ?? []) catCounts[r.category] = (catCounts[r.category] ?? 0) + 1
  console.log(`\n📊 Total: ${total} transactions`)
  console.log('   By category:', catCounts)
}

main().catch((e) => { console.error(e); process.exit(1) })
