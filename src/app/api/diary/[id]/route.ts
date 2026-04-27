import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createClient } from '@/lib/supabase/server'
import {
  DiaryUpdateSchema,
  deleteDiaryEntry,
  updateDiaryEntry,
} from '@/lib/diary/queries'

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const farm = await getFarmContext()
  if (!farm) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: plans } = await supabase
    .from('diary_plans')
    .select('*')
    .eq('diary_entry_id', id)
    .in('status', ['pending', 'snoozed'])
    .order('due_date')
  return NextResponse.json({ plans: plans ?? [] })
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const farm = await getFarmContext()
  if (!farm) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const body = await request.json()
  const parsed = DiaryUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  try {
    const data = await updateDiaryEntry(id, parsed.data)
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

  const { id } = await ctx.params
  try {
    await deleteDiaryEntry(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
