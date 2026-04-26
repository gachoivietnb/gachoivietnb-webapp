'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export type UserRow = {
  id: string
  full_name: string
  phone: string | null
  role: 'chu_trai' | 'nhan_vien' | 'khach'
  is_active: boolean
  farm_id: string
  farm_name: string
  farm_slug: string
  email: string | null
  last_sign_in_at: string | null
  created_at: string
}

export type FarmRef = { id: string; name: string; slug: string }

const ROLE_META: Record<UserRow['role'], { label: string; emoji: string; cls: string }> = {
  chu_trai: { label: 'Chủ trại', emoji: '👑', cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800' },
  nhan_vien: { label: 'Nhân viên', emoji: '👤', cls: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800' },
  khach: { label: 'Khách', emoji: '👁', cls: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700' },
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'chưa từng'
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'vừa xong'
  if (m < 60) return `${m} phút`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ`
  const d = Math.floor(h / 24)
  return `${d} ngày`
}

export function UsersManagerClient({
  initialUsers,
  farms,
  currentUserId,
}: {
  initialUsers: UserRow[]
  farms: FarmRef[]
  currentUserId: string
}) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [filterFarm, setFilterFarm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [resetting, setResetting] = useState<UserRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  function showToast(kind: 'ok' | 'err', msg: string) {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 4500)
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filterFarm && u.farm_id !== filterFarm) return false
      if (filterRole && u.role !== filterRole) return false
      if (filterStatus === 'active' && !u.is_active) return false
      if (filterStatus === 'inactive' && u.is_active) return false
      if (search.trim()) {
        const s = search.toLowerCase()
        if (
          !u.full_name.toLowerCase().includes(s) &&
          !(u.email ?? '').toLowerCase().includes(s) &&
          !(u.phone ?? '').includes(s) &&
          !u.farm_name.toLowerCase().includes(s)
        )
          return false
      }
      return true
    })
  }, [users, filterFarm, filterRole, filterStatus, search])

  async function refresh() {
    const r = await fetch('/api/super-admin/users')
    if (!r.ok) return
    const j = (await r.json()) as { users?: UserRow[] }
    if (j.users) setUsers(j.users)
    startTransition(() => router.refresh())
  }

  async function handleDelete(u: UserRow) {
    if (!confirm(`Xoá vĩnh viễn user "${u.full_name}" (${u.email})?\n\nKHÔNG thể hoàn tác. Tất cả dữ liệu user tạo ra sẽ vẫn còn nhưng author sẽ là NULL.`)) return
    setBusy(true)
    try {
      const r = await fetch(`/api/super-admin/users/${u.id}`, { method: 'DELETE' })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        showToast('err', 'Lỗi: ' + (j.error ?? r.status))
      } else {
        showToast('ok', `Đã xoá ${u.full_name}`)
        await refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {toast && (
        <div
          className={
            'mb-3 rounded-lg p-3 text-sm border ' +
            (toast.kind === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200')
          }
        >
          {toast.msg}
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <input
            type="search"
            placeholder="🔍 tên / email / sđt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1.5 col-span-2"
          />
          <select
            value={filterFarm}
            onChange={(e) => setFilterFarm(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1.5"
          >
            <option value="">Tất cả trại</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1.5"
          >
            <option value="">Mọi role</option>
            {Object.entries(ROLE_META).map(([k, m]) => (
              <option key={k} value={k}>{m.emoji} {m.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1.5"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khoá</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold rounded-lg px-3 py-1.5 shadow"
          >
            ➕ Tạo tài khoản mới
          </button>
          <button
            onClick={refresh}
            className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-200"
          >
            🔄 Làm mới
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto self-center">
            {filtered.length}/{users.length} user
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40">
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                <th className="px-3 py-2.5">Người dùng</th>
                <th className="px-3 py-2.5">Trại</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Trạng thái</th>
                <th className="px-3 py-2.5">Login gần nhất</th>
                <th className="px-3 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                    Không có user nào khớp lọc
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const role = ROLE_META[u.role]
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {u.full_name}
                          {u.id === currentUserId && (
                            <span className="ml-1.5 text-[10px] bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 rounded-full px-1.5 py-0.5 font-bold">
                              BẠN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate max-w-[200px]">
                          {u.email ?? '—'}
                        </div>
                        {u.phone && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">📞 {u.phone}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/admin/super-admin/farms/${u.farm_id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          {u.farm_name}
                        </Link>
                        <div className="text-[10px] text-gray-400 font-mono truncate max-w-[160px]">{u.farm_slug}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={'text-[11px] px-2 py-0.5 rounded-full border font-bold inline-block ' + role.cls}>
                          {role.emoji} {role.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {u.is_active ? (
                          <span className="text-[11px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5 font-semibold">
                            🟢 Hoạt động
                          </span>
                        ) : (
                          <span className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 font-semibold">
                            ⚫ Khoá
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">
                        {timeAgo(u.last_sign_in_at)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex gap-1 justify-end flex-wrap">
                          <button
                            onClick={() => setEditing(u)}
                            className="text-xs bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            onClick={() => setResetting(u)}
                            className="text-xs bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-1 rounded"
                          >
                            🔑 Reset
                          </button>
                          {u.id !== currentUserId && (
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={busy}
                              className="text-xs bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-2 py-1 rounded disabled:opacity-50"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission editor hint */}
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        💡 Để phân quyền chi tiết theo từng module cho nhân viên (xem/sửa/xoá từng phần),
        chủ trại vào <Link href="/admin/nhan-su" className="text-blue-600 dark:text-blue-400 hover:underline">/admin/nhan-su</Link> trong farm tương ứng.
      </p>

      {showCreate && (
        <CreateUserModal
          farms={farms}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            showToast('ok', '✓ Đã tạo tài khoản mới')
            refresh()
          }}
          onError={(msg) => showToast('err', msg)}
        />
      )}

      {editing && (
        <EditUserModal
          user={editing}
          farms={farms}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            showToast('ok', '✓ Đã cập nhật user')
            refresh()
          }}
          onError={(msg) => showToast('err', msg)}
        />
      )}

      {resetting && (
        <ResetPasswordModal
          user={resetting}
          onClose={() => setResetting(null)}
          onDone={(pass) => {
            setResetting(null)
            showToast('ok', `✓ Đã reset password cho ${resetting.full_name}: ${pass}`)
          }}
          onError={(msg) => showToast('err', msg)}
        />
      )}
    </>
  )
}

/* ============================================================
 * Modals
 * ============================================================ */

function CreateUserModal({
  farms, onClose, onCreated, onError,
}: {
  farms: FarmRef[]
  onClose: () => void
  onCreated: () => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'nhan_vien' as 'chu_trai' | 'nhan_vien' | 'khach',
    farm_id: farms[0]?.id ?? '',
    is_active: true,
  })
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!form.email || !form.password || !form.full_name || !form.farm_id) {
      onError('Điền đủ Email, mật khẩu, họ tên, trại')
      return
    }
    if (form.password.length < 6) {
      onError('Mật khẩu tối thiểu 6 ký tự')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        onError('Lỗi: ' + (j.error ?? r.status))
        return
      }
      onCreated()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="➕ Tạo tài khoản mới" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Họ tên *" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Nguyễn Văn A" />
        <Field label="Email *" value={form.email} onChange={(v) => setForm({ ...form, email: v.toLowerCase() })} placeholder="user@example.com" type="email" />
        <Field label="Mật khẩu (≥6 ký tự) *" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="••••••••" type="text" />
        <Field label="Số điện thoại" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0xxx..." />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Vai trò *"
            value={form.role}
            options={[
              { v: 'chu_trai', t: '👑 Chủ trại' },
              { v: 'nhan_vien', t: '👤 Nhân viên' },
              { v: 'khach', t: '👁 Khách (chỉ xem)' },
            ]}
            onChange={(v) => setForm({ ...form, role: v as 'chu_trai' | 'nhan_vien' | 'khach' })}
          />
          <SelectField
            label="Thuộc trại *"
            value={form.farm_id}
            options={farms.map((f) => ({ v: f.id, t: f.name }))}
            onChange={(v) => setForm({ ...form, farm_id: v })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          <span>Kích hoạt ngay</span>
        </label>
      </div>
      <ModalActions
        onCancel={onClose}
        onConfirm={submit}
        confirmLabel={busy ? '⏳ Đang tạo...' : '✓ Tạo'}
        confirmDisabled={busy}
      />
    </Modal>
  )
}

function EditUserModal({
  user, farms, onClose, onSaved, onError,
}: {
  user: UserRow
  farms: FarmRef[]
  onClose: () => void
  onSaved: () => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState({
    full_name: user.full_name,
    phone: user.phone ?? '',
    role: user.role,
    farm_id: user.farm_id,
    is_active: user.is_active,
  })
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      const r = await fetch(`/api/super-admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        onError('Lỗi: ' + (j.error ?? r.status))
        return
      }
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`✏️ Sửa: ${user.full_name}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs bg-gray-50 dark:bg-gray-900/60 rounded p-2 font-mono text-gray-500 dark:text-gray-400 break-all">
          {user.email}
        </div>
        <Field label="Họ tên" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
        <Field label="Số điện thoại" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Vai trò"
            value={form.role}
            options={[
              { v: 'chu_trai', t: '👑 Chủ trại' },
              { v: 'nhan_vien', t: '👤 Nhân viên' },
              { v: 'khach', t: '👁 Khách' },
            ]}
            onChange={(v) => setForm({ ...form, role: v as 'chu_trai' | 'nhan_vien' | 'khach' })}
          />
          <SelectField
            label="Thuộc trại"
            value={form.farm_id}
            options={farms.map((f) => ({ v: f.id, t: f.name }))}
            onChange={(v) => setForm({ ...form, farm_id: v })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          <span>Đang hoạt động (uncheck = khoá)</span>
        </label>
      </div>
      <ModalActions
        onCancel={onClose}
        onConfirm={submit}
        confirmLabel={busy ? '⏳ Đang lưu...' : '💾 Lưu'}
        confirmDisabled={busy}
      />
    </Modal>
  )
}

function ResetPasswordModal({
  user, onClose, onDone, onError,
}: {
  user: UserRow
  onClose: () => void
  onDone: (pass: string) => void
  onError: (msg: string) => void
}) {
  function genPass() {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let s = ''
    for (let i = 0; i < 10; i++) s += a[Math.floor(Math.random() * a.length)]
    return s
  }
  const [pass, setPass] = useState(genPass())
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (pass.length < 6) { onError('Mật khẩu tối thiểu 6 ký tự'); return }
    setBusy(true)
    try {
      const r = await fetch(`/api/super-admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass }),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        onError('Lỗi: ' + (j.error ?? r.status))
        return
      }
      onDone(pass)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`🔑 Reset mật khẩu`} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs bg-gray-50 dark:bg-gray-900/60 rounded p-2">
          <div className="font-semibold text-gray-900 dark:text-gray-100">{user.full_name}</div>
          <div className="font-mono text-gray-500 dark:text-gray-400 break-all">{user.email}</div>
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
              onClick={() => setPass(genPass())}
              className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-semibold"
            >
              🎲 Random
            </button>
          </div>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded p-2">
          ⚠️ Sao chép mật khẩu này NGAY — sau khi bấm Reset, password cũ mất ngay lập tức và bạn sẽ không thấy lại.
        </p>
      </div>
      <ModalActions
        onCancel={onClose}
        onConfirm={submit}
        confirmLabel={busy ? '⏳ Đang reset...' : '🔑 Reset ngay'}
        confirmDisabled={busy || pass.length < 6}
        confirmTone="amber"
      />
    </Modal>
  )
}

/* ============================================================
 * Modal building blocks
 * ============================================================ */

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
  onCancel, onConfirm, confirmLabel, confirmDisabled, confirmTone = 'violet',
}: {
  onCancel: () => void
  onConfirm: () => void
  confirmLabel: string
  confirmDisabled?: boolean
  confirmTone?: 'violet' | 'amber' | 'rose'
}) {
  const cls = {
    violet: 'bg-violet-600 hover:bg-violet-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
    rose: 'bg-rose-600 hover:bg-rose-700',
  }[confirmTone]
  return (
    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onCancel}
        className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg px-3 py-2"
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

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
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

function SelectField({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: Array<{ v: string; t: string }>
  onChange: (v: string) => void
}) {
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
