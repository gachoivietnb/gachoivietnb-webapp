import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  chicks: z
    .array(
      z.object({
        name: z.string().optional(),
        breed_id: z.string().uuid(),
        qr_tag_id: z.string().uuid().optional(),
        cage_id: z.string().uuid().optional(),
        gender: z.enum(['trong', 'mai', 'chua_xac_dinh']).default('chua_xac_dinh'),
        parent_male_id: z.string().uuid().optional(),
      })
    )
    .min(1)
    .max(100),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  // Guard: không cho graduate 2 lần cho cùng 1 litter
  const { count: existingGraduates } = await supabase
    .from('chickens')
    .select('id', { count: 'exact', head: true })
    .eq('breeding_litter_id', id)
  if ((existingGraduates ?? 0) > 0) {
    return NextResponse.json(
      { error: `Lứa này đã tốt nghiệp ${existingGraduates} con. Xóa các con đã graduated trước nếu muốn chạy lại.` },
      { status: 409 }
    )
  }

  const { data, error } = await supabase.rpc('graduate_chicks' as never, {
    p_litter_id: id,
    p_chicks: parsed.data.chicks,
  } as never)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const arr = (data as unknown as Array<unknown>) ?? []
  return NextResponse.json({ data, count: arr.length })
}
