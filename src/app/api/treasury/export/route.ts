import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createClient } from '@/lib/supabase/server'
import { listAccounts } from '@/lib/treasury/accounts'
import { listTransactions } from '@/lib/treasury/transactions'
import {
  buildExcel,
  buildPdf,
  type ReportKind,
  type Format,
  type ExportData,
  type FarmInfo,
} from '@/lib/treasury/exports'

const VALID_REPORTS: ReportKind[] = ['cash_book', 'receipt_journal', 'disbursement_journal']
const VALID_FORMATS: Format[] = ['excel', 'pdf']

const REPORT_FILENAMES: Record<ReportKind, string> = {
  cash_book: 'so-quy-tien-mat',
  receipt_journal: 'nhat-ky-thu-tien',
  disbursement_journal: 'nhat-ky-chi-tien',
}

export async function GET(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const report = url.searchParams.get('report') as ReportKind | null
  const format = (url.searchParams.get('format') ?? 'excel') as Format
  const fromDate = url.searchParams.get('from')
  const toDate = url.searchParams.get('to')
  const accountId = url.searchParams.get('account_id') // null/empty = tất cả

  if (!report || !VALID_REPORTS.includes(report)) {
    return NextResponse.json({ error: 'Báo cáo không hợp lệ' }, { status: 400 })
  }
  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: 'Định dạng không hợp lệ' }, { status: 400 })
  }
  if (!fromDate || !toDate) {
    return NextResponse.json({ error: 'Thiếu khoảng thời gian' }, { status: 400 })
  }

  const supabase = await createClient()

  // Farm info
  const { data: farmRow } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'farm_info')
    .maybeSingle()
  type FarmInfoRow = { name?: string; address?: string; phone?: string; tax_code?: string }
  const farmStored = (farmRow as { value?: FarmInfoRow } | null)?.value ?? {}
  const farm: FarmInfo = {
    name: farmStored.name || ctx.farm.name,
    address: farmStored.address ?? null,
    phone: farmStored.phone ?? null,
    tax_code: farmStored.tax_code ?? null,
  }

  // Accounts (cho lookup name)
  const accounts = await listAccounts()
  const account = accountId ? accounts.find((a) => a.account_id === accountId) ?? null : null
  if (accountId && !account) {
    return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })
  }

  // Transactions trong khoảng
  const txsRaw = await listTransactions({
    accountId: accountId || undefined,
    fromDate,
    toDate,
    limit: 10000,
  })

  // Tính số dư đầu kỳ + cuối kỳ
  // Nếu chọn 1 account → balance riêng. Nếu tất cả → tổng quỹ.
  const currentBalance = account
    ? account.current_balance
    : accounts.reduce((s, a) => s + a.current_balance, 0)

  // Net trong range
  let netInRange = 0
  for (const t of txsRaw) {
    if (t.direction === 'in') netInRange += t.amount
    else netInRange -= t.amount
  }

  // Net sau range
  const todayStr = new Date().toISOString().slice(0, 10)
  let netAfterRange = 0
  if (toDate < todayStr) {
    const after = await listTransactions({
      accountId: accountId || undefined,
      fromDate: addDays(toDate, 1),
      toDate: todayStr,
      limit: 10000,
    })
    for (const t of after) {
      if (t.direction === 'in') netAfterRange += t.amount
      else netAfterRange -= t.amount
    }
  }
  const openingBalance = currentBalance - netInRange - netAfterRange
  const closingBalance = openingBalance + netInRange

  const data: ExportData = {
    farm,
    fromDate,
    toDate,
    account: account
      ? {
          id: account.account_id,
          name: account.name,
          account_type: account.account_type,
          bank_name: account.bank_name,
          account_number: account.account_number,
        }
      : null,
    openingBalance,
    closingBalance,
    txs: txsRaw.map((r) => ({
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
      expense_category_name: r.expense_category_name ?? null,
    })),
  }

  const dateSuffix = `${fromDate}_${toDate}`
  const filename = `${REPORT_FILENAMES[report]}_${dateSuffix}`

  if (format === 'excel') {
    const buf = await buildExcel(report, data)
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        'Content-Length': String(buf.byteLength),
      },
    })
  } else {
    const buf = buildPdf(report, data)
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        'Content-Length': String(buf.byteLength),
      },
    })
  }
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
