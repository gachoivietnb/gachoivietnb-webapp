import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params
  const supabase = await createClient()

  const { data: tagRow, error } = await supabase
    .from('qr_tags')
    .select('id, tag_number, status, chicken_id')
    .eq('tag_number', tag)
    .maybeSingle<{ id: string; tag_number: string; status: string; chicken_id: string | null }>()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!tagRow) return NextResponse.json({ error: 'Không tìm thấy thẻ' }, { status: 404 })

  if (!tagRow.chicken_id) {
    return NextResponse.json({ data: { ...tagRow, chickens: null } })
  }

  const { data: chicken } = await supabase
    .from('chickens')
    .select('id, chicken_code, name, breeds(name_vi)')
    .eq('id', tagRow.chicken_id)
    .maybeSingle()

  return NextResponse.json({ data: { ...tagRow, chickens: chicken } })
}
