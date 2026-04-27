import { createClient } from '@/lib/supabase/server'
import { VaccinationsClient, type VacItem } from '@/components/admin/health/VaccinationsClient'
import { VaccinationTabs } from '@/components/admin/vaccinations/VaccinationTabs'
import { VaccinationHero } from '@/components/admin/vaccinations/VaccinationHero'

export const revalidate = 0

export default async function TiemPhongPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const next30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const [dueRes, areasRes, kpiRes] = await Promise.all([
    supabase
      .from('vaccinations_due')
      .select('*')
      .lte('scheduled_date', next30)
      .order('scheduled_date', { ascending: true })
      .limit(1000),
    supabase.from('areas').select('code, name_vi').eq('is_active', true).order('display_order'),
    supabase.rpc('farm_vaccination_kpis'),
  ])

  const items = (dueRes.data ?? []) as VacItem[]
  const areas = (areasRes.data ?? []) as Array<{ code: string; name_vi: string }>
  const kpis = (kpiRes.data ?? {}) as Record<string, number>

  return (
    <div>
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          💉 Tiêm phòng
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Lịch tiêm + đợt tiêm hàng loạt + lộ trình chuẩn cho gà chọi VN · Tự sinh nhắc nhở định kỳ
        </p>
      </div>

      <VaccinationTabs />

      <VaccinationHero kpis={kpis} />

      <div className="mt-4">
        <VaccinationsClient items={items} areas={areas} todayIso={today} />
      </div>
    </div>
  )
}
