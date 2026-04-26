import 'server-only'
import { getGeminiModel } from '@/lib/gemini/client'
import type { PeriodAggregates } from './aggregate'

/* ============================================================
 * AI Management Analysis — gọi Gemini với prompt structured
 *
 * Output JSON shape:
 * {
 *   overall_score: 0-100,
 *   verdict: "1-2 câu đánh giá tổng quan",
 *   period_summary: { strengths_count, weaknesses_count, ... },
 *   strengths: [{title, detail, metric}],
 *   weaknesses: [{title, detail, metric}],
 *   improvements: [{title, detail, priority}],
 *   watch_outs: [{title, detail, severity}],
 *   next_month_actions: [{priority, title, detail, expected_impact}],
 *   kpi_analysis: [{name, current, previous, change_pct, rating, comment}]
 * }
 * ============================================================ */

export type AiAnalysis = {
  overall_score: number
  verdict: string
  highlight_metric: { label: string; value: string; trend: 'up' | 'down' | 'flat' }
  strengths: Array<{ title: string; detail: string; metric?: string }>
  weaknesses: Array<{ title: string; detail: string; metric?: string }>
  improvements: Array<{ title: string; detail: string; priority: 'high' | 'medium' | 'low' }>
  watch_outs: Array<{ title: string; detail: string; severity: 'high' | 'medium' | 'low' }>
  next_month_actions: Array<{
    priority: 'high' | 'medium' | 'low'
    title: string
    detail: string
    expected_impact?: string
  }>
  kpi_analysis: Array<{
    name: string
    current: string
    previous: string
    change_pct: number
    rating: 'good' | 'warning' | 'bad' | 'neutral'
    comment: string
  }>
  generated_at: string
}

