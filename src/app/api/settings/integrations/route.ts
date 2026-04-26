import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { invalidateGeminiCache, testGeminiKey } from '@/lib/gemini/client'

async function requireChuTrai(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profile as { role?: string } | null)?.role
  if (role !== 'chu_trai') return { error: 'Chỉ chủ trại', status: 403 as const }
  return { user, status: 200 as const }
}

function maskKey(key: string | null | undefined): string {
  if (!key || key.length < 8) return ''
  return key.substring(0, 4) + '...' + key.substring(key.length - 4)
}

export async function GET() {
  const supabase = await createClient()
  const auth = await requireChuTrai(supabase)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data } = await supabase
    .from('system_settings')
    .select('key, value, updated_at')
    .in('key', ['gemini_api_key', 'gemini_model', 'ai_enabled'])

  const rows = (data ?? []) as Array<{ key: string; value: { value: unknown }; updated_at: string }>
  const settings: Record<string, { value: unknown; masked?: string; updated_at: string }> = {}
  rows.forEach((r) => {
    if (r.key === 'gemini_api_key') {
      settings[r.key] = {
        value: !!r.value?.value,
        masked: maskKey(r.value?.value as string),
        updated_at: r.updated_at,
      }
    } else {
      settings[r.key] = { value: r.value?.value, updated_at: r.updated_at }
    }
  })

  return NextResponse.json({ data: settings })
}

const PatchSchema = z.object({
  gemini_api_key: z.string().optional(),
  gemini_model: z.string().optional(),
  ai_enabled: z.boolean().optional(),
  test_before_save: z.boolean().default(false),
})

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const auth = await requireChuTrai(supabase)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = PatchSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const updates = parsed.data

  // Nếu test trước khi save + có key mới → gọi API test
  if (updates.test_before_save && updates.gemini_api_key) {
    const model = updates.gemini_model ?? 'gemini-2.0-flash-exp'
    const test = await testGeminiKey(updates.gemini_api_key, model)
    if (!test.ok) {
      return NextResponse.json({ error: `Key không hợp lệ: ${test.message}` }, { status: 400 })
    }
  }

  const toUpdate: Array<{ key: string; value: { value: unknown } }> = []
  if (updates.gemini_api_key !== undefined) {
    toUpdate.push({ key: 'gemini_api_key', value: { value: updates.gemini_api_key } })
  }
  if (updates.gemini_model !== undefined) {
    toUpdate.push({ key: 'gemini_model', value: { value: updates.gemini_model } })
  }
  if (updates.ai_enabled !== undefined) {
    toUpdate.push({ key: 'ai_enabled', value: { value: updates.ai_enabled } })
  }

  for (const u of toUpdate) {
    await supabase
      .from('system_settings')
      .update({ value: u.value as never, updated_at: new Date().toISOString(), updated_by: auth.user.id } as never)
      .eq('key', u.key)
  }

  invalidateGeminiCache()

  return NextResponse.json({ success: true, updated: toUpdate.length })
}

export async function POST(request: Request) {
  // /api/settings/integrations with action=test
  const { action, apiKey, model } = (await request.json()) as {
    action?: string
    apiKey?: string
    model?: string
  }
  if (action !== 'test') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (!apiKey) return NextResponse.json({ error: 'Missing apiKey' }, { status: 400 })

  const supabase = await createClient()
  const auth = await requireChuTrai(supabase)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await testGeminiKey(apiKey, model || 'gemini-2.0-flash-exp')
  return NextResponse.json(result)
}
