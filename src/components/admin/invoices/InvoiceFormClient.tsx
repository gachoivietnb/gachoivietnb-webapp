'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { moneyToVietnameseWords } from '@/lib/invoice-providers/money-words'
import { ExportPanel } from './ExportPanel'

type Provider = {
  id: string
  name: string
  provider_code: string
  default_template_code: string | null
  default_invoice_serial: string | null
  is_default: boolean
  test_mode: boolean
}

type Buyer = {
  id: string
  name: string
  tax_code: string | null
  address: string | null
  email: string | null
  phone: string | null
  buyer_type: 'ca_nhan' | 'doanh_nghiep'
}

type Item = {
  key: string
  description: string
  unit: string
  quantity: number
  unit_price: number
  discount_pct: number
  tax_rate: number
}

const TAX_OPTIONS = [
  { value: 0, label: '0%' },
  { value: 5, label: '5%' },
  { value: 8, label: '8%' },
  { value: 10, label: '10%' },
  { value: -1, label: 'KCT (Không chịu thuế)' },
  { value: -2, label: 'KKKNT (Không kê khai nộp thuế)' },
]

const TAX_LABEL: Record<number, string> = {
  0: '0%',
  5: '5%',
  8: '8%',
  10: '10%',
  '-1': 'KCT',
  '-2': 'KKKNT',
}

