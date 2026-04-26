import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import {
  AccountUpdateSchema,
  deleteAccount,
  getAccount,
  updateAccount,
} from '@/lib/treasury/accounts'

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const farm = await getFarmContext()
  if (!farm) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const data = await getAccount(id)
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const farm = await getFarmContext()
  if (!farm) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (farm.profile.role !== 'chu_trai') {
    return NextResponse.json({ error: 'Chỉ chủ trại được sửa tài khoản quỹ' }, { status: 403 })
  }
  const { id } = await ctx.params
  const body = await request.json()
  const parsed = AccountUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  try {
    const data = await updateAccount(id, parsed.data)
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const farm = await getFarmContext()
  if (!farm) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (farm.profile.role !== 'chu_trai') {
    return NextResponse.json({ error: 'Chỉ chủ trại được xoá tài khoản quỹ' }, { status: 403 })
  }
  const { id } = await ctx.params
  try {
    await deleteAccount(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
