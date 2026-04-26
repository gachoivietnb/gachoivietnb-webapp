'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MODULES,
  DEFAULT_NHAN_VIEN_PERMISSIONS,
  type PermissionsMap,
} from '@/lib/rbac/modules'
import { removeDiacritics } from '@/lib/utils/slugify'

type Staff = {
  id: string
  full_name: string
  role: string
  is_active: boolean
  permissions: PermissionsMap | null
}

type Action = 'read' | 'write' | 'delete'

const GROUP_META: Record<string, { emoji: string; bar: string; cls: string; chip: string }> = {
  'Quản lý đàn': {
    emoji: '🐓',
    bar: 'from-blue-400 to-indigo-500',
    cls: 'border-blue-300 dark:border-blue-800',
    chip: 'from-blue-500 to-indigo-500',
  },
  'Sức khỏe': {
    emoji: '💉',
    bar: 'from-emerald-400 to-teal-500',
    cls: 'border-emerald-300 dark:border-emerald-800',
    chip: 'from-emerald-500 to-teal-500',
  },
  'Kinh doanh': {
    emoji: '💵',
    bar: 'from-amber-400 to-orange-500',
    cls: 'border-amber-300 dark:border-amber-800',
    chip: 'from-amber-500 to-orange-500',
  },
  Marketing: {
    emoji: '✨',
    bar: 'from-violet-400 to-purple-500',
    cls: 'border-violet-300 dark:border-violet-800',
    chip: 'from-violet-500 to-purple-500',
  },
  'Hệ thống': {
    emoji: '⚙️',
    bar: 'from-slate-400 to-gray-500',
    cls: 'border-slate-300 dark:border-slate-700',
    chip: 'from-slate-500 to-gray-500',
  },
}

const ACTION_META: Record<
  Action,
  { label: string; emoji: string; on: string; off: string }
> = {
  read: {
    label: 'Xem',
    emoji: '👁',
    on: 'bg-emerald-500 text-white border-emerald-500',
    off: 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700',
  },
  write: {
    label: 'Sửa',
    emoji: '✎',
    on: 'bg-blue-500 text-white border-blue-500',
    off: 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700',
  },
  delete: {
    label: 'Xoá',
    emoji: '🗑',
    on: 'bg-rose-500 text-white border-rose-500',
    off: 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-700',
  },
}

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

function permsEqual(a: PermissionsMap, b: PermissionsMap): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    const pa = a[k] ?? {}
    const pb = b[k] ?? {}
    if (
      Boolean(pa.read) !== Boolean(pb.read) ||
      Boolean(pa.write) !== Boolean(pb.write) ||
      Boolean(pa.delete) !== Boolean(pb.delete)
    )
      return false
  }
  return true
}

function countPerms(p: PermissionsMap): { modules: number; read: number; write: number; delete: number } {
  let modules = 0,
    read = 0,
    write = 0,
    del = 0
  for (const v of Object.values(p)) {
    if (v.read || v.write || v.delete) modules += 1
    if (v.read) read += 1
    if (v.write) write += 1
    if (v.delete) del += 1
  }
  return { modules, read, write, delete: del }
}

