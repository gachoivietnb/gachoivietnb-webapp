// Logic tính công nợ theo kỳ — DÙNG CHUNG cho client (hiển thị) và API export
// (đảm bảo báo cáo xuất ra KHỚP TUYỆT ĐỐI với màn hình).
// Pure, không phụ thuộc server/DOM.

export type StmtItem = {
  id: string
  code: string
  date: string // YYYY-MM-DD (ngày nợ phát sinh: order_date / purchase_date)
  total: number
  paid: number
  partner_id: string | null
  partner_name: string | null
  kind?: string | null
}
export type StmtPayment = { item_id: string; date: string; amount: number }
export type Stmt = { opening: number; increase: number; decrease: number; closing: number }

export function groupPayments(payments: StmtPayment[]): Map<string, StmtPayment[]> {
  const m = new Map<string, StmtPayment[]>()
  for (const p of payments) {
    const arr = m.get(p.item_id) ?? []
    arr.push(p)
    m.set(p.item_id, arr)
  }
  return m
}

// Số dư đầu kỳ bền vững với dữ liệu cũ chưa có ngày thanh toán:
//   opening = Σ_{item.date < from} ( total − paid_hiện_tại + Σ payment(date ≥ from) )
//   increase = Σ total (item.date ∈ [from,to])
//   decrease = Σ payment.amount (date ∈ [from,to])
//   closing  = opening + increase − decrease
export function computeStmt(
  items: StmtItem[],
  paysByItem: Map<string, StmtPayment[]>,
  from: string,
  to: string
): Stmt {
  let opening = 0
  let increase = 0
  let decrease = 0
  for (const it of items) {
    const pays = paysByItem.get(it.id) ?? []
    if (it.date < from) {
      const payGeFrom = pays.reduce((s, p) => (p.date >= from ? s + p.amount : s), 0)
      opening += it.total - it.paid + payGeFrom
    }
    if (it.date >= from && it.date <= to) increase += it.total
    decrease += pays.reduce((s, p) => (p.date >= from && p.date <= to ? s + p.amount : s), 0)
  }
  return { opening, increase, decrease, closing: opening + increase - decrease }
}

export type PartnerStmt = { partner_id: string; partner_name: string } & Stmt

export function statementByPartner(
  items: StmtItem[],
  paysByItem: Map<string, StmtPayment[]>,
  from: string,
  to: string
): PartnerStmt[] {
  const groups = new Map<string, StmtItem[]>()
  for (const it of items) {
    const key = it.partner_id ?? '—'
    const arr = groups.get(key) ?? []
    arr.push(it)
    groups.set(key, arr)
  }
  return [...groups.entries()]
    .map(([pid, its]) => {
      const st = computeStmt(its, paysByItem, from, to)
      return { partner_id: pid, partner_name: its[0]?.partner_name ?? '— Không rõ —', ...st }
    })
    .filter((r) => r.opening !== 0 || r.increase !== 0 || r.decrease !== 0 || r.closing !== 0)
    .sort((a, b) => b.closing - a.closing)
}

// ---- Sổ chi tiết công nợ (ledger từng dòng, chạy số dư) ----
export type LedgerRow = {
  date: string
  code: string // chứng từ
  desc: string // diễn giải
  increase: number // phát sinh tăng (bán/mua chịu)
  decrease: number // phát sinh giảm (đã thu/đã trả)
  balance: number // số dư lũy kế
}
export type Ledger = {
  opening: number
  rows: LedgerRow[]
  totalInc: number
  totalDec: number
  closing: number
}

export function buildLedger(
  items: StmtItem[],
  payments: StmtPayment[],
  from: string,
  to: string,
  side: 'receivable' | 'payable'
): Ledger {
  const paysByItem = groupPayments(payments)
  const codeById = new Map(items.map((i) => [i.id, i.code]))
  const { opening } = computeStmt(items, paysByItem, from, to)

  const incDesc = side === 'receivable' ? 'Bán chịu' : 'Mua chịu'
  const decDesc = side === 'receivable' ? 'Khách thanh toán' : 'Trả nhà cung cấp'

  type Ev = LedgerRow & { sort: number }
  const events: Ev[] = []
  for (const it of items) {
    if (it.date >= from && it.date <= to) {
      events.push({ date: it.date, code: it.code, desc: incDesc, increase: it.total, decrease: 0, balance: 0, sort: 0 })
    }
  }
  const itemIds = new Set(items.map((i) => i.id))
  for (const p of payments) {
    if (itemIds.has(p.item_id) && p.date >= from && p.date <= to) {
      events.push({ date: p.date, code: codeById.get(p.item_id) ?? '', desc: decDesc, increase: 0, decrease: p.amount, balance: 0, sort: 1 })
    }
  }
  events.sort((a, b) => (a.date === b.date ? a.sort - b.sort : a.date < b.date ? -1 : 1))

  let bal = opening
  let totalInc = 0
  let totalDec = 0
  const rows: LedgerRow[] = events.map((e) => {
    bal = bal + e.increase - e.decrease
    totalInc += e.increase
    totalDec += e.decrease
    return { date: e.date, code: e.code, desc: e.desc, increase: e.increase, decrease: e.decrease, balance: bal }
  })
  return { opening, rows, totalInc, totalDec, closing: opening + totalInc - totalDec }
}

export function filterItems(
  items: StmtItem[],
  opts: { partnerId?: string; kind?: string; qNorm?: string; norm: (s: string) => string }
): StmtItem[] {
  return items.filter((it) => {
    if (opts.partnerId && it.partner_id !== opts.partnerId) return false
    if (opts.kind && (it.kind ?? 'ga') !== opts.kind) return false
    if (opts.qNorm) {
      const hay = opts.norm(`${it.code} ${it.partner_name ?? ''}`)
      if (!hay.includes(opts.qNorm)) return false
    }
    return true
  })
}
