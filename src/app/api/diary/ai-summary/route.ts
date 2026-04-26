import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { listDiaryEntries } from '@/lib/diary/queries'
import { getGeminiModel, toFriendlyAiError } from '@/lib/gemini/client'
import { CATEGORY_META, MOOD_META } from '@/lib/diary/types'

const Schema = z.object({
  period: z.enum(['week', 'month', 'quarter']),
})

export type DiarySummary = {
  period_label: string
  total_entries: number
  by_category: Array<{ category: string; count: number }>
  by_mood: Array<{ mood: string; count: number }>
  top_tags: Array<{ tag: string; count: number }>
  ai: {
    overview: string
    highlights: Array<{ title: string; detail: string }>
    concerns: Array<{ title: string; detail: string; severity: 'high' | 'medium' | 'low' }>
    patterns: Array<{ title: string; detail: string }>
    recommendations: Array<{ title: string; detail: string; priority: 'high' | 'medium' | 'low' }>
  } | null
  ai_error?: string
}

function rangeFor(period: 'week' | 'month' | 'quarter'): { from: string; to: string; label: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  if (period === 'week') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return { from: fmt(d), to: fmt(today), label: '7 ngày qua' }
  }
  if (period === 'month') {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return { from: fmt(d), to: fmt(today), label: '30 ngày qua' }
  }
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return { from: fmt(d), to: fmt(today), label: '90 ngày qua' }
}

function buildPrompt(entries: Array<{
  diary_date: string
  category: string
  mood: string | null
  title: string | null
  content: string
  tags: string[]
  weather: string | null
}>, periodLabel: string): string {
  const json = JSON.stringify(
    entries.map((e) => ({
      date: e.diary_date,
      category: e.category,
      mood: e.mood,
      title: e.title ?? null,
      content: e.content.slice(0, 500),  // truncate quá dài
      tags: e.tags,
      weather: e.weather,
    })),
    null,
    1
  )

  return `Bạn là CHUYÊN GIA QUẢN LÝ TRANG TRẠI GÀ CHỌI tại Việt Nam, giúp chủ trại đọc lại nhật ký công việc của họ trong ${periodLabel} và rút ra insights.

## NHIỆM VỤ
Đọc kỹ ${entries.length} entry nhật ký dưới đây — của chủ trại + nhân viên ghi lại hằng ngày. Tóm tắt thành báo cáo chất lượng cao.

## DỮ LIỆU NHẬT KÝ (${periodLabel}):
\`\`\`json
${json}
\`\`\`

## NGUYÊN TẮC PHÂN TÍCH

1. **Đọc kỹ content** — hiểu bối cảnh, không chỉ count category
2. **Phát hiện patterns** lặp lại (vd: nhiều ngày liền có vấn đề tương tự, một khu cụ thể bị cách ly nhiều)
3. **Highlight tích cực** — sự kiện đáng chúc mừng (đơn lớn, lứa nở tốt, không sự cố...)
4. **Concerns** — sự việc đáng lo (sự cố lặp lại, mood lo lắng, đàn ốm...)
5. **Recommendations** cụ thể, có thể hành động được

## PHONG CÁCH VIẾT
- Tiếng Việt thân thiện, ngắn gọn (mỗi item 1-2 câu, max 200 ký tự)
- CITE ngày cụ thể nếu có (vd "ngày 22/04 có sự cố mất điện")
- Gọi tên người, gà, khu nếu có (vd "anh Tùng từ Bình Định mua 3 con")
- KHÔNG bịa số liệu — chỉ dùng những gì có trong content

## DEFAULT KHI ÍT DỮ LIỆU
- Nếu < 3 entries → field "overview" ghi: "Chưa đủ nhật ký để phân tích sâu."
- Highlights/concerns/patterns/recommendations có thể là array rỗng []

## ĐỊNH DẠNG OUTPUT
Trả về CHÍNH XÁC JSON object (KHÔNG markdown), schema:

\`\`\`
{
  "overview": "<2-3 câu tổng quan giai đoạn>",
  "highlights": [
    { "title": "<tóm tắt>", "detail": "<chi tiết với ngày/người/số liệu>" }
  ],
  "concerns": [
    { "title": "<...>", "detail": "<...>", "severity": "high" | "medium" | "low" }
  ],
  "patterns": [
    { "title": "<pattern phát hiện>", "detail": "<bằng chứng từ dữ liệu>" }
  ],
  "recommendations": [
    { "title": "<hành động>", "detail": "<gợi ý cụ thể>", "priority": "high" | "medium" | "low" }
  ]
}
\`\`\`

## YÊU CẦU SỐ LƯỢNG
- highlights: 2-4 items
- concerns: 0-3 items (chỉ list nếu thực sự có lo ngại)
- patterns: 1-3 items
- recommendations: 2-5 items, sắp xếp priority high → low

## QUAN TRỌNG
- CHỈ trả JSON, KHÔNG có text giải thích, KHÔNG có markdown code fence
- Mỗi item phải dựa trên BẰNG CHỨNG cụ thể trong nhật ký, không suy diễn

Phân tích NGAY:`
}

export async function POST(request: Request) {
  const ctx = await getFarmContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'period không hợp lệ' }, { status: 400 })
  }

  const { from, to, label } = rangeFor(parsed.data.period)
  const entries = await listDiaryEntries({ fromDate: from, toDate: to, limit: 500 })

  // Aggregate stats
  const catMap = new Map<string, number>()
  const moodMap = new Map<string, number>()
  const tagMap = new Map<string, number>()
  for (const e of entries) {
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + 1)
    if (e.mood) moodMap.set(e.mood, (moodMap.get(e.mood) ?? 0) + 1)
    for (const t of e.tags) tagMap.set(t, (tagMap.get(t) ?? 0) + 1)
  }

  const summary: DiarySummary = {
    period_label: label,
    total_entries: entries.length,
    by_category: [...catMap.entries()]
      .map(([category, count]) => ({
        category: CATEGORY_META[category as keyof typeof CATEGORY_META]?.label ?? category,
        count,
      }))
      .sort((a, b) => b.count - a.count),
    by_mood: [...moodMap.entries()]
      .map(([mood, count]) => ({
        mood: MOOD_META[mood as keyof typeof MOOD_META]?.label ?? mood,
        count,
      }))
      .sort((a, b) => b.count - a.count),
    top_tags: [...tagMap.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    ai: null,
  }

  if (entries.length === 0) {
    summary.ai = {
      overview: 'Chưa có nhật ký nào trong khoảng này.',
      highlights: [],
      concerns: [],
      patterns: [],
      recommendations: [
        {
          title: 'Bắt đầu ghi nhật ký hằng ngày',
          detail:
            'Mỗi tối dành 5 phút ghi 1-2 entry — sau 1 tháng sẽ có dữ liệu cho AI phân tích sâu sắc.',
          priority: 'high',
        },
      ],
    }
    return NextResponse.json({ data: summary })
  }

  // Call Gemini
  try {
    const model = await getGeminiModel()
    const prompt = buildPrompt(entries, label)
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 3000,
        responseMimeType: 'application/json',
      },
    })
    let text = result.response.text().trim()
    if (text.startsWith('```json')) text = text.slice(7)
    if (text.startsWith('```')) text = text.slice(3)
    if (text.endsWith('```')) text = text.slice(0, -3)
    text = text.trim()
    const ai = JSON.parse(text) as DiarySummary['ai']
    summary.ai = ai
  } catch (e) {
    summary.ai_error = toFriendlyAiError(e).message
  }

  return NextResponse.json({ data: summary })
}
