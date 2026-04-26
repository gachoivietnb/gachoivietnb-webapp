import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { getGeminiConfig, toFriendlyAiError } from '@/lib/gemini/client'
import { slugifyVi } from '@/lib/utils/slugify'

const Schema = z.object({
  topic: z.string().min(3).max(200),
  category: z.enum(['tin-tuc', 'kinh-nghiem', 'su-kien', 'giong-ga', 'cham-soc']).default('tin-tuc'),
  keywords: z.array(z.string()).optional(),
})

const SYSTEM_PROMPT = `Bạn là biên tập viên chuyên viết bài cho website trang trại gà chọi "Gà Chọi Việt Ninh Bình" (gachoivietnb.com).

Nhiệm vụ: viết 1 bài SEO hoàn chỉnh bằng tiếng Việt về chủ đề được đưa. Bài phải:
- Độ dài 600-1000 từ
- Cấu trúc heading hierarchy: H1 (tiêu đề), H2 (các phần chính), H3 (ý con)
- Văn phong thân thiện, kiến thức chuyên gia nhưng dễ đọc
- Không copy-paste nguyên si từ nguồn nào
- Lồng ghép tự nhiên các từ khóa gà chọi, trang trại, nuôi gà
- Kết bài gợi khách hàng liên hệ trang trại

TRẢ VỀ ĐÚNG JSON sau (không wrap markdown codeblock, không thêm gì khác):
{
  "title": "Tiêu đề hấp dẫn max 70 ký tự",
  "excerpt": "Mô tả ngắn 150-200 ký tự cho meta description",
  "seo_title": "Tiêu đề SEO max 60 ký tự, có từ khóa chính",
  "seo_description": "Meta description SEO 150-160 ký tự",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "body_markdown": "Nội dung bài đầy đủ dạng Markdown. Dùng ## cho heading chính, ### cho sub-heading. KHÔNG dùng # (đã có title ở trên)."
}`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (profile?.role !== 'chu_trai') {
    return NextResponse.json({ error: 'Chỉ chủ trại' }, { status: 403 })
  }

  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const config = await getGeminiConfig()
  if (!config.enabled || !config.apiKey) {
    return NextResponse.json(
      { error: 'AI chưa bật. Cài đặt → Tích hợp AI để bật Gemini.' },
      { status: 503 }
    )
  }

  const genAI = new GoogleGenerativeAI(config.apiKey)
  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: SYSTEM_PROMPT,
  })

  const userPrompt = `Chủ đề: ${parsed.data.topic}
Danh mục: ${parsed.data.category}
${parsed.data.keywords && parsed.data.keywords.length ? 'Từ khóa cần có: ' + parsed.data.keywords.join(', ') : ''}

Viết bài đầy đủ theo format JSON được yêu cầu.`

  let jsonRaw: string
  try {
    const result = await model.generateContent(userPrompt)
    jsonRaw = result.response.text().trim()
    // Gemini đôi khi vẫn wrap code fence dù đã dặn — strip nó
    jsonRaw = jsonRaw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
  } catch (e) {
    const err = toFriendlyAiError(e)
    return NextResponse.json({ error: err.message }, { status: 502 })
  }

  let parsedArticle: {
    title: string
    excerpt: string
    seo_title: string
    seo_description: string
    tags: string[]
    body_markdown: string
  }
  try {
    parsedArticle = JSON.parse(jsonRaw)
  } catch {
    return NextResponse.json(
      { error: 'AI trả về dữ liệu không đúng format. Thử lại.' },
      { status: 502 }
    )
  }

  if (!parsedArticle.title || !parsedArticle.body_markdown) {
    return NextResponse.json({ error: 'AI trả về thiếu trường' }, { status: 502 })
  }

  // Tạo slug unique
  let slug = slugifyVi(parsedArticle.title)
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`
    const { data: exists } = await supabase
      .from('news_articles')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!exists) {
      slug = candidate
      break
    }
  }

  // Lưu bài ở status draft để admin review + publish
  const { data, error } = await supabase
    .from('news_articles')
    .insert({
      slug,
      title: parsedArticle.title,
      excerpt: parsedArticle.excerpt ?? null,
      body_markdown: parsedArticle.body_markdown,
      category: parsed.data.category,
      tags: parsedArticle.tags ?? [],
      seo_title: parsedArticle.seo_title ?? parsedArticle.title,
      seo_description: parsedArticle.seo_description ?? parsedArticle.excerpt ?? null,
      status: 'draft',
      ai_generated: true,
      author_id: user.id,
    } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log ai_generations cho tracking
  await supabase.from('ai_generations').insert({
    generation_type: 'news_article',
    model_used: config.model,
    prompt_summary: parsed.data.topic.slice(0, 200),
    output_text: parsedArticle.body_markdown.slice(0, 500),
    related_entity_id: (data as { id: string }).id,
    generated_by: user.id,
  } as never)

  return NextResponse.json({ data, slug })
}
