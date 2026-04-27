'use client'

import {
  AreaChart, Area, ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart,
} from 'recharts'
import { fmtVnd } from './KpiCard'

const PALETTE = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#14b8a6']

// =============================================================
// Revenue + Expense + Profit (12 months)
// =============================================================

type TrendRow = {
  month: string
  revenue: number | string
  expenses: number | string
  cogs: number | string
  net_profit: number | string
  chickens_sold?: number
  new_customers?: number
}

export function RevenueExpenseChart({ data }: { data: TrendRow[] }) {
  const formatted = data.map((d) => ({
    month: d.month.slice(2),  // YY-MM
    'Doanh thu': Number(d.revenue),
    'Chi phí': Number(d.expenses),
    'GVHB': Number(d.cogs),
    'LN ròng': Number(d.net_profit),
  }))

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          📈 Doanh thu · Chi phí · Lợi nhuận
        </h3>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">12 tháng gần nhất</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={formatted} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtVnd(v, true)} />
          <Tooltip
            formatter={((v: number) => fmtVnd(v) + ' đ') as never}
            contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #d1d5db' }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="Doanh thu" stroke="#10b981" fill="url(#rev)" strokeWidth={2} />
          <Area type="monotone" dataKey="Chi phí" stroke="#ef4444" fill="url(#exp)" strokeWidth={1.5} />
          <Line type="monotone" dataKey="LN ròng" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// =============================================================
// Donut: Chicken status distribution
// =============================================================

const STATUS_LABEL: Record<string, string> = {
  dang_nuoi: 'Đang nuôi',
  dang_cach_ly: 'Cách ly',
  da_ban: 'Đã bán',
  chet: 'Đã chết',
  loai_thai: 'Loại thải',
}

export function ChickenStatusDonut({
  byStatus,
}: {
  byStatus: Record<string, number> | null | undefined
}) {
  const data = Object.entries(byStatus || {}).map(([k, v], i) => ({
    name: STATUS_LABEL[k] || k,
    value: v,
    color: PALETTE[i % PALETTE.length],
  }))
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">🐓 Phân bổ đàn gà</h3>
      {total === 0 ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
              label={({ value }) => value}
              labelLine={false}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={((v: number) => `${v} con (${((v / total) * 100).toFixed(1)}%)`) as never}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
      <div className="grid grid-cols-2 gap-1 mt-2 text-[11px]">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            <span className="text-gray-600 dark:text-gray-400 truncate">{d.name}</span>
            <span className="font-semibold ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================
// Donut: Sales by breed (12mo)
// =============================================================

type BreedRow = { breed_id: string; breed_name: string; chickens_sold: number; total_revenue: number }

export function BreedRevenueDonut({ rows }: { rows: BreedRow[] }) {
  const data = rows.slice(0, 7).map((r, i) => ({
    name: r.breed_name,
    value: Number(r.total_revenue),
    sold: r.chickens_sold,
    color: PALETTE[i % PALETTE.length],
  }))
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">🏆 Doanh thu theo giống</h3>
      {data.length === 0 ? (
        <EmptyChart message="Chưa bán gà nào trong 12 tháng" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={((v: number) => fmtVnd(v) + ' đ') as never}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2 text-[11px]">
            {data.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{d.name}</span>
                <span className="text-gray-500 dark:text-gray-400">{d.sold} con</span>
                <span className="font-semibold w-12 text-right tabular-nums">
                  {((d.value / total) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================
// Horizontal bar: Top customers
// =============================================================

type CustomerRow = {
  customer_id: string
  customer_name: string
  tier: string | null
  total_revenue: number
  orders_count: number
  avg_order_value: number
  last_purchase_date: string | null
}

export function TopCustomersBar({ rows }: { rows: CustomerRow[] }) {
  const data = rows.slice(0, 5).map((r) => ({
    name: r.customer_name.length > 22 ? r.customer_name.slice(0, 22) + '…' : r.customer_name,
    full_name: r.customer_name,
    revenue: Number(r.total_revenue),
    orders: r.orders_count,
    tier: r.tier,
  }))

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">💎 Top 5 khách hàng (12 tháng)</h3>
      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <div className="space-y-2">
          {data.map((d, i) => {
            const max = Math.max(...data.map((x) => x.revenue))
            const w = (d.revenue / max) * 100
            return (
              <div key={d.full_name + i}>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-gray-400 w-5">{i + 1}.</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
                    {d.tier === 'vip' && '⭐ '}{d.name}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-[10px]">{d.orders} đơn</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                    {fmtVnd(d.revenue, true)}đ
                  </span>
                </div>
                <div className="mt-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                    style={{ width: `${w}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// =============================================================
// Bar chart: Expenses by category
// =============================================================

type ExpenseRow = { category_code: string; category_name: string; total_amount: number; txn_count: number }

export function ExpenseBreakdownChart({ rows }: { rows: ExpenseRow[] }) {
  const data = rows.slice(0, 8).map((r, i) => ({
    name: r.category_name,
    amount: Number(r.total_amount),
    count: r.txn_count,
    color: PALETTE[i % PALETTE.length],
  }))

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">💸 Chi phí theo nhóm (6 tháng)</h3>
      {data.length === 0 ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, left: 70, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtVnd(v, true)} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
            <Tooltip
              formatter={((v: number) => fmtVnd(v) + ' đ') as never}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// =============================================================
// Cash accounts bar
// =============================================================

type CashAccountRow = {
  id: string
  name: string
  account_type: string
  current_balance: number
  icon: string | null
  color: string | null
}

export function CashAccountsList({ rows }: { rows: CashAccountRow[] }) {
  const total = rows.reduce((s, r) => s + Number(r.current_balance || 0), 0)
  const TYPE_LABEL: Record<string, string> = {
    cash: 'Tiền mặt',
    bank: 'Ngân hàng',
    ewallet: 'Ví điện tử',
    other: 'Khác',
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-1.5">💰 Số dư các tài khoản</h3>
        <span className="text-[10px] uppercase tracking-wide text-gray-500">
          Tổng: <b className="text-emerald-700">{fmtVnd(total)}đ</b>
        </span>
      </div>
      {rows.length === 0 ? (
        <EmptyChart message="Chưa có tài khoản quỹ nào" />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const pct = total > 0 ? (Number(r.current_balance) / total) * 100 : 0
            return (
              <div key={r.id}>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-base">{r.icon || '🪙'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{r.name}</div>
                    <div className="text-[10px] text-gray-500">{TYPE_LABEL[r.account_type] || r.account_type}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {fmtVnd(r.current_balance)}đ
                    </div>
                    <div className="text-[10px] text-gray-500">{pct.toFixed(0)}%</div>
                  </div>
                </div>
                <div className="mt-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: r.color || '#10b981' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// =============================================================
// Empty state
// =============================================================

function EmptyChart({ message = 'Chưa có dữ liệu' }: { message?: string }) {
  return (
    <div className="h-32 flex items-center justify-center text-xs text-gray-400 dark:text-gray-600">
      📭 {message}
    </div>
  )
}
