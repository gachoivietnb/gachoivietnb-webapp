'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function IntegrationsForm({
  initialKeyMasked,
  initialModel,
  initialEnabled,
}: {
  initialKeyMasked: string
  initialModel: string
  initialEnabled: boolean
}) {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(initialModel)
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleTest() {
    if (!apiKey) return setMsg({ type: 'err', text: 'Nhập key trước khi test' })
    setTesting(true)
    setMsg(null)
    const res = await fetch('/api/settings/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test', apiKey, model }),
    })
    const json = await res.json()
    if (json.ok) {
      setMsg({ type: 'ok', text: '✓ ' + json.message })
    } else {
      setMsg({ type: 'err', text: '✗ ' + (json.message ?? json.error ?? 'Lỗi') })
    }
    setTesting(false)
  }

  async function handleSave(testFirst: boolean) {
    setLoading(true)
    setMsg(null)
    const payload: Record<string, unknown> = { gemini_model: model, ai_enabled: enabled }
    if (apiKey) {
      payload.gemini_api_key = apiKey
      if (testFirst) payload.test_before_save = true
    }

    const res = await fetch('/api/settings/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg({ type: 'err', text: typeof json.error === 'string' ? json.error : 'Lỗi lưu' })
      setLoading(false)
      return
    }
    setMsg({ type: 'ok', text: '✓ Đã lưu cài đặt' })
    setApiKey('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 rounded p-3 text-sm">
        <p className="mb-1"><strong>📘 Hướng dẫn lấy khoá AI (miễn phí):</strong></p>
        <ol className="list-decimal list-inside text-xs space-y-0.5">
          <li>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline">trang khoá AI của Google</a></li>
          <li>Bấm "Create API key" → chọn project (hoặc tạo mới)</li>
          <li>Copy khoá nhận được, dán vào ô bên dưới</li>
          <li>Miễn phí ~15 lần/phút, 1500 lần/ngày — đủ dùng cho 1 trang trại</li>
        </ol>
      </div>

      <label className="block">
        <span className="text-sm block mb-1">Khoá kết nối AI</span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={initialKeyMasked ? `Khoá hiện tại: ${initialKeyMasked} (để trống nếu không đổi)` : 'Dán khoá vào đây (AIza...)'}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 font-mono text-sm"
        />
        {initialKeyMasked && !apiKey && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Khoá đã cấu hình. Nhập khoá mới để thay.</p>
        )}
      </label>

      <label className="block">
        <span className="text-sm block mb-1">Phiên bản mô hình AI</span>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
        >
          <option value="gemini-2.0-flash">Tiêu chuẩn (nhanh, miễn phí — khuyến nghị)</option>
          <option value="gemini-2.5-flash">Mới nhất (Gemini 2.5 Flash)</option>
          <option value="gemini-1.5-flash">Bản 1.5 (ổn định, dự phòng)</option>
          <option value="gemini-1.5-pro">Cao cấp (chất lượng tốt hơn, chậm hơn)</option>
        </select>
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm">Bật AI (tạo bio, bài Zalo, chatbot)</span>
      </label>

      {msg && (
        <div className={`rounded p-3 text-sm ${
          msg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-800'
          : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleTest}
          disabled={testing || !apiKey}
          className="border border-gray-300 dark:border-gray-600 rounded px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {testing ? 'Đang test...' : '🧪 Test kết nối'}
        </button>
        <button
          onClick={() => handleSave(!!apiKey)}
          disabled={loading}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Đang lưu...' : '💾 Lưu cài đặt'}
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Key lưu an toàn trong DB (chỉ chủ trại đọc được). Đổi key bất cứ lúc nào không cần deploy lại.
      </p>
    </div>
  )
}
