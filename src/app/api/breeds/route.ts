import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function requireChuTrai() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, supabase }
  const { data: p } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (p?.role !== 'chu_trai') return { error: 'Chỉ chủ trại', status: 403, supabase }
  return { supabase }
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('breeds')
    .select('*')
    .order('display_order')
    .order('name_vi')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const auth = await requireChuTrai()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json()) as {
    code: string
    name_vi: string
    origin?: string
    description?: string
    characteristics?: Record<string, unknown>
    tier?: string
    default_avatar_url?: string
    is_active?: boolean
    display_order?: number
  }

  if (!body.code || !body.name_vi) {
    return NextResponse.json({ error: 'code và name_vi là bắt buộc' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('breeds')
    .insert({
      code: body.code,
      name_vi: body.name_vi,
      origin: body.origin ?? null,
      description: body.description ?? null,
      characteristics: body.characteristics ?? null,
      tier: body.tier ?? 'pho_thong',
      default_avatar_url: body.default_avatar_url ?? null,
      is_active: body.is_active ?? true,
      display_order: body.display_order ?? 0,
    } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
