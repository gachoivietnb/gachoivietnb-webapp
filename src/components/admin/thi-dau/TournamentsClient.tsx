'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TOURNAMENT_TYPE_META, TOURNAMENT_STATUS_META, RULES_META } from '@/lib/thi-dau/types'
import type { TournamentType, TournamentStatus, MatchRules } from '@/lib/thi-dau/types'

type Tournament = {
  id: string
  name: string
  type: TournamentType
  status: TournamentStatus
  venue: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  weight_class_min: number | null
  weight_class_max: number | null
  rules: MatchRules
  prize_pool: number
  entry_fee: number
  organizer: string | null
  organizer_phone: string | null
  banner_url: string | null
  notes: string | null
  matches?: Array<{ count: number }>
}

const fmtVnd = (n: number) => Number(n || 0).toLocaleString('vi-VN')

export function TournamentsClient({
  initial,
  canWrite,
  canDelete,
}: {
  initial: Tournament[]
  canWrite: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [list, setList] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Tournament | null>(null)

  async function reload() {
    const res = await fetch('/api/tournaments')
    const json = await res.json()
    setList(json.tournaments || [])
  }

  async function handleDelete(id: string) {
    if (!confirm('Xoá giải này? Các trận đã link sẽ giữ nhưng tournament_id thành null.')) return
    const res = await fetch(`/api/tournaments?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      alert('Lỗi xoá')
      return
    }
    setList(list.filter((t) => t.id !== id))
    router.refresh()
  }

  if (showForm) {
    return (
      <TournamentForm
        editing={editing}
        onCancel={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSaved={async () => {
          setShowForm(false)
          setEditing(null)
          await reload()
          router.refresh()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canWrite && (
          <button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg px-4 py-2 text-sm font-bold shadow"
          >
            + Tạo giải mới
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-12 text-center">
          <div className="text-6xl mb-2 opacity-50">🏟</div>
          <p className="text-sm text-gray-500">Chưa có giải đấu nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map((t) => {
            const meta = TOURNAMENT_TYPE_META[t.type]
            const stat = TOURNAMENT_STATUS_META[t.status]
            const rules = RULES_META[t.rules]
            const matchCount = t.matches?.[0]?.count ?? 0
            return (
              <div
                key={t.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition"
              >
                {t.banner_url && (
                  <div
                    className="h-24 bg-cover bg-center"
                    style={{ backgroundImage: `url(${t.banner_url})` }}
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-[11px] text-gray-500 mb-0.5">{meta.emoji} {meta.label}</div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">{t.name}</h3>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${stat.cls}`}>
                      {stat.emoji} {stat.label}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {(t.start_date || t.end_date) && (
                      <div>
                        📅 {t.start_date?.split('-').reverse().join('/') ?? '?'}
                        {t.end_date && ` → ${t.end_date.split('-').reverse().join('/')}`}
                      </div>
                    )}
                    {(t.venue || t.location) && (
                      <div>📍 {[t.venue, t.location].filter(Boolean).join(' · ')}</div>
                    )}
                    {t.organizer && <div>👤 {t.organizer}{t.organizer_phone && ` · ${t.organizer_phone}`}</div>}
                    <div>{rules.emoji} {rules.label} {(t.weight_class_min || t.weight_class_max) && `· Hạng ${t.weight_class_min ?? '0'}-${t.weight_class_max ?? '∞'}kg`}</div>
                    {t.prize_pool > 0 && (
                      <div className="font-semibold text-amber-700 dark:text-amber-400">💰 Giải thưởng: {fmtVnd(t.prize_pool)}đ</div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 items-center">
                    <span className="text-xs text-gray-500">⚔️ {matchCount} trận đã ghi</span>
                    {canWrite && (
                      <button
                        onClick={() => {
                          setEditing(t)
                          setShowForm(true)
                        }}
                        className="ml-auto text-xs text-blue-600 hover:underline"
                      >
                        ✏️ Sửa
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        🗑 Xoá
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TournamentForm({
  editing,
  onCancel,
  onSaved,
}: {
  editing: Tournament | null
  onCancel: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    id: editing?.id,
    name: editing?.name ?? '',
    type: editing?.type ?? ('hoi_xom' as TournamentType),
    status: editing?.status ?? ('sap_dien_ra' as TournamentStatus),
    venue: editing?.venue ?? '',
    location: editing?.location ?? '',
    start_date: editing?.start_date ?? '',
    end_date: editing?.end_date ?? '',
    weight_class_min: editing?.weight_class_min?.toString() ?? '',
    weight_class_max: editing?.weight_class_max?.toString() ?? '',
    rules: editing?.rules ?? ('don' as MatchRules),
    prize_pool: editing?.prize_pool?.toString() ?? '0',
    entry_fee: editing?.entry_fee?.toString() ?? '0',
    organizer: editing?.organizer ?? '',
    organizer_phone: editing?.organizer_phone ?? '',
    banner_url: editing?.banner_url ?? '',
    notes: editing?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Cần tên giải')
      return
    }
    setSaving(true)
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        weight_class_min: form.weight_class_min ? Number(form.weight_class_min) : null,
        weight_class_max: form.weight_class_max ? Number(form.weight_class_max) : null,
        prize_pool: Number(form.prize_pool || 0),
        entry_fee: Number(form.entry_fee || 0),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json()
      setError(typeof j.error === 'string' ? j.error : 'Lỗi lưu')
      return
    }
    onSaved()
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">{editing ? '✏️ Sửa giải' : '➕ Tạo giải mới'}</h2>
        <button onClick={onCancel} className="text-gray-500">✕</button>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1.5">Cấp giải</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {(['van_trai', 'hoi_xom', 'giai_tinh', 'khu_vuc', 'quoc_gia'] as TournamentType[]).map((t) => {
            const m = TOURNAMENT_TYPE_META[t]
            return (
              <button
                key={t}
                onClick={() => setForm({ ...form, type: t })}
                className={`text-center p-2 rounded-lg border-2 transition ${
                  form.type === t
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30 font-semibold'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="text-2xl">{m.emoji}</div>
                <div className="text-xs">{m.label}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Tên giải *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <div>
          <label className="block text-xs font-semibold mb-1">Trạng thái</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as TournamentStatus })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm"
          >
            {Object.entries(TOURNAMENT_STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
        </div>
        <Input label="Địa điểm cụ thể" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} placeholder="Sân đấu hội xóm Đông" />
        <Input label="Tỉnh/Thành" value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="Ninh Bình" />
        <Input label="Ngày bắt đầu" type="date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
        <Input label="Ngày kết thúc" type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
        <Input label="Cân tối thiểu (kg)" type="number" step="0.01" value={form.weight_class_min} onChange={(v) => setForm({ ...form, weight_class_min: v })} />
        <Input label="Cân tối đa (kg)" type="number" step="0.01" value={form.weight_class_max} onChange={(v) => setForm({ ...form, weight_class_max: v })} />
        <div>
          <label className="block text-xs font-semibold mb-1">Luật</label>
          <select
            value={form.rules}
            onChange={(e) => setForm({ ...form, rules: e.target.value as MatchRules })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm"
          >
            <option value="don">⚔️ Đá đòn</option>
            <option value="cua">🗡 Đá cựa</option>
          </select>
        </div>
        <Input label="Giải thưởng (đ)" type="number" value={form.prize_pool} onChange={(v) => setForm({ ...form, prize_pool: v })} />
        <Input label="Phí tham gia (đ)" type="number" value={form.entry_fee} onChange={(v) => setForm({ ...form, entry_fee: v })} />
        <Input label="Banner URL" value={form.banner_url} onChange={(v) => setForm({ ...form, banner_url: v })} placeholder="https://..." />
        <Input label="Đơn vị tổ chức" value={form.organizer} onChange={(v) => setForm({ ...form, organizer: v })} />
        <Input label="SĐT liên hệ" value={form.organizer_phone} onChange={(v) => setForm({ ...form, organizer_phone: v })} />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1">Ghi chú</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">⚠ {error}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg px-5 py-2 text-sm font-bold shadow disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo giải'}
        </button>
        <button
          onClick={onCancel}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-5 py-2 text-sm hover:bg-gray-50"
        >
          Huỷ
        </button>
      </div>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  step,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  step?: string
}) {
  return (
    <label className="block">
      <span className="text-xs block mb-1 font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm"
      />
    </label>
  )
}
