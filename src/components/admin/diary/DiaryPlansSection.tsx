'use client'

import { useState } from 'react'

export type PlanInput = {
  key: string
  title: string
  description: string
  due_date: string
  due_time: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: PlanCategoryKey
  assignee_id: string
}

type PlanCategoryKey =
  | 'cong_viec' | 'cham_soc' | 'cho_an' | 've_sinh' | 'huan_luyen'
  | 'sinh_san' | 'thu_y' | 'kinh_doanh' | 'su_co' | 'bao_tri' | 'khac'

const CATEGORIES: Array<{ key: PlanCategoryKey; emoji: string; label: string }> = [
  { key: 'cong_viec',  emoji: '🛠', label: 'Công việc' },
  { key: 'cham_soc',   emoji: '🐔', label: 'Chăm sóc' },
  { key: 'cho_an',     emoji: '🌾', label: 'Cho ăn' },
  { key: 've_sinh',    emoji: '🧹', label: 'Vệ sinh' },
  { key: 'huan_luyen', emoji: '🥊', label: 'Huấn luyện' },
  { key: 'sinh_san',   emoji: '🥚', label: 'Sinh sản' },
  { key: 'thu_y',      emoji: '💉', label: 'Thú y' },
  { key: 'kinh_doanh', emoji: '💵', label: 'Kinh doanh' },
  { key: 'su_co',      emoji: '⚠️', label: 'Sự cố' },
  { key: 'bao_tri',    emoji: '🔧', label: 'Bảo trì' },
  { key: 'khac',       emoji: '📌', label: 'Khác' },
]

