import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { listAccounts, ensureDefaultAccountsExist } from '@/lib/treasury/accounts'
import { listTransactions } from '@/lib/treasury/transactions'
import { CashFlowReport, type CashFlowTx } from '@/components/admin/reports/CashFlowReport'
import { CashFlowReportFilter } from '@/components/admin/reports/CashFlowReportFilter'

export const revalidate = 0

type SearchParams = Promise<{
  preset?: string
  from?: string
  to?: string
}>

const PRESETS = [
  'this_month',
  'last_month',
  'last_30',
  'last_90',
  'this_quarter',
  'this_year',
  'all',
  'custom',
] as const
type Preset = (typeof PRESETS)[number]

function isValidPreset(s: string | undefined): s is Preset {
  return Boolean(s && (PRESETS as readonly string[]).includes(s))
}

function computeRange(preset: Preset, from?: string, to?: string): { from: string; to: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const todayStr = fmt(today)

  if (preset === 'custom') {
    return {
      from: from ?? fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: to ?? todayStr,
    }
  }
  if (preset === 'this_month') {
    return {
      from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    }
  }
  if (preset === 'last_month') {
    return {
      from: fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: fmt(new Date(today.getFullYear(), today.getMonth(), 0)),
    }
  }
  if (preset === 'last_30') {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return { from: fmt(d), to: todayStr }
  }
  if (preset === 'last_90') {
    const d = new Date()
    d.setDate(d.getDate() - 89)
    return { from: fmt(d), to: todayStr }
  }
  if (preset === 'this_quarter') {
    const q = Math.floor(today.getMonth() / 3)
    return {
      from: fmt(new Date(today.getFullYear(), q * 3, 1)),
      to: todayStr,
    }
  }
  if (preset === 'this_year') {
    return {
      from: fmt(new Date(today.getFullYear(), 0, 1)),
      to: todayStr,
    }
  }
  // all
  return { from: '2000-01-01', to: todayStr }
}

export default async function CashFlowReportPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')

  const sp = await searchParams
  const preset: Preset = isValidPreset(sp.preset) ? sp.preset : 'this_month'
  const range = computeRange(preset, sp.from, sp.to)

  await ensureDefaultAccountsExist()

  const [accounts, txsRaw] = await Promise.all([
    listAccounts(),
    listTransactions({
      fromDate: range.from,
      toDate: range.to,
      limit: 5000,
    }),
  ])

  // Tính số dư đầu kỳ = balance hiện tại - net trong khoảng
  // (vì balance hiện tại bao gồm tất cả tx kể cả ngoài khoảng)
  const currentTotalBalance = accounts.reduce((s, a) => s + a.current_balance, 0)
  // Net trong khoảng đã chọn:
  let netInRange = 0
  for (const t of txsRaw) {
    if (t.direction === 'in') netInRange += t.amount
    else netInRange -= t.amount
  }
  // Net SAU range:
  // Để tính chính xác, cần load transactions sau range. Nếu range.to < hôm nay thì có
  // tx sau đó. Để giữ đơn giản & chính xác cho preset thường dùng (khoảng KẾT THÚC <= today),
  // ta dùng: opening = current - net_in_range - net_after_range (~ 0 nếu range tới today).
  const todayStr = new Date().toISOString().slice(0, 10)
  let netAfterRange = 0
  if (range.to < todayStr) {
    const after = await listTransactions({ fromDate: addDays(range.to, 1), toDate: todayStr, limit: 5000 })
    for (const t of after) {
      if (t.direction === 'in') netAfterRange += t.amount
      else netAfterRange -= t.amount
    }
  }
  const openingBalance = currentTotalBalance - netInRange - netAfterRange

  const txs: CashFlowTx[] = txsRaw.map((r) => ({
    id: r.id,
    account_id: r.account_id,
    direction: r.direction,
    amount: r.amount,
    transaction_date: r.transaction_date,
    category: r.category,
    description: r.description,
    account_name: r.account_name ?? null,
    account_icon: r.account_icon ?? null,
    account_color: r.account_color ?? null,
  }))

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4 print:hidden">
        <div>
          <Link
            href="/admin/tai-chinh/bao-cao"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại 7 báo cáo
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            💸 Báo cáo dòng tiền
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Thu / chi thực tế từ quỹ · {range.from} → {range.to} · {accounts.length} tài khoản · {txs.length} giao dịch
          </p>
        </div>
        <CashFlowReportFilter
          preset={preset}
          from={sp.from}
          to={sp.to}
          accounts={accounts}
          fromDate={range.from}
          toDate={range.to}
        />
      </div>

      <CashFlowReport
        txs={txs}
        accounts={accounts}
        fromDate={range.from}
        toDate={range.to}
        preset={preset}
        openingBalance={openingBalance}
      />
    </div>
  )
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
