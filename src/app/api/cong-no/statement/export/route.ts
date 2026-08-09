import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { removeDiacritics } from '@/lib/utils/slugify'
import { buildExcel, buildPdf, type ReportMeta, type ReportSection } from '@/lib/reports/finance-export'
import {
  groupPayments,
  computeStmt,
  statementByPartner,
  buildLedger,
  filterItems,
  type StmtItem,
  type StmtPayment,
} from '@/lib/reports/debt-statement'

const fmtVnd = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ'
const fmtD = (d: string) =>
  d === '0000-01-01' ? 'từ đầu' : d === '9999-12-31' ? 'nay' : d.split('-').reverse().join('/')

export async function GET(request: Request) {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.can('cong_no', 'read')) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const side = searchParams.get('side') === 'payable' ? 'payable' : 'receivable'
  const from = searchParams.get('from') || '0000-01-01'
  const to = searchParams.get('to') || '9999-12-31'
  const partnerId = searchParams.get('partnerId') || ''
  const kind = searchParams.get('kind') || ''
  const q = searchParams.get('q') || ''
  const format = searchParams.get('format') === 'pdf' ? 'pdf' : 'excel'
  const mode = searchParams.get('mode') === 'ledger' ? 'ledger' : 'summary'
  const isRec = side === 'receivable'

  const supabase = await createClient()

  // ---- Nạp dữ liệu (giống trang báo cáo) ----
  let items: StmtItem[] = []
  let payments: StmtPayment[] = []
  if (isRec) {
    const [ordersRes, paysRes] = await Promise.all([
      supabase
        .from('sales_orders')
        .select('id, order_code, order_date, total_amount, paid_amount, customer:customers(id, name)')
        .in('status', ['dat_coc', 'da_giao'])
        .limit(5000),
      supabase
        .from('cash_transactions')
        .select('ref_id, transaction_date, amount')
        .eq('ref_type', 'sales_order')
        .eq('direction', 'in')
        .in('category', ['sale', 'deposit'])
        .limit(10000),
    ])
    type O = { id: string; order_code: string; order_date: string; total_amount: number; paid_amount: number | null; customer: { id: string; name: string } | { id: string; name: string }[] | null }
    items = ((ordersRes.data ?? []) as O[]).map((o) => {
      const c = Array.isArray(o.customer) ? o.customer[0] : o.customer
      return { id: o.id, code: o.order_code, date: o.order_date, total: Number(o.total_amount), paid: Number(o.paid_amount ?? 0), partner_id: c?.id ?? null, partner_name: c?.name ?? null }
    })
    payments = ((paysRes.data ?? []) as Array<{ ref_id: string; transaction_date: string; amount: number }>).map((p) => ({ item_id: p.ref_id, date: p.transaction_date, amount: Number(p.amount) }))
  } else {
    const [purchasesRes, paysRes] = await Promise.all([
      supabase
        .from('purchases')
        .select('id, purchase_code, purchase_date, total_amount, paid_amount, kind, supplier:suppliers(id, name)')
        .limit(5000),
      supabase.from('supplier_payments').select('purchase_id, payment_date, amount').limit(10000),
    ])
    type P = { id: string; purchase_code: string; purchase_date: string; total_amount: number; paid_amount: number | null; kind: string | null; supplier: { id: string; name: string } | { id: string; name: string }[] | null }
    items = ((purchasesRes.data ?? []) as P[]).map((p) => {
      const s = Array.isArray(p.supplier) ? p.supplier[0] : p.supplier
      return { id: p.id, code: p.purchase_code, date: p.purchase_date, total: Number(p.total_amount), paid: Number(p.paid_amount ?? 0), partner_id: s?.id ?? null, partner_name: s?.name ?? null, kind: p.kind ?? 'ga' }
    })
    payments = ((paysRes.data ?? []) as Array<{ purchase_id: string; payment_date: string; amount: number }>).map((p) => ({ item_id: p.purchase_id, date: p.payment_date, amount: Number(p.amount) }))
  }

  // ---- Lọc + tính (dùng chung lib với màn hình) ----
  const filtered = filterItems(items, { partnerId, kind, qNorm: removeDiacritics(q.trim()), norm: removeDiacritics })
  const paysByItem = groupPayments(payments)
  const total = computeStmt(filtered, paysByItem, from, to)
  const byPartner = statementByPartner(filtered, paysByItem, from, to)

  // ---- Thông tin trại + người lập + chủ trại ----
  const [farmRes, userRes] = await Promise.all([
    supabase.from('system_settings').select('value').eq('key', 'farm_info').maybeSingle(),
    supabase.auth.getUser(),
  ])
  const farmVal = (farmRes.data as { value?: Record<string, string> } | null)?.value ?? {}
  const farm = { name: farmVal.name ?? 'Gà Chọi Việt NB', address: farmVal.address ?? '', phone: farmVal.phone ?? '' }

  const uid = userRes.data.user?.id
  const [prepRes, ownerRes] = await Promise.all([
    uid ? supabase.from('profiles').select('full_name').eq('id', uid).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('profiles').select('full_name').eq('role', 'chu_trai').order('created_at', { ascending: true }).limit(1).maybeSingle(),
  ])
  const preparer = (prepRes.data as { full_name?: string } | null)?.full_name ?? ''
  const owner = (ownerRes.data as { full_name?: string } | null)?.full_name ?? ''

  const partnerLabel = isRec ? 'Khách hàng' : 'Nhà cung cấp'
  const signatures = [
    { role: 'Người lập', name: preparer },
    { role: 'Chủ trang trại', name: owner },
  ]

  let meta: ReportMeta
  let sections: ReportSection[]
  let fnameBase: string

  if (mode === 'ledger') {
    const partnerName = partnerId ? filtered.find((i) => i.partner_id === partnerId)?.partner_name ?? '' : ''
    const led = buildLedger(filtered, payments, from, to, side)
    const fmtDate = (d: string) => d.split('-').reverse().join('/')
    const rows: Array<Array<string | number>> = [
      ['', '', 'Số dư đầu kỳ', '', '', led.opening],
      ...led.rows.map((r) => [fmtDate(r.date), r.code, r.desc, r.increase || '', r.decrease || '', r.balance]),
      ['', '', 'Cộng phát sinh trong kỳ', led.totalInc, led.totalDec, ''],
    ]
    meta = {
      title: isRec ? 'SỔ CHI TIẾT CÔNG NỢ PHẢI THU' : 'SỔ CHI TIẾT CÔNG NỢ PHẢI TRẢ',
      subtitle: partnerName || `Gộp tất cả ${partnerLabel.toLowerCase()}`,
      period: `${fmtD(from)} → ${fmtD(to)}`,
      summary: [
        ['Số dư đầu kỳ', fmtVnd(led.opening)],
        ['Cộng phát sinh tăng', fmtVnd(led.totalInc)],
        ['Cộng phát sinh giảm', fmtVnd(led.totalDec)],
        ['Số dư cuối kỳ', fmtVnd(led.closing)],
      ],
      signatures,
    }
    sections = [
      {
        title: `Sổ chi tiết${partnerName ? ' — ' + partnerName : ''}`,
        headers: ['Ngày', 'Chứng từ', 'Diễn giải', 'Phát sinh tăng', 'Phát sinh giảm', 'Số dư'],
        rows,
        footer: ['', '', 'SỐ DƯ CUỐI KỲ', '', '', led.closing],
        rightAlign: [3, 4, 5],
      },
    ]
    fnameBase = `so-chi-tiet-cong-no-${isRec ? 'phai-thu' : 'phai-tra'}-${from}_${to}`
  } else {
    meta = {
      title: isRec ? 'BÁO CÁO CÔNG NỢ PHẢI THU' : 'BÁO CÁO CÔNG NỢ PHẢI TRẢ',
      subtitle: isRec ? 'Khách hàng còn nợ' : 'Phải trả nhà cung cấp',
      period: `${fmtD(from)} → ${fmtD(to)}`,
      summary: [
        ['Số dư đầu kỳ', fmtVnd(total.opening)],
        [isRec ? 'Phát sinh tăng (bán chịu)' : 'Phát sinh tăng (mua chịu)', fmtVnd(total.increase)],
        [isRec ? 'Phát sinh giảm (đã thu)' : 'Phát sinh giảm (đã trả)', fmtVnd(total.decrease)],
        ['Số dư cuối kỳ', fmtVnd(total.closing)],
      ],
      signatures,
    }
    sections = [
      {
        title: `Bảng kê theo ${partnerLabel.toLowerCase()}`,
        headers: [partnerLabel, 'Số dư đầu kỳ', 'Phát sinh tăng', 'Phát sinh giảm', 'Số dư cuối kỳ'],
        rows: byPartner.map((r) => [r.partner_name, r.opening, r.increase, r.decrease, r.closing]),
        footer: ['TỔNG CỘNG', total.opening, total.increase, total.decrease, total.closing],
        rightAlign: [1, 2, 3, 4],
      },
    ]
    fnameBase = `bao-cao-cong-no-${isRec ? 'phai-thu' : 'phai-tra'}-${from}_${to}`
  }

  if (format === 'pdf') {
    const buf = buildPdf(meta, sections, farm)
    return new NextResponse(buf as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fnameBase}.pdf"`,
      },
    })
  }
  const buf = await buildExcel(meta, sections, farm)
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fnameBase}.xlsx"`,
    },
  })
}
