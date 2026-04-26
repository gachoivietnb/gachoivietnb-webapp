import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createClient } from '@/lib/supabase/server'
import { getAssetKpi, listAssets } from '@/lib/assets/queries'
import { AssetsListClient } from '@/components/admin/assets/AssetsListClient'

export const revalidate = 0

export default async function AssetsPage() {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')

  const supabase = await createClient()
  const [assets, kpi, areasRes, profilesRes] = await Promise.all([
    listAssets({ limit: 500 }),
    getAssetKpi(),
    supabase.from('areas').select('id, code, name:name_vi').order('code'),
    supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name'),
  ])

  type Area = { id: string; code: string; name: string }
  type Profile = { id: string; full_name: string }
  const areas = (areasRes.data as Area[] | null) ?? []
  const profiles = (profilesRes.data as Profile[] | null) ?? []

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🛠 Tài sản & Công cụ dụng cụ
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Quản lý TSCĐ + CCDC · Khấu hao tự động · Lịch bảo trì · Sự cố / sửa chữa.
        </p>
      </div>

      <AssetsListClient
        initialAssets={assets}
        kpi={kpi}
        profiles={profiles}
        areas={areas}
      />
    </div>
  )
}
