import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createClient } from '@/lib/supabase/server'
import { buildFarmPlan } from '@/lib/planning/aggregator'
import { PlanClient } from '@/components/admin/planning/PlanClient'

export const revalidate = 0

export default async function KeHoachPage() {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')

  const supabase = await createClient()
  const items = await buildFarmPlan(supabase, ctx.farm.id)

  return (
    <div className="space-y-3">
      <div>
        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 dark:from-violet-950/60 dark:to-fuchsia-950/60 text-violet-700 dark:text-violet-300 text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-0.5 mb-1.5 border border-violet-200 dark:border-violet-900">
          📅 Tổng quan
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          📅 Kế hoạch trang trại
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Hệ thống tự tổng hợp việc cần làm ngày mai, tuần tới, tháng tới — bạn chủ động thời gian, chi phí, đỡ quên việc.
        </p>
      </div>

      <PlanClient items={items} />
    </div>
  )
}
