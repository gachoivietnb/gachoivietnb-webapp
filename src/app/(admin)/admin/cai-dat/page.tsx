import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { IntegrationsForm } from '@/components/admin/settings/IntegrationsForm'
import { FarmInfoForm } from '@/components/admin/settings/FarmInfoForm'
import { PushNotificationToggle } from '@/components/admin/settings/PushNotificationToggle'
import { FarmDataModeSection } from '@/components/admin/settings/FarmDataModeSection'
import { CaiDatHub, type SectionMeta } from '@/components/admin/settings/CaiDatHub'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createAdminClient } from '@/lib/multitenancy/super-admin'

export const revalidate = 0

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('system_settings')
    .select('key, value, updated_at')
    .in('key', ['farm_info', 'gemini_api_key', 'gemini_model', 'ai_enabled'])

  const rows = (data ?? []) as Array<{
    key: string
    value: { value?: unknown } | null
    updated_at: string
  }>
  const settings = new Map(rows.map((r) => [r.key, r]))

  const farmInfo = (settings.get('farm_info')?.value ?? {}) as {
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
    tax_code?: string
    legal_name?: string
    legal_address?: string
    bank_account?: string
    bank_name?: string
    bank_branch?: string
    representative_name?: string
    representative_position?: string
  }

  const geminiKeyRaw =
    (settings.get('gemini_api_key')?.value as { value?: string } | null)?.value ?? ''
  const geminiKeyMasked =
    geminiKeyRaw && geminiKeyRaw.length > 8
      ? geminiKeyRaw.substring(0, 4) + '...' + geminiKeyRaw.substring(geminiKeyRaw.length - 4)
      : ''
  const geminiModel =
    ((settings.get('gemini_model')?.value as { value?: string } | null)?.value) ??
    'gemini-2.0-flash'
  const aiEnabled = Boolean(
    (settings.get('ai_enabled')?.value as { value?: boolean } | null)?.value
  )

  const farmConfigured = Boolean(farmInfo.name && farmInfo.phone)
  const driveConfigured = Boolean(farmInfo.drive_folder_id)
  const aiConfigured = Boolean(geminiKeyRaw)

  // Data mode (demo / real) — chỉ chu_trai mới thấy section này
  const ctx = await getFarmContext()
  const isOwner = ctx?.profile.role === 'chu_trai'
  const adminClient = createAdminClient()
  const { data: farmDataModeRow } = ctx
    ? await adminClient
        .from('farms')
        .select('data_mode, data_mode_switched_at')
        .eq('id', ctx.farm.id)
        .maybeSingle()
    : { data: null }
  const dataMode =
    ((farmDataModeRow as { data_mode?: 'demo' | 'real' } | null)?.data_mode) ?? 'demo'
  const dataModeSwitchedAt =
    ((farmDataModeRow as { data_mode_switched_at?: string | null } | null)?.data_mode_switched_at) ?? null

  const metas: SectionMeta[] = [
    {
      id: 'farm',
      title: 'Thông tin trang trại',
      icon: '🏡',
      group: 'Thông tin',
      description:
        'Tên trại, địa chỉ, hotline, Zalo, Facebook, email, website và Drive backup. Dùng cho watermark ảnh và liên hệ public.',
      keywords:
        'thong tin trai farm name short address phone hotline zalo facebook email website drive watermark backup',
      bar: 'from-emerald-400 to-teal-500',
      status: farmConfigured ? 'on' : 'partial',
      statusLabel: farmConfigured
        ? 'Đã cấu hình'
        : 'Thiếu tên/SĐT — chưa thể watermark',
      lastUpdated: settings.get('farm_info')?.updated_at ?? null,
    },
    {
      id: 'ai',
      title: 'Tích hợp AI',
      icon: '🤖',
      group: 'Tích hợp',
      description:
        'API key, model và bật/tắt AI cho các tính năng tạo bio, viết bài Zalo/Facebook và chatbot.',
      keywords:
        'ai gemini api key model integration tich hop chatbot bio zalo facebook marketing flash pro',
      bar: 'from-violet-400 to-purple-500',
      status: aiConfigured ? (aiEnabled ? 'on' : 'off') : 'partial',
      statusLabel: aiConfigured
        ? aiEnabled
          ? `Đang dùng ${geminiModel}`
          : 'Đã có key · AI đang tắt'
        : 'Chưa có API key',
      lastUpdated:
        settings.get('gemini_api_key')?.updated_at ??
        settings.get('ai_enabled')?.updated_at ??
        null,
    },
    {
      id: 'push',
      title: 'Thông báo đẩy (Push)',
      icon: '🔔',
      group: 'Tích hợp',
      description:
        'Bật notification trên thiết bị này để nhận cảnh báo khi có dịch bệnh, kho hết, đơn mới…',
      keywords: 'push notification thong bao day vapid pwa service worker offline',
      bar: 'from-amber-400 to-orange-500',
      status: 'info',
      statusLabel: 'Đăng ký theo thiết bị',
    },
    ...(isOwner
      ? ([{
          id: 'data-mode' as const,
          title: 'Chế độ dữ liệu (Demo / Thật)',
          icon: dataMode === 'demo' ? '🎓' : '✅',
          group: 'Dữ liệu',
          description:
            'Trại đang dùng dữ liệu DEMO để bạn trải nghiệm tính năng. Khi sẵn sàng vận hành thật → chuyển sang dữ liệu trống để tự nhập của trại bạn (chỉ thực hiện được 1 lần).',
          keywords: 'demo real data mode du lieu thuc that trong wipe reset chuyen doi',
          bar: dataMode === 'demo' ? 'from-blue-400 to-indigo-500' : 'from-emerald-400 to-teal-500',
          status: dataMode === 'demo' ? ('partial' as const) : ('on' as const),
          statusLabel: dataMode === 'demo' ? '🎓 Đang dùng DEMO' : '✅ Đang dùng THẬT',
          lastUpdated: dataModeSwitchedAt,
        }])
      : []),
    {
      id: 'qr-guide',
      title: 'Hướng dẫn thẻ QR',
      icon: '🔳',
      group: 'Tài liệu',
      description:
        'Tài liệu kỹ thuật về kiến trúc 2 thành phần (vòng silicon + thẻ QR PET): kích thước, chất liệu, chi phí, quy trình đeo, nguồn mua, checklist trước khi đặt hàng — mang đi xưởng in.',
      keywords:
        'qr the qr huong dan the chân vong silicon spiral leg ring chicken band chip rfid in the pdf',
      bar: 'from-cyan-400 to-blue-500',
      status: 'info',
      statusLabel: 'Tài liệu kỹ thuật',
    },
  ]

  const slots = {
    farm: <FarmInfoForm initial={farmInfo} />,
    ai: (
      <IntegrationsForm
        initialKeyMasked={geminiKeyMasked}
        initialModel={geminiModel}
        initialEnabled={aiEnabled}
      />
    ),
    push: <PushNotificationToggle />,
    'data-mode': <FarmDataModeSection initialMode={dataMode} switchedAt={dataModeSwitchedAt} />,
    'qr-guide': (
      <div className="space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          Tài liệu kỹ thuật đầy đủ về <b>hệ thống thẻ QR + vòng chân</b> dùng cho gà chọi: chọn vòng silicon
          xoắn 32mm Shore A45 + thẻ PET 25×35mm có QR 18×18mm. Chi phí chỉ <b>~3-5k đ/bộ</b>, dùng được
          xuyên suốt vòng đời gà.
        </p>
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border border-cyan-200 dark:border-cyan-900 rounded-xl p-4">
          <div className="text-xs uppercase tracking-wide text-cyan-700 dark:text-cyan-300 font-bold mb-1">
            10 mục trong tài liệu
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700 dark:text-gray-300">
            <li>1. 🎯 Tổng quan kiến trúc 2 thành phần</li>
            <li>2. ⚖️ So sánh 3 giải pháp (RFID/QR/Laser)</li>
            <li>3. ⭕ Specs vòng chân (size 32mm Shore A45)</li>
            <li>4. 📅 Thời điểm đeo theo dòng (Nòi/Asil/Mã Lai/Tre)</li>
            <li>5. 🏷 Specs thẻ QR + URL pattern + Error level</li>
            <li>6. 🧪 Chất liệu vòng + thẻ + màu theo dòng</li>
            <li>7. 💰 Chi phí 1000 bộ + kế hoạch 3 phase</li>
            <li>8. 🪜 Quy trình đeo 5 bước chi tiết</li>
            <li>9. 🔧 Vận hành, bảo trì, xử lý sự cố</li>
            <li>10. 🛒 Nguồn mua (Shopee/Alibaba/xưởng)</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/cai-dat/the-qr"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl px-5 py-2.5 font-bold shadow text-sm flex items-center gap-1.5"
          >
            📖 Mở tài liệu đầy đủ
          </Link>
          <Link
            href="/admin/generate-qr"
            className="bg-white dark:bg-gray-900 border-2 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-xl px-5 py-2.5 font-bold text-sm flex items-center gap-1.5"
          >
            🔳 Đến module In thẻ QR
          </Link>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          💡 Tài liệu chỉ hiển thị cho chủ trại — có thể in (🖨) để mang đi xưởng đặt hàng.
        </p>
      </div>
    ),
  }

  const configuredCount = [farmConfigured, aiConfigured, driveConfigured].filter(Boolean).length

  const kpis = [
    {
      label: 'Mục đã cấu hình',
      value: `${configuredCount}/3`,
      icon: '✓',
      tone: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'Tích hợp AI',
      value: aiConfigured ? (aiEnabled ? 'Đang bật' : 'Đã cấu hình khoá') : 'Chưa cấu hình',
      icon: '🤖',
      tone: aiEnabled ? 'from-violet-500 to-purple-600' : 'from-gray-400 to-gray-500',
      pulse: aiEnabled,
    },
    {
      label: 'Watermark trại',
      value: farmInfo.name ? farmInfo.name.slice(0, 18) : 'Chưa đặt tên',
      icon: '🏷️',
      tone: 'from-blue-500 to-indigo-500',
    },
    {
      label: 'Drive backup',
      value: driveConfigured ? 'Đã liên kết' : 'Chưa liên kết',
      icon: '☁️',
      tone: driveConfigured ? 'from-cyan-500 to-sky-500' : 'from-amber-500 to-orange-500',
    },
  ]

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          ⚙️ Cài đặt hệ thống
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Thông tin trại · Tích hợp AI · Push notification · Sao lưu — tìm nhanh và cấu hình tập trung
        </p>
      </div>

      <CaiDatHub metas={metas} slots={slots} kpis={kpis} />
    </div>
  )
}