export function PermissionsEditor({ staff }: { staff: Staff[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(staff[0]?.id ?? null)
  const initialPerms = useMemo(
    () => staff[0]?.permissions ?? DEFAULT_NHAN_VIEN_PERMISSIONS,
    [staff]
  )
  const [original, setOriginal] = useState<PermissionsMap>(initialPerms)
  const [draft, setDraft] = useState<PermissionsMap>(initialPerms)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [staffSearch, setStaffSearch] = useState('')
  const [moduleSearch, setModuleSearch] = useState('')

  const selected = staff.find((s) => s.id === selectedId) ?? null
  const dirty = !permsEqual(original, draft)

  const grouped = useMemo(() => {
    const g: Record<string, typeof MODULES> = {}
    for (const m of MODULES) {
      if (!g[m.group]) g[m.group] = []
      g[m.group].push(m)
    }
    return g
  }, [])

  const qStaffNorm = removeDiacritics(staffSearch.trim())
  const qModuleNorm = removeDiacritics(moduleSearch.trim())

  const filteredStaff = useMemo(() => {
    if (!qStaffNorm) return staff
    return staff.filter((s) => removeDiacritics(s.full_name).includes(qStaffNorm))
  }, [staff, qStaffNorm])

  function pickStaff(id: string) {
    if (dirty && !confirm('Có thay đổi chưa lưu — bỏ và chuyển sang nhân viên khác?')) {
      return
    }
    const s = staff.find((x) => x.id === id)
    const perms = s?.permissions ?? DEFAULT_NHAN_VIEN_PERMISSIONS
    setSelectedId(id)
    setOriginal(perms)
    setDraft(perms)
    setMsg(null)
  }

  function toggle(moduleKey: string, action: Action) {
    setDraft((prev) => {
      const cur = prev[moduleKey] ?? {}
      const next = { ...cur, [action]: !cur[action] }
      // Cascade: turning off read also turns off write+delete
      if (action === 'read' && !next.read) {
        next.write = false
        next.delete = false
      }
      // Turning off write also turns off delete
      if (action === 'write' && !next.write) {
        next.delete = false
      }
      // Turning on write requires read
      if (action === 'write' && next.write) next.read = true
      // Turning on delete requires read+write
      if (action === 'delete' && next.delete) {
        next.read = true
        next.write = true
      }
      return { ...prev, [moduleKey]: next }
    })
  }

  function applyPreset(preset: 'full' | 'read_only' | 'default' | 'none') {
    if (preset === 'full') {
      const full: PermissionsMap = {}
      for (const m of MODULES) {
        full[m.key] = {
          read: m.supports.read,
          write: m.supports.write,
          delete: m.supports.delete,
        }
      }
      setDraft(full)
    } else if (preset === 'read_only') {
      const ro: PermissionsMap = {}
      for (const m of MODULES) ro[m.key] = { read: m.supports.read }
      setDraft(ro)
    } else if (preset === 'default') {
      setDraft(DEFAULT_NHAN_VIEN_PERMISSIONS)
    } else {
      setDraft({})
    }
  }

  function applyGroupPreset(group: string, mode: 'all' | 'read' | 'none') {
    const mods = grouped[group] ?? []
    setDraft((prev) => {
      const next = { ...prev }
      for (const m of mods) {
        if (mode === 'all') {
          next[m.key] = {
            read: m.supports.read,
            write: m.supports.write,
            delete: m.supports.delete,
          }
        } else if (mode === 'read') {
          next[m.key] = { read: m.supports.read }
        } else {
          next[m.key] = {}
        }
      }
      return next
    })
  }

  function resetDraft() {
    setDraft(original)
    setMsg(null)
  }

  async function save() {
    if (!selectedId) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/staff/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: selectedId, permissions: draft }),
      })
      const j = await res.json()
      if (!res.ok) {
        setMsg({ tone: 'err', text: j.error ?? 'Lỗi' })
      } else {
        setMsg({ tone: 'ok', text: '✓ Đã lưu phân quyền' })
        setOriginal(draft)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  if (staff.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
        <div className="text-5xl mb-2">👥</div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Chưa có nhân viên nào
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Mời nhân viên đăng ký tài khoản tại trang đăng nhập, sau đó quay lại đây để cấu hình quyền truy cập.
        </p>
      </div>
    )
  }

  const stats = countPerms(draft)
  const totalSupportsRead = MODULES.filter((m) => m.supports.read).length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
      <aside className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden h-fit lg:sticky lg:top-4">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="p-3">
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              👥 Nhân viên
            </h3>
            <span className="text-[10.5px] text-gray-500 dark:text-gray-400">
              {filteredStaff.length}/{staff.length}
            </span>
          </div>
          <div className="relative mb-2">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              placeholder="Tìm tên…"
              className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ul className="space-y-1">
            {filteredStaff.map((s) => {
              const stat = countPerms(s.permissions ?? {})
              const active = selectedId === s.id
              return (
                <li key={s.id}>
                  <button
                    onClick={() => pickStaff(s.id)}
                    className={
                      'w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 transition ' +
                      (active
                        ? 'bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-300 dark:ring-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/40')
                    }
                  >
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(
                        s.id
                      )} text-white text-xs font-bold flex items-center justify-center shadow`}
                    >
                      {getInitials(s.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                        {s.full_name}
                        {!s.is_active && (
                          <span className="text-[9px] px-1 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            khoá
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-gray-500 dark:text-gray-400 truncate">
                        {stat.modules > 0
                          ? `${stat.modules} module · ${stat.write} sửa · ${stat.delete} xoá`
                          : 'Chưa có quyền nào'}
                      </div>
                    </div>
                    {active && dirty && (
                      <span
                        className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                        title="Có thay đổi chưa lưu"
                      />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          {filteredStaff.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-4">
              Không khớp tên
            </p>
          )}
        </div>
      </aside>

      <div className="space-y-4">
        {selected && (
          <>
            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
              <div className="p-4 md:p-5">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <div
                    className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${avatarColor(
                      selected.id
                    )} text-white text-lg font-extrabold flex items-center justify-center shadow ring-2 ring-white dark:ring-gray-800`}
                  >
                    {getInitials(selected.full_name)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                      {selected.full_name}
                      <span
                        className={
                          'text-[10.5px] px-1.5 py-0.5 rounded-full ' +
                          (selected.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300')
                        }
                      >
                        {selected.is_active ? '✓ Hoạt động' : '✗ Đã khoá'}
                      </span>
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Cấu hình quyền Read / Write / Delete trên từng module — chủ trại luôn full
                      quyền.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <Stat icon="📦" label="Module có quyền" value={`${stats.modules}/${MODULES.length}`} tone="from-slate-500 to-slate-600" />
                  <Stat icon="👁" label="Quyền xem" value={`${stats.read}/${totalSupportsRead}`} tone="from-emerald-500 to-teal-500" />
                  <Stat icon="✎" label="Quyền sửa" value={String(stats.write)} tone="from-blue-500 to-indigo-500" />
                  <Stat icon="🗑" label="Quyền xoá" value={String(stats.delete)} tone="from-rose-500 to-red-500" />
                </div>

                <div>
                  <div className="text-[10.5px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    Preset nhanh
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <PresetBtn label="🔓 Full quyền" onClick={() => applyPreset('full')} tone="violet" />
                    <PresetBtn
                      label="📋 Mặc định nhân viên"
                      onClick={() => applyPreset('default')}
                      tone="blue"
                    />
                    <PresetBtn label="👁 Chỉ xem" onClick={() => applyPreset('read_only')} tone="emerald" />
                    <PresetBtn label="🚫 Bỏ hết" onClick={() => applyPreset('none')} tone="rose" />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  placeholder="Tìm module: hồ sơ gà, kho thuốc, tài chính, tin tức…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </section>

            {Object.entries(grouped).map(([group, modules]) => {
              const meta = GROUP_META[group] ?? {
                emoji: '📁',
                bar: 'from-gray-400 to-gray-500',
                cls: '',
                chip: 'from-gray-500 to-gray-600',
              }
              const visible = qModuleNorm
                ? modules.filter((m) =>
                    removeDiacritics(`${m.label} ${m.key}`).includes(qModuleNorm)
                  )
                : modules
              if (visible.length === 0) return null
              const groupCount = modules.filter((m) => {
                const p = draft[m.key] ?? {}
                return p.read || p.write || p.delete
              }).length

              return (
                <section
                  key={group}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${meta.bar}`} />
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{meta.emoji}</span>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {group}
                      </h3>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {groupCount}/{modules.length} có quyền
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => applyGroupPreset(group, 'all')}
                        className={
                          'text-[10.5px] px-2 py-1 rounded font-semibold text-white shadow-sm bg-gradient-to-r ' +
                          meta.chip
                        }
                      >
                        Full
                      </button>
                      <button
                        onClick={() => applyGroupPreset(group, 'read')}
                        className="text-[10.5px] px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Chỉ xem
                      </button>
                      <button
                        onClick={() => applyGroupPreset(group, 'none')}
                        className="text-[10.5px] px-2 py-1 rounded border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        Bỏ hết
                      </button>
                    </div>
                  </div>
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {visible.map((m) => {
                      const p = draft[m.key] ?? {}
                      const hasAny = p.read || p.write || p.delete
                      return (
                        <div
                          key={m.key}
                          className={
                            'rounded-lg border p-2.5 transition ' +
                            (hasAny
                              ? 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/40 dark:to-gray-800/40 border-gray-200 dark:border-gray-700'
                              : 'bg-gray-50/40 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700')
                          }
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {m.label}
                            </div>
                            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                              {m.key}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {(['read', 'write', 'delete'] as const).map((act) => {
                              const meta = ACTION_META[act]
                              const supports = m.supports[act]
                              const on = !!p[act]
                              const disabled =
                                !supports ||
                                (act === 'write' && !p.read) ||
                                (act === 'delete' && (!p.read || !p.write))
                              return (
                                <button
                                  key={act}
                                  type="button"
                                  onClick={() => supports && toggle(m.key, act)}
                                  disabled={!supports}
                                  className={
                                    'px-2 py-1.5 rounded-md border text-[11px] font-semibold transition flex items-center justify-center gap-1 ' +
                                    (!supports
                                      ? 'opacity-30 cursor-not-allowed'
                                      : disabled && !on
                                        ? 'opacity-50'
                                        : '') +
                                    ' ' +
                                    (on ? meta.on : meta.off)
                                  }
                                  title={
                                    !supports
                                      ? 'Module này không hỗ trợ thao tác này'
                                      : disabled
                                        ? act === 'write'
                                          ? 'Cần bật Xem trước'
                                          : 'Cần bật Xem + Sửa trước'
                                        : ''
                                  }
                                >
                                  <span>{meta.emoji}</span>
                                  <span>{meta.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}

            <div className="lg:sticky lg:bottom-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {dirty ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-full px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Có thay đổi chưa lưu
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Đã đồng bộ
                  </span>
                )}
                {msg && (
                  <span
                    className={
                      'text-xs font-medium px-2 py-1 rounded ' +
                      (msg.tone === 'ok'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300')
                    }
                  >
                    {msg.text}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {dirty && (
                  <button
                    onClick={resetDraft}
                    disabled={saving}
                    className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-3 py-2 text-sm"
                  >
                    ↺ Khôi phục
                  </button>
                )}
                <button
                  onClick={save}
                  disabled={saving || !dirty}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg px-5 py-2 text-sm font-semibold shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {saving ? '⏳ Đang lưu…' : '💾 Lưu phân quyền'}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center pb-2">
              💡 Thay đổi áp dụng ngay khi nhân viên reload trang. Logic ràng buộc: Sửa cần Xem ·
              Xoá cần Xem + Sửa.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: string
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="relative overflow-hidden bg-gray-50/60 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5">
      <div
        className={`absolute -right-4 -top-4 w-12 h-12 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl`}
      />
      <div className="relative">
        <div className="flex items-center gap-1 text-[10.5px] text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-0.5 text-base font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </div>
      </div>
    </div>
  )
}

function PresetBtn({
  label,
  onClick,
  tone,
}: {
  label: string
  onClick: () => void
  tone: 'violet' | 'blue' | 'emerald' | 'rose'
}) {
  const cls = {
    violet:
      'border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30',
    blue: 'border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30',
    emerald:
      'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
    rose: 'border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30',
  }[tone]
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border bg-white dark:bg-gray-900 ${cls}`}
    >
      {label}
    </button>
  )
}
