'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  type AssetWithValue,
  type AssetEvent,
  type AssetStatus,
  type AssetEventType,
  KIND_META,
  STATUS_META,
  EVENT_TYPE_META,
  categoryMeta,
  formatVnd,
  formatVndShort,
  depreciationPct,
} from '@/lib/assets/types'

const QUICK_EVENT_TYPES: Array<{ key: AssetEventType; label: string; emoji: string; bar: string }> = [
  { key: 'maintenance', label: 'Bảo trì', emoji: '🔧', bar: 'from-emerald-500 to-teal-600' },
  { key: 'repair', label: 'Sửa chữa', emoji: '🛠', bar: 'from-amber-500 to-orange-600' },
  { key: 'incident', label: 'Sự cố', emoji: '⚠️', bar: 'from-rose-500 to-red-600' },
  { key: 'inspection', label: 'Kiểm kê', emoji: '🔍', bar: 'from-blue-500 to-indigo-600' },
  { key: 'transfer', label: 'Chuyển vị trí', emoji: '🔄', bar: 'from-violet-500 to-fuchsia-600' },
  { key: 'note', label: 'Ghi chú', emoji: '📝', bar: 'from-slate-500 to-gray-600' },
]

export function AssetDetailClient({ initialAsset }: { initialAsset: AssetWithValue }) {
  const router = useRouter()
  const [asset, setAsset] = useState(initialAsset)
  const [events, setEvents] = useState<AssetEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventModalOpen, setEventModalOpen] = useState<AssetEventType | null>(null)

  useEffect(() => {
    fetch(`/api/assets/${asset.id}/events`)
      .then((r) => r.json())
      .then((j) => setEvents((j.data ?? []) as AssetEvent[]))
      .finally(() => setEventsLoading(false))
  }, [asset.id])

  async function refreshAll() {
    const [a, e] = await Promise.all([
      fetch(`/api/assets/${asset.id}`).then((r) => r.json()),
      fetch(`/api/assets/${asset.id}/events`).then((r) => r.json()),
    ])
    if (a.data) setAsset(a.data)
    if (e.data) setEvents(e.data)
    router.refresh()
  }

  async function changeStatus(newStatus: AssetStatus) {
    if (!confirm(`Đổi trạng thái sang "${STATUS_META[newStatus].label}"?`)) return
    const res = await fetch(`/api/assets/${asset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      const j = await res.json()
      alert('Lỗi: ' + (typeof j.error === 'string' ? j.error : 'unknown'))
      return
    }
    await fetch(`/api/assets/${asset.id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'status_change',
        event_date: new Date().toISOString().slice(0, 10),
        cost: 0,
        description: `Đổi trạng thái: ${STATUS_META[asset.status].label} → ${STATUS_META[newStatus].label}`,
      }),
    })
    refreshAll()
  }

  async function deleteAsset() {
    if (!confirm(`Xoá vĩnh viễn "${asset.name}"?\n\nLưu ý: chỉ nên xoá nếu nhập nhầm. Tài sản đã sử dụng nên dùng "Thanh lý" thay vì xoá.`)) return
    const res = await fetch(`/api/assets/${asset.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json()
      alert('Lỗi: ' + (typeof j.error === 'string' ? j.error : 'unknown'))
      return
    }
    router.push('/admin/tai-san')
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm('Xoá sự kiện này?')) return
    const res = await fetch(`/api/assets/${asset.id}/events?event_id=${eventId}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json()
      alert('Lỗi: ' + (typeof j.error === 'string' ? j.error : 'unknown'))
      return
    }
    refreshAll()
  }

  const km = KIND_META[asset.kind]
  const sm = STATUS_META[asset.status]
  const cat = categoryMeta(asset.category)
  const dep = depreciationPct(asset.months_used, asset.useful_life_months)

  const totalCost = asset.purchase_price + events.reduce((s, e) => s + (e.event_type !== 'purchase' ? e.cost : 0), 0)
  const totalMaintenanceCost = events
    .filter((e) => e.event_type === 'maintenance' || e.event_type === 'repair')
    .reduce((s, e) => s + e.cost, 0)

  return (
    <div className="space-y-4">
      {/* HERO */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${km.bar} text-white shadow-xl`}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <span className="absolute top-3 right-6 text-9xl">{cat.emoji}</span>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative p-5 md:p-6">
          <div className="flex flex-wrap items-start gap-4 mb-3">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-4xl md:text-5xl shadow">
              {cat.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold bg-white/25 backdrop-blur rounded px-1.5 py-0.5">
                  {km.emoji} {km.label}
                </span>
                <span className="text-xs font-mono opacity-80">{asset.code}</span>
                <span className={'text-[10px] font-semibold px-1.5 py-0.5 rounded ' + sm.cls.replace('border-', 'border-0 bg-')}>
                  {sm.emoji} {sm.label}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{asset.name}</h1>
              <div className="text-sm opacity-90 mt-1 flex flex-wrap gap-2">
                <span>📂 {cat.label}</span>
                {asset.brand && <span>· 🏷 {asset.brand}{asset.model ? ' / ' + asset.model : ''}</span>}
                {asset.quantity > 1 && <span>· ×{asset.quantity} {asset.unit}</span>}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-4">
            <Stat label="Giá mua" value={formatVnd(asset.purchase_price)} />
            <Stat label="Còn lại" value={formatVnd(asset.current_value)} highlight />
            <Stat
              label="Khấu hao"
              value={asset.useful_life_months ? `${dep}%` : '—'}
              sub={asset.useful_life_months ? `${asset.months_used}/${asset.useful_life_months} tháng` : undefined}
            />
            <Stat label="Tổng chi phí" value={formatVndShort(totalCost)} sub={`+${formatVndShort(totalMaintenanceCost)} bảo trì`} />
          </div>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT — Info card */}
        <div className="lg:col-span-1 space-y-3">
          <Card title="📋 Thông tin">
            <Kv k="Mã" v={<span className="font-mono">{asset.code}</span>} />
            <Kv k="Phân loại" v={`${cat.emoji} ${cat.label}`} />
            <Kv k="Trạng thái" v={
              <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ' + sm.cls}>
                {sm.emoji} {sm.label}
              </span>
            } />
            <Kv k="Số lượng" v={`${asset.quantity} ${asset.unit}`} />
            {asset.serial_number && <Kv k="Serial" v={<span className="font-mono text-xs">{asset.serial_number}</span>} />}
            <Kv k="Vị trí" v={asset.area_name ?? '—'} />
            <Kv k="Phụ trách" v={asset.responsible_name ?? '—'} />
            {asset.location_note && <Kv k="Ghi chú vị trí" v={asset.location_note} />}
          </Card>

          <Card title="💰 Mua sắm">
            <Kv k="Ngày mua" v={asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('vi-VN') : '—'} />
            <Kv k="Giá mua" v={<b className="tabular-nums">{formatVnd(asset.purchase_price)}</b>} />
            <Kv k="Nhà cung cấp" v={asset.supplier_name ?? '—'} />
            <Kv k="Số HĐ" v={asset.invoice_number ?? '—'} />
            {asset.warranty_until && (
              <Kv
                k="Bảo hành đến"
                v={
                  <span
                    className={
                      new Date(asset.warranty_until) < new Date()
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }
                  >
                    {new Date(asset.warranty_until).toLocaleDateString('vi-VN')}
                    {new Date(asset.warranty_until) < new Date() && ' (hết hạn)'}
                  </span>
                }
              />
            )}
            <Kv k="Giá trị thu hồi" v={formatVnd(asset.salvage_value)} />
          </Card>

          <Card title="🔧 Bảo trì">
            <Kv k="Lần gần nhất" v={asset.last_maintenance_date ? new Date(asset.last_maintenance_date).toLocaleDateString('vi-VN') : 'Chưa có'} />
            <Kv k="Lần kế tiếp" v={
              asset.next_maintenance_date ? (
                <span
                  className={
                    asset.maintenance_status === 'overdue'
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : asset.maintenance_status === 'due_soon'
                        ? 'text-amber-600 dark:text-amber-400 font-bold'
                        : ''
                  }
                >
                  {new Date(asset.next_maintenance_date).toLocaleDateString('vi-VN')}
                  {asset.maintenance_status === 'overdue' && ' ⚠️ Quá hạn'}
                  {asset.maintenance_status === 'due_soon' && ' 🔔 Sắp tới'}
                </span>
              ) : 'Chưa lên lịch'
            } />
            <Kv k="Chu kỳ" v={asset.maintenance_interval_months ? `${asset.maintenance_interval_months} tháng/lần` : '—'} />
          </Card>

          {asset.notes && (
            <Card title="📝 Ghi chú">
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{asset.notes}</div>
            </Card>
          )}
        </div>

        {/* RIGHT — Events timeline */}
        <div className="lg:col-span-2 space-y-3">
          {/* Quick action buttons */}
          <Card title="⚡ Thao tác nhanh">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_EVENT_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setEventModalOpen(t.key)}
                  className={`bg-gradient-to-br ${t.bar} text-white rounded-xl p-3 text-left shadow hover:shadow-lg transition`}
                >
                  <div className="text-2xl mb-1">{t.emoji}</div>
                  <div className="text-sm font-bold">{t.label}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Status change shortcuts */}
          <Card title="🔁 Đổi trạng thái">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_META) as AssetStatus[]).map((s) => {
                const m = STATUS_META[s]
                const active = asset.status === s
                return (
                  <button
                    key={s}
                    disabled={active}
                    onClick={() => changeStatus(s)}
                    className={
                      'px-3 py-1.5 rounded-lg text-xs font-semibold border transition ' +
                      (active
                        ? m.cls + ' opacity-100 cursor-default ring-2 ring-orange-400'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-300')
                    }
                  >
                    {m.emoji} {m.label}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={deleteAsset}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
              >
                🗑 Xoá tài sản này (không khôi phục được)
              </button>
            </div>
          </Card>

          {/* Timeline */}
          <Card title={`📜 Lịch sử (${events.length} sự kiện)`}>
            {eventsLoading ? (
              <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Đang tải...</div>
            ) : events.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">Chưa có sự kiện nào</div>
            ) : (
              <ol className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-3">
                {events.map((ev) => {
                  const m = EVENT_TYPE_META[ev.event_type]
                  return (
                    <li key={ev.id} className="ml-4 group">
                      <span
                        className={
                          'absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white dark:ring-gray-800 text-xs ' +
                          m.tone
                        }
                      >
                        {m.emoji}
                      </span>
                      <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className={'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ' + m.tone}>
                              {m.label}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              {new Date(ev.event_date).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {ev.cost > 0 && (
                              <span className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                                -{formatVnd(ev.cost)}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded p-1 text-xs transition"
                              title="Xoá sự kiện"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                        {ev.description && (
                          <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                            {ev.description}
                          </div>
                        )}
                        {ev.next_due_date && (
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                            🔔 Lần kế tiếp: {new Date(ev.next_due_date).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>

      {eventModalOpen && (
        <EventFormModal
          eventType={eventModalOpen}
          assetId={asset.id}
          assetName={asset.name}
          onClose={() => setEventModalOpen(null)}
          onSaved={() => {
            setEventModalOpen(null)
            refreshAll()
          }}
          maintenanceInterval={asset.maintenance_interval_months}
        />
      )}
    </div>
  )
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={'rounded-xl p-3 backdrop-blur border border-white/20 ' + (highlight ? 'bg-white/25' : 'bg-white/10')}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-base md:text-lg font-extrabold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] opacity-75">{sub}</div>}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  )
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 w-28 flex-shrink-0">{k}</span>
      <span className="text-gray-900 dark:text-gray-100 flex-1 min-w-0 break-words">{v}</span>
    </div>
  )
}

/* ============================================================
 * Event form modal
 * ============================================================ */

function EventFormModal({
  eventType,
  assetId,
  assetName,
  onClose,
  onSaved,
  maintenanceInterval,
}: {
  eventType: AssetEventType
  assetId: string
  assetName: string
  onClose: () => void
  onSaved: () => void
  maintenanceInterval: number | null
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [cost, setCost] = useState(0)
  const [description, setDescription] = useState('')
  const [nextDue, setNextDue] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const m = EVENT_TYPE_META[eventType]
  const showCost = ['maintenance', 'repair', 'incident', 'liquidation', 'purchase'].includes(eventType)
  const showNextDue = eventType === 'maintenance'

  // Tự suggest next_due cho maintenance theo chu kỳ
  useEffect(() => {
    if (eventType === 'maintenance' && maintenanceInterval && date) {
      const d = new Date(date)
      d.setMonth(d.getMonth() + maintenanceInterval)
      setNextDue(d.toISOString().slice(0, 10))
    }
  }, [eventType, maintenanceInterval, date])

  function parseAmt(s: string): number {
    return Number(s.replace(/[^\d]/g, '')) || 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const res = await fetch(`/api/assets/${assetId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        event_date: date,
        cost,
        description: description || null,
        next_due_date: nextDue || null,
      }),
    })
    const j = await res.json()
    setSaving(false)
    if (!res.ok) {
      setErr(typeof j.error === 'string' ? j.error : 'Lỗi tạo sự kiện')
      return
    }
    onSaved()
  }

  const quick = QUICK_EVENT_TYPES.find((t) => t.key === eventType)
  const bar = quick?.bar ?? 'from-blue-500 to-indigo-600'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className={`px-5 py-4 bg-gradient-to-r ${bar} text-white flex items-center justify-between`}>
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">Ghi nhận</div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>{m.emoji}</span> {m.label}
            </h2>
            <div className="text-sm opacity-80 truncate">{assetName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Ngày
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            {showCost && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                  Chi phí <span className="text-gray-400 dark:text-gray-500">(VND, tuỳ chọn)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cost > 0 ? cost.toLocaleString('vi-VN') : ''}
                    onChange={(e) => setCost(parseAmt(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 pr-7 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm tabular-nums text-right font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xs">đ</span>
                </div>
              </div>
            )}
          </div>

          {showNextDue && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Lịch bảo trì lần kế tiếp
              </label>
              <input
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              />
              {maintenanceInterval && (
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  💡 Tự gợi ý theo chu kỳ {maintenanceInterval} tháng
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              Mô tả {eventType === 'incident' ? '(bắt buộc)' : '(tuỳ chọn)'}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              required={eventType === 'incident'}
              placeholder={
                eventType === 'maintenance'
                  ? 'VD: Thay dầu, vệ sinh bộ lọc, thay băng tải'
                  : eventType === 'repair'
                    ? 'VD: Thay motor, bảng mạch điều khiển bị cháy'
                    : eventType === 'incident'
                      ? 'VD: Mất điện đột ngột làm hỏng cảm biến'
                      : 'Ghi chú nếu có...'
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm resize-none"
            />
          </div>

          {err && (
            <div className="px-3 py-2 rounded-lg text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              ⚠️ {err}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 px-4 py-2.5 rounded-xl text-white font-bold shadow-md disabled:opacity-50 bg-gradient-to-r ${bar}`}
            >
              {saving ? 'Đang lưu...' : `${m.emoji} Ghi nhận`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
