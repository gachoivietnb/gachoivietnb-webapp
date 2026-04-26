'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { removeDiacritics } from '@/lib/utils/slugify'

type Status = 'on' | 'off' | 'partial' | 'info'

export type SectionMeta = {
  id: string
  title: string
  icon: string
  description: string
  group: string
  keywords: string
  bar: string
  status?: Status
  statusLabel?: string
  lastUpdated?: string | null
}

const STATUS_META: Record<Status, { label: string; cls: string; dot: string }> = {
  on: {
    label: 'Đang bật',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    dot: 'bg-emerald-500',
  },
  off: {
    label: 'Đã tắt',
    cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900',
    dot: 'bg-rose-400',
  },
  partial: {
    label: 'Cần cấu hình',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    dot: 'bg-amber-500',
  },
  info: {
    label: 'Thông tin',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900',
    dot: 'bg-blue-500',
  },
}

export function CaiDatHub({
  metas,
  slots,
  kpis,
}: {
  metas: SectionMeta[]
  slots: Record<string, ReactNode>
  kpis: { label: string; value: string; icon: string; tone: string; pulse?: boolean }[]
}) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<string>('')

  const groups = useMemo(() => {
    const set = new Set(metas.map((m) => m.group))
    return Array.from(set)
  }, [metas])

  const qNorm = removeDiacritics(q.trim())

  const filtered = useMemo(() => {
    return metas.filter((m) => {
      if (group && m.group !== group) return false
      if (qNorm) {
        const hay = removeDiacritics(`${m.title} ${m.description} ${m.keywords} ${m.group}`)
        if (!hay.includes(qNorm)) return false
      }
      return true
    })
  }, [metas, qNorm, group])

  function reset() {
    setQ('')
    setGroup('')
  }

  function jumpTo(id: string) {
    const el = document.getElementById('section-' + id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const hasFilter = Boolean(q || group)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm cài đặt: AI, watermark, drive, push, backup, zalo, facebook…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setGroup('')}
              className={
                'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                (!group
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400')
              }
            >
              🌐 Tất cả
            </button>
            {groups.map((g) => {
              const active = group === g
              const count = metas.filter((m) => m.group === g).length
              return (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition ' +
                    (active
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400')
                  }
                >
                  {g} <span className="opacity-70">({count})</span>
                </button>
              )
            })}
            {hasFilter && (
              <button
                onClick={reset}
                className="text-sm text-rose-600 dark:text-rose-400 hover:underline px-2"
              >
                Bỏ lọc
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            Hiện <strong className="text-gray-900 dark:text-gray-100">{filtered.length}</strong>/
            {metas.length} mục cài đặt
          </span>
          <div className="flex flex-wrap gap-1.5">
            {filtered.map((m) => {
              const st = m.status ? STATUS_META[m.status] : null
              return (
                <button
                  key={m.id}
                  onClick={() => jumpTo(m.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 transition"
                >
                  <span>{m.icon}</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{m.title}</span>
                  {st && (
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} aria-label={st.label} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
          <div className="text-5xl mb-2">🔍</div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Không tìm thấy mục cài đặt nào khớp.
          </p>
          {hasFilter && (
            <button
              onClick={reset}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"
            >
              Bỏ tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          <aside className="hidden lg:block">
            <div className="sticky top-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
                Mục lục
              </div>
              <ul className="space-y-0.5">
                {filtered.map((m) => {
                  const st = m.status ? STATUS_META[m.status] : null
                  return (
                    <li key={m.id}>
                      <button
                        onClick={() => jumpTo(m.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
                      >
                        <span className="text-base leading-none">{m.icon}</span>
                        <span className="flex-1 truncate">{m.title}</span>
                        {st && <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </aside>

          <div className="space-y-4 min-w-0">
            {filtered.map((m) => (
              <SettingsCard key={m.id} meta={m}>
                {slots[m.id]}
              </SettingsCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsCard({ meta, children }: { meta: SectionMeta; children: ReactNode }) {
  const st = meta.status ? STATUS_META[meta.status] : null
  return (
    <section
      id={'section-' + meta.id}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden scroll-mt-4"
    >
      <div className={`h-1.5 bg-gradient-to-r ${meta.bar}`} />
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xl">
              {meta.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {meta.title}
                </h2>
                {st && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${st.cls}`}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${st.dot} mr-1`} />
                    {meta.statusLabel ?? st.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {meta.description}
              </p>
            </div>
          </div>
          {meta.lastUpdated && (
            <div className="text-[10.5px] text-gray-400 dark:text-gray-500 text-right whitespace-nowrap">
              Cập nhật
              <br />
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {new Date(meta.lastUpdated).toLocaleDateString('vi-VN')}
              </span>
            </div>
          )}
        </div>
        {children}
      </div>
    </section>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  pulse,
}: {
  label: string
  value: string
  icon: string
  tone: string
  pulse?: boolean
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </div>
      </div>
    </div>
  )
}
