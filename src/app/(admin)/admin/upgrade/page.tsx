import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { UpgradeClient } from '@/components/admin/upgrade/UpgradeClient'

export const revalidate = 0

type SearchParams = Promise<{ tier?: string }>

export default async function UpgradePage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')
  if (ctx.profile.role !== 'chu_trai') {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-5 md:p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🔒</div>
        <p className="text-amber-900 dark:text-amber-200 font-semibold">
          Chỉ chủ trại mới có quyền nâng cấp gói
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
          Vui lòng liên hệ chủ trại để upgrade.
        </p>
      </div>
    )
  }

  const params = await searchParams
  const requested = params.tier
  const initialTier: 'basic' | 'pro' | 'enterprise' =
    requested === 'basic' || requested === 'pro' || requested === 'enterprise'
      ? requested
      : 'pro'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          🚀 Nâng cấp phần mềm
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Mở khoá tính năng cao cấp cho trại <b>{ctx.farm.name}</b> — đăng ký bao lâu cũng được, huỷ bất kỳ lúc nào.
        </p>
      </div>

      <UpgradeClient initialTier={initialTier} currentTier={ctx.farm.tier} />
    </div>
  )
}
