'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  type CashAccountBalance,
  type Direction,
  type TransactionCategory,
  type CashTransaction,
  CATEGORY_META,
  formatVnd,
  formatVndShort,
  formatVndSigned,
} from '@/lib/treasury/types'
import { TransactionFormModal } from './TransactionFormModal'
import { TransferModal } from './TransferModal'
import { ExportTreasuryModal } from './ExportTreasuryModal'

export type DayFlow = { date: string; in: number; out: number }
type ExpenseCat = { id: string; name_vi: string; code: string }

export type RecentTx = CashTransaction & {
  account_name: string | null
  account_icon: string | null
  account_color: string | null
}

export function TreasuryDashboardClient({
  accounts,
  expenseCategories,
  monthSummary,
  byCategory,
  dayFlow30,
  recentTxs,
}: {
  accounts: CashAccountBalance[]
  expenseCategories: ExpenseCat[]
  monthSummary: { totalIn: number; totalOut: number; netFlow: number; txCount: number }
  byCategory: Array<{ category: TransactionCategory; direction: Direction; amount: number; count: number }>
  dayFlow30: DayFlow[]
  recentTxs: RecentTx[]
}) {
  const router = useRouter()
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txDirection, setTxDirection] = useState<Direction>('in')
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)

  const totalBalance = accounts
    .filter((a) => a.is_active)
    .reduce((s, a) => s + a.current_balance, 0)

  function openTx(d: Direction) {
    setTxDirection(d)
    setTxModalOpen(true)
  }

  function onSaved() {
    setTxModalOpen(false)
    setTransferModalOpen(false)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* HERO + TOTAL */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <span className="absolute top-4 right-4 text-7xl">💰</span>
          <span className="absolute bottom-2 left-6 text-5xl">📊</span>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative p-6 md:p-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-80">Tổng quỹ hiện tại</div>
              <div className="text-4xl md:text-5xl font-black tabular-nums mt-1">
                {formatVnd(totalBalance)}
              </div>
              <div className="text-sm opacity-80 mt-1">
                {accounts.filter((a) => a.is_active).length} tài khoản · {monthSummary.txCount} giao dịch tháng này
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openTx('in')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold shadow text-sm flex items-center gap-1.5"
              >
                📥 Thu nhanh
              </button>
              <button
                onClick={() => openTx('out')}
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-4 py-2.5 font-bold shadow text-sm flex items-center gap-1.5"
              >
                📤 Chi nhanh
              </button>
              <button
                onClick={() => setTransferModalOpen(true)}
                className="bg-white/15 hover:bg-white/25 backdrop-blur text-white rounded-xl px-4 py-2.5 font-bold border border-white/30 text-sm flex items-center gap-1.5"
              >
                🔄 Chuyển khoản
              </button>
              <Link
                href="/admin/tai-chinh/bao-cao/dong-tien"
                className="bg-white/15 hover:bg-white/25 backdrop-blur text-white rounded-xl px-4 py-2.5 font-bold border border-white/30 text-sm flex items-center gap-1.5"
              >
                📊 Báo cáo
              </Link>
              <button
                onClick={() => setExportModalOpen(true)}
                className="bg-white/15 hover:bg-white/25 backdrop-blur text-white rounded-xl px-4 py-2.5 font-bold border border-white/30 text-sm flex items-center gap-1.5"
              >
                📥 Xuất Excel/PDF
              </button>
            </div>
          </div>

          {/* Mini KPI grid trong hero */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <HeroKpi
              label="Tháng này"
              value={`+${formatVndShort(monthSummary.totalIn)}`}
              tone="text-emerald-200"
              sub="Tiền vào"
            />
            <HeroKpi
              label="Tháng này"
              value={`-${formatVndShort(monthSummary.totalOut)}`}
              tone="text-rose-200"
              sub="Tiền ra"
            />
            <HeroKpi
              label="Dòng tiền ròng"
              value={formatVndSigned(monthSummary.netFlow).replace(/đ$/, '') + 'đ'}
              tone={monthSummary.netFlow >= 0 ? 'text-emerald-200' : 'text-rose-200'}
              sub={monthSummary.netFlow >= 0 ? 'Lãi tiền' : 'Lỗ tiền'}
              big
            />
          </div>
        </div>
      </div>

      {/* ACCOUNT CARDS */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🏦 Số dư từng tài khoản
          </h2>
          <Link
            href="/admin/quy/tai-khoan"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Quản lý tài khoản →
          </Link>
        </div>

        {accounts.length === 0 ? (
          <EmptyAccounts />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {accounts.filter((a) => a.is_active).map((a) => (
              <AccountCard key={a.account_id} acc={a} />
            ))}
          </div>
        )}
      </section>

      {/* CHART + CATEGORY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              📈 Dòng tiền 30 ngày gần nhất
            </h2>
            <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Vào
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Ra
              </span>
            </div>
          </div>
          <DayFlowChart data={dayFlow30} />
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
            🏷 Theo phân loại
          </h2>
          <CategoryBreakdown items={byCategory} />
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🧾 Giao dịch gần nhất
          </h2>
          <Link
            href="/admin/quy/giao-dich"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Xem tất cả →
          </Link>
        </div>
        {recentTxs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <div className="text-5xl mb-2">📭</div>
            <div className="text-sm">Chưa có giao dịch nào — bấm "Thu nhanh" / "Chi nhanh" ở trên</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentTxs.slice(0, 10).map((t) => (
              <TxRow key={t.id} tx={t} />
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      <TransactionFormModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        onSaved={onSaved}
        accounts={accounts}
        expenseCategories={expenseCategories}
        initialDirection={txDirection}
      />
      <TransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onSaved={onSaved}
        accounts={accounts}
      />
      <ExportTreasuryModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        accounts={accounts}
      />
    </div>
  )
}

function HeroKpi({ label, value, sub, tone, big }: { label: string; value: string; sub: string; tone: string; big?: boolean }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className={`font-bold tabular-nums ${tone} ${big ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'}`}>
        {value}
      </div>
      <div className="text-[10px] opacity-70">{sub}</div>
    </div>
  )
}

function AccountCard({ acc }: { acc: CashAccountBalance }) {
  const negative = acc.current_balance < 0
  return (
    <Link
      href={`/admin/quy/giao-dich?account_id=${acc.account_id}`}
      className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700 transition flex flex-col"
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${acc.color} text-white flex items-center justify-center text-2xl shadow`}
        >
          {acc.icon}
        </div>
        {acc.is_default && (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 rounded-full px-2 py-0.5">
            ⭐ Mặc định
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="font-bold text-gray-900 dark:text-gray-100 truncate">{acc.name}</div>
        {acc.bank_name && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{acc.bank_name}</div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div
          className={
            'text-xl font-extrabold tabular-nums ' +
            (negative ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-gray-100')
          }
        >
          {formatVnd(acc.current_balance)}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex justify-between mt-0.5">
          <span>{acc.transaction_count} giao dịch</span>
          {acc.last_transaction_date && (
            <span>{new Date(acc.last_transaction_date).toLocaleDateString('vi-VN')}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function EmptyAccounts() {
  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl p-8 text-center">
      <div className="text-5xl mb-3">🏦</div>
      <div className="text-base font-semibold text-blue-900 dark:text-blue-200 mb-1">
        Chưa có tài khoản quỹ nào
      </div>
      <div className="text-sm text-blue-700 dark:text-blue-300 mb-4">
        Tạo tài khoản đầu tiên (Tiền mặt, Vietcombank...) để bắt đầu quản lý dòng tiền
      </div>
      <Link
        href="/admin/quy/tai-khoan"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2.5 font-semibold text-sm"
      >
        + Tạo tài khoản
      </Link>
    </div>
  )
}

function DayFlowChart({ data }: { data: DayFlow[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
        Chưa có dữ liệu
      </div>
    )
  }
  const maxIn = Math.max(...data.map((d) => d.in), 1)
  const maxOut = Math.max(...data.map((d) => d.out), 1)
  const max = Math.max(maxIn, maxOut)

  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((d, i) => {
        const inH = (d.in / max) * 100
        const outH = (d.out / max) * 100
        const day = new Date(d.date).getDate()
        return (
          <div key={d.date} className="flex-1 flex flex-col gap-0.5 items-stretch group min-w-0 relative">
            {/* tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap">
                <div className="font-semibold">{new Date(d.date).toLocaleDateString('vi-VN')}</div>
                <div className="text-emerald-300">+{formatVndShort(d.in)}</div>
                <div className="text-rose-300">-{formatVndShort(d.out)}</div>
              </div>
            </div>
            <div
              className="bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm hover:from-emerald-600 hover:to-emerald-500 transition"
              style={{ height: `${inH}%`, minHeight: d.in > 0 ? '2px' : '0' }}
            />
            <div
              className="bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-sm hover:from-rose-600 hover:to-rose-500 transition"
              style={{ height: `${outH}%`, minHeight: d.out > 0 ? '2px' : '0' }}
            />
            {i % 5 === 0 && (
              <div className="text-[9px] text-gray-400 dark:text-gray-500 text-center mt-1">{day}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CategoryBreakdown({
  items,
}: {
  items: Array<{ category: TransactionCategory; direction: Direction; amount: number; count: number }>
}) {
  if (items.length === 0) {
    return <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">Chưa có dữ liệu</div>
  }
  const max = Math.max(...items.map((i) => i.amount), 1)
  return (
    <div className="space-y-2.5">
      {items.slice(0, 8).map((it) => {
        const meta = CATEGORY_META[it.category] ?? { label: it.category, emoji: '❔', direction: it.direction, group: 'Khác' }
        const pct = (it.amount / max) * 100
        return (
          <div key={`${it.direction}-${it.category}`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
                {meta.emoji} {meta.label}
                <span className="text-gray-400 dark:text-gray-500 ml-1">({it.count})</span>
              </span>
              <span
                className={
                  'font-bold tabular-nums ' +
                  (it.direction === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
                }
              >
                {it.direction === 'in' ? '+' : '-'}
                {formatVndShort(it.amount)}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={
                  'h-full rounded-full ' +
                  (it.direction === 'in'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-r from-rose-500 to-red-500')
                }
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TxRow({ tx }: { tx: RecentTx }) {
  const meta = CATEGORY_META[tx.category] ?? { label: tx.category, emoji: '❔', direction: tx.direction, group: 'Khác' }
  const isIn = tx.direction === 'in'
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className={
          'w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ' +
          (isIn
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300')
        }
      >
        {meta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {tx.description || meta.label}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
          <span>{tx.account_icon} {tx.account_name}</span>
          <span>·</span>
          <span>{new Date(tx.transaction_date).toLocaleDateString('vi-VN')}</span>
        </div>
      </div>
      <div
        className={
          'text-sm font-bold tabular-nums shrink-0 ' +
          (isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
        }
      >
        {isIn ? '+' : '-'}
        {formatVnd(tx.amount)}
      </div>
    </div>
  )
}