export function InvoiceFormClient({
  providers,
  buyers,
  prefill,
  invoiceId,
}: {
  providers: Provider[]
  buyers: Buyer[]
  prefill: {
    sales_order_id?: string
    buyer_id?: string
    items?: Array<{ description: string; unit: string; quantity: number; unit_price: number; tax_rate: number }>
    notes?: string
  } | null
  invoiceId?: string
}) {
  const router = useRouter()
  const defaultProvider = providers.find((p) => p.is_default) || providers[0]

  const [providerId, setProviderId] = useState<string>(defaultProvider?.id ?? '')
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState<'TM' | 'CK' | 'TM_CK'>('TM_CK')
  const [buyerId, setBuyerId] = useState<string>(prefill?.buyer_id ?? '')
  const [buyerSearch, setBuyerSearch] = useState('')
  const [showBuyerPicker, setShowBuyerPicker] = useState(false)
  const [notes, setNotes] = useState(prefill?.notes ?? '')
  const [items, setItems] = useState<Item[]>(
    (prefill?.items?.map((it, i) => ({
      key: `pre-${i}`,
      description: it.description,
      unit: it.unit,
      quantity: it.quantity,
      unit_price: it.unit_price,
      discount_pct: 0,
      tax_rate: it.tax_rate,
    })) || [
      { key: 'k1', description: '', unit: 'con', quantity: 1, unit_price: 0, discount_pct: 0, tax_rate: 0 },
    ]) as Item[]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buyer = buyers.find((b) => b.id === buyerId)

  const filteredBuyers = useMemo(() => {
    const q = buyerSearch.trim().toLowerCase()
    if (!q) return buyers.slice(0, 30)
    return buyers
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.tax_code ?? '').toLowerCase().includes(q) ||
          (b.phone ?? '').toLowerCase().includes(q)
      )
      .slice(0, 30)
  }, [buyers, buyerSearch])

  const computed = useMemo(() => {
    let subtotal = 0
    let tax = 0
    items.forEach((it) => {
      const gross = it.quantity * it.unit_price
      const disc = (gross * it.discount_pct) / 100
      const lineSub = gross - disc
      const lineTax = it.tax_rate > 0 ? (lineSub * it.tax_rate) / 100 : 0
      subtotal += lineSub
      tax += lineTax
    })
    const total = subtotal + tax
    return {
      subtotal: +subtotal.toFixed(2),
      tax: +tax.toFixed(2),
      total: +total.toFixed(2),
      words: moneyToVietnameseWords(total),
    }
  }, [items])

  function addItem() {
    setItems([
      ...items,
      {
        key: `k${Date.now()}`,
        description: '',
        unit: 'con',
        quantity: 1,
        unit_price: 0,
        discount_pct: 0,
        tax_rate: items[items.length - 1]?.tax_rate ?? 0,
      },
    ])
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx: number) {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== idx))
  }

  /** Lưu nháp âm thầm (không redirect) — dùng khi xuất PDF/Excel/XML từ form chưa lưu. */
  async function saveDraftSilent(): Promise<string | null> {
    if (!buyerId) {
      setError('Vui lòng chọn người mua trước khi xuất')
      return null
    }
    if (items.length === 0 || items.some((it) => !it.description.trim() || it.quantity <= 0)) {
      setError('Mỗi dòng phải có tên hàng + SL > 0')
      return null
    }
    if (!providerId) {
      setError('Chọn NCC HĐĐT trước khi xuất')
      return null
    }
    setError(null)
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: invoiceId,
        provider_id: providerId,
        buyer_id: buyerId,
        issue_date: issueDate,
        payment_method: paymentMethod,
        notes,
        items: items.map((it, idx) => ({
          sort_order: idx,
          description: it.description,
          unit: it.unit,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          discount_pct: Number(it.discount_pct),
          tax_rate: Number(it.tax_rate),
          tax_rate_label: TAX_LABEL[it.tax_rate] ?? `${it.tax_rate}%`,
        })),
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : 'Lỗi lưu nháp')
      return null
    }
    return json.id || invoiceId || null
  }

  async function handleSave(action: 'draft' | 'publish') {
    if (!buyerId) {
      setError('Vui lòng chọn người mua')
      return
    }
    if (items.length === 0 || items.some((it) => !it.description.trim() || it.quantity <= 0)) {
      setError('Mỗi dòng phải có tên hàng + SL > 0')
      return
    }
    if (!providerId) {
      setError('Chọn NCC HĐĐT')
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: invoiceId,
        provider_id: providerId,
        buyer_id: buyerId,
        issue_date: issueDate,
        payment_method: paymentMethod,
        notes,
        items: items.map((it, idx) => ({
          sort_order: idx,
          description: it.description,
          unit: it.unit,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          discount_pct: Number(it.discount_pct),
          tax_rate: Number(it.tax_rate),
          tax_rate_label: TAX_LABEL[it.tax_rate] ?? `${it.tax_rate}%`,
        })),
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(typeof json.error === 'string' ? json.error : JSON.stringify(json.error))
      setSaving(false)
      return
    }
    const finalId = json.id || invoiceId
    if (action === 'publish') {
      // Issue ngay
      const issueRes = await fetch(`/api/invoices/${finalId}/issue`, { method: 'POST' })
      const issueJson = await issueRes.json()
      if (!issueRes.ok) {
        setError('Đã lưu nháp. Lỗi phát hành: ' + (issueJson.error || ''))
        setSaving(false)
        router.push(`/admin/hoa-don/${finalId}`)
        return
      }
    }
    router.push(`/admin/hoa-don/${finalId}`)
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* MAIN */}
      <div className="lg:col-span-2 space-y-4">
        {/* Section: Header */}
        <Card title="① Thông tin chung" icon="📋">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1 text-gray-700 dark:text-gray-300 font-medium">NCC HĐĐT</label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
              >
                <option value="">— Chọn NCC —</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.test_mode ? '(test)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1 text-gray-700 dark:text-gray-300 font-medium">Ngày phát hành</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs block mb-1 text-gray-700 dark:text-gray-300 font-medium">Phương thức thanh toán</label>
              <div className="flex gap-1">
                {(['TM', 'CK', 'TM_CK'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`flex-1 text-xs px-3 py-1.5 rounded border ${
                      paymentMethod === m
                        ? 'bg-amber-500 text-white border-amber-500 font-semibold'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {m === 'TM' ? '💵 Tiền mặt' : m === 'CK' ? '🏦 Chuyển khoản' : '🔀 TM/CK'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Section: Người mua */}
        <Card title="② Người mua" icon="👤">
          {buyer ? (
            <div className="border border-amber-200 dark:border-amber-900 rounded-lg p-3 bg-amber-50 dark:bg-amber-950/30">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {buyer.buyer_type === 'doanh_nghiep' ? '🏢 ' : '👤 '}
                    {buyer.name}
                  </div>
                  {buyer.tax_code && (
                    <div className="text-xs font-mono text-gray-600 dark:text-gray-400">MST: {buyer.tax_code}</div>
                  )}
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {[buyer.phone, buyer.email, buyer.address].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setBuyerId('')
                    setShowBuyerPicker(true)
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Đổi
                </button>
              </div>
            </div>
          ) : (
            <div>
              <input
                value={buyerSearch}
                onChange={(e) => {
                  setBuyerSearch(e.target.value)
                  setShowBuyerPicker(true)
                }}
                onFocus={() => setShowBuyerPicker(true)}
                placeholder="🔍 Tìm tên / MST / SĐT người mua..."
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
              />
              {showBuyerPicker && (
                <div className="mt-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                  {filteredBuyers.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 text-center">
                      Không tìm thấy.{' '}
                      <a href="/admin/hoa-don/nguoi-mua" className="text-blue-600 hover:underline">
                        + Tạo người mua mới ↗
                      </a>
                    </div>
                  ) : (
                    filteredBuyers.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setBuyerId(b.id)
                          setShowBuyerPicker(false)
                          setBuyerSearch('')
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="font-medium text-sm">
                          {b.buyer_type === 'doanh_nghiep' ? '🏢 ' : '👤 '}
                          {b.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {b.tax_code && `MST: ${b.tax_code} · `}
                          {b.phone || b.email || 'không có liên hệ'}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              <a
                href="/admin/hoa-don/nguoi-mua"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline mt-2 inline-block"
              >
                + Tạo người mua mới ↗
              </a>
            </div>
          )}
        </Card>

        {/* Section: Items */}
        <Card title="③ Chi tiết hàng hóa / dịch vụ" icon="📦">
          <div className="overflow-x-auto -mx-3">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="text-left p-2 w-[8%]">STT</th>
                  <th className="text-left p-2 w-[28%]">Tên hàng / DV</th>
                  <th className="text-left p-2 w-[10%]">ĐVT</th>
                  <th className="text-right p-2 w-[10%]">SL</th>
                  <th className="text-right p-2 w-[14%]">Đơn giá</th>
                  <th className="text-right p-2 w-[8%]">CK%</th>
                  <th className="text-left p-2 w-[14%]">Thuế</th>
                  <th className="text-right p-2 w-[12%]">Thành tiền</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const gross = it.quantity * it.unit_price
                  const disc = (gross * it.discount_pct) / 100
                  const lineSub = gross - disc
                  const lineTax = it.tax_rate > 0 ? (lineSub * it.tax_rate) / 100 : 0
                  const lineTotal = lineSub + lineTax
                  return (
                    <tr key={it.key} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="p-2 text-gray-500">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          value={it.description}
                          onChange={(e) => updateItem(idx, { description: e.target.value })}
                          placeholder="VD: Gà nòi giống bố mẹ"
                          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={it.unit}
                          onChange={(e) => updateItem(idx, { unit: e.target.value })}
                          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                          step="0.01"
                          min={0}
                          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm text-right"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={it.unit_price}
                          onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })}
                          step="1000"
                          min={0}
                          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm text-right font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={it.discount_pct}
                          onChange={(e) => updateItem(idx, { discount_pct: Number(e.target.value) })}
                          step="1"
                          min={0}
                          max={100}
                          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 rounded px-2 py-1 text-sm text-right"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={it.tax_rate}
                          onChange={(e) => updateItem(idx, { tax_rate: Number(e.target.value) })}
                          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 rounded px-1 py-1 text-xs"
                        >
                          {TAX_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-right font-mono text-sm">{lineTotal.toLocaleString('vi-VN')}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          disabled={items.length === 1}
                          className="text-red-500 hover:text-red-700 disabled:opacity-30 text-lg leading-none"
                          title="Xoá dòng"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            + Thêm dòng
          </button>
        </Card>

        <Card title="④ Ghi chú (tuỳ chọn)" icon="📝">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ghi chú nội bộ trên HĐ"
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
          />
        </Card>
      </div>

      {/* SIDEBAR — Tổng kết */}
      <div className="space-y-4">
        <div className="sticky top-4 space-y-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-2 border-amber-200 dark:border-amber-900 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-1.5">
              💰 Tổng kết
            </h3>
            <div className="space-y-1.5 text-sm">
              <Row label="Cộng tiền hàng" value={computed.subtotal} />
              <Row label="Thuế GTGT" value={computed.tax} />
              <div className="border-t border-amber-200 dark:border-amber-800 pt-2 mt-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Tổng cộng</span>
                  <span className="font-bold text-2xl text-amber-700 dark:text-amber-300 font-mono">
                    {computed.total.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
              <div className="text-[11px] italic text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                <span className="font-semibold">Bằng chữ:</span> {computed.words}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm">
              ⚠ {error}
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="w-full bg-white dark:bg-gray-800 border-2 border-amber-400 text-amber-700 dark:text-amber-300 rounded-lg py-2.5 text-sm font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : '📝 Lưu nháp'}
            </button>
            <button
              onClick={() => handleSave('publish')}
              disabled={saving}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg py-2.5 text-sm font-bold shadow disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : '🚀 Phát hành ngay'}
            </button>
            <p className="text-[11px] text-gray-500 text-center">
              Phát hành sẽ gửi đến NCC HĐĐT, ký số và xin mã CQT.
            </p>
          </div>

          <ExportPanel
            invoiceId={invoiceId}
            status="nhap"
            onSaveDraft={saveDraftSilent}
          />
        </div>
      </div>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5 mb-3">
        <span>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-mono">{value.toLocaleString('vi-VN')}</span>
    </div>
  )
}
