'use client'

import Link from 'next/link'

/**
 * Detect any AI-related friendly error code returned by the server.
 * Server-side `toFriendlyAiError()` prefixes all errors with AI_*.
 */
export function isAiNotConfiguredError(err: string | null | undefined): boolean {
  if (!err) return false
  return /^AI_|AI_NOT_CONFIGURED|AI_INVALID_KEY|AI_QUOTA_EXCEEDED|AI_MODEL_NOT_FOUND|AI_NETWORK|AI_FORBIDDEN|AI_ERROR|chưa cấu hình.*ai|chưa cấu hình.*kết nối/i.test(err)
}

type ErrKind = 'not_configured' | 'invalid_key' | 'quota' | 'model' | 'network' | 'forbidden' | 'unknown'

function classify(err: string | null | undefined): ErrKind {
  if (!err) return 'unknown'
  if (/^AI_NOT_CONFIGURED|chưa cấu hình.*ai|chưa cấu hình.*kết nối/i.test(err)) return 'not_configured'
  if (/^AI_INVALID_KEY/i.test(err)) return 'invalid_key'
  if (/^AI_QUOTA_EXCEEDED/i.test(err)) return 'quota'
  if (/^AI_MODEL_NOT_FOUND/i.test(err)) return 'model'
  if (/^AI_NETWORK/i.test(err)) return 'network'
  if (/^AI_FORBIDDEN/i.test(err)) return 'forbidden'
  return 'unknown'
}

const META: Record<ErrKind, {
  emoji: string
  title: (feature: string) => string
  desc: string
  primary: { label: string; href: string }
  showFreeTier?: boolean
  tone: string
}> = {
  not_configured: {
    emoji: '🔑',
    title: (f) => `Cần cấu hình khoá AI để dùng ${f}`,
    desc: 'Tính năng AI yêu cầu khoá kết nối Google AI Studio (miễn phí — bạn đăng ký bằng tài khoản Google của bạn). Mỗi trại có khoá riêng để chủ động chi phí và quota.',
    primary: { label: '⚙️ Đi tới Cài đặt → Tích hợp AI', href: '/admin/cai-dat?section=ai' },
    showFreeTier: true,
    tone: 'amber',
  },
  invalid_key: {
    emoji: '⚠️',
    title: () => 'Khoá AI không hợp lệ hoặc đã bị xoá',
    desc: 'Khoá AI hiện tại không còn hoạt động — có thể do bạn đã xoá ở Google AI Studio hoặc dán nhầm. Cấp lại khoá mới và cập nhật.',
    primary: { label: '⚙️ Cập nhật khoá AI', href: '/admin/cai-dat?section=ai' },
    tone: 'rose',
  },
  quota: {
    emoji: '⏳',
    title: () => 'Đã hết quota AI miễn phí hôm nay',
    desc: 'Phiên bản tiêu chuẩn miễn phí của Google: ~15 lần/phút, 1500 lần/ngày. Đã dùng hết — quota sẽ reset sau ít phút (rate limit) hoặc sau 24h (daily limit). Có thể nâng cấp gói pay-as-you-go nếu cần dùng nhiều hơn.',
    primary: { label: '📖 Xem cách nâng cấp', href: '/admin/huong-dan?q=khoa+ai' },
    tone: 'amber',
  },
  model: {
    emoji: '🔄',
    title: () => 'Mô hình AI đã được Google đổi/loại bỏ',
    desc: 'Phiên bản AI cũ đã bị Google ngừng hỗ trợ. Vào Cài đặt và chọn lại phiên bản mới (Tiêu chuẩn / Tăng tốc / Cao cấp).',
    primary: { label: '⚙️ Đổi phiên bản mô hình', href: '/admin/cai-dat?section=ai' },
    tone: 'amber',
  },
  network: {
    emoji: '📵',
    title: () => 'Không kết nối được tới máy chủ AI',
    desc: 'Có thể do mất internet hoặc Google đang bảo trì. Kiểm tra mạng trại và thử lại sau ít phút.',
    primary: { label: '↻ Thử lại', href: '#retry' },
    tone: 'rose',
  },
  forbidden: {
    emoji: '🚫',
    title: () => 'Khoá AI bị Google chặn',
    desc: 'Có thể do Google phát hiện vi phạm chính sách. Vào Google AI Studio tạo khoá mới rồi cập nhật trong Cài đặt.',
    primary: { label: '⚙️ Tạo khoá mới', href: '/admin/cai-dat?section=ai' },
    tone: 'rose',
  },
  unknown: {
    emoji: '⚙️',
    title: () => 'AI gặp lỗi tạm thời',
    desc: 'Hệ thống AI không phản hồi đúng. Thử lại sau ít phút — nếu vẫn không được, kiểm tra cấu hình AI hoặc liên hệ hỗ trợ.',
    primary: { label: '⚙️ Kiểm tra cấu hình', href: '/admin/cai-dat?section=ai' },
    tone: 'amber',
  },
}

