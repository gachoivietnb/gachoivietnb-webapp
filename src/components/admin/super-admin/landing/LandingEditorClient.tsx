'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  PricingTier,
  Testimonial,
  Faq,
} from '@/lib/landing/content'

type SectionKey = 'pricing' | 'testimonials' | 'faqs'

type Meta = {
  updated_at: string | null
  is_default: boolean
}

const TONE_PRESETS = [
  { value: 'from-slate-400 to-slate-500', label: '⚪ Slate' },
  { value: 'from-blue-500 to-indigo-500', label: '🔵 Blue' },
  { value: 'from-orange-500 via-red-500 to-rose-500', label: '🔥 Pro orange' },
  { value: 'from-violet-500 to-purple-600', label: '👑 Violet' },
  { value: 'from-emerald-500 to-teal-500', label: '🟢 Emerald' },
  { value: 'from-amber-500 to-orange-500', label: '🟡 Amber' },
  { value: 'from-pink-500 to-rose-500', label: '🌸 Pink' },
  { value: 'from-cyan-500 to-blue-500', label: '💎 Cyan' },
]

const CTA_TONE_PRESETS = [
  {
    value:
      'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
    label: 'Outline gray',
  },
  {
    value:
      'border-2 border-blue-500 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30',
    label: 'Outline blue',
  },
  {
    value:
      'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg hover:shadow-xl hover:scale-105',
    label: 'Gradient orange (Pro)',
  },
  {
    value:
      'border-2 border-violet-500 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30',
    label: 'Outline violet',
  },
  {
    value:
      'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow hover:shadow-lg',
    label: 'Gradient emerald',
  },
]

