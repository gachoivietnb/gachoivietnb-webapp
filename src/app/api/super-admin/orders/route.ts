import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/multitenancy/super-admin'
import { listAllOrders } from '@/lib/payment/orders'

export async function GET(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(request.url)
  const status = url.searchParams.get('status') as
    | 'pending'
    | 'paid'
    | 'cancelled'
    | 'expired'
    | 'refunded'
    | null

  const data = await listAllOrders({ status: status ?? undefined, limit: 200 })
  return NextResponse.json({ data })
}