const TONE_CLS: Record<string, { bg: string; text: string; subtitle: string; pill: string; border: string; primary: string }> = {
  amber: {
    bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-amber-950/30',
    border: 'border-amber-300 dark:border-amber-800',
    text: 'text-amber-900 dark:text-amber-200',
    subtitle: 'text-amber-800 dark:text-amber-300',
    pill: 'text-amber-700 dark:text-amber-400',
    primary: 'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-50 via-red-50 to-rose-50 dark:from-rose-950/30 dark:via-red-950/30 dark:to-rose-950/30',
    border: 'border-rose-300 dark:border-rose-800',
    text: 'text-rose-900 dark:text-rose-200',
    subtitle: 'text-rose-800 dark:text-rose-300',
    pill: 'text-rose-700 dark:text-rose-400',
    primary: 'from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700',
  },
}

/**
 * Friendly empty/error state for AI features. Renders different copy
 * based on the underlying error kind so users get actionable guidance,
 * not raw 404/quota stack traces.
 */
export function AiNotConfiguredCard({
  feature = 'tính năng AI',
  hint,
  rawError,
}: {
  feature?: string
  hint?: string
  rawError?: string
}) {
  const kind = classify(rawError)
  const meta = META[kind]
  const cls = TONE_CLS[meta.tone] ?? TONE_CLS.amber

  return (
    <div className={'rounded-2xl border-2 p-5 md:p-6 ' + cls.bg + ' ' + cls.border}>
      <div className="flex items-start gap-4">
        <div className="text-4xl shrink-0">{meta.emoji}</div>
        <div className="flex-1">
          <h3 className={'text-base md:text-lg font-bold mb-1 ' + cls.text}>
            {meta.title(feature)}
          </h3>
          <p className={'text-sm mb-3 leading-relaxed ' + cls.subtitle}>
            {meta.desc}
          </p>
          {hint && (
            <p className={'text-xs italic mb-3 ' + cls.pill}>{hint}</p>
          )}
          {meta.showFreeTier && (
            <ul className={'text-xs mb-4 space-y-1 list-disc pl-5 ' + cls.subtitle}>
              <li>Phiên bản tiêu chuẩn <b>miễn phí</b>: ~15 lần/phút, 1500 lần/ngày</li>
              <li>Hết quota có thể nâng cấp pay-as-you-go (~0,001-0,005 USD / lần)</li>
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            {meta.primary.href === '#retry' ? (
              <button
                onClick={() => window.location.reload()}
                className={'bg-gradient-to-r text-white text-sm font-bold rounded-xl px-4 py-2.5 shadow-md hover:shadow-lg transition flex items-center gap-1.5 ' + cls.primary}
              >
                {meta.primary.label}
              </button>
            ) : (
              <Link
                href={meta.primary.href}
                className={'bg-gradient-to-r text-white text-sm font-bold rounded-xl px-4 py-2.5 shadow-md hover:shadow-lg transition flex items-center gap-1.5 ' + cls.primary}
              >
                {meta.primary.label}
              </Link>
            )}
            <Link
              href="/admin/huong-dan?q=khoa+ai"
              className={'bg-white dark:bg-gray-800 border text-sm font-bold rounded-xl px-4 py-2.5 transition flex items-center gap-1.5 ' + cls.border + ' ' + cls.text + ' hover:bg-white/80'}
            >
              📖 Hướng dẫn lấy khoá AI
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
