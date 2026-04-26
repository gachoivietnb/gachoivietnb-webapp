'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function FarmInfoForm({
  initial,
}: {
  initial: {
    name?: string
    short_name?: string
    address?: string
    phone?: string
    zalo?: string
    facebook?: string
    email_business?: string
    website?: string
    drive_folder_id?: string
    map_url?: string
  }
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: initial.name ?? '',
    short_name: initial.short_name ?? '',
    address: initial.address ?? '',
    phone: initial.phone ?? '',
    zalo: initial.zalo ?? '',
    facebook: initial.facebook ?? '',
    email_business: initial.email_business ?? '',
    website: initial.website ?? 'https://gachoivietnb.com',
    drive_folder_id: initial.drive_folder_id ?? '',
    map_url: initial.map_url ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function handleSave() {
    setLoading(true)
    setMsg(null)
    const res = await fetch('/api/settings/farm-info', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg({ type: 'err', text: typeof json.error === 'string' ? json.error : 'Lỗi' })
      setLoading(false)
      return
    }
    setMsg({ type: 'ok', text: '✓ Đã lưu' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Tên đầy đủ" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Tên ngắn" value={form.short_name} onChange={(v) => setForm({ ...form, short_name: v })} />
        <Field label="Địa chỉ" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="Hoa Lư, Ninh Bình" />
        <Field label="Hotline" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0933.669.639" />
        <Field label="Zalo OA (số ID)" value={form.zalo} onChange={(v) => setForm({ ...form, zalo: v })} />
        <Field label="Facebook URL" value={form.facebook} onChange={(v) => setForm({ ...form, facebook: v })} />
        <Field label="Email" value={form.email_business} onChange={(v) => setForm({ ...form, email_business: v })} />
        <Field
          label="Website (dùng cho watermark)"
          value={form.website}
          onChange={(v) => setForm({ ...form, website: v })}
          placeholder="https://gachoivietnb.com"
        />
        <Field
          label="Google Drive folder ID (backup media)"
          value={form.drive_folder_id}
          onChange={(v) => setForm({ ...form, drive_folder_id: v })}
          placeholder="1AbcD2...abcXYZ"
          help='Lấy ID từ URL Drive: drive.google.com/drive/folders/<ID>'
        />
        <Field
          label="Link Google Maps (chia sẻ vị trí trại)"
          value={form.map_url}
          onChange={(v) => setForm({ ...form, map_url: v })}
          placeholder="https://maps.app.goo.gl/..."
          help='Vào Google Maps trên điện thoại → Tìm trại → bấm "Chia sẻ" → Sao chép link → dán vào đây.'
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200">
        🔒 <strong>Thông tin watermark:</strong> Tên trại + Website sẽ được đóng dấu bản quyền lên
        tất cả ảnh upload mới. Video hiển thị trên public có overlay bản quyền + khóa tải về.
      </div>

      {msg && (
        <div className={`rounded p-2 text-sm ${
          msg.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {msg.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Đang lưu...' : 'Lưu thông tin'}
      </button>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  help,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  help?: string
}) {
  return (
    <label className="block">
      <span className="text-xs block mb-1 text-gray-700 dark:text-gray-300">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
      />
      {help && <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block">{help}</span>}
    </label>
  )
}
