'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PaymentSettings } from '@/lib/payment/settings'

const VIETNAM_BANKS: Array<{ name: string; bin: string }> = [
  { name: 'Vietcombank', bin: '970436' },
  { name: 'Techcombank', bin: '970407' },
  { name: 'BIDV', bin: '970418' },
  { name: 'VietinBank', bin: '970415' },
  { name: 'Agribank', bin: '970405' },
  { name: 'MB Bank', bin: '970422' },
  { name: 'ACB', bin: '970416' },
  { name: 'TPBank', bin: '970423' },
  { name: 'VPBank', bin: '970432' },
  { name: 'Sacombank', bin: '970403' },
  { name: 'SHB', bin: '970443' },
  { name: 'OCB', bin: '970448' },
  { name: 'HDBank', bin: '970437' },
  { name: 'VIB', bin: '970441' },
  { name: 'SeABank', bin: '970440' },
  { name: 'MSB', bin: '970426' },
  { name: 'PVcomBank', bin: '970412' },
  { name: 'NCB', bin: '970419' },
  { name: 'Eximbank', bin: '970431' },
  { name: 'BacABank', bin: '970409' },
]

export function PaymentSettingsClient({ initial }: { initial: PaymentSettings }) {
  const router = useRouter()
  const [form, setForm] = useState<PaymentSettings>(initial)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function save(patch: Partial<PaymentSettings>) {
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/super-admin/payment-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setMsg({ kind: 'err', text: typeof data.error === 'string' ? data.error : 'Lỗi lưu' })
      return false
    }
    setForm(data.data)
    setMsg({ kind: 'ok', text: 'Đã lưu' })
    router.refresh()
    return true
  }

  function update<K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function selectBank(bin: string) {
    const found = VIETNAM_BANKS.find((b) => b.bin === bin)
    if (!found) return
    setForm((f) => ({ ...f, bank_name: found.name, bank_bin: found.bin }))
  }

  async function saveBankSection() {
    await save({
      bank_name: form.bank_name,
      bank_bin: form.bank_bin,
      bank_account_number: form.bank_account_number,
      bank_account_holder: form.bank_account_holder,
      bank_branch: form.bank_branch,
    })
  }

  async function saveMomoSection() {
    await save({
      momo_phone: form.momo_phone,
      momo_holder: form.momo_holder,
    })
  }

  async function saveSupportSection() {
    await save({
      support_phone: form.support_phone,
      support_zalo: form.support_zalo,
      payment_note_prefix: form.payment_note_prefix,
    })
  }

  async function saveAdvancedSection() {
    await save({
      auto_activate_enabled: form.auto_activate_enabled,
      casso_api_key: form.casso_api_key,
      casso_webhook_secret: form.casso_webhook_secret,
    })
  }

  const previewQR = form.bank_bin && form.bank_account_number
    ? `https://img.vietqr.io/image/${form.bank_bin}-${form.bank_account_number}-${form.vietqr_template || 'compact2'}.png?amount=199000&addInfo=${encodeURIComponent(form.payment_note_prefix + 'PREVIEW')}&accountName=${encodeURIComponent(form.bank_account_holder || '')}`
    : null

  return (
    <div className="space-y-5">
      {msg && (
        <div
          className={
            'rounded-lg px-4 py-3 text-sm font-medium ' +
            (msg.kind === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300')
          }
        >
          {msg.kind === 'ok' ? '✅ ' : '⚠️ '}
          {msg.text}
        </div>
      )}

      {/* ============ Bank ============ */}
      <Section
        title="🏦 Tài khoản ngân hàng nhận tiền"
        subtitle="Thông tin này sẽ hiển thị trên trang thanh toán + tạo VietQR cho khách quét"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Ngân hàng" required>
            <select
              value={form.bank_bin ?? ''}
              onChange={(e) => selectBank(e.target.value)}
              className="input-cls"
            >
              <option value="">-- Chọn ngân hàng --</option>
              {VIETNAM_BANKS.map((b) => (
                <option key={b.bin} value={b.bin}>
                  {b.name} ({b.bin})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mã BIN (tự động)">
            <input value={form.bank_bin ?? ''} readOnly className="input-cls bg-gray-50 dark:bg-gray-900" />
          </Field>
          <Field label="Số tài khoản" required hint="Chỉ số, không có dấu cách">
            <input
              type="text"
              inputMode="numeric"
              value={form.bank_account_number ?? ''}
              onChange={(e) => update('bank_account_number', e.target.value.replace(/\s/g, ''))}
              placeholder="VD: 1234567890"
              className="input-cls font-mono"
            />
          </Field>
          <Field label="Chủ tài khoản (in hoa)" required>
            <input
              type="text"
              value={form.bank_account_holder ?? ''}
              onChange={(e) => update('bank_account_holder', e.target.value.toUpperCase())}
              placeholder="VD: NGUYEN VAN A"
              className="input-cls uppercase"
            />
          </Field>
          <Field label="Chi nhánh (tuỳ chọn)">
            <input
              type="text"
              value={form.bank_branch ?? ''}
              onChange={(e) => update('bank_branch', e.target.value)}
              placeholder="VD: Hà Nội"
              className="input-cls"
            />
          </Field>
        </div>

        {previewQR && (
          <div className="mt-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-900 rounded-xl p-4 flex flex-wrap gap-4 items-center">
            <img
              src={previewQR}
              alt="VietQR preview"
              className="w-40 h-40 rounded-lg bg-white object-contain shadow-sm"
            />
            <div className="text-sm flex-1 min-w-0">
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                ✅ Preview QR — khách quét sẽ ra:
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                <div>• Ngân hàng: <b>{form.bank_name}</b></div>
                <div>• Số TK: <b className="font-mono">{form.bank_account_number}</b></div>
                <div>• Tên TK: <b>{form.bank_account_holder}</b></div>
                <div>• Số tiền: <b>199,000đ</b> (mẫu)</div>
                <div>• Ghi chú: <b className="font-mono">{form.payment_note_prefix}PREVIEW</b></div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={saveBankSection}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : '💾 Lưu thông tin TK ngân hàng'}
          </button>
        </div>
      </Section>

      {/* ============ MoMo (optional) ============ */}
      <Section
        title="📱 MoMo (tuỳ chọn)"
        subtitle="Nếu nhận thêm qua MoMo, điền số điện thoại + tên chủ ví"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Số điện thoại MoMo">
            <input
              type="tel"
              value={form.momo_phone ?? ''}
              onChange={(e) => update('momo_phone', e.target.value)}
              placeholder="VD: 0912345678"
              className="input-cls"
            />
          </Field>
          <Field label="Tên chủ ví">
            <input
              type="text"
              value={form.momo_holder ?? ''}
              onChange={(e) => update('momo_holder', e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="input-cls"
            />
          </Field>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={saveMomoSection}
            disabled={saving}
            className="bg-pink-600 hover:bg-pink-700 text-white rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : '💾 Lưu MoMo'}
          </button>
        </div>
      </Section>

      {/* ============ Support / Note ============ */}
      <Section
        title="📞 Hỗ trợ & Mã ghi chú"
        subtitle="Hiển thị cho khách trên trang thanh toán + cấu hình mã đơn"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tiền tố mã ghi chú" hint="Sẽ thành: GCV260426123456 (prefix + ngày + random)">
            <input
              type="text"
              value={form.payment_note_prefix}
              onChange={(e) => update('payment_note_prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={6}
              placeholder="GCV"
              className="input-cls font-mono uppercase"
            />
          </Field>
          <div />
          <Field label="Hotline hỗ trợ">
            <input
              type="tel"
              value={form.support_phone ?? ''}
              onChange={(e) => update('support_phone', e.target.value)}
              placeholder="0933.669.639"
              className="input-cls"
            />
          </Field>
          <Field label="Zalo hỗ trợ" hint="Dạng số điện thoại — sẽ link sang zalo.me">
            <input
              type="tel"
              value={form.support_zalo ?? ''}
              onChange={(e) => update('support_zalo', e.target.value)}
              placeholder="0933669639"
              className="input-cls"
            />
          </Field>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={saveSupportSection}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : '💾 Lưu hỗ trợ'}
          </button>
        </div>
      </Section>

      {/* ============ Auto-activate (Casso) ============ */}
      <Section
        title="⚡ Tự động kích hoạt qua Casso (Phase 3)"
        subtitle="Tích hợp Casso (casso.vn) để tự động activate khi nhận được chuyển khoản. Nếu chưa có, để TẮT — sẽ xác nhận thủ công."
      >
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-sm text-amber-900 dark:text-amber-300 mb-4">
          ⚠️ <b>Phase hiện tại: thủ công.</b> Bạn vào /admin/super-admin/orders xem đơn pending →
          đối chiếu app ngân hàng → click "Xác nhận đã nhận". Khi nào ổn định, đăng ký Casso và
          bật flag dưới đây.
        </div>
        <Field label="">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_activate_enabled}
              onChange={(e) => update('auto_activate_enabled', e.target.checked)}
              className="mt-1 w-4 h-4"
            />
            <div className="text-sm">
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                Bật auto-activate qua Casso
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Yêu cầu đã đăng ký Casso và setup webhook trỏ về <code className="font-mono text-xs">/api/webhook/casso</code>
              </div>
            </div>
          </label>
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <Field label="Casso API key" hint="Lấy ở Casso Dashboard → Tích hợp">
            <input
              type="password"
              value={form.casso_api_key ?? ''}
              onChange={(e) => update('casso_api_key', e.target.value || null)}
              placeholder="••••••••••"
              className="input-cls font-mono"
            />
          </Field>
          <Field label="Casso webhook secret" hint="Verify Casso khi POST tới webhook">
            <input
              type="password"
              value={form.casso_webhook_secret ?? ''}
              onChange={(e) => update('casso_webhook_secret', e.target.value || null)}
              placeholder="••••••••••"
              className="input-cls font-mono"
            />
          </Field>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={saveAdvancedSection}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : '💾 Lưu Casso'}
          </button>
        </div>
      </Section>

      <style jsx global>{`
        .input-cls {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid rgb(209 213 219);
          background: white;
          font-size: 0.875rem;
        }
        .input-cls:focus {
          outline: none;
          border-color: rgb(249 115 22);
          box-shadow: 0 0 0 3px rgb(254 215 170 / 0.5);
        }
        .dark .input-cls {
          background: rgb(31 41 55);
          border-color: rgb(75 85 99);
          color: rgb(243 244 246);
        }
      `}</style>
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  )
}
