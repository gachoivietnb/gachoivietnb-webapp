import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import {
  DiaryCreateSchema,
  createDiaryEntry,
  listDiaryEntries,
} from '@/lib/diary/queries'
import type { DiaryCategory, DiaryMood } from '@/lib/diary/types'

export async function GET(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const data = await listDiaryEntries({
    category: (url.searchParams.get('category') as DiaryCategory) ?? undefined,
    mood: (url.searchParams.get('mood') as DiaryMood) ?? undefined,
    authorId: url.searchParams.get('author_id') ?? undefined,
    fromDate: url.searchParams.get('from') ?? undefined,
    toDate: url.searchParams.get('to') ?? undefined,
    search: url.searchParams.get('q') ?? undefined,
    tag: url.searchParams.get('tag') ?? undefined,
  })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = DiaryCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  try {
    const data = await createDiaryEntry(parsed.data, ctx.user.id)
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
