import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const count = Math.min(parseInt(searchParams.get('count') || '1'), 200)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qr_tags')
    .select('id, tag_number')
    .eq('status', 'chua_su_dung')
    .order('tag_number')
    .limit(count)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
