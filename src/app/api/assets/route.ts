import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import {
  AssetCreateSchema,
  createAsset,
  listAssets,
  nextAssetCode,
} from '@/lib/assets/queries'
import type { AssetKind, AssetStatus } from '@/lib/assets/types'

export async function GET(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const data = await listAssets({
    kind: (url.searchParams.get('kind') as AssetKind) ?? undefined,
    status: (url.searchParams.get('status') as AssetStatus) ?? undefined,
    search: url.searchParams.get('q') ?? undefined,
  })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  // Auto-generate code if not provided
  if (!body.code && body.kind) {
    body.code = await nextAssetCode(body.kind as AssetKind)
  }
  const parsed = AssetCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  try {
    const data = await createAsset(parsed.data, ctx.user.id)
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
