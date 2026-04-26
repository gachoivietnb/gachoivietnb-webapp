import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

type GeminiConfig = {
  apiKey: string | null
  model: string
  enabled: boolean
}

// Default model — only stable / supported names. The old `gemini-2.0-flash-exp`
// was experimental and was removed by Google → 404 on v1beta endpoint.
const DEFAULT_MODEL = 'gemini-2.0-flash'

let cachedConfig: GeminiConfig | null = null
let cacheExpiry = 0
const CACHE_TTL_MS = 60 * 1000

export async function getGeminiConfig(): Promise<GeminiConfig> {
  if (cachedConfig && Date.now() < cacheExpiry) return cachedConfig

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['gemini_api_key', 'gemini_model', 'ai_enabled'])

    const rows = (data ?? []) as Array<{ key: string; value: { value: unknown } }>
    const settings: Record<string, unknown> = {}
    rows.forEach((r) => {
      settings[r.key] = r.value?.value
    })

    const apiKey = (settings.gemini_api_key as string | undefined) || process.env.GEMINI_API_KEY || null
    let model =
      (settings.gemini_model as string | undefined) ||
      process.env.GEMINI_MODEL ||
      DEFAULT_MODEL
    // Auto-rewrite the deprecated experimental model so existing farms keep working
    if (model === 'gemini-2.0-flash-exp') model = DEFAULT_MODEL
    const enabled = Boolean(settings.ai_enabled) && Boolean(apiKey && apiKey.length > 10)

    cachedConfig = { apiKey, model, enabled }
    cacheExpiry = Date.now() + CACHE_TTL_MS
    return cachedConfig
  } catch {
    const apiKey = process.env.GEMINI_API_KEY || null
    return {
      apiKey,
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      enabled: Boolean(apiKey),
    }
  }
}

export function invalidateGeminiCache() {
  cachedConfig = null
  cacheExpiry = 0
}

export async function getGeminiClient(): Promise<GoogleGenerativeAI> {
  const config = await getGeminiConfig()
  if (!config.apiKey) {
    throw new Error(
      'AI_NOT_CONFIGURED:Chưa cấu hình khoá AI. Vào Cài đặt → Tích hợp AI để khai báo.'
    )
  }
  return new GoogleGenerativeAI(config.apiKey)
}

export async function getGeminiModel(modelName?: string) {
  const client = await getGeminiClient()
  const config = await getGeminiConfig()
  let modelToUse = modelName ?? config.model
  // Belt-and-suspenders: never let the deprecated experimental name through
  if (modelToUse === 'gemini-2.0-flash-exp') modelToUse = DEFAULT_MODEL
  return client.getGenerativeModel({ model: modelToUse })
}

/**
 * Map any error thrown by Gemini SDK / our code into a structured friendly
 * code that client components can detect via isAiError() helpers. Always
 * returns an Error with a prefix the client can match.
 */
export function toFriendlyAiError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e)

  // Already structured
  if (/^AI_NOT_CONFIGURED:/i.test(msg)) return e as Error
  if (/^AI_/.test(msg)) return e as Error

  // Pattern match common Google API errors
  if (/api[_ ]?key|invalid.*key|API_KEY_INVALID|400.*key/i.test(msg)) {
    return new Error('AI_INVALID_KEY:Khoá AI không hợp lệ hoặc đã bị xoá. Vào Cài đặt → Tích hợp AI để cập nhật.')
  }
  if (/quota|RESOURCE_EXHAUSTED|429|rate.?limit/i.test(msg)) {
    return new Error('AI_QUOTA_EXCEEDED:Đã vượt quota AI miễn phí của Google hôm nay (15/phút · 1500/ngày). Thử lại sau 1 phút hoặc nâng cấp gói pay-as-you-go.')
  }
  if (/404|not found|is not supported|is not available/i.test(msg)) {
    return new Error('AI_MODEL_NOT_FOUND:Mô hình AI đã được Google đổi/loại bỏ. Vào Cài đặt → Tích hợp AI và chọn lại phiên bản (Tiêu chuẩn / Cao cấp / Tăng tốc).')
  }
  if (/network|fetch|timeout|ECONNRESET|ENOTFOUND|fetch failed/i.test(msg)) {
    return new Error('AI_NETWORK:Không kết nối được tới máy chủ AI. Kiểm tra internet trại và thử lại.')
  }
  if (/permission|PERMISSION_DENIED|403/i.test(msg)) {
    return new Error('AI_FORBIDDEN:Khoá AI bị chặn (có thể do Google phát hiện vi phạm). Tạo khoá mới ở Google AI Studio và cập nhật trong Cài đặt.')
  }

  // Unknown — keep technical message but prefix so UI knows to suppress raw form
  return new Error('AI_ERROR:AI gặp lỗi tạm thời. Thử lại sau ít phút — nếu vẫn lỗi liên hệ hỗ trợ. (' + msg.slice(0, 120) + ')')
}

/**
 * Test gemini key hợp lệ không — gọi API với prompt ngắn
 */
export async function testGeminiKey(apiKey: string, model = DEFAULT_MODEL): Promise<{ ok: boolean; message: string }> {
  try {
    const client = new GoogleGenerativeAI(apiKey)
    const m = model === 'gemini-2.0-flash-exp' ? DEFAULT_MODEL : model
    const genModel = client.getGenerativeModel({ model: m })
    const result = await genModel.generateContent('Trả lời: "OK"')
    const text = result.response.text().trim()
    return { ok: true, message: `Kết nối thành công (phản hồi: ${text.substring(0, 50)})` }
  } catch (e) {
    return {
      ok: false,
      message: toFriendlyAiError(e).message,
    }
  }
}
