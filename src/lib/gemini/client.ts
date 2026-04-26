import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

type GeminiConfig = {
  apiKey: string | null
  model: string
  enabled: boolean
}

let cachedConfig: GeminiConfig | null = null
let cacheExpiry = 0
const CACHE_TTL_MS = 60 * 1000 // 1 phút

export async function getGeminiConfig(): Promise<GeminiConfig> {
  // Cache để tránh query DB mỗi request
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
    const model =
      (settings.gemini_model as string | undefined) ||
      process.env.GEMINI_MODEL ||
      'gemini-2.0-flash-exp'
    const enabled = Boolean(settings.ai_enabled) && Boolean(apiKey && apiKey.length > 10)

    cachedConfig = { apiKey, model, enabled }
    cacheExpiry = Date.now() + CACHE_TTL_MS
    return cachedConfig
  } catch {
    // Fallback: chỉ dùng env var
    const apiKey = process.env.GEMINI_API_KEY || null
    return {
      apiKey,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
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
      'Chưa cấu hình AI. Vào /admin/cai-dat → Tích hợp AI để cấu hình khoá kết nối.'
    )
  }
  return new GoogleGenerativeAI(config.apiKey)
}

export async function getGeminiModel(modelName?: string) {
  const client = await getGeminiClient()
  const config = await getGeminiConfig()
  return client.getGenerativeModel({
    model: modelName ?? config.model,
  })
}

/**
 * Test gemini key hợp lệ không — gọi API với prompt ngắn
 */
export async function testGeminiKey(apiKey: string, model = 'gemini-2.0-flash-exp'): Promise<{ ok: boolean; message: string }> {
  try {
    const client = new GoogleGenerativeAI(apiKey)
    const genModel = client.getGenerativeModel({ model })
    const result = await genModel.generateContent('Trả lời: "OK"')
    const text = result.response.text().trim()
    return { ok: true, message: `Kết nối thành công (phản hồi: ${text.substring(0, 50)})` }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Lỗi không xác định',
    }
  }
}
