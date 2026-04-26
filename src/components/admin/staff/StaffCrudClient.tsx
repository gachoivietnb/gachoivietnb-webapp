'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export type StaffRow = {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: string
  is_active: boolean
  base_salary_monthly: number | string | null
  standard_work_days: number | null
}

const ROLE_OPTS = [
  { v: 'nhan_vien', t: '👷 Nhân viên' },
  { v: 'chu_trai', t: '👑 Chủ trại' },
  { v: 'khach', t: '👁 Khách (chỉ xem)' },
]

export function StaffCrudClient({
  staff,
  currentUserId,
}: {
  staff: StaffRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<StaffRow | null>(null)
  const [resetting, setResetting] = useState<StaffRow | null>(null)
  const [, startTransition] = useTransition()
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [busy, setBusy] = useState(false)

  function showToast(kind: 'ok' | 'err', msg: string, ms = 6000) {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), ms)
  }

  async function handleDelete(s: StaffRow) {
    if (!confirm(`Xoá vĩnh viễn nhân viên "${s.full_name}"? Không thể hoàn tác.`)) return
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/staff/${s.id}`, { method: 'DELETE' })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        showToast('err', '❌ ' + (j.error ?? r.status))
        return
      }
      showToast('ok', `✓ Đã xoá ${s.full_name}`)
      startTransition(() => router.refresh())
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleActive(s: StaffRow) {
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/staff/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !s.is_active }),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        showToast('err', '❌ ' + (j.error ?? r.status))
        return
      }
      showToast('ok', s.is_active ? `🔒 Đã khoá ${s.full_name}` : `🔓 Đã mở khoá ${s.full_name}`)
      startTransition(() => router.refresh())
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {toast && (
        <div
          className={
            'rounded-lg p-3 text-sm border ' +
            (toast.kind === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200')
          }
        >
          {toast.msg}
        </div>
      )}

      {/* CRUD bar */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            ⚙️ Quản lý nhân sự — Tạo / Sửa / Reset password / Xoá
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-bold rounded-lg px-3 py-1.5 shadow"
          >
            ➕ Tạo nhân viên mới
          </button>
        </div>

        {staff.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-6">
            Chưa có nhân viên. Bấm "Tạo nhân viên mới" để bắt đầu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="text-left py-2 px-2">Nhân viên</th>
                  <th className="text-left py-2 px-2">Liên hệ</th>
                  <th className="text-left py-2 px-2">Vai trò</th>
                  <th className="text-left py-2 px-2">Trạng thái</th>
                  <th className="text-right py-2 px-2">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {s.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.avatar_url}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
                            {s.full_name.split(' ').slice(-1)[0]?.[0] ?? '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {s.full_name}
                            {s.id === currentUserId && (
                              <span className="ml-1 text-[10px] bg-blue-600 text-white rounded px-1 py-0.5 font-bold">
                                BẠN
                              </span>
                            )}
                          </div>
                          {(s.base_salary_monthly !== null && s.base_salary_monthly !== undefined) && (
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              💰 {Number(s.base_salary_monthly).toLocaleString('vi-VN')}đ/tháng
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-gray-700 dark:text-gray-300">
                      {s.phone ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {ROLE_OPTS.find((r) => r.v === s.role)?.t ?? s.role}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {s.is_active ? (
                        <span className="text-[11px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5 font-semibold">
                          🟢 Hoạt động
                        </span>
                      ) : (
                        <span className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 font-semibold">
                          ⚫ Đã khoá
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex gap-1 justify-end flex-wrap">
                        <button
                          onClick={() => setEditing(s)}
                          className="text-xs bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 px-2 py-1 rounded"
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          onClick={() => setResetting(s)}
                          className="text-xs bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-700 dark:text-amber-300 px-2 py-1 rounded"
                        >
                          🔑 Reset
                        </button>
                        {s.id !== currentUserId && (
                          <>
                            <button
                              onClick={() => handleToggleActive(s)}
                              disabled={busy}
                              className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 px-2 py-1 rounded disabled:opacity-50"
                            >
                              {s.is_active ? '🔒 Khoá' : '🔓 Mở'}
                            </button>
                            <button
                              onClick={() => handleDelete(s)}
                              disabled={busy}
                              className="text-xs bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-2 py-1 rounded disabled:opacity-50"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreate && (
        <CreateStaffModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            showToast('ok', '✓ Đã tạo nhân viên mới')
            startTransition(() => router.refresh())
          }}
          onError={(msg) => showToast('err', msg)}
        />
      )}

      {editing && (
        <EditStaffModal
          staff={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            showToast('ok', '✓ Đã cập nhật')
            startTransition(() => router.refresh())
          }}
          onError={(msg) => showToast('err', msg)}
        />
      )}

      {resetting && (
        <ResetPasswordModal
          staff={resetting}
          onClose={() => setResetting(null)}
          onDone={(pass) => {
            setResetting(null)
            showToast('ok', `🔑 Mật khẩu mới của ${resetting.full_name}: ${pass}`, 12000)
          }}
          onError={(msg) => showToast('err', msg)}
        />
      )}
    </>
  )
}

/* ============================================================ */

function CreateStaffModal({
  onClose, onCreated, onError,
}: {
  onClose: () => void
  onCreated: () => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'nhan_vien' as 'nhan_vien' | 'chu_trai' | 'khach',
    base_salary_monthly: '',
    standard_work_days: '',
    avatar_url: '',
  })
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleAvatarUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/admin/staff/avatar', { method: 'POST', body: fd })
      const j = (await r.json()) as { url?: string; error?: string }
      if (!r.ok || !j.url) {
        onError('❌ Upload lỗi: ' + (j.error ?? 'unknown'))
        return
      }
      setForm((f) => ({ ...f, avatar_url: j.url! }))
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    if (!form.email || !form.password || !form.full_name) {
      onError('Điền đủ Email, mật khẩu, họ tên')
      return
    }
    if (form.password.length < 6) {
      onError('Mật khẩu tối thiểu 6 ký tự')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.toLowerCase().trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || undefined,
          role: form.role,
          base_salary_monthly: form.base_salary_monthly ? Number(form.base_salary_monthly) : undefined,
          standard_work_days: form.standard_work_days ? Number(form.standard_work_days) : undefined,
          avatar_url: form.avatar_url || undefined,
        }),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        onError('❌ ' + (j.error ?? r.status))
        return
      }
      onCreated()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="➕ Tạo nhân viên mới" onClose={onClose}>
      <div className="space-y-3">
        <AvatarPicker url={form.avatar_url} onChange={(u) => setForm({ ...form, avatar_url: u })} onUpload={handleAvatarUpload} uploading={uploading} />
        <Field label="Họ tên *" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Nguyễn Văn A" />
        <Field label="Email đăng nhập *" value={form.email} onChange={(v) => setForm({ ...form, email: v.toLowerCase() })} placeholder="user@example.com" type="email" />
        <Field label="Mật khẩu (≥6 ký tự) *" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="••••••••" />
        <Field label="Số điện thoại" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0xxx..." />
        <SelectField
          label="Vai trò"
          value={form.role}
          options={ROLE_OPTS}
          onChange={(v) => setForm({ ...form, role: v as 'nhan_vien' | 'chu_trai' | 'khach' })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Lương cơ bản (đ/tháng)" value={form.base_salary_monthly} onChange={(v) => setForm({ ...form, base_salary_monthly: v.replace(/\D/g, '') })} placeholder="6000000" />
          <Field label="Ngày công chuẩn" value={form.standard_work_days} onChange={(v) => setForm({ ...form, standard_work_days: v.replace(/\D/g, '') })} placeholder="26" />
        </div>
      </div>
      <ModalActions onCancel={onClose} onConfirm={submit} confirmLabel={busy ? '⏳ Đang tạo...' : '✓ Tạo'} confirmDisabled={busy} />
    </Modal>
  )
}

function EditStaffModal({
  staff, onClose, onSaved, onError,
}: {
  staff: StaffRow
  onClose: () => void
  onSaved: () => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState({
    full_name: staff.full_name,
    phone: staff.phone ?? '',
    role: staff.role,
    is_active: staff.is_active,
    base_salary_monthly: staff.base_salary_monthly?.toString() ?? '',
    standard_work_days: staff.standard_work_days?.toString() ?? '',
    avatar_url: staff.avatar_url ?? '',
  })
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleAvatarUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/admin/staff/avatar', { method: 'POST', body: fd })
      const j = (await r.json()) as { url?: string; error?: string }
      if (!r.ok || !j.url) {
        onError('❌ Upload lỗi: ' + (j.error ?? 'unknown'))
        return
      }
      setForm((f) => ({ ...f, avatar_url: j.url! }))
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          is_active: form.is_active,
          base_salary_monthly: form.base_salary_monthly ? Number(form.base_salary_monthly) : null,
          standard_work_days: form.standard_work_days ? Number(form.standard_work_days) : null,
          avatar_url: form.avatar_url || null,
        }),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        onError('❌ ' + (j.error ?? r.status))
        return
      }
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`✏️ Sửa: ${staff.full_name}`} onClose={onClose}>
      <div className="space-y-3">
        <AvatarPicker url={form.avatar_url} onChange={(u) => setForm({ ...form, avatar_url: u })} onUpload={handleAvatarUpload} uploading={uploading} />
        <Field label="Họ tên" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
        <Field label="Số điện thoại" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <SelectField
          label="Vai trò"
          value={form.role}
          options={ROLE_OPTS}
          onChange={(v) => setForm({ ...form, role: v })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Lương (đ/tháng)" value={form.base_salary_monthly} onChange={(v) => setForm({ ...form, base_salary_monthly: v.replace(/\D/g, '') })} />
          <Field label="Ngày công chuẩn" value={form.standard_work_days} onChange={(v) => setForm({ ...form, standard_work_days: v.replace(/\D/g, '') })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          <span>Đang hoạt động (uncheck = khoá)</span>
        </label>
      </div>
      <ModalActions onCancel={onClose} onConfirm={submit} confirmLabel={busy ? '⏳ Đang lưu...' : '💾 Lưu'} confirmDisabled={busy} />
    </Modal>
  )
}

function ResetPasswordModal({
  staff, onClose, onDone, onError,
}: {
  staff: StaffRow
  onClose: () => void
  onDone: (pass: string) => void
  onError: (msg: string) => void
}) {
  function gen() {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let s = ''
    for (let i = 0; i < 10; i++) s += a[Math.floor(Math.random() * a.length)]
    return s
  }
  const [pass, setPass] = useState(gen())
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (pass.length < 6) {
      onError('Mật khẩu tối thiểu 6 ký tự')
      return
    }
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/staff/${staff.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass }),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        onError('❌ ' + (j.error ?? r.status))
        return
      }
      onDone(pass)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="🔑 Reset mật khẩu" onClose={onClose}>
      <div className="space-y-3">
        <div className="text-sm bg-gray-50 dark:bg-gray-900/60 rounded p-2">
          <div className="font-semibold text-gray-900 dark:text-gray-100">{staff.full_name}</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Mật khẩu mới</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setPass(gen())}
              className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-semibold"
            >
              🎲 Random
            </button>
          </div>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded p-2">
          ⚠️ Sau khi bấm Reset, mật khẩu cũ mất ngay — sao chép mật khẩu này ngay để gửi cho nhân viên.
        </p>
      </div>
      <ModalActions onCancel={onClose} onConfirm={submit} confirmLabel={busy ? '⏳ Đang reset...' : '🔑 Reset'} confirmDisabled={busy || pass.length < 6} confirmTone="amber" />
    </Modal>
  )
}

/* ============================================================ */

function AvatarPicker({
  url, onChange, onUpload, uploading,
}: {
  url: string
  onChange: (url: string) => void
  onUpload: (file: File) => void
  uploading: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        Ảnh đại diện
      </label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-2xl">?</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <label className="inline-block cursor-pointer text-xs bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg font-semibold border border-blue-200 dark:border-blue-900 transition mb-1">
            {uploading ? '⏳ Đang upload...' : '📷 Chọn ảnh từ máy'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUpload(f)
              }}
            />
          </label>
          {url && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="block text-[11px] text-rose-600 dark:text-rose-400 hover:underline"
            >
              Xoá ảnh
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full my-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

function ModalActions({
  onCancel, onConfirm, confirmLabel, confirmDisabled, confirmTone = 'emerald',
}: {
  onCancel: () => void
  onConfirm: () => void
  confirmLabel: string
  confirmDisabled?: boolean
  confirmTone?: 'emerald' | 'amber' | 'rose'
}) {
  const cls = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
    rose: 'bg-rose-600 hover:bg-rose-700',
  }[confirmTone]
  return (
    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onCancel}
        className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg px-3 py-2"
      >
        Huỷ
      </button>
      <button
        onClick={onConfirm}
        disabled={confirmDisabled}
        className={`flex-1 ${cls} disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-3 py-2`}
      >
        {confirmLabel}
      </button>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg text-sm"
      />
    </label>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ v: string; t: string }>; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg text-sm"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.t}</option>
        ))}
      </select>
    </label>
  )
}
