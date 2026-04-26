import { createClient } from '@/lib/supabase/server'
import { getGeminiModel, getGeminiConfig, toFriendlyAiError } from '@/lib/gemini/client'
import { SYSTEM_PROMPT_ZALO } from '@/lib/gemini/prompts'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await getGeminiConfig()
  if (!config.enabled) {
    return NextResponse.json(
      { error: 'AI chưa bật. Vào /admin/cai-dat cấu hình key.' },
      { status: 503 }
    )
  }

  const { chicken_id, custom_context } = (await request.json()) as {
    chicken_id?: string
    custom_context?: string
  }
  if (!chicken_id) return NextResponse.json({ error: 'Missing chicken_id' }, { status: 400 })

  const { data: chicken } = await supabase
    .from('public_chickens')
    .select('*')
    .eq('id', chicken_id)
    .maybeSingle()

  if (!chicken) return NextResponse.json({ error: 'Chicken not found' }, { status: 404 })

  const c = chicken as {
    chicken_code: string
    name: string | null
    breed_name: string | null
    age_months: number | null
    listed_price: number | null
    vaccinations_done: number | null
    training_sessions_count: number | null
    avg_training_score: number | null
    tag_number: string | null
  }

  const context = `
Gà: ${c.name ?? c.chicken_code}
Giống: ${c.breed_name}
Tuổi: ${c.age_months ?? '—'} tháng
${c.listed_price ? `Giá: ${new Intl.NumberFormat('vi-VN').format(c.listed_price)} đ` : ''}
Đã tiêm: ${c.vaccinations_done ?? 0}/8 mũi
${(c.training_sessions_count ?? 0) > 0 ? `Đã vần: ${c.training_sessions_count} buổi, điểm TB ${c.avg_training_score ?? '—'}/10` : ''}

${custom_context ? `Gợi ý thêm: ${custom_context}` : ''}

${c.tag_number ? `Link: https://gachoivietnb.com/ga/${c.tag_number}` : ''}
`

  try {
    const model = await getGeminiModel()
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT_ZALO },
      { text: context },
    ])
    const text = result.response.text()

    await supabase.from('ai_generations').insert({
      generation_type: 'zalo_post',
      related_entity_type: 'chickens',
      related_entity_id: chicken_id,
      model_used: config.model,
      output_text: text,
      generated_by: user.id,
    } as never)

    return NextResponse.json({ data: { text } })
  } catch (e) {
    const err = toFriendlyAiError(e)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