const PRIORITIES: Array<{
  key: 'critical' | 'high' | 'medium' | 'low'
  label: string
  emoji: string
  cls: string
  activeCls: string
}> = [
  { key: 'critical', label: 'Khẩn cấp', emoji: '🔥', cls: 'border-red-200 dark:border-red-900 text-red-700 dark:text-red-300', activeCls: 'bg-red-500 text-white border-red-500' },
  { key: 'high',     label: 'Cao',      emoji: '⚡',  cls: 'border-orange-200 dark:border-orange-900 text-orange-700 dark:text-orange-300', activeCls: 'bg-orange-500 text-white border-orange-500' },
  { key: 'medium',   label: 'TB',       emoji: '🔹', cls: 'border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300', activeCls: 'bg-blue-500 text-white border-blue-500' },
  { key: 'low',      label: 'Thấp',     emoji: '🟢', cls: 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400', activeCls: 'bg-gray-500 text-white border-gray-500' },
]

const SUGGESTED_TITLES = [
  '🐔 Kiểm tra sức khoẻ đàn',
  '💉 Tiêm bổ sung',
  '🌾 Mua thêm thức ăn',
  '🧹 Vệ sinh chuồng',
  '🥊 Vần lại con A',
  '📞 Gọi khách báo giá',
  '🔧 Sửa chuồng',
  '🥚 Kiểm tra ổ ấp',
]

type Profile = { id: string; full_name: string }

export function DiaryPlansSection({
  enabled,
  onEnabledChange,
  plans,
  onChange,
  profiles,
  defaultDate,
}: {
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  plans: PlanInput[]
  onChange: (plans: PlanInput[]) => void
  profiles: Profile[]
  defaultDate: string
}) {
  function addPlan() {
    const tomorrow = addDays(new Date(defaultDate || todayISO()), 1)
    onChange([
      ...plans,
      {
        key: `p${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: '',
        description: '',
        due_date: toLocalISO(tomorrow),
        due_time: '',
        priority: 'medium',
        category: 'cong_viec',
        assignee_id: '',
      },
    ])
  }

  function update(idx: number, patch: Partial<PlanInput>) {
    onChange(plans.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  function remove(idx: number) {
    onChange(plans.filter((_, i) => i !== idx))
  }

  function toggleEnabled(v: boolean) {
    onEnabledChange(v)
    if (v && plans.length === 0) addPlan()
  }

  return (
    <div
      className={
        'rounded-xl border-2 transition-all overflow-hidden ' +
        (enabled
          ? 'border-violet-300 dark:border-violet-800 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 dark:from-violet-950/30 dark:via-fuchsia-950/30 dark:to-pink-950/30'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40')
      }
    >
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => toggleEnabled(!enabled)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={
              'w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ' +
              (enabled
                ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700')
            }
          >
            {enabled ? '🎯' : '📌'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                Đặt nhắc việc tới đây
              </span>
              {enabled && plans.length > 0 && (
                <span className="text-[10px] bg-violet-500 text-white font-bold px-2 py-0.5 rounded-full">
                  {plans.length} việc
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
              {enabled
                ? '💡 Tự đồng bộ vào module Kế hoạch · App nhắc đúng ngày · Không bỏ sót'
                : 'Khi ghi nhật ký mà nhớ ra việc cần làm tới — note ngay tại đây để app nhắc'}
            </div>
          </div>
        </div>
        {/* Switch */}
        <div
          className={
            'relative w-11 h-6 rounded-full transition-colors shrink-0 ml-2 ' +
            (enabled ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'bg-gray-300 dark:bg-gray-600')
          }
        >
          <div
            className={
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ' +
              (enabled ? 'translate-x-5' : '')
            }
          />
        </div>
      </button>

      {/* Body */}
      {enabled && (
        <div className="px-4 pb-4 space-y-3 border-t border-violet-200/50 dark:border-violet-900/50">
          {plans.length === 0 && (
            <div className="text-center py-6 text-xs text-gray-500 dark:text-gray-400">
              Chưa có việc nào — bấm <b>+ Thêm việc</b> để bắt đầu
            </div>
          )}

          {plans.map((plan, idx) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              idx={idx}
              profiles={profiles}
              onChange={(patch) => update(idx, patch)}
              onRemove={() => remove(idx)}
            />
          ))}

          <button
            type="button"
            onClick={addPlan}
            className="w-full py-3 rounded-xl border-2 border-dashed border-violet-400 dark:border-violet-700 text-violet-700 dark:text-violet-300 font-bold text-sm hover:bg-violet-100 dark:hover:bg-violet-950/30 transition-colors"
          >
            + Thêm việc nữa
          </button>

          {plans.length > 0 && (
            <div className="bg-white/60 dark:bg-gray-800/40 rounded-lg px-3 py-2 text-[11px] text-violet-900 dark:text-violet-300 leading-relaxed">
              ✨ <b>{plans.length} việc</b> sẽ xuất hiện trong{' '}
              <a href="/admin/ke-hoach" target="_blank" rel="noreferrer" className="underline font-semibold">
                /admin/ke-hoach ↗
              </a>{' '}
              cùng với các việc auto-detect (tiêm phòng, kho thiếu...). App sẽ nhắc đúng ngày.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlanCard({
  plan,
  idx,
  profiles,
  onChange,
  onRemove,
}: {
  plan: PlanInput
  idx: number
  profiles: Profile[]
  onChange: (patch: Partial<PlanInput>) => void
  onRemove: () => void
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const cat = CATEGORIES.find((c) => c.key === plan.category) || CATEGORIES[0]
  const pri = PRIORITIES.find((p) => p.key === plan.priority) || PRIORITIES[2]

  function applyDatePreset(preset: 'tomorrow' | 'weekend' | 'nextweek' | 'nextmonth') {
    const now = new Date()
    let d = new Date()
    if (preset === 'tomorrow') d.setDate(now.getDate() + 1)
    else if (preset === 'weekend') {
      const dow = now.getDay()
      const offset = dow === 0 ? 6 : 6 - dow // tới thứ 7 gần nhất
      d.setDate(now.getDate() + offset)
    } else if (preset === 'nextweek') d.setDate(now.getDate() + 7)
    else if (preset === 'nextmonth') d.setMonth(now.getMonth() + 1)
    onChange({ due_date: toLocalISO(d) })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-violet-200 dark:border-violet-900 p-3 space-y-2 shadow-sm">
      {/* Title row */}
      <div className="flex gap-2">
        <span className="text-[10px] font-bold w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0 mt-1">
          {idx + 1}
        </span>
        <input
          value={plan.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Việc cần nhắc... VD: Mua thêm thuốc Coccidiosis"
          maxLength={300}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
          title="Xoá"
        >
          ×
        </button>
      </div>

      {/* Quick title suggestions (chỉ hiện khi title rỗng) */}
      {plan.title.trim().length === 0 && (
        <div className="flex flex-wrap gap-1 ml-7">
          {SUGGESTED_TITLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ title: s })}
              className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-gray-600 dark:text-gray-400"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Date + Priority + Category — main row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-7">
        {/* Date */}
        <div>
          <label className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold block mb-0.5">
            📅 Ngày
          </label>
          <input
            type="date"
            value={plan.due_date}
            onChange={(e) => onChange({ due_date: e.target.value })}
            className="w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
          />
        </div>

        {/* Time */}
        <div>
          <label className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold block mb-0.5">
            🕐 Giờ
          </label>
          <input
            type="time"
            value={plan.due_time}
            onChange={(e) => onChange({ due_time: e.target.value })}
            className="w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold block mb-0.5">
            ⚡ Mức ưu tiên
          </label>
          <select
            value={plan.priority}
            onChange={(e) => onChange({ priority: e.target.value as PlanInput['priority'] })}
            className={`w-full px-2 py-1.5 rounded-md border text-xs font-semibold ${pri.cls}`}
          >
            {PRIORITIES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.emoji} {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold block mb-0.5">
            🏷 Loại
          </label>
          <select
            value={plan.category}
            onChange={(e) => onChange({ category: e.target.value as PlanCategoryKey })}
            className="w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick date presets */}
      <div className="flex flex-wrap gap-1 ml-7">
        {(
          [
            ['tomorrow', '📆 Mai'],
            ['weekend', '🏖 Cuối tuần'],
            ['nextweek', '📅 Tuần sau'],
            ['nextmonth', '🗓 Tháng sau'],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => applyDatePreset(k)}
            className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60"
          >
            {l}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[10px] px-2 py-0.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ml-auto"
        >
          {showAdvanced ? '▲ Thu gọn' : '▼ Thêm chi tiết'}
        </button>
      </div>

      {/* Advanced (collapsible) */}
      {showAdvanced && (
        <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold block mb-0.5">
              👤 Phụ trách
            </label>
            <select
              value={plan.assignee_id}
              onChange={(e) => onChange({ assignee_id: e.target.value })}
              className="w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
            >
              <option value="">— Chưa giao —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold block mb-0.5">
              📝 Mô tả thêm
            </label>
            <input
              value={plan.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Chi tiết hơn (tuỳ chọn)..."
              maxLength={2000}
              className="w-full px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
            />
          </div>
        </div>
      )}

      {/* Visual badges */}
      <div className="flex items-center gap-1.5 ml-7 text-[10px]">
        <span className="text-gray-400">→ Hiện trên Kế hoạch:</span>
        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{cat.emoji} {cat.label}</span>
        <span className={`px-1.5 py-0.5 rounded ${pri.activeCls}`}>{pri.emoji} {pri.label}</span>
        {plan.due_date && (
          <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
            📆 {formatDateVN(plan.due_date)}{plan.due_time ? ` · ${plan.due_time}` : ''}
          </span>
        )}
      </div>
    </div>
  )
}

function todayISO(): string {
  return toLocalISO(new Date())
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function formatDateVN(s: string): string {
  if (!s || s.length !== 10) return s
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}
