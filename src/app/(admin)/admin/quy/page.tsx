import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createClient } from '@/lib/supabase/server'
import { listAccountsWithStatus, ensureDefaultAccountsExist } from '@/lib/treasury/accounts'
import { listTransactions, getTreasurySummary } from '@/lib/treasury/transactions'
import { TreasuryDashboardClient, type RecentTx } from '@/components/admin/treasury/TreasuryDashboardClient'

export const revalidate = 0

export default async function TreasuryDashboardPage() {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')

  // Check trước xem DB đã sẵn sàng chưa
  const accountsResult = await listAccountsWithStatus()
  if (!accountsResult.ready) {
    return <MigrationNotApplied detail={accountsResult.message} />
  }

  // Đảm bảo có default accounts (cho farm mới chưa có)
  await ensureDefaultAccountsExist()

  const supabase = await createClient()
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)

  const start30 = new Date()
  start30.setDate(start30.getDate() - 29)
  const start30Str = start30.toISOString().slice(0, 10)
  const todayStr = today.toISOString().slice(0, 10)

  // Reload accounts sau ensureDefaultAccountsExist (vì có thể vừa insert)
  const accountsResult2 = await listAccountsWithStatus()
  const accounts = accountsResult2.ready ? accountsResult2.accounts : []

  const [monthSum, recent, expenseCatsRes, summary30] = await Promise.all([
    getTreasurySummary({ fromDate: monthStart, toDate: monthEnd }),
    listTransactions({ limit: 10 }),
    supabase
      .from('expense_categories')
      .select('id, name_vi, code')
      .order('display_order', { ascending: true }),
    getTreasurySummary({ fromDate: start30Str, toDate: todayStr }),
  ])

  type ExpCat = { id: string; name_vi: string; code: string }
  const expenseCategories = (expenseCatsRes.data as ExpCat[] | null) ?? []

  // Build dayFlow30 — fill empty days
  const dayFlow30: { date: string; in: number; out: number }[] = []
  const map = new Map(summary30.byDay.map((d) => [d.date, d]))
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    const v = map.get(ds)
    dayFlow30.push({ date: ds, in: v?.in ?? 0, out: v?.out ?? 0 })
  }

  const recentTxs: RecentTx[] = recent.map((r) => ({
    id: r.id,
    farm_id: r.farm_id,
    account_id: r.account_id,
    direction: r.direction,
    amount: r.amount,
    transaction_date: r.transaction_date,
    category: r.category,
    ref_type: r.ref_type,
    ref_id: r.ref_id,
    expense_category_id: r.expense_category_id,
    description: r.description,
    reconciled: r.reconciled,
    created_by: r.created_by,
    created_at: r.created_at,
    updated_at: r.updated_at,
    account_name: r.account_name ?? null,
    account_icon: r.account_icon ?? null,
    account_color: r.account_color ?? null,
  }))

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          💰 Quản lý quỹ
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Theo dõi dòng tiền, số dư từng tài khoản, ghi nhận thu chi nhanh.
        </p>
      </div>

      <TreasuryDashboardClient
        accounts={accounts}
        expenseCategories={expenseCategories}
        monthSummary={{
          totalIn: monthSum.totalIn,
          totalOut: monthSum.totalOut,
          netFlow: monthSum.netFlow,
          txCount: monthSum.txCount,
        }}
        byCategory={monthSum.byCategory}
        dayFlow30={dayFlow30}
        recentTxs={recentTxs}
      />
    </div>
  )
}

function MigrationNotApplied({ detail }: { detail: string }) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          💰 Quản lý quỹ
        </h1>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-4 md:p-8">
        <div className="flex items-start gap-4">
          <div className="text-5xl shrink-0">⚙️</div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg md:text-xl font-bold text-amber-900 dark:text-amber-200 mb-2">
              Cần apply migration trước khi dùng
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-300 mb-4">
              Module quản lý quỹ và toàn bộ các tính năng SaaS (Multi-tenancy, Landing CMS, Payment, Treasury) đều yêu cầu các migration mới được apply vào DB.
              Đây là lý do trang này hiển thị trống.
            </p>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
              <div className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                Các migration cần apply:
              </div>
              <ul className="text-xs space-y-1 font-mono">
                <li>• 20260901000012_multitenancy_schema.sql</li>
                <li>• 20260901000013_multitenancy_rls.sql</li>
                <li>• 20260901000014_multitenancy_triggers.sql</li>
                <li>• 20260901000015_landing_settings.sql</li>
                <li>• 20260901000016_update_handle_new_user.sql</li>
                <li>• 20260901000017_payment_orders.sql</li>
                <li>• 20260901000018_treasury.sql</li>
              </ul>
            </div>

            <div className="bg-gray-900 text-gray-100 rounded-xl p-4 mb-3 font-mono text-xs overflow-x-auto">
              <div className="text-emerald-400 mb-1"># Trong WSL Ubuntu (cần Docker chạy)</div>
              <div className="text-gray-400">$</div>
              <div>wsl -d Ubuntu</div>
              <div className="text-gray-400">$</div>
              <div>cd /mnt/e/GaChoiVietNB/WebApp</div>
              <div className="text-gray-400 mt-2"># Cách 1: Chỉ apply migration mới (an toàn, giữ data)</div>
              <div className="text-gray-400">$</div>
              <div className="text-yellow-300">supabase db push --local</div>
              <div className="text-gray-400 mt-2"># Cách 2: Reset hoàn toàn (XOÁ HẾT data, apply lại tất cả)</div>
              <div className="text-gray-400">$</div>
              <div className="text-red-300">supabase db reset</div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200">
              💡 <b>Khuyến nghị:</b> Vì migration 12-14 thay đổi schema mạnh (thêm farm_id NOT NULL + RLS), nếu bạn chưa nhập data quan trọng nào thì <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">supabase db reset</code> sẽ chắc chắn thành công.
              <br />
              Sau khi reset, tài khoản admin@gachoivietnb.com sẽ mất → chạy lại <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">node scripts/create-super-admin.mjs</code> để tạo lại.
            </div>

            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-amber-700 dark:text-amber-300 font-semibold">Chi tiết lỗi (debug)</summary>
              <pre className="mt-2 bg-gray-100 dark:bg-gray-900 rounded p-2 overflow-x-auto text-[10px] text-gray-700 dark:text-gray-300">{detail}</pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