export function LandingEditorClient({
  initialPricing,
  initialTestimonials,
  initialFaqs,
  meta,
}: {
  initialPricing: PricingTier[]
  initialTestimonials: Testimonial[]
  initialFaqs: Faq[]
  meta: Record<SectionKey, Meta>
}) {
  const router = useRouter()
  const [tab, setTab] = useState<SectionKey>('pricing')
  const [pricing, setPricing] = useState(initialPricing)
  const [testimonials, setTestimonials] = useState(initialTestimonials)
  const [faqs, setFaqs] = useState(initialFaqs)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const dirty = useMemo(
    () => ({
      pricing: JSON.stringify(pricing) !== JSON.stringify(initialPricing),
      testimonials: JSON.stringify(testimonials) !== JSON.stringify(initialTestimonials),
      faqs: JSON.stringify(faqs) !== JSON.stringify(initialFaqs),
    }),
    [pricing, testimonials, faqs, initialPricing, initialTestimonials, initialFaqs]
  )

  async function save(key: SectionKey) {
    setSaving(true)
    setMsg(null)
    const value = key === 'pricing' ? pricing : key === 'testimonials' ? testimonials : faqs
    try {
      const res = await fetch('/api/super-admin/landing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      const j = await res.json()
      if (!res.ok) {
        setMsg({
          tone: 'err',
          text: typeof j.error === 'string' ? j.error : JSON.stringify(j.error),
        })
      } else {
        setMsg({ tone: 'ok', text: '✓ Đã lưu — public page cập nhật trong tối đa 1 giờ (cache).' })
        router.refresh()
      }
    } catch (e) {
      setMsg({ tone: 'err', text: 'Lỗi mạng: ' + (e instanceof Error ? e.message : String(e)) })
    }
    setSaving(false)
  }

  async function resetSection(key: SectionKey) {
    if (!confirm(`Khôi phục về defaults? Override hiện tại sẽ bị xoá.`)) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/super-admin/landing?key=${key}`, { method: 'DELETE' })
      if (res.ok) {
        setMsg({ tone: 'ok', text: '✓ Đã reset về defaults — reload trang để thấy.' })
        router.refresh()
      } else {
        const j = await res.json()
        setMsg({ tone: 'err', text: j.error ?? 'Lỗi reset' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* TAB BAR */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 flex gap-1">
        {(
          [
            { k: 'pricing' as const, label: '💎 Pricing', count: pricing.length },
            {
              k: 'testimonials' as const,
              label: '⭐ Testimonials',
              count: testimonials.length,
            },
            { k: 'faqs' as const, label: '❓ FAQ', count: faqs.length },
          ]
        ).map((t) => {
          const active = tab === t.k
          const isDirty = dirty[t.k]
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={
                'flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ' +
                (active
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow'
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
              {isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          )
        })}
      </div>

      {/* META BAR */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          {meta[tab].is_default ? (
            <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-full px-2 py-0.5">
              ⚠️ Đang dùng defaults
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-full px-2 py-0.5">
              ✓ Đã override
            </span>
          )}
          {meta[tab].updated_at && (
            <span className="text-gray-500 dark:text-gray-400">
              Cập nhật: {new Date(meta[tab].updated_at!).toLocaleString('vi-VN')}
            </span>
          )}
          {dirty[tab] && (
            <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Có thay đổi chưa lưu
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!meta[tab].is_default && (
            <button
              onClick={() => resetSection(tab)}
              disabled={saving}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50"
            >
              ↺ Reset về defaults
            </button>
          )}
          <button
            onClick={() => save(tab)}
            disabled={saving || !dirty[tab]}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg px-4 py-1.5 text-sm font-semibold shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? '⏳ Đang lưu…' : '💾 Lưu thay đổi'}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={
            'rounded-xl p-3 text-sm border ' +
            (msg.tone === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300')
          }
        >
          {msg.text}
        </div>
      )}

      {tab === 'pricing' && (
        <PricingEditor pricing={pricing} setPricing={setPricing} />
      )}
      {tab === 'testimonials' && (
        <TestimonialsEditor testimonials={testimonials} setTestimonials={setTestimonials} />
      )}
      {tab === 'faqs' && <FaqsEditor faqs={faqs} setFaqs={setFaqs} />}
    </div>
  )
}

/* ============================================================ */
/*  PRICING EDITOR                                              */
/* ============================================================ */

function PricingEditor({
  pricing,
  setPricing,
}: {
  pricing: PricingTier[]
  setPricing: (p: PricingTier[]) => void
}) {
  function update(idx: number, patch: Partial<PricingTier>) {
    setPricing(pricing.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }
  function addFeature(idx: number) {
    update(idx, { features: [...pricing[idx].features, 'Tính năng mới'] })
  }
  function updateFeature(idx: number, fIdx: number, val: string) {
    const features = [...pricing[idx].features]
    features[fIdx] = val
    update(idx, { features })
  }
  function removeFeature(idx: number, fIdx: number) {
    update(idx, { features: pricing[idx].features.filter((_, i) => i !== fIdx) })
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...pricing]
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= next.length) return
    ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
    setPricing(next)
  }
  function addTier() {
    setPricing([
      ...pricing,
      {
        name: 'Gói mới',
        price: '0',
        period: 'tháng',
        desc: '',
        bar: 'from-slate-400 to-slate-500',
        cta: 'Đăng ký',
        ctaTone: CTA_TONE_PRESETS[0].value,
        features: [],
        featured: false,
      },
    ])
  }
  function removeTier(idx: number) {
    if (!confirm(`Xoá gói "${pricing[idx].name}"?`)) return
    setPricing(pricing.filter((_, i) => i !== idx))
  }
  function setFeatured(idx: number) {
    setPricing(pricing.map((p, i) => ({ ...p, featured: i === idx })))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {pricing.map((tier, idx) => (
          <article
            key={idx}
            className={
              'bg-white dark:bg-gray-800 border-2 rounded-xl overflow-hidden ' +
              (tier.featured
                ? 'border-orange-400 dark:border-orange-700 ring-2 ring-orange-200 dark:ring-orange-900/50'
                : 'border-gray-200 dark:border-gray-700')
            }
          >
            <div className={`h-1.5 bg-gradient-to-r ${tier.bar}`} />
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Gói #{idx + 1}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === pricing.length - 1}
                    className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <label className="text-[11px] flex items-center gap-1 ml-1">
                    <input
                      type="checkbox"
                      checked={tier.featured}
                      onChange={() => setFeatured(idx)}
                    />
                    ⭐ Phổ biến
                  </label>
                  <button
                    onClick={() => removeTier(idx)}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline ml-1"
                  >
                    🗑
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Tên gói">
                  <input
                    value={tier.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1 text-sm"
                  />
                </Field>
                <Field label="Mô tả ngắn">
                  <input
                    value={tier.desc}
                    onChange={(e) => update(idx, { desc: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1 text-sm"
                  />
                </Field>
                <Field label="Giá">
                  <input
                    value={tier.price}
                    onChange={(e) => update(idx, { price: e.target.value })}
                    placeholder="VD: 499.000 hoặc 0"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1 text-sm font-mono tabular-nums"
                  />
                </Field>
                <Field label="Period">
                  <input
                    value={tier.period}
                    onChange={(e) => update(idx, { period: e.target.value })}
                    placeholder="tháng / 14 ngày"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1 text-sm"
                  />
                </Field>
                <Field label="Màu thanh trên (gradient)">
                  <select
                    value={tier.bar}
                    onChange={(e) => update(idx, { bar: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1 text-xs"
                  >
                    {TONE_PRESETS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Style nút CTA">
                  <select
                    value={tier.ctaTone}
                    onChange={(e) => update(idx, { ctaTone: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1 text-xs"
                  >
                    {CTA_TONE_PRESETS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Text trên nút CTA" className="col-span-2">
                  <input
                    value={tier.cta}
                    onChange={(e) => update(idx, { cta: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-2 py-1 text-sm"
                  />
                </Field>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                    Features ({tier.features.length})
                  </span>
                  <button
                    onClick={() => addFeature(idx)}
                    className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-semibold"
                  >
                    ＋ Thêm
                  </button>
                </div>
                <ul className="space-y-1">
                  {tier.features.map((f, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-1.5">
                      <span className="text-emerald-500 text-xs">✓</span>
                      <input
                        value={f}
                        onChange={(e) => updateFeature(idx, fIdx, e.target.value)}
                        className="flex-1 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded px-2 py-0.5 text-xs"
                      />
                      <button
                        onClick={() => removeFeature(idx, fIdx)}
                        className="text-rose-500 hover:text-rose-700 text-xs"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* MINI PREVIEW */}
              <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 text-center border border-gray-200 dark:border-gray-700">
                <div className="text-[10.5px] text-gray-500 mb-0.5">PREVIEW</div>
                <div className="text-base font-bold">{tier.name}</div>
                <div className="text-2xl font-extrabold tabular-nums">
                  {tier.price}đ
                  <span className="text-xs font-normal text-gray-500">/{tier.period}</span>
                </div>
                <div className="text-[10.5px] text-gray-600 dark:text-gray-400 mt-0.5">
                  {tier.desc}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <button
        onClick={addTier}
        className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-violet-400 hover:bg-violet-50/40 dark:hover:bg-violet-950/15 text-gray-600 dark:text-gray-400 hover:text-violet-700 dark:hover:text-violet-300 rounded-xl py-4 font-semibold text-sm transition"
      >
        ＋ Thêm gói mới
      </button>
    </div>
  )
}

/* ============================================================ */
/*  TESTIMONIALS EDITOR                                         */
/* ============================================================ */

function TestimonialsEditor({
  testimonials,
  setTestimonials,
}: {
  testimonials: Testimonial[]
  setTestimonials: (t: Testimonial[]) => void
}) {
  function update(idx: number, patch: Partial<Testimonial>) {
    setTestimonials(testimonials.map((t, i) => (i === idx ? { ...t, ...patch } : t)))
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...testimonials]
    const ni = idx + dir
    if (ni < 0 || ni >= next.length) return
    ;[next[idx], next[ni]] = [next[ni], next[idx]]
    setTestimonials(next)
  }
  function add() {
    setTestimonials([
      ...testimonials,
      {
        name: 'Khách hàng mới',
        role: 'Trại gà · Tỉnh',
        avatar: 'K',
        avatarTone: 'from-blue-500 to-indigo-500',
        quote: 'Phần mềm rất tốt, tôi đã dùng được... Cụ thể hơn ở đây.',
        stars: 5,
      },
    ])
  }
  function remove(idx: number) {
    if (!confirm(`Xoá testimonial của "${testimonials[idx].name}"?`)) return
    setTestimonials(testimonials.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {testimonials.map((t, idx) => (
          <article
            key={idx}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
          >
            <div className={`h-1.5 bg-gradient-to-r ${t.avatarTone}`} />
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Testimonial #{idx + 1}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === testimonials.length - 1}
                    className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => remove(idx)}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline ml-1"
                  >
                    🗑
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Field label="Tên" className="col-span-2">
                  <input
                    value={t.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-sm"
                  />
                </Field>
                <Field label="Ký tự avatar">
                  <input
                    value={t.avatar}
                    onChange={(e) => update(idx, { avatar: e.target.value.slice(0, 2).toUpperCase() })}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-sm font-bold text-center"
                    maxLength={2}
                  />
                </Field>
                <Field label="Vai trò / Trại" className="col-span-2">
                  <input
                    value={t.role}
                    onChange={(e) => update(idx, { role: e.target.value })}
                    placeholder="VD: Trại gà Asil · Ninh Bình"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-sm"
                  />
                </Field>
                <Field label="Số sao">
                  <select
                    value={t.stars}
                    onChange={(e) => update(idx, { stars: Number(e.target.value) })}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} sao
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Màu avatar (gradient)" className="col-span-3">
                  <select
                    value={t.avatarTone}
                    onChange={(e) => update(idx, { avatarTone: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-xs"
                  >
                    {TONE_PRESETS.map((tone) => (
                      <option key={tone.value} value={tone.value}>
                        {tone.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Quote (10–500 ký tự)">
                <textarea
                  value={t.quote}
                  onChange={(e) => update(idx, { quote: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded px-2 py-1 text-sm"
                />
                <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {t.quote.length}/500
                </div>
              </Field>

              {/* PREVIEW */}
              <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-[10.5px] text-gray-500 mb-1.5">PREVIEW</div>
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span key={i} className="text-amber-400 text-xs">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-xs italic text-gray-700 dark:text-gray-300 mb-2 line-clamp-3">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-br ${t.avatarTone} text-white text-xs font-bold flex items-center justify-center`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{t.name}</div>
                    <div className="text-[10px] text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <button
        onClick={add}
        className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-violet-400 hover:bg-violet-50/40 dark:hover:bg-violet-950/15 text-gray-600 dark:text-gray-400 hover:text-violet-700 dark:hover:text-violet-300 rounded-xl py-4 font-semibold text-sm transition"
      >
        ＋ Thêm testimonial
      </button>
    </div>
  )
}

/* ============================================================ */
/*  FAQ EDITOR                                                  */
/* ============================================================ */

function FaqsEditor({
  faqs,
  setFaqs,
}: {
  faqs: Faq[]
  setFaqs: (f: Faq[]) => void
}) {
  function update(idx: number, patch: Partial<Faq>) {
    setFaqs(faqs.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...faqs]
    const ni = idx + dir
    if (ni < 0 || ni >= next.length) return
    ;[next[idx], next[ni]] = [next[ni], next[idx]]
    setFaqs(next)
  }
  function add() {
    setFaqs([
      ...faqs,
      {
        q: 'Câu hỏi mới?',
        a: 'Câu trả lời chi tiết... Tối thiểu 10 ký tự để phù hợp validate.',
      },
    ])
  }
  function remove(idx: number) {
    if (!confirm(`Xoá FAQ "${faqs[idx].q}"?`)) return
    setFaqs(faqs.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      {faqs.map((f, idx) => (
        <article
          key={idx}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">FAQ #{idx + 1}</div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === faqs.length - 1}
                  className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  onClick={() => remove(idx)}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline ml-1"
                >
                  🗑
                </button>
              </div>
            </div>

            <Field label="Câu hỏi">
              <input
                value={f.q}
                onChange={(e) => update(idx, { q: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm font-semibold"
              />
              <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5">
                {f.q.length}/200
              </div>
            </Field>

            <Field label="Trả lời">
              <textarea
                value={f.a}
                onChange={(e) => update(idx, { a: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg px-3 py-2 text-sm leading-relaxed"
              />
              <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5">
                {f.a.length}/2000
              </div>
            </Field>
          </div>
        </article>
      ))}
      <button
        onClick={add}
        className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-violet-400 hover:bg-violet-50/40 dark:hover:bg-violet-950/15 text-gray-600 dark:text-gray-400 hover:text-violet-700 dark:hover:text-violet-300 rounded-xl py-4 font-semibold text-sm transition"
      >
        ＋ Thêm FAQ
      </button>
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
      <span className="text-[10.5px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 block mb-0.5">
        {label}
      </span>
      {children}
    </label>
  )
}
