import { NextResponse } from 'next/server'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import {
  EventCreateSchema,
  createEvent,
  deleteEvent,
  listEvents,
} from '@/lib/assets/queries'

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const farm = await getFarmContext()
  if (!farm) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const data = await listEvents(id)
  return NextResponse.json({ data })
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const farm = await getFarmContext()
  if (!farm) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const body = await request.json()
  const parsed = EventCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  try {
    const data = await createEvent(id, parsed.data, farm.user.id)
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const farm = await getFarmContext()
  if (!farm) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const eventId = url.searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })
  try {
    await deleteEvent(eventId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
