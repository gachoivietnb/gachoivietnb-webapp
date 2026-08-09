import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { QrTagsGuide } from '@/components/admin/settings/QrTagsGuide'

export const metadata = {
  title: 'Hướng dẫn thẻ QR · Cài đặt',
}

export default async function QrTagsGuidePage() {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')
  // Chỉ chủ trại được xem (theo yêu cầu)
  if (ctx.profile.role !== 'chu_trai') {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-5 md:p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🔒</div>
        <p className="text-amber-900 dark:text-amber-200 font-semibold">
          Tài liệu này dành riêng cho chủ trại
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
          Liên hệ chủ trại nếu bạn cần xem nội dung này.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 print:hidden">
        <Link
          href="/admin/cai-dat"
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Cài đặt hệ thống
        </Link>
      </div>

      <QrTagsGuide />
    </div>
  )
}
