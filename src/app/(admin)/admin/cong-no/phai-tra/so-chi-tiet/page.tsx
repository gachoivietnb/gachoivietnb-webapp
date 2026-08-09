import { createClient } from '@/lib/supabase/server'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DebtLedgerClient } from '@/components/admin/finance/DebtLedgerClient'
import type { StmtItem, StmtPayment } from '@/lib/reports/debt-statement'

export const revalidate = 0

export default async function PayablesLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ partner?: string }>
}) {
  const sp = await searchParams
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('cong_no', 'read')) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Không có quyền xem công nợ.</div>
  }

  const supabase = await createClient()
  const [purchasesRes, paysRes] = await Promise.all([
    supabase
      .from('purchases')
      .select('id, purchase_code, purchase_date, total_amount, paid_amount, kind, supplier:suppliers(id, name)')
      .order('purchase_date', { ascending: false })
      .limit(5000),
    supabase.from('supplier_payments').select('purchase_id, payment_date, amount').limit(10000),
  ])

  type PurchaseRow = {
    id: string; purchase_code: string; purchase_date: string; total_amount: number; paid_amount: number | null; kind: string | null
    supplier: { id: string; name: string } | { id: string; name: string }[] | null
  }
  const items: StmtItem[] = ((purchasesRes.data ?? []) as PurchaseRow[]).map((p) => {
    const s = Array.isArray(p.supplier) ? p.supplier[0] : p.supplier
    return { id: p.id, code: p.purchase_code, date: p.purchase_date, total: Number(p.total_amount), paid: Number(p.paid_amount ?? 0), partner_id: s?.id ?? null, partner_name: s?.name ?? null, kind: p.kind ?? 'ga' }
  })
  const payments: StmtPayment[] = ((paysRes.data ?? []) as Array<{ purchase_id: string; payment_date: string; amount: number }>).map((p) => ({ item_id: p.purchase_id, date: p.payment_date, amount: Number(p.amount) }))

  const pMap = new Map<string, string>()
  for (const it of items) if (it.partner_id && it.partner_name) pMap.set(it.partner_id, it.partner_name)
  const partners = [...pMap.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <div className="mb-5">
        <Link href="/admin/cong-no/phai-tra" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2">
          <ArrowLeft className="w-4 h-4" /> Danh sách phải trả
        </Link>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">📒 Sổ chi tiết công nợ phải trả</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Số dư đầu kỳ · từng phát sinh (mua chịu / trả tiền) · số dư lũy kế · số dư cuối kỳ
        </p>
      </div>
      <DebtLedgerClient side="payable" items={items} payments={payments} partners={partners} defaultPartnerId={sp.partner} />
    </div>
  )
}
