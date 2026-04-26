'use client'

import { useState } from 'react'

export function ContactForm() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', honeypot: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/public/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : 'Gửi thất bại')
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    setForm({ name: '', phone: '', email: '', message: '', honeypot: '' })
  }

  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h3 className="font-medium text-green-900 mb-1">Đã nhận yêu cầu!</h3>
        <p className="text-sm text-green-700 dark:text-green-300">
          Trang trại sẽ liên hệ bạn trong thời gian sớm nhất.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Gửi yêu cầu khác
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={form.honeypot}
        onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <label className="block">
        <span className="text-sm block mb-1">Họ và tên *</span>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
          placeholder="Nguyễn Văn A"
        />
      </label>

      <label className="block">
        <span className="text-sm block mb-1">Số điện thoại *</span>
        <input
          required
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
          placeholder="09xx..."
        />
      </label>

      <label className="block">
        <span className="text-sm block mb-1">Email (tuỳ chọn)</span>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm block mb-1">Lời nhắn</span>
        <textarea
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
          placeholder="Bạn quan tâm giống nào? Ngân sách? Dùng để đá hay làm giống?"
        />
      </label>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-800 dark:text-red-300 rounded p-3 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
      </button>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Thông tin sẽ được chuyển trực tiếp đến trang trại qua hệ thống CRM.
      </p>
    </form>
  )
}
