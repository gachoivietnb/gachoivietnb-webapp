'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ChickGroup = {
  id: string
  hatched_count: number
  alive_count: number
  dead_count: number
  sick_count: number
}

type Graduated = {
  id: string
  chicken_code: string
  name: string | null
  gender: string
  status: string
}

export function LitterActions({
  litterId,
  status,
  eggsTotal,
  eggsFertile,
  hatchedCount,
  chickGroups,
  graduated,
}: {
  litterId: string
  status: string
  eggsTotal: number
  eggsFertile: number
  hatchedCount: number
  maleIds: string[]
  chickGroups: ChickGroup[]
  graduated: Graduated[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [eggsTotalF, setEggsTotalF] = useState(eggsTotal)
  const [eggsFertileF, setEggsFertileF] = useState(eggsFertile)
  const [hatchedCountF, setHatchedCountF] = useState(hatchedCount)
  const [hatchedDateF, setHatchedDateF] = useState(new Date().toISOString().split('T')[0])

  async function updateEggs() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/breeding/litters/${litterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eggs_total: eggsTotalF, eggs_fertile: eggsFertileF }),
    })
    if (!res.ok) setError('Update fail')
    setLoading(false)
    router.refresh()
  }

  async function markHatched() {
    if (hatchedCountF < 0) return
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/breeding/litters/${litterId}/hatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hatched_count: hatchedCountF, hatched_date: hatchedDateF }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(typeof json.error === 'string' ? json.error : 'Error')
    }
    setLoading(false)
    router.refresh()
  }

  if (status === 'dang_ap') {
    return (
      <div className="space-y-4">
        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">Cập nhật số trứng / phôi</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm block mb-1">Tổng trứng</span>
              <input
                type="number"
                min={0}
                value={eggsTotalF}
                onChange={(e) => setEggsTotalF(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm block mb-1">Số có phôi</span>
              <input
                type="number"
                min={0}
                max={eggsTotalF}
                value={eggsFertileF}
                onChange={(e) => setEggsFertileF(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
              />
            </label>
          </div>
          <button
            onClick={updateEggs}
            disabled={loading}
            className="mt-3 bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Cập nhật trứng
          </button>
        </section>

        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">🐣 Đánh dấu nở</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm block mb-1">Số gà con nở</span>
              <input
                type="number"
                min={0}
                value={hatchedCountF}
                onChange={(e) => setHatchedCountF(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm block mb-1">Ngày nở</span>
              <input
                type="date"
                value={hatchedDateF}
                onChange={(e) => setHatchedDateF(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
              />
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Nếu {hatchedCountF} = 0 → lứa sẽ được đánh dấu "Thất bại". Nếu {'>'} 0 → chuyển sang "Đã nở" và tự tạo chick_group.
          </p>
          <button
            onClick={markHatched}
            disabled={loading}
            className="mt-3 bg-green-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {hatchedCountF > 0 ? 'Đánh dấu đã nở' : 'Đánh dấu thất bại'}
          </button>
        </section>

        {error && <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-800 dark:text-red-300 rounded p-3 text-sm">{error}</div>}
      </div>
    )
  }

  if (status === 'da_no') {
    return (
      <div className="space-y-4">
        {chickGroups.map((cg) => (
          <ChickGroupForm key={cg.id} group={cg} />
        ))}

        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-semibold">🎓 Tốt nghiệp gà con</h2>
            <Link
              href={`/admin/sinh-san/${litterId}/tot-nghiep`}
              className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-blue-700"
            >
              Tốt nghiệp ngay
            </Link>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Chuyển gà con thành hồ sơ riêng. Mẹ, lứa và ngày sinh được tự gán từ dữ liệu lứa.
          </p>
        </section>

        {graduated.length > 0 && (
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-3">
              Đã tốt nghiệp ({graduated.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {graduated.map((g) => (
                <Link
                  key={g.id}
                  href={`/admin/ho-so-ga/${g.id}`}
                  className="text-sm border border-gray-200 dark:border-gray-700 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <strong>{g.name ?? g.chicken_code}</strong>
                  <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                    {g.gender === 'trong' ? '♂' : g.gender === 'mai' ? '♀' : '?'} {g.status}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
      Lứa đã <strong>{status === 'that_bai' ? 'thất bại' : 'kết thúc'}</strong> — không có hành động nào khả dụng.
    </section>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-xl font-medium">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  )
}

function ChickGroupForm({ group }: { group: ChickGroup }) {
  const router = useRouter()
  const [alive, setAlive] = useState(group.alive_count)
  const [dead, setDead] = useState(group.dead_count)
  const [sick, setSick] = useState(group.sick_count)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const survivalRate = group.hatched_count > 0
    ? Math.round((alive / group.hatched_count) * 100)
    : 0

  async function save() {
    setSaving(true)
    setErr(null)
    const res = await fetch(`/api/breeding/chick-groups/${group.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alive_count: alive, dead_count: dead, sick_count: sick }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErr(typeof json.error === 'string' ? json.error : 'Lỗi')
      setSaving(false)
      return
    }
    setSaving(false)
    router.refresh()
  }

  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-semibold">🐥 Nhóm gà con</h2>
        <span className={`text-xs px-2 py-1 rounded ${survivalRate >= 80 ? 'bg-green-100 text-green-800' : survivalRate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
          Tỷ lệ sống {survivalRate}%
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center bg-gray-50 dark:bg-gray-900 rounded p-3 mb-3">
        <Stat value={group.hatched_count} label="Tổng nở" />
        <Stat value={alive} label="Còn sống" />
        <Stat value={dead} label="Đã chết" />
        <Stat value={sick} label="Ốm" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label>
          <span className="text-xs block mb-1">Sống</span>
          <input
            type="number"
            min={0}
            max={group.hatched_count}
            value={alive}
            onChange={(e) => setAlive(parseInt(e.target.value) || 0)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
          />
        </label>
        <label>
          <span className="text-xs block mb-1">Chết</span>
          <input
            type="number"
            min={0}
            max={group.hatched_count}
            value={dead}
            onChange={(e) => setDead(parseInt(e.target.value) || 0)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
          />
        </label>
        <label>
          <span className="text-xs block mb-1">Ốm</span>
          <input
            type="number"
            min={0}
            value={sick}
            onChange={(e) => setSick(parseInt(e.target.value) || 0)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
          />
        </label>
      </div>
      {err && <div className="text-xs text-red-600 dark:text-red-400 mt-2">{err}</div>}
      <button
        onClick={save}
        disabled={saving}
        className="mt-3 bg-blue-600 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Đang lưu...' : 'Lưu'}
      </button>
    </section>
  )
}
