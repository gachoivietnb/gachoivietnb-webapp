import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import {
  TransactionCreateSchema,
  createTransaction,
  listTransactions,
} from '@/lib/treasury/transactions'
import type { Direction, TransactionCategory } from '@/lib/treasury/types'

export async function GET(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const data = await listTransactions({
    accountId: url.searchParams.get('account_id') ?? undefined,
    direction: (url.searchParams.get('direction') as Direction) ?? undefined,
    category: (url.searchParams.get('category') as TransactionCategory) ?? undefined,
    fromDate: url.searchParams.get('from') ?? undefined,
    toDate: url.searchParams.get('to') ?? undefined,
    search: url.searchParams.get('q') ?? undefined,
    limit: url.searchParams.get('limit')
      ? Number(url.searchParams.get('limit'))
      : undefined,
  })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = TransactionCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  try {
    const data = await createTransaction(parsed.data, ctx.user.id)
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
