'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils/format'

export type Disease = {
  id: string
  chicken_id: string
  symptoms: string
  diagnosis: string | null
  treatment?: string | null
  outcome: string | null
  start_date: string
  end_date: string | null
  notes?: string | null
  chickens: { id: string; chicken_code: string; name: string | null } | null
}

export function DiseasesClient({ items }: { items: Disease[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Disease | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(d: Disease) {
    if (!window.confirm(`Xóa ca bệnh của ${d.chickens?.name ?? d.chickens?.chicken_code ?? 'gà này'} (${formatDate(d.start_date)})?`)) return
    setDeletingId(d.id)
    const res = await fetch(`/api/diseases/${d.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      window.alert('Lỗi xóa: ' + (j.error ?? `HTTP ${res.status}`))
      setDeletingId(null)
      return
    }
    setDeletingId(null)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {items.map((d) => (
        <div key={d.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {d.chickens && (
                <Link href={`/admin/ho-so-ga/${d.chickens.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-sm">
                  {d.chickens.name ?? d.chickens.chicken_code}
                </Link>
              )}
              <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{d.symptoms}</div>
              {d.diagnosis && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Chẩn đoán: {d.diagnosis}</div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                d.outcome === 'khoi' ? 'bg-green-100 text-green-800'
                : d.outcome === 'chet' ? 'bg-red-100 text-red-800'
                : 'bg-amber-100 text-amber-800'
              }`}>
                {d.outcome === 'khoi' ? '✓ Đã khỏi' : d.outcome === 'chet' ? '✗ Đã chết' : '⏳ Điều trị'}
              </span>
              <button
                onClick={() => setEditing(d)}
                title="Sửa"
                className="text-xs px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDelete(d)}
                disabled={deletingId === d.id}
                title="Xóa"
                className="text-xs px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 font-semibold"
              >
                {deletingId === d.id ? '⏳' : '🗑️'}
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Từ {formatDate(d.start_date)}
            {d.end_date && ` đến ${formatDate(d.end_date)}`}
          </div>
        </div>
      ))}

      {editing && (
        <EditDiseaseModal
          disease={editing}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function EditDiseaseModal({
  disease,
  onClose,
  onDone,
}: {
  disease: Disease
  onClose: () => void
  onDone: () => void
}) {
  const [form, setForm] = useState({
    symptoms: disease.symptoms ?? '',
    diagnosis: disease.diagnosis ?? '',
    treatment: disease.treatment ?? '',
    outcome: (disease.outcome ?? '') as string,
    start_date: disease.start_date ?? '',
    end_date: disease.end_date ?? '',
    notes: disease.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.symptoms.trim().length < 3) {
      setErr('Triệu chứng cần ít nhất 3 ký tự')
      return
    }
    setLoading(true)
    setErr(null)
    const res = await fetch(`/api/diseases/${disease.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symptoms: form.symptoms,
        diagnosis: form.diagnosis || null,
        treatment: form.treatment || null,
        outcome: form.outcome || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes || null,
      }),
    })
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      setErr(typeof j.error === 'string' ? j.error : 'Lỗi cập nhật')
      setLoading(false)
      return
    }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="h-1.5 bg-gradient-to-r from-rose-500 to-red-500" />
        <div className="p-4 md:p-5 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            🩺 Sửa ca bệnh — {disease.chickens?.name ?? disease.chickens?.chicken_code ?? ''}
          </h3>

          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">
            Triệu chứng *
            <textarea
              value={form.symptoms}
              rows={2}
              onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Chẩn đoán
              <input
                type="text"
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Kết quả điều trị
              <select
                value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">⏳ Đang điều trị</option>
                <option value="khoi">✓ Đã khỏi</option>
                <option value="chet">✗ Đã chết</option>
              </select>
            </label>
          </div>

          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">
            Cách điều trị / thuốc
            <textarea
              value={form.treatment}
              rows={2}
              onChange={(e) => setForm({ ...form, treatment: e.target.value })}
              className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Ngày bắt đầu
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Ngày kết thúc
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="mt-1 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>

          {err && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-lg px-3 py-2 text-sm">
              ✗ {err}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-4 py-2 text-sm"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-lg px-5 py-2 text-sm font-semibold shadow hover:shadow-lg disabled:opacity-50 transition"
            >
              {loading ? '⏳ Đang lưu…' : '💾 Cập nhật'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
