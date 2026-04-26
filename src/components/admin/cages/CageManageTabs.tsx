'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { removeDiacritics } from '@/lib/utils/slugify'

type Area = {
  id: string
  code: string
  name_vi: string
  type: string
  is_active: boolean
}
type Row = {
  id: string
  area_id: string
  code: string
  name_vi: string | null
  is_active: boolean
  areas?: { code: string; name_vi: string } | null
}
type Cage = {
  id: string
  row_id: string
  code: string
  full_code: string
  capacity: number
  status: string
  cage_rows?: {
    code: string
    area_id?: string
    areas?: { code: string; name_vi?: string } | null
  } | null
}

const AREA_TYPES: Array<{ value: string; label: string; emoji: string; cls: string; bar: string }> = [
  { value: 'trong',          label: 'Trống',         emoji: '⚪', cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700', bar: 'from-slate-400 to-slate-500' },
  { value: 'mai',            label: 'Mái',           emoji: '🐔', cls: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-900', bar: 'from-pink-400 to-rose-500' },
  { value: 'duc',            label: 'Đực',           emoji: '🐓', cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900', bar: 'from-blue-400 to-indigo-500' },
  { value: 'ghep_doi',       label: 'Ghép đôi',      emoji: '💞', cls: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900', bar: 'from-violet-400 to-purple-500' },
  { value: 'cach_ly',        label: 'Cách ly',       emoji: '🚧', cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900', bar: 'from-amber-400 to-orange-500' },
  { value: 'gia_pho_tong',   label: 'Gia phả tổng',  emoji: '🌳', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900', bar: 'from-emerald-400 to-teal-500' },
]

const CAGE_STATUSES: Array<{ value: string; label: string; emoji: string; cls: string; bar: string }> = [
  { value: 'trong',         label: 'Trống',     emoji: '⚪', cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700', bar: 'from-slate-400 to-gray-500' },
  { value: 'dang_su_dung',  label: 'Đang dùng', emoji: '🟢', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900', bar: 'from-emerald-400 to-teal-500' },
  { value: 'bao_tri',       label: 'Bảo trì',   emoji: '🔧', cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900', bar: 'from-amber-400 to-orange-500' },
  { value: 'khoa',          label: 'Khóa',      emoji: '🔒', cls: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900', bar: 'from-rose-400 to-red-500' },
]

const areaMeta = (v: string) => AREA_TYPES.find((t) => t.value === v) ?? AREA_TYPES[0]
const cageMeta = (v: string) => CAGE_STATUSES.find((t) => t.value === v) ?? CAGE_STATUSES[0]

export function CageManageTabs({
  areas,
  rows,
  cages,
}: {
  areas: Area[]
  rows: Row[]
  cages: Cage[]
}) {
  const [tab, setTab] = useState<'cages' | 'rows' | 'areas'>('cages')

  const stats = useMemo(() => {
    const cageByStatus = new Map<string, number>()
    for (const c of cages) cageByStatus.set(c.status, (cageByStatus.get(c.status) ?? 0) + 1)
    const cageByRow = new Map<string, number>()
    for (const c of cages) cageByRow.set(c.row_id, (cageByRow.get(c.row_id) ?? 0) + 1)
    const cageByArea = new Map<string, number>()
    for (const c of cages) {
      const aid = c.cage_rows?.area_id
      if (aid) cageByArea.set(aid, (cageByArea.get(aid) ?? 0) + 1)
    }
    const rowsByArea = new Map<string, number>()
    for (const r of rows) rowsByArea.set(r.area_id, (rowsByArea.get(r.area_id) ?? 0) + 1)

    const totalCapacity = cages.reduce((s, c) => s + (c.capacity ?? 0), 0)
    const usingCapacity = cages
      .filter((c) => c.status === 'dang_su_dung')
      .reduce((s, c) => s + (c.capacity ?? 0), 0)

    return { cageByStatus, cageByRow, cageByArea, rowsByArea, totalCapacity, usingCapacity }
  }, [cages, rows])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi
          label="Khu vực"
          value={String(areas.length)}
          icon="🏞️"
          tone="from-emerald-500 to-teal-500"
          sub={`${areas.filter((a) => a.is_active).length} đang dùng`}
        />
        <Kpi
          label="Dãy"
          value={String(rows.length)}
          icon="📚"
          tone="from-blue-500 to-indigo-500"
          sub={`${rows.filter((r) => r.is_active).length} đang dùng`}
        />
        <Kpi
          label="Chuồng"
          value={String(cages.length)}
          icon="🏠"
          tone="from-violet-500 to-purple-500"
          sub={`${stats.cageByStatus.get('dang_su_dung') ?? 0} đang dùng · ${stats.cageByStatus.get('trong') ?? 0} trống`}
        />
        <Kpi
          label="Tổng sức chứa"
          value={String(stats.totalCapacity)}
          icon="🐓"
          tone="from-amber-500 to-orange-500"
          sub={`Đang nuôi ${stats.usingCapacity}`}
        />
      </div>

      {cages.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
            <span>Phân bổ chuồng theo trạng thái</span>
            <span className="tabular-nums">
              {CAGE_STATUSES.map(
                (s) => `${s.emoji} ${stats.cageByStatus.get(s.value) ?? 0}`
              ).join(' · ')}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-900/60 overflow-hidden flex">
            {CAGE_STATUSES.map((s) => {
              const pct = ((stats.cageByStatus.get(s.value) ?? 0) / cages.length) * 100
              if (pct === 0) return null
              return (
                <div
                  key={s.value}
                  className={`h-full bg-gradient-to-r ${s.bar} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${s.label}: ${pct.toFixed(0)}%`}
                />
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 flex gap-1">
        {(
          [
            { k: 'cages' as const, label: '🏠 Chuồng', count: cages.length, tone: 'from-violet-500 to-purple-500' },
            { k: 'rows' as const, label: '📚 Dãy', count: rows.length, tone: 'from-blue-500 to-indigo-500' },
            { k: 'areas' as const, label: '🏞️ Khu vực', count: areas.length, tone: 'from-emerald-500 to-teal-500' },
          ]
        ).map((t) => {
          const active = tab === t.k
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={
                'flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ' +
                (active
                  ? `bg-gradient-to-r ${t.tone} text-white shadow`
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/40')
              }
            >
              <span>{t.label}</span>
              <span
                className={
                  'text-[11px] font-bold rounded-full px-1.5 py-0.5 ' +
                  (active
                    ? 'bg-white/20'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300')
                }
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {tab === 'areas' && (
        <AreasTab areas={areas} rowsByArea={stats.rowsByArea} cageByArea={stats.cageByArea} />
      )}
      {tab === 'rows' && <RowsTab rows={rows} areas={areas} cageByRow={stats.cageByRow} />}
      {tab === 'cages' && <CagesTab cages={cages} rows={rows} />}
    </div>
  )
}

/* ================================================================
 * CONFIRM DELETE MODAL
 * ================================================================ */
function ConfirmDelete({
  open,
  title,
  message,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="h-1.5 bg-gradient-to-r from-rose-500 to-red-500" />
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-xl">
              ⚠️
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{message}</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-md rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Đang xóa…' : '🗑 Xóa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
 * AREAS TAB
 * ================================================================ */
function AreasTab({
  areas,
  rowsByArea,
  cageByArea,
}: {
  areas: Area[]
  rowsByArea: Map<string, number>
  cageByArea: Map<string, number>
}) {
  const router = useRouter()
  const [form, setForm] = useState({ code: '', name_vi: '', type: 'trong' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ code: '', name_vi: '', type: 'trong' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [q, setQ] = useState('')
  const [filterType, setFilterType] = useState('')

  const qNorm = removeDiacritics(q.trim())
  const filtered = useMemo(() => {
    return areas.filter((a) => {
      if (filterType && a.type !== filterType) return false
      if (qNorm) {
        const hay = removeDiacritics(`${a.code} ${a.name_vi}`)
        if (!hay.includes(qNorm)) return false
      }
      return true
    })
  }, [areas, qNorm, filterType])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setLoading(false)
      return
    }
    setForm({ code: '', name_vi: '', type: 'trong' })
    setLoading(false)
    router.refresh()
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/areas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    router.refresh()
  }

  function startEdit(a: Area) {
    setEditId(a.id)
    setEditForm({ code: a.code, name_vi: a.name_vi, type: a.type })
    setError(null)
  }

  async function saveEdit(id: string) {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/areas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setLoading(false)
      return
    }
    setEditId(null)
    setLoading(false)
    router.refresh()
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    setError(null)
    const res = await fetch(`/api/areas/${deleteId}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(false)
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : 'Không xóa được')
      setDeleteId(null)
      return
    }
    setDeleteId(null)
    router.refresh()
  }

  const deleteArea = areas.find((a) => a.id === deleteId)

  return (
    <div className="space-y-3">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <form
          onSubmit={handleAdd}
          className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
        >
          <Field label="Mã khu (1-2 ký tự)">
            <input
              required
              placeholder="vd: F"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono font-bold tracking-widest"
              maxLength={10}
            />
          </Field>
          <Field label="Tên khu" className="md:col-span-2">
            <input
              required
              placeholder="Khu nuôi gà mái"
              value={form.name_vi}
              onChange={(e) => setForm({ ...form, name_vi: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Loại khu">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            >
              {AREA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-md disabled:opacity-50"
          >
            {loading ? 'Đang thêm…' : '+ Thêm khu'}
          </button>
        </form>
      </section>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã / tên khu (không dấu OK)"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
        >
          <option value="">Tất cả loại</option>
          {AREA_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.emoji} {t.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500 dark:text-gray-400 self-center whitespace-nowrap">
          {filtered.length}/{areas.length}
        </span>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🏞️"
          title={areas.length === 0 ? 'Chưa có khu nào' : 'Không khớp bộ lọc'}
          desc={areas.length === 0 ? 'Tạo khu đầu tiên ở form bên trên.' : 'Thử bỏ filter hoặc đổi từ khoá.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((a) => {
            const meta = areaMeta(a.type)
            const isEdit = editId === a.id
            return (
              <div
                key={a.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-md transition"
              >
                <div className={`h-1.5 bg-gradient-to-r ${meta.bar}`} />
                <div className="p-4">
                  {isEdit ? (
                    <div className="space-y-2">
                      <input
                        value={editForm.code}
                        onChange={(e) =>
                          setEditForm({ ...editForm, code: e.target.value.toUpperCase() })
                        }
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-sm font-mono font-bold"
                        maxLength={10}
                      />
                      <input
                        value={editForm.name_vi}
                        onChange={(e) => setEditForm({ ...editForm, name_vi: e.target.value })}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-sm"
                      />
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-sm"
                      >
                        {AREA_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.emoji} {t.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1 justify-end pt-1">
                        <button
                          onClick={() => saveEdit(a.id)}
                          disabled={loading}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
                        >
                          {loading ? '…' : '✓ Lưu'}
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5"
                        >
                          ✕ Huỷ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-2xl font-bold tabular-nums tracking-wide font-mono text-gray-900 dark:text-gray-100">
                              {a.code}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${meta.cls}`}>
                              {meta.emoji} {meta.label}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                            {a.name_vi}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleActive(a.id, a.is_active)}
                          className={
                            'text-[11px] px-2 py-0.5 rounded-full font-semibold transition whitespace-nowrap ' +
                            (a.is_active
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400')
                          }
                        >
                          {a.is_active ? '✓ Đang dùng' : '✗ Tắt'}
                        </button>
                      </div>

                      <div className="flex items-center gap-3 text-xs mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">
                          📚 <strong className="text-gray-700 dark:text-gray-300">{rowsByArea.get(a.id) ?? 0}</strong> dãy
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          🏠 <strong className="text-gray-700 dark:text-gray-300">{cageByArea.get(a.id) ?? 0}</strong> chuồng
                        </span>
                        <div className="ml-auto flex gap-1">
                          <button
                            onClick={() => startEdit(a)}
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          >
                            ✎ Sửa
                          </button>
                          <button
                            onClick={() => setDeleteId(a.id)}
                            className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDelete
        open={!!deleteId}
        title="Xóa khu vực?"
        message={`Xóa khu "${deleteArea?.code} · ${deleteArea?.name_vi}"? Chỉ xóa được nếu khu chưa có dãy. Thao tác không thể hoàn tác.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  )
}

/* ================================================================
 * ROWS TAB
 * ================================================================ */
function RowsTab({
  rows,
  areas,
  cageByRow,
}: {
  rows: Row[]
  areas: Area[]
  cageByRow: Map<string, number>
}) {
  const router = useRouter()
  const [form, setForm] = useState({ area_id: '', code: '', name_vi: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ area_id: '', code: '', name_vi: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [q, setQ] = useState('')
  const [filterArea, setFilterArea] = useState('')

  const qNorm = removeDiacritics(q.trim())
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterArea && r.area_id !== filterArea) return false
      if (qNorm) {
        const hay = removeDiacritics(`${r.code} ${r.name_vi ?? ''} ${r.areas?.code ?? ''} ${r.areas?.name_vi ?? ''}`)
        if (!hay.includes(qNorm)) return false
      }
      return true
    })
  }, [rows, qNorm, filterArea])

  // Group filtered rows by area for display
  const grouped = useMemo(() => {
    const m = new Map<string, { area: Area | undefined; items: Row[] }>()
    for (const r of filtered) {
      const cur = m.get(r.area_id) ?? { area: areas.find((a) => a.id === r.area_id), items: [] }
      cur.items.push(r)
      m.set(r.area_id, cur)
    }
    return Array.from(m.values()).sort((a, b) =>
      (a.area?.code ?? '').localeCompare(b.area?.code ?? '')
    )
  }, [filtered, areas])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/cage-rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setLoading(false)
      return
    }
    setForm({ area_id: form.area_id, code: '', name_vi: '' })
    setLoading(false)
    router.refresh()
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/cage-rows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    router.refresh()
  }

  function startEdit(r: Row) {
    setEditId(r.id)
    setEditForm({ area_id: r.area_id, code: r.code, name_vi: r.name_vi ?? '' })
    setError(null)
  }

  async function saveEdit(id: string) {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/cage-rows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setLoading(false)
      return
    }
    setEditId(null)
    setLoading(false)
    router.refresh()
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    setError(null)
    const res = await fetch(`/api/cage-rows/${deleteId}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(false)
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : 'Không xóa được')
      setDeleteId(null)
      return
    }
    setDeleteId(null)
    router.refresh()
  }

  const deleteRow = rows.find((r) => r.id === deleteId)

  return (
    <div className="space-y-3">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <form onSubmit={handleAdd} className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <Field label="Khu vực">
            <select
              required
              value={form.area_id}
              onChange={(e) => setForm({ ...form, area_id: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Chọn khu —</option>
              {areas.filter((a) => a.is_active).map((a) => {
                const meta = areaMeta(a.type)
                return (
                  <option key={a.id} value={a.id}>
                    {meta.emoji} {a.code} · {a.name_vi}
                  </option>
                )
              })}
            </select>
          </Field>
          <Field label="Mã dãy (vd: 01)">
            <input
              required
              placeholder="01"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono font-bold"
            />
          </Field>
          <Field label="Tên dãy (tuỳ chọn)">
            <input
              placeholder="Dãy gần cửa"
              value={form.name_vi}
              onChange={(e) => setForm({ ...form, name_vi: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <button
            type="submit"
            disabled={loading || !form.area_id}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-md disabled:opacity-50"
          >
            {loading ? 'Đang thêm…' : '+ Thêm dãy'}
          </button>
        </form>
      </section>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm dãy theo mã / tên / khu"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterArea}
          onChange={(e) => setFilterArea(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
        >
          <option value="">Tất cả khu</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} · {a.name_vi}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500 dark:text-gray-400 self-center whitespace-nowrap">
          {filtered.length}/{rows.length}
        </span>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📚"
          title={rows.length === 0 ? 'Chưa có dãy nào' : 'Không khớp bộ lọc'}
          desc={rows.length === 0 ? 'Tạo dãy đầu tiên ở form bên trên.' : 'Thử bỏ filter hoặc đổi từ khoá.'}
        />
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => {
            const meta = g.area ? areaMeta(g.area.type) : areaMeta('trong')
            return (
              <div
                key={g.area?.id ?? '_'}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                <div className={`h-1.5 bg-gradient-to-r ${meta.bar}`} />
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                      {g.area?.code ?? '?'}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${meta.cls}`}>
                      {meta.emoji} {meta.label}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {g.area?.name_vi ?? '—'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {g.items.length} dãy
                  </span>
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {g.items.map((r) => {
                    const isEdit = editId === r.id
                    const cageCount = cageByRow.get(r.id) ?? 0
                    return (
                      <div
                        key={r.id}
                        className="bg-gray-50/60 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5"
                      >
                        {isEdit ? (
                          <div className="space-y-2">
                            <select
                              value={editForm.area_id}
                              onChange={(e) =>
                                setEditForm({ ...editForm, area_id: e.target.value })
                              }
                              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-xs"
                            >
                              {areas.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.code} · {a.name_vi}
                                </option>
                              ))}
                            </select>
                            <input
                              value={editForm.code}
                              onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-xs font-mono"
                            />
                            <input
                              value={editForm.name_vi}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name_vi: e.target.value })
                              }
                              placeholder="Tên dãy"
                              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-xs"
                            />
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => saveEdit(r.id)}
                                disabled={loading}
                                className="text-[11px] bg-emerald-600 text-white rounded px-2 py-1 font-semibold"
                              >
                                ✓ Lưu
                              </button>
                              <button
                                onClick={() => setEditId(null)}
                                className="text-[11px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-2 py-1"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="font-mono font-bold text-gray-900 dark:text-gray-100">
                                  Dãy {r.code}
                                </div>
                                {r.name_vi && (
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                    {r.name_vi}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => toggleActive(r.id, r.is_active)}
                                className={
                                  'text-[10.5px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ' +
                                  (r.is_active
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400')
                                }
                              >
                                {r.is_active ? '✓' : '✗'}
                              </button>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                🏠 <strong className="text-gray-700 dark:text-gray-300">{cageCount}</strong> chuồng
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => startEdit(r)}
                                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={() => setDeleteId(r.id)}
                                  className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDelete
        open={!!deleteId}
        title="Xóa dãy?"
        message={`Xóa dãy "${deleteRow?.code}${deleteRow?.name_vi ? ` · ${deleteRow.name_vi}` : ''}"? Chỉ xóa được nếu dãy chưa có chuồng.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  )
}

/* ================================================================
 * CAGES TAB
 * ================================================================ */
function CagesTab({ cages, rows }: { cages: Cage[]; rows: Row[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ row_id: '', start_num: 1, count: 10, capacity: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ code: '', capacity: 1, status: 'trong' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [q, setQ] = useState('')
  const [filterRow, setFilterRow] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [view, setView] = useState<'grid' | 'table'>('grid')

  const qNorm = removeDiacritics(q.trim())

  const filteredCages = useMemo(() => {
    return cages.filter((c) => {
      if (filterRow && c.row_id !== filterRow) return false
      if (filterStatus && c.status !== filterStatus) return false
      if (qNorm) {
        const hay = removeDiacritics(`${c.code} ${c.full_code}`)
        if (!hay.includes(qNorm)) return false
      }
      return true
    })
  }, [cages, qNorm, filterRow, filterStatus])

  // Group by row
  const grouped = useMemo(() => {
    const m = new Map<string, { row: Row | undefined; items: Cage[] }>()
    for (const c of filteredCages) {
      const cur = m.get(c.row_id) ?? { row: rows.find((r) => r.id === c.row_id), items: [] }
      cur.items.push(c)
      m.set(c.row_id, cur)
    }
    return Array.from(m.values()).sort((a, b) =>
      (a.row?.areas?.code ?? '').localeCompare(b.row?.areas?.code ?? '') ||
      (a.row?.code ?? '').localeCompare(b.row?.code ?? '')
    )
  }, [filteredCages, rows])

  async function handleBulkCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    const res = await fetch('/api/cages/bulk-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setLoading(false)
      return
    }
    setResult(`✓ Đã tạo ${json.inserted} chuồng mới.`)
    setLoading(false)
    router.refresh()
  }

  function startEdit(c: Cage) {
    setEditId(c.id)
    setEditForm({ code: c.code, capacity: c.capacity, status: c.status })
    setError(null)
  }

  async function saveEdit(id: string) {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/cages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setLoading(false)
      return
    }
    setEditId(null)
    setLoading(false)
    router.refresh()
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    setError(null)
    const res = await fetch(`/api/cages/${deleteId}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(false)
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : 'Không xóa được')
      setDeleteId(null)
      return
    }
    setDeleteId(null)
    router.refresh()
  }

  const deleteCage = cages.find((c) => c.id === deleteId)
  const previewLastNum = form.start_num + form.count - 1

  return (
    <div className="space-y-3">
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500" />
        <form onSubmit={handleBulkCreate} className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🚀 Tạo hàng loạt chuồng
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <Field label="Dãy" className="md:col-span-2">
              <select
                required
                value={form.row_id}
                onChange={(e) => setForm({ ...form, row_id: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Chọn dãy —</option>
                {rows.filter((r) => r.is_active).map((r) => (
                  <option key={r.id} value={r.id}>
                    Khu {r.areas?.code} · Dãy {r.code}{r.name_vi ? ` (${r.name_vi})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bắt đầu từ">
              <input
                type="number"
                min={1}
                max={999}
                required
                value={form.start_num}
                onChange={(e) =>
                  setForm({ ...form, start_num: parseInt(e.target.value) || 1 })
                }
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono tabular-nums"
              />
            </Field>
            <Field label="Số lượng">
              <input
                type="number"
                min={1}
                max={100}
                required
                value={form.count}
                onChange={(e) => setForm({ ...form, count: parseInt(e.target.value) || 1 })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm font-mono tabular-nums"
              />
            </Field>
            <button
              type="submit"
              disabled={loading || !form.row_id}
              className="bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow hover:shadow-md disabled:opacity-50"
            >
              {loading ? 'Đang tạo…' : '🚀 Tạo'}
            </button>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded px-3 py-2">
            Sẽ tạo <strong>{form.count}</strong> chuồng số{' '}
            <span className="font-mono">{String(form.start_num).padStart(3, '0')}</span> →{' '}
            <span className="font-mono">{String(previewLastNum).padStart(3, '0')}</span>. Trùng số sẽ bị skip.
          </div>
        </form>
      </section>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}
      {result && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-lg p-3 text-sm">
          {result}
        </div>
      )}

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
        <div className="flex flex-col lg:flex-row gap-2 mb-2">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo mã chuồng / full code"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            value={filterRow}
            onChange={(e) => setFilterRow(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2"
          >
            <option value="">Tất cả dãy</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                Khu {r.areas?.code} · Dãy {r.code}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterStatus('')}
              className={
                'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                (!filterStatus
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-transparent shadow'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
              }
            >
              🌐 Tất cả
            </button>
            {CAGE_STATUSES.map((s) => {
              const active = filterStatus === s.value
              const count = cages.filter((c) => c.status === s.value).length
              return (
                <button
                  key={s.value}
                  onClick={() => setFilterStatus(s.value)}
                  className={
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                    (active
                      ? `bg-gradient-to-r ${s.bar} text-white border-transparent shadow`
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400')
                  }
                >
                  {s.emoji} {s.label} <span className="opacity-70">({count})</span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              {filteredCages.length}/{cages.length}
            </span>
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={
                  'px-3 py-1 ' +
                  (view === 'grid'
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                    : 'bg-white dark:bg-gray-900 text-gray-500')
                }
              >
                ▦ Lưới
              </button>
              <button
                onClick={() => setView('table')}
                className={
                  'px-3 py-1 ' +
                  (view === 'table'
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                    : 'bg-white dark:bg-gray-900 text-gray-500')
                }
              >
                ☰ Bảng
              </button>
            </div>
          </div>
        </div>
      </section>

      {filteredCages.length === 0 ? (
        <EmptyState
          icon="🏠"
          title={cages.length === 0 ? 'Chưa có chuồng nào' : 'Không khớp bộ lọc'}
          desc={
            cages.length === 0
              ? 'Tạo hàng loạt chuồng ở form bên trên.'
              : 'Bỏ filter trạng thái / dãy hoặc đổi từ khoá.'
          }
        />
      ) : view === 'grid' ? (
        <div className="space-y-3">
          {grouped.map((g) => (
            <div
              key={g.row?.id ?? '_'}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
            >
              <div className="h-1.5 bg-gradient-to-r from-blue-400 to-violet-500" />
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    Khu {g.row?.areas?.code ?? '?'} · Dãy {g.row?.code ?? '?'}
                  </span>
                  {g.row?.name_vi && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {g.row.name_vi}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {g.items.length} chuồng
                </span>
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {g.items.slice(0, 200).map((c) => {
                  const meta = cageMeta(c.status)
                  const isEdit = editId === c.id
                  return (
                    <div
                      key={c.id}
                      className={
                        'rounded-lg overflow-hidden border transition ' +
                        (isEdit
                          ? 'border-violet-400 ring-2 ring-violet-200 dark:ring-violet-900'
                          : 'border-gray-200 dark:border-gray-700')
                      }
                    >
                      <div className={`h-1 bg-gradient-to-r ${meta.bar}`} />
                      <div className="p-2.5 bg-gray-50/60 dark:bg-gray-900/40">
                        {isEdit ? (
                          <div className="space-y-1.5">
                            <input
                              value={editForm.code}
                              onChange={(e) =>
                                setEditForm({ ...editForm, code: e.target.value })
                              }
                              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-xs font-mono"
                            />
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={editForm.capacity}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  capacity: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-xs"
                            />
                            <select
                              value={editForm.status}
                              onChange={(e) =>
                                setEditForm({ ...editForm, status: e.target.value })
                              }
                              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-xs"
                            >
                              {CAGE_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.emoji} {s.label}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => saveEdit(c.id)}
                                disabled={loading}
                                className="text-[10.5px] bg-emerald-600 text-white rounded px-1.5 py-1 font-semibold"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditId(null)}
                                className="text-[10.5px] bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-1"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono font-bold text-sm text-gray-900 dark:text-gray-100">
                                {c.code}
                              </span>
                              <span className={`text-[10px] px-1 rounded ${meta.cls}`}>
                                {meta.emoji}
                              </span>
                            </div>
                            <div className="text-[10.5px] font-mono text-gray-500 dark:text-gray-400 truncate">
                              {c.full_code}
                            </div>
                            <div className="flex items-center justify-between mt-1.5 text-[10.5px]">
                              <span className="text-gray-500 dark:text-gray-400">
                                🐓 {c.capacity}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => startEdit(c)}
                                  className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={() => setDeleteId(c.id)}
                                  className="text-rose-600 dark:text-rose-400 hover:underline"
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
                {g.items.length > 200 && (
                  <div className="col-span-full text-[11px] text-gray-500 dark:text-gray-400 italic text-center">
                    Hiển thị 200/{g.items.length} chuồng — dùng filter để thu hẹp.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CagesTable
          cages={filteredCages}
          editId={editId}
          editForm={editForm}
          loading={loading}
          onStartEdit={startEdit}
          onSaveEdit={saveEdit}
          onCancelEdit={() => setEditId(null)}
          onSetEditForm={setEditForm}
          onAskDelete={(id) => setDeleteId(id)}
        />
      )}

      <ConfirmDelete
        open={!!deleteId}
        title="Xóa chuồng?"
        message={`Xóa chuồng "${deleteCage?.full_code}"? Chỉ xóa được nếu chuồng không có gà.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  )
}

function CagesTable({
  cages,
  editId,
  editForm,
  loading,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onSetEditForm,
  onAskDelete,
}: {
  cages: Cage[]
  editId: string | null
  editForm: { code: string; capacity: number; status: string }
  loading: boolean
  onStartEdit: (c: Cage) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onSetEditForm: (f: { code: string; capacity: number; status: string }) => void
  onAskDelete: (id: string) => void
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-3 py-2 text-left">Mã</th>
              <th className="px-3 py-2 text-left">Full code</th>
              <th className="px-3 py-2 text-left w-24">Sức chứa</th>
              <th className="px-3 py-2 text-left w-36">Trạng thái</th>
              <th className="px-3 py-2 text-right w-44">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {cages.slice(0, 500).map((c) => {
              const meta = cageMeta(c.status)
              const isEdit = editId === c.id
              return (
                <tr key={c.id} className="border-t border-gray-100 dark:border-gray-700">
                  {isEdit ? (
                    <>
                      <td className="px-3 py-2">
                        <input
                          value={editForm.code}
                          onChange={(e) => onSetEditForm({ ...editForm, code: e.target.value })}
                          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-sm w-20 font-mono"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {c.full_code}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={editForm.capacity}
                          onChange={(e) =>
                            onSetEditForm({
                              ...editForm,
                              capacity: parseInt(e.target.value) || 1,
                            })
                          }
                          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-sm w-16"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={editForm.status}
                          onChange={(e) =>
                            onSetEditForm({ ...editForm, status: e.target.value })
                          }
                          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-sm"
                        >
                          {CAGE_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.emoji} {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => onSaveEdit(c.id)}
                            disabled={loading}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-1 disabled:opacity-50"
                          >
                            {loading ? '…' : '✓ Lưu'}
                          </button>
                          <button
                            onClick={onCancelEdit}
                            className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-2 py-1"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-mono font-medium">{c.code}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">
                        {c.full_code}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{c.capacity}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${meta.cls}`}>
                          {meta.emoji} {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => onStartEdit(c)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          >
                            ✎ Sửa
                          </button>
                          <button
                            onClick={() => onAskDelete(c.id)}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                          >
                            🗑 Xóa
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {cages.length > 500 && (
        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
          Hiển thị 500/{cages.length} chuồng — dùng filter để thu hẹp.
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={'block ' + (className ?? '')}>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
      <div className="text-5xl mb-2">{icon}</div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  sub,
}: {
  label: string
  value: string
  icon: string
  tone: string
  sub?: string
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl`}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </div>
        {sub && (
          <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}
