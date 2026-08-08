import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getFarmContext } from '@/lib/multitenancy/farm-context'

const UpdateSchema = z.object({
  symptoms: z.string().min(3).optional(),
  diagnosis: z.string().nullable().optional(),
  treatment: z.string().nullable().optional(),
  outcome: z.string().nullable().optional(),
  start_date: z.string().optional(),
  end_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()
  const parsed = UpdateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Không có trường nào để cập nhật' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('diseases')
    .update(parsed.data as never)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Không tìm thấy ca bệnh (hoặc không có quyền)' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from('diseases').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