function buildPrompt(current: PeriodAggregates, previous: PeriodAggregates, currentLabel: string, previousLabel: string): string {
  const currentJson = JSON.stringify(current, null, 2)
  const previousJson = JSON.stringify(previous, null, 2)

  return `Bạn là CHUYÊN GIA TÀI CHÍNH KẾ TOÁN chuyên về NGÀNH CHĂN NUÔI GÀ CHỌI / GÀ ĐÁ tại Việt Nam, có 15 năm kinh nghiệm tư vấn cho các trang trại quy mô vừa và lớn ở Bình Định, Long An, Đồng Tháp.

## NHIỆM VỤ
Phân tích báo cáo quản trị của 1 trang trại gà chọi, so sánh KỲ HIỆN TẠI với KỲ TRƯỚC, đưa ra:
1. Đánh giá tổng quan (chấm điểm 0-100)
2. Điểm mạnh đang phát huy tốt
3. Điểm yếu / chưa đạt
4. Khu vực cần cải thiện cụ thể
5. Cảnh báo cần lưu ý
6. Hành động đề xuất cho kỳ tới

## DỮ LIỆU

### Kỳ hiện tại (${currentLabel}, ${current.from} → ${current.to}):
\`\`\`json
${currentJson}
\`\`\`

### Kỳ trước (${previousLabel}, ${previous.from} → ${previous.to}):
\`\`\`json
${previousJson}
\`\`\`

## NGUYÊN TẮC PHÂN TÍCH

### Chỉ tiêu quan trọng cần xem:
- **survival_rate**: Tỷ lệ sống. Trại tốt: ≥95%. Báo động: <85%.
- **mortality_rate**: Tỷ lệ chết. Báo động: >10%.
- **net_margin**: Biên lợi nhuận ròng. Tốt: >25%. Báo động: <10% hoặc âm.
- **net_cash_flow**: Dòng tiền ròng. Phải dương để bền vững.
- **treasury_balance**: Số dư quỹ. Cần đủ ≥3 tháng chi phí dự phòng.
- **receivable_total**: Công nợ phải thu. Càng cao càng rủi ro thu hồi.
- **medicine_expiring_soon**: Số thuốc cận date 30 ngày. Phải dùng kịp tránh lãng phí.
- **asset_need_maintenance**: Tài sản cần bảo trì. Để lâu dễ hỏng nặng.
- **hatch_rate**: Tỷ lệ ấp nở. Tốt: >80%. Báo động: <60%.
- **expense_by_category**: So sánh tỷ trọng chi phí, hạng mục nào tăng bất thường.
- **chickens_sold vs chickens_died**: Cân bằng "đầu ra" vs "tổn thất".

### Phong cách viết:
- Dùng tiếng Việt thân thiện, NGẮN GỌN, SÚC TÍCH như anh/em đang nói chuyện
- Tránh từ chuyên môn khô khan; dùng ngôn ngữ chủ trại VN dễ hiểu
- Mỗi điểm chỉ 1-2 câu (max 200 ký tự)
- Trong "metric" hãy CITE chính xác con số: ví dụ "Tỷ lệ sống 96.2% (+2.1% so kỳ trước)"
- Trong "next_month_actions" hãy đưa hành động CỤ THỂ, có thể đo lường được — không nói chung chung
- Trong "expected_impact" hãy ƯỚC LƯỢNG bằng số nếu được (vd "+5tr/tháng", "-2% chi phí thức ăn")
- Nếu kỳ trước có dữ liệu = 0 (mới bắt đầu), bỏ qua so sánh, chỉ phân tích kỳ hiện tại

### Nguyên tắc chấm overall_score:
- ≥85: Trại đang vận hành rất tốt
- 70-84: Tốt, có vài điểm cần tinh chỉnh
- 55-69: Trung bình, cần cải thiện
- 40-54: Có vấn đề, cần can thiệp
- <40: Cảnh báo nghiêm trọng

## ĐỊNH DẠNG OUTPUT
Trả về CHÍNH XÁC JSON object (KHÔNG kèm markdown \`\`\`json), schema:

\`\`\`
{
  "overall_score": <number 0-100>,
  "verdict": "<1-2 câu đánh giá tổng quan>",
  "highlight_metric": {
    "label": "<chỉ tiêu nổi bật nhất>",
    "value": "<giá trị + thay đổi>",
    "trend": "up" | "down" | "flat"
  },
  "strengths": [
    { "title": "<tóm tắt ngắn>", "detail": "<giải thích>", "metric": "<số liệu cụ thể>" }
  ],
  "weaknesses": [
    { "title": "<tóm tắt>", "detail": "<...>", "metric": "<...>" }
  ],
  "improvements": [
    { "title": "<...>", "detail": "<gợi ý cách cải thiện>", "priority": "high" | "medium" | "low" }
  ],
  "watch_outs": [
    { "title": "<...>", "detail": "<lý do cần lưu ý>", "severity": "high" | "medium" | "low" }
  ],
  "next_month_actions": [
    {
      "priority": "high" | "medium" | "low",
      "title": "<hành động cụ thể>",
      "detail": "<bước thực hiện>",
      "expected_impact": "<ước lượng tác động>"
    }
  ],
  "kpi_analysis": [
    {
      "name": "<tên KPI bằng tiếng Việt>",
      "current": "<giá trị kỳ này>",
      "previous": "<giá trị kỳ trước>",
      "change_pct": <number>,
      "rating": "good" | "warning" | "bad" | "neutral",
      "comment": "<nhận xét 1 câu>"
    }
  ]
}
\`\`\`

## YÊU CẦU SỐ LƯỢNG
- strengths: 2-4 điểm
- weaknesses: 2-4 điểm
- improvements: 2-5 điểm (sắp xếp theo priority high → low)
- watch_outs: 1-3 điểm
- next_month_actions: 3-6 hành động (sắp xếp theo priority)
- kpi_analysis: ĐÚNG 8 KPI quan trọng nhất (Doanh thu, Lợi nhuận ròng, Biên LN, Tỷ lệ sống, Số gà bán, Dòng tiền ròng, Số dư quỹ, Công nợ phải thu)

## QUAN TRỌNG
- CHỈ trả JSON, KHÔNG có text giải thích, KHÔNG có markdown code fence
- Số liệu trong "metric" phải CHÍNH XÁC từ data, KHÔNG được bịa
- Nếu thiếu dữ liệu so sánh, set change_pct = 0 và rating = "neutral"

Hãy phân tích NGAY BÂY GIỜ:`
}

export async function generateAnalysis(
  current: PeriodAggregates,
  previous: PeriodAggregates,
  currentLabel: string,
  previousLabel: string
): Promise<AiAnalysis> {
  const model = await getGeminiModel()
  const prompt = buildPrompt(current, previous, currentLabel, previousLabel)

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 4000,
      responseMimeType: 'application/json',
    },
  })

  const text = result.response.text().trim()

  // Loại bỏ ```json prefix nếu có
  let cleaned = text
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()

  let parsed: Partial<AiAnalysis>
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    throw new Error(
      `AI trả về không phải JSON hợp lệ: ${e instanceof Error ? e.message : 'unknown'}\n\nResponse:\n${cleaned.slice(0, 500)}`
    )
  }

  // Validate + fill defaults
  const analysis: AiAnalysis = {
    overall_score: typeof parsed.overall_score === 'number' ? parsed.overall_score : 50,
    verdict: typeof parsed.verdict === 'string' ? parsed.verdict : 'Chưa đủ dữ liệu để đánh giá.',
    highlight_metric: parsed.highlight_metric ?? { label: '—', value: '—', trend: 'flat' },
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    watch_outs: Array.isArray(parsed.watch_outs) ? parsed.watch_outs : [],
    next_month_actions: Array.isArray(parsed.next_month_actions) ? parsed.next_month_actions : [],
    kpi_analysis: Array.isArray(parsed.kpi_analysis) ? parsed.kpi_analysis : [],
    generated_at: new Date().toISOString(),
  }
  return analysis
}
