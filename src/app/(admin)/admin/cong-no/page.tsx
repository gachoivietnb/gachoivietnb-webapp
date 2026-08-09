import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatVnd } from '@/lib/utils/format'

export const revalidate = 0

type Rec = { customer_id: string; customer_name: string; amount_due: number; days_since_order: number }
type Pay = { supplier_id: string; supplier_name: string; amount_due: number; days_since: number }

export default async function CongNoOverviewPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('cong_no', 'read')) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Không có quyền xem công nợ.</div>
  }

  const supabase = await createClient()
  const [recRes, payRes] = await Promise.all([
    supabase.from('customer_receivables').select('customer_id, customer_name, amount_due, days_since_order'),
    supabase.from('supplier_debt').select('supplier_id, supplier_name, amount_due, days_since'),
  ])
  const rec = (recRes.data ?? []) as Rec[]
  const pay = (payRes.data ?? []) as Pay[]

  const totalRec = rec.reduce((s, r) => s + Number(r.amount_due), 0)
  const totalPay = pay.reduce((s, r) => s + Number(r.amount_due), 0)
  const net = totalRec - totalPay
  const recOverdue = rec.filter((r) => r.days_since_order > 30).reduce((s, r) => s + Number(r.amount_due), 0)
  const payOverdue = pay.filter((r) => r.days_since > 30).reduce((s, r) => s + Number(r.amount_due), 0)

  const topCust = aggr(rec.map((r) => ({ id: r.customer_id, name: r.customer_name, due: Number(r.amount_due) })))
  const topSup = aggr(pay.map((r) => ({ id: r.supplier_id, name: r.supplier_name, due: Number(r.amount_due) })))

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">💳 Công nợ</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tổng quan phải thu &amp; phải trả · cảnh báo quá hạn · thu/trả nhanh
        </p>
      </div>

      {/* 3 KPI chính */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <Link href="/admin/cong-no/phai-thu" className="group">
          <BigStat
            label="Phải thu (khách nợ mình)"
            value={formatVnd(totalRec)}
            sub={`${rec.length} đơn · quá hạn ${formatVnd(recOverdue)}`}
            tone="emerald"
            emoji="📥"
          />
        </Link>
        <Link href="/admin/cong-no/phai-tra" className="group">
          <BigStat
            label="Phải trả (mình nợ NCC)"
            value={formatVnd(totalPay)}
            sub={`${pay.length} phiếu · quá hạn ${formatVnd(payOverdue)}`}
            tone="red"
            emoji="📤"
          />
        </Link>
        <BigStat
          label="Chênh lệch ròng"
          value={formatVnd(net)}
          sub={net >= 0 ? 'Khách nợ nhiều hơn mình nợ' : 'Mình nợ nhiều hơn khách nợ'}
          tone={net >= 0 ? 'blue' : 'amber'}
          emoji={net >= 0 ? '📈' : '📉'}
        />
      </div>

      {/* Cảnh báo quá hạn */}
      {(recOverdue > 0 || payOverdue > 0) && (
        <div className="mb-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <b>Quá hạn 30 ngày:</b> khách nợ <b>{formatVnd(recOverdue)}</b> · mình nợ NCC <b>{formatVnd(payOverdue)}</b>.
            Nên đôn đốc thu và thu xếp trả để giữ uy tín.
          </div>
        </div>
      )}

      {/* 2 cột: top khách nợ / top NCC nợ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopList
          title="Khách nợ nhiều nhất"
          emoji="👥"
          href="/admin/cong-no/phai-thu"
          items={topCust}
          linkBase=""
          tone="emerald"
        />
        <TopList
          title="NCC mình nợ nhiều nhất"
          emoji="🏭"
          href="/admin/cong-no/phai-tra"
          items={topSup}
          linkBase="/admin/nha-cung-cap"
          tone="red"
        />
      </div>
    </div>
  )
}

function aggr(rows: Array<{ id: string; name: string; due: number }>) {
  const m = new Map<string, { id: string; name: string; due: number; count: number }>()
  for (const r of rows) {
    const c = m.get(r.id) ?? { id: r.id, name: r.name, due: 0, count: 0 }
    c.due += r.due
    c.count += 1
    m.set(r.id, c)
  }
  return [...m.values()].sort((a, b) => b.due - a.due).slice(0, 8)
}

function BigStat({
  label,
  value,
  sub,
  tone,
  emoji,
}: {
  label: string
  value: string
  sub: string
  tone: 'emerald' | 'red' | 'blue' | 'amber'
  emoji: string
}) {
  const toneCls: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 group-hover:border-blue-300 dark:group-hover:border-blue-700 transition">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
        <span>{emoji}</span> {label}
      </div>
      <div className={`text-2xl font-extrabold tabular-nums mt-1 ${toneCls[tone]}`}>{value}đ</div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{sub}</div>
    </div>
  )
}

function TopList({
  title,
  emoji,
  href,
  items,
  linkBase,
  tone,
}: {
  title: string
  emoji: string
  href: string
  items: Array<{ id: string; name: string; due: number; count: number }>
  linkBase: string
  tone: 'emerald' | 'red'
}) {
  const toneCls = tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-between">
        <h3 className="font-bold text-sm">{emoji} {title}</h3>
        <Link href={href} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Xem tất cả →</Link>
      </div>
      {items.length === 0 ? (
        <p className="p-6 text-center text-xs text-gray-400">Không có công nợ</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((it) => (
            <li key={it.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              {linkBase ? (
                <Link href={`${linkBase}/${it.id}`} className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate hover:underline">{it.name}</div>
                  <div className="text-[11px] text-gray-400">{it.count} khoản</div>
                </Link>
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{it.name}</div>
                  <div className="text-[11px] text-gray-400">{it.count} khoản</div>
                </div>
              )}
              <div className={`font-bold tabular-nums text-sm ${toneCls}`}>{formatVnd(it.due)}đ</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
