'use client'

import { useState } from 'react'

export type CustomerFormData = {
  name: string
  phone: string
  zalo: string
  facebook: string
  email: string
  address: string
  tier: 'thuong' | 'vip'
  source: string
  notes: string
}

type Customer = {
  id: string
  name: string
  phone: string | null
  zalo: string | null
  facebook: string | null
  email: string | null
  address: string | null
  tier: string
  notes: string | null
  source: string | null
}

const SOURCES: Array<{ v: string; label: string; emoji: string }> = [
  { v: '', label: 'Không rõ', emoji: '❓' },
  { v: 'truc_tiep', label: 'Đến trại', emoji: '🏠' },
  { v: 'zalo', label: 'Zalo / FB', emoji: '💬' },
  { v: 'gioi_thieu', label: 'Giới thiệu', emoji: '🤝' },
  { v: 'website', label: 'Website', emoji: '🌐' },
]

function avatarColor(seed: string): string {
  const palette = [
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-blue-500',
    'from-violet-400 to-purple-500',
    'from-fuchsia-400 to-pink-500',
    'from-lime-400 to-green-500',
    'from-cyan-400 to-sky-500',
  ]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function isValidPhone(p: string): boolean {
  if (!p) return true
  // Vietnamese mobile: starts with 0, 10 digits
  return /^0\d{9}$/.test(p.replace(/\s/g, ''))
}

function isValidEmail(e: string): boolean {
  if (!e) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export function CustomerFormModal({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer | null
  onClose: () => void
  onSave: (data: CustomerFormData) => Promise<void>
}) {
  const [form, setForm] = useState<CustomerFormData>({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    zalo: customer?.zalo ?? '',
    facebook: customer?.facebook ?? '',
    email: customer?.email ?? '',
    address: customer?.address ?? '',
    tier: (customer?.tier as 'thuong' | 'vip') ?? 'thuong',
    source: customer?.source ?? '',
    notes: customer?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const phoneOk = isValidPhone(form.phone)
  const zaloOk = isValidPhone(form.zalo)
  const emailOk = isValidEmail(form.email)
  const initials = getInitials(form.name) || '?'
  const avatar = avatarColor(form.name || 'x')

  async function save() {
    if (!form.name.trim()) {
      setErr('Tên khách hàng là bắt buộc')
      return
    }
    if (!phoneOk) {
      setErr('Số điện thoại không hợp lệ (phải 10 số bắt đầu bằng 0)')
      return
    }
    if (!zaloOk) {
      setErr('Số Zalo không hợp lệ')
      return
    }
    if (!emailOk) {
      setErr('Email không hợp lệ')
      return
    }

    setSaving(true)
    setErr(null)
    try {
      const clean = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [
          k,
          typeof v === 'string' && v.trim() === '' ? null : v,
        ])
      )
      await onSave(clean as unknown as CustomerFormData)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Lỗi lưu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
      >
        <div
          className={`h-1.5 ${
            form.tier === 'vip'
              ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400'
              : 'bg-gradient-to-r from-blue-500 to-indigo-500'
          }`}
        />

        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${avatar} text-white text-base font-extrabold flex items-center justify-center shadow ring-2 ring-white dark:ring-gray-800`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                {customer ? 'Sửa khách hàng' : '👤 Thêm khách hàng mới'}
                {form.tier === 'vip' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                    ⭐ VIP
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {form.name || 'Tên · SĐT · Zalo · Hạng · Nguồn · Ghi chú'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 text-2xl leading-none px-2"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section>
            <SectionTitle icon="📌" title="Thông tin cá nhân" />
            <div className="space-y-3">
              <Field label="Tên khách" required hint="Họ và tên đầy đủ — bắt buộc">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn A"
                  autoFocus
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Địa chỉ" hint="Tỉnh / huyện / xã — dùng cho ship & thống kê vùng">
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="VD: Ninh Bình"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </section>

          <section>
            <SectionTitle icon="📞" title="Liên hệ" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Số điện thoại"
                hint={!phoneOk ? '⚠️ Sai format — phải 10 số bắt đầu bằng 0' : 'Format: 0912xxxxxx'}
                error={!phoneOk}
              >
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0912345678"
                  className={
                    'w-full border rounded-lg px-3 py-2 text-sm font-mono dark:bg-gray-900 ' +
                    (!phoneOk
                      ? 'border-rose-300 dark:border-rose-800 ring-1 ring-rose-200 dark:ring-rose-900/40'
                      : 'border-gray-300 dark:border-gray-600')
                  }
                />
              </Field>
              <Field
                label="Zalo"
                hint={
                  form.phone && form.phone === form.zalo
                    ? '✓ Trùng SĐT'
                    : !zaloOk
                      ? '⚠️ Sai format'
                      : 'Số Zalo · có thể giống SĐT'
                }
                error={!zaloOk}
                action={
                  form.phone && phoneOk && form.phone !== form.zalo ? (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, zalo: form.phone })}
                      className="text-[10.5px] text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      ↩ Dùng SĐT
                    </button>
                  ) : null
                }
              >
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.zalo}
                  onChange={(e) => setForm({ ...form, zalo: e.target.value })}
                  placeholder="0912345678"
                  className={
                    'w-full border rounded-lg px-3 py-2 text-sm font-mono dark:bg-gray-900 ' +
                    (!zaloOk
                      ? 'border-rose-300 dark:border-rose-800 ring-1 ring-rose-200 dark:ring-rose-900/40'
                      : 'border-gray-300 dark:border-gray-600')
                  }
                />
              </Field>
              <Field
                label="Email"
                hint={!emailOk ? '⚠️ Email sai format' : 'Tuỳ chọn'}
                error={!emailOk}
              >
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ten@example.com"
                  className={
                    'w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 ' +
                    (!emailOk
                      ? 'border-rose-300 dark:border-rose-800 ring-1 ring-rose-200 dark:ring-rose-900/40'
                      : 'border-gray-300 dark:border-gray-600')
                  }
                />
              </Field>
              <Field label="Facebook" hint="URL hoặc username">
                <input
                  value={form.facebook}
                  onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                  placeholder="fb.com/username"
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </section>

          <section>
            <SectionTitle icon="💎" title="Hạng khách" />
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    v: 'thuong' as const,
                    label: 'Thường',
                    emoji: '👤',
                    desc: 'Khách thông thường',
                    bar: 'from-blue-400 to-indigo-500',
                    cls: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30',
                  },
                  {
                    v: 'vip' as const,
                    label: 'VIP',
                    emoji: '⭐',
                    desc: 'Mua nhiều · Chi cao · Ưu tiên',
                    bar: 'from-amber-400 via-orange-500 to-amber-400',
                    cls: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30',
                  },
                ]
              ).map((t) => {
                const active = form.tier === t.v
                return (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setForm({ ...form, tier: t.v })}
                    className={
                      'rounded-xl border-2 overflow-hidden text-left transition ' +
                      (active
                        ? t.cls + ' ring-2 ring-offset-1'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300')
                    }
                  >
                    <div className={`h-1 bg-gradient-to-r ${t.bar}`} />
                    <div className="p-3">
                      <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                        {t.emoji} {t.label}
                      </div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                        {t.desc}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-900/40 rounded px-2 py-1.5 leading-relaxed">
              💡 Hạng VIP <strong>tự động</strong> cập nhật khi khách chi ≥ 50 triệu hoặc mua ≥ 5
              con. Set tay chỉ để override.
            </p>
          </section>

          <section>
            <SectionTitle icon="📍" title="Nguồn khách" />
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => {
                const active = form.source === s.v
                return (
                  <button
                    key={s.v || 'none'}
                    type="button"
                    onClick={() => setForm({ ...form, source: s.v })}
                    className={
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                      (active
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-transparent shadow'
                        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
                    }
                  >
                    {s.emoji} {s.label}
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <SectionTitle icon="📝" title="Ghi chú" />
            <Field label="Ghi chú nội bộ" hint="Sở thích · tính cách · lưu ý khi giao dịch">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="VD: Thích gà Asil đỏ, thanh toán chuyển khoản, hẹn giao cuối tuần…"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
            </Field>
          </section>
        </div>

        {err && (
          <div className="mx-5 mb-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg px-3 py-2 text-sm">
            ✗ {err}
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-2 bg-gray-50/60 dark:bg-gray-900/40">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-lg px-4 py-2 text-sm"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !form.name.trim()}
            className={
              'rounded-lg px-5 py-2 text-sm font-semibold text-white shadow disabled:opacity-50 disabled:cursor-not-allowed transition ' +
              (form.tier === 'vip'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:shadow-lg'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg')
            }
          >
            {saving ? '⏳ Đang lưu…' : customer ? '💾 Lưu thay đổi' : '＋ Tạo khách hàng'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
      <span>{icon}</span>
      <span>{title}</span>
    </h4>
  )
}

function Field({
  label,
  required,
  hint,
  error,
  action,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: boolean
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        {action}
      </div>
      {children}
      {hint && (
        <p
          className={
            'text-[10.5px] mt-0.5 ' +
            (error
              ? 'text-rose-600 dark:text-rose-400 font-medium'
              : 'text-gray-500 dark:text-gray-400')
          }
        >
          {hint}
        </p>
      )}
    </div>
  )
}
