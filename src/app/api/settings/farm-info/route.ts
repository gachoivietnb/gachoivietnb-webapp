import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  name: z.string().optional(),
  short_name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  zalo: z.string().optional(),
  facebook: z.string().optional(),
  email_business: z.string().optional(),
  website: z.string().optional(),
  drive_folder_id: z.string().optional(),
})

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role?: string } | null)?.role !== 'chu_trai') {
    return NextResponse.json({ error: 'Chỉ chủ trại' }, { status: 403 })
  }

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { error } = await supabase
    .from('system_settings')
    .upsert(
      {
        key: 'farm_info',
        value: parsed.data as never,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      } as never,
      { onConflict: 'key' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
