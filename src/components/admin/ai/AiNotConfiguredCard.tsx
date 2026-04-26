'use client'

import Link from 'next/link'

/**
 * Detect if an error message indicates AI is not configured.
 * Server throws errors prefixed with 'AI_NOT_CONFIGURED:' from src/lib/gemini/client.ts.
 */
export function isAiNotConfiguredError(err: string | null | undefined): boolean {
  if (!err) return false
  return /AI_NOT_CONFIGURED|chưa cấu hình.*ai|chưa cấu hình.*kết nối/i.test(err)
}

/**
 * Friendly empty-state shown when a chu_trai tries to use an AI feature
 * but hasn't configured the Gemini API key yet. Provides a clear CTA
 * to navigate to the right Settings tab.
 */
export function AiNotConfiguredCard({
  feature = 'tính năng AI',
  hint,
}: {
  feature?: string
  hint?: string
}) {
  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div className="text-4xl shrink-0">🔑</div>
        <div className="flex-1">
          <h3 className="text-base md:text-lg font-bold text-amber-900 dark:text-amber-200 mb-1">
            Cần cấu hình khoá AI để dùng {feature}
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-300 mb-3 leading-relaxed">
            Tính năng AI yêu cầu khoá kết nối Google AI Studio (miễn phí — bạn đăng ký bằng tài khoản Google của bạn).
            Mỗi trại có khoá riêng để chủ động chi phí và quota.
          </p>
          {hint && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3 italic">
              {hint}
            </p>
          )}
          <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1 mb-4 list-disc pl-5">
            <li>Phiên bản tiêu chuẩn <b>miễn phí</b>: ~15 lần/phút, 1500 lần/ngày — đủ cho 1 trại quy mô vừa</li>
            <li>Hết quota miễn phí có thể nâng cấp gói tính phí của Google (theo lượng request thực tế)</li>
            <li>Chi phí trung bình ~0,001-0,005 USD / lần gọi cho mô hình tiêu chuẩn</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/cai-dat?section=ai"
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-sm font-bold rounded-xl px-4 py-2.5 shadow-md hover:shadow-lg transition flex items-center gap-1.5"
            >
              ⚙️ Đi tới Cài đặt → Tích hợp AI
            </Link>
            <Link
              href="/admin/huong-dan?q=khoa+ai"
              className="bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-sm font-bold rounded-xl px-4 py-2.5 transition flex items-center gap-1.5"
            >
              📖 Xem hướng dẫn lấy khoá
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
