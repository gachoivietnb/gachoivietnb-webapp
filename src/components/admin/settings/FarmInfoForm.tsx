'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type FarmInfoData = {
  name?: string
  short_name?: string
  address?: string
  phone?: string
  zalo?: string
  facebook?: string
  email_business?: string
  website?: string
  drive_folder_id?: string
  map_url?: string
  // Thông tin pháp nhân & xuất hóa đơn điện tử
  tax_code?: string
  legal_name?: string
  legal_address?: string
  bank_account?: string
  bank_name?: string
  bank_branch?: string
  representative_name?: string
  representative_position?: string
}

export function FarmInfoForm({ initial }: { initial: FarmInfoData }) {
  const router = useRouter()
  const [form, setForm] = useState<FarmInfoData>({
    name: initial.name ?? '',
    short_name: initial.short_name ?? '',
    address: initial.address ?? '',
    phone: initial.phone ?? '',
    zalo: initial.zalo ?? '',
    facebook: initial.facebook ?? '',
    email_business: initial.email_business ?? '',
    website: initial.website ?? 'https://gachoivietnb.com',
    drive_folder_id: initial.drive_folder_id ?? '',
    map_url: initial.map_url ?? '',
    tax_code: initial.tax_code ?? '',
    legal_name: initial.legal_name ?? '',
    legal_address: initial.legal_address ?? '',
    bank_account: initial.bank_account ?? '',
    bank_name: initial.bank_name ?? '',
    bank_branch: initial.bank_branch ?? '',
    representative_name: initial.representative_name ?? '',
    representative_position: initial.representative_position ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showLegal, setShowLegal] = useState(
    Boolean(initial.tax_code || initial.legal_name || initial.bank_account)
  )

  async function handleSave() {
    setLoading(true)
    setMsg(null)
    const res = await fetch('/api/settings/farm-info', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg({ type: 'err', text: typeof json.error === 'string' ? json.error : 'Lỗi' })
      setLoading(false)
      return
    }
    setMsg({ type: 'ok', text: '✓ Đã lưu' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Tên đầy đủ" value={form.name ?? ''} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Tên ngắn" value={form.short_name ?? ''} onChange={(v) => setForm({ ...form, short_name: v })} />
        <Field label="Địa chỉ" value={form.address ?? ''} onChange={(v) => setForm({ ...form, address: v })} placeholder="Hoa Lư, Ninh Bình" />
        <Field label="Hotline" value={form.phone ?? ''} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0933.669.639" />
        <Field label="Zalo OA (số ID)" value={form.zalo ?? ''} onChange={(v) => setForm({ ...form, zalo: v })} />
        <Field label="Facebook URL" value={form.facebook ?? ''} onChange={(v) => setForm({ ...form, facebook: v })} />
        <Field label="Email" value={form.email_business ?? ''} onChange={(v) => setForm({ ...form, email_business: v })} />
        <Field
          label="Website (dùng cho watermark)"
          value={form.website ?? ''}
          onChange={(v) => setForm({ ...form, website: v })}
          placeholder="https://gachoivietnb.com"
        />
        <Field
          label="Google Drive folder ID (backup media)"
          value={form.drive_folder_id ?? ''}
          onChange={(v) => setForm({ ...form, drive_folder_id: v })}
          placeholder="1AbcD2...abcXYZ"
          help='Lấy ID từ URL Drive: drive.google.com/drive/folders/<ID>'
        />
        <Field
          label="Link Google Maps (chia sẻ vị trí trại)"
          value={form.map_url ?? ''}
          onChange={(v) => setForm({ ...form, map_url: v })}
          placeholder="https://maps.app.goo.gl/..."
          help='Vào Google Maps trên điện thoại → Tìm trại → bấm "Chia sẻ" → Sao chép link → dán vào đây.'
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-200">
        🔒 <strong>Thông tin watermark:</strong> Tên trại + Website sẽ được đóng dấu bản quyền lên
        tất cả ảnh upload mới. Video hiển thị trên public có overlay bản quyền + khóa tải về.
      </div>

      {/* ===== Section: Pháp nhân & Xuất hóa đơn ===== */}
      <div className="border border-amber-200 dark:border-amber-900 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLegal(!showLegal)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-950/60 dark:hover:to-orange-950/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🧾</span>
            <div className="text-left">
              <div className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                Thông tin pháp nhân & xuất hóa đơn điện tử
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400">
                MST, tài khoản NH, người đại diện — dùng cho module Hóa đơn điện tử
              </div>
            </div>
          </div>
          <span className="text-amber-700 dark:text-amber-400 text-sm">
            {showLegal ? '▲ Thu gọn' : '▼ Mở rộng'}
          </span>
        </button>

        {showLegal && (
          <div className="p-4 bg-white dark:bg-gray-800 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Mã số thuế (MST)"
                value={form.tax_code ?? ''}
                onChange={(v) => setForm({ ...form, tax_code: v.replace(/\s/g, '') })}
                placeholder="0301234567 hoặc 0301234567-001"
                help="MST của trại / hộ kinh doanh / DN — dùng làm bên bán trên HĐ điện tử"
              />
              <Field
                label="Tên pháp nhân (nếu khác tên trại)"
                value={form.legal_name ?? ''}
                onChange={(v) => setForm({ ...form, legal_name: v })}
                placeholder="Hộ kinh doanh Nguyễn Văn A"
                help="Để trống nếu trùng tên trại"
              />
              <Field
                label="Địa chỉ trên HĐ (theo ĐKKD)"
                value={form.legal_address ?? ''}
                onChange={(v) => setForm({ ...form, legal_address: v })}
                placeholder="Số ..., Phường ..., Quận/Huyện ..., Tỉnh/TP ..."
                help="Để trống nếu dùng địa chỉ trại ở trên"
              />
              <Field
                label="Tên ngân hàng"
                value={form.bank_name ?? ''}
                onChange={(v) => setForm({ ...form, bank_name: v })}
                placeholder="Vietcombank / Techcombank ..."
              />
              <Field
                label="Số tài khoản ngân hàng"
                value={form.bank_account ?? ''}
                onChange={(v) => setForm({ ...form, bank_account: v.replace(/\s/g, '') })}
                placeholder="0123456789"
              />
              <Field
                label="Chi nhánh ngân hàng"
                value={form.bank_branch ?? ''}
                onChange={(v) => setForm({ ...form, bank_branch: v })}
                placeholder="Ninh Bình"
              />
              <Field
                label="Người đại diện"
                value={form.representative_name ?? ''}
                onChange={(v) => setForm({ ...form, representative_name: v })}
                placeholder="Nguyễn Văn A"
              />
              <Field
                label="Chức vụ"
                value={form.representative_position ?? ''}
                onChange={(v) => setForm({ ...form, representative_position: v })}
                placeholder="Chủ trại / Giám đốc"
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200">
              ⚖️ <strong>Lưu ý pháp lý:</strong> Các thông tin này sẽ in lên hóa đơn điện tử xuất ra
              cho khách. Đảm bảo MST và tên pháp nhân khớp với đăng ký kinh doanh / hợp đồng với
              nhà cung cấp HĐ điện tử (Viettel S-Invoice, VNPT-Invoice, MISA meInvoice…).
            </div>
          </div>
        )}
      </div>

      {msg && (
        <div className={`rounded p-2 text-sm ${
          msg.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {msg.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Đang lưu...' : 'Lưu thông tin'}
      </button>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  help,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  help?: string
}) {
  return (
    <label className="block">
      <span className="text-xs block mb-1 text-gray-700 dark:text-gray-300">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
      />
      {help && <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block">{help}</span>}
    </label>
  )
}
