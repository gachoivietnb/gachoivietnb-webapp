import { createClient } from '@/lib/supabase/server'
import { getGeminiModel, getGeminiConfig, toFriendlyAiError } from '@/lib/gemini/client'
import { SYSTEM_PROMPT_BIO } from '@/lib/gemini/prompts'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await getGeminiConfig()
  if (!config.enabled || !config.apiKey) {
    return NextResponse.json(
      { error: 'AI chưa được bật. Vào /admin/cai-dat → Tích hợp để cấu hình Gemini key.' },
      { status: 503 }
    )
  }

  const { chicken_id } = (await request.json()) as { chicken_id?: string }
  if (!chicken_id) return NextResponse.json({ error: 'Missing chicken_id' }, { status: 400 })

  const { data: chicken } = await supabase
    .from('chickens_with_details')
    .select('*')
    .eq('id', chicken_id)
    .maybeSingle()

  if (!chicken) return NextResponse.json({ error: 'Chicken not found' }, { status: 404 })

  const c = chicken as {
    chicken_code: string
    name: string | null
    breed_name: string | null
    age_months: number | null
    weight_kg: number | null
    color: string | null
    gender: string
    parent_male_code: string | null
    parent_female_code: string | null
    listed_price: number | null
  }

  const { count: vaxDone } = await supabase
    .from('vaccinations')
    .select('*', { count: 'exact', head: true })
    .eq('chicken_id', chicken_id)
    .eq('status', 'da_tiem')

  const { data: trainStats } = await supabase
    .from('chicken_training_stats')
    .select('*')
    .eq('chicken_id', chicken_id)
    .maybeSingle()

  const t = trainStats as {
    total_sessions: number
    wins: number
    losses: number
    draws: number
    avg_strength: number | null
    avg_appearance: number | null
    avg_aggression: number | null
    avg_total: number | null
  } | null

  const context = `
THÔNG TIN GÀ:
- Tên: ${c.name ?? c.chicken_code}
- Mã: ${c.chicken_code}
- Giống: ${c.breed_name}
- Tuổi: ${c.age_months ?? '—'} tháng
- Cân nặng: ${c.weight_kg ?? 'chưa cân'} kg
- Màu lông: ${c.color ?? 'chưa ghi'}
- Giới tính: ${c.gender === 'trong' ? 'Trống' : c.gender === 'mai' ? 'Mái' : 'Chưa xác định'}

GIA PHẢ:
- Bố: ${c.parent_male_code ?? 'chưa rõ'}
- Mẹ: ${c.parent_female_code ?? 'chưa rõ'}

SỨC KHOẺ:
- Đã tiêm ${vaxDone ?? 0}/8 mũi vaccine cơ bản

THÀNH TÍCH VẦN:
${t && t.total_sessions > 0 ? `
- Đã vần ${t.total_sessions} buổi
- Thắng ${t.wins} / Thua ${t.losses} / Hoà ${t.draws}
- Điểm TB: thể lực ${t.avg_strength}/10, vóc dáng ${t.avg_appearance}/10, hung hãn ${t.avg_aggression}/10
- Điểm tổng TB: ${t.avg_total}/10
` : '- Chưa vần buổi nào'}

GIÁ:
${c.listed_price ? `- Giá bán: ${new Intl.NumberFormat('vi-VN').format(c.listed_price)} đ` : '- Chưa định giá'}
`

  try {
    const model = await getGeminiModel()
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT_BIO },
      { text: 'Hãy viết mô tả marketing cho con gà này:\n\n' + context },
    ])
    const text = result.response.text()

    await supabase.from('chickens').update({
      description: text,
      ai_description_updated_at: new Date().toISOString(),
    } as never).eq('id', chicken_id)

    await supabase.from('ai_generations').insert({
      generation_type: 'bio',
      related_entity_type: 'chickens',
      related_entity_id: chicken_id,
      model_used: config.model,
      output_text: text,
      prompt_summary: `Bio cho ${c.chicken_code}`,
      generated_by: user.id,
    } as never)

    return NextResponse.json({ data: { bio: text } })
  } catch (e) {
    const err = toFriendlyAiError(e)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
