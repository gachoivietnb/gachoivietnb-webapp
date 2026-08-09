import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  requireSuperAdmin,
  createAdminClient,
  computeFarmStatus,
  type FarmRow,
} from '@/lib/multitenancy/super-admin'
import { SuperFarmsClient, type FarmCard } from '@/components/admin/super-admin/SuperFarmsClient'

export const revalidate = 0

export default async function FarmsListPage() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-5 md:p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🚫</div>
        <p className="text-rose-800 dark:text-rose-300">Không có quyền truy cập.</p>
      </div>
    )
  }

  const admin = createAdminClient()
  const [farmsRes, profilesRes, chickensRes] = await Promise.all([
    admin.from('farms').select('*').order('created_at', { ascending: false }),
    admin.from('profiles').select('id, farm_id, role, is_active'),
    admin.from('chickens').select('farm_id, status').limit(100000),
  ])

  const farms = (farmsRes.data ?? []) as FarmRow[]
  const profiles = (profilesRes.data ?? []) as Array<{
    farm_id: string
    is_active: boolean
  }>
  const chickens = (chickensRes.data ?? []) as Array<{
    farm_id: string
    status: string
  }>

  const usersByFarm = new Map<string, number>()
  for (const p of profiles) {
    if (p.is_active) usersByFarm.set(p.farm_id, (usersByFarm.get(p.farm_id) ?? 0) + 1)
  }
  const chickensByFarm = new Map<string, number>()
  for (const c of chickens) {
    if (c.status === 'dang_nuoi' || c.status === 'dang_cach_ly') {
      chickensByFarm.set(c.farm_id, (chickensByFarm.get(c.farm_id) ?? 0) + 1)
    }
  }

  const cards: FarmCard[] = farms.map((f) => {
    const s = computeFarmStatus(f)
    return {
      id: f.id,
      slug: f.slug,
      name: f.name,
      tier: f.tier,
      phone: f.phone,
      address: f.address,
      created_at: f.created_at,
      trial_ends_at: f.trial_ends_at,
      subscription_expires_at: f.subscription_expires_at,
      max_chickens: f.max_chickens,
      max_users: f.max_users,
      users: usersByFarm.get(f.id) ?? 0,
      chickens: chickensByFarm.get(f.id) ?? 0,
      status: s.status,
      daysRemaining: s.daysRemaining,
      monthlyValue: s.monthlyValue,
    }
  })

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link
            href="/admin/super-admin"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Dashboard
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🏠 Tất cả farms ({farms.length})
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý toàn bộ tenants · Lọc theo tier / status / search · Click vào farm để xem chi
            tiết
          </p>
        </div>
      </div>

      <SuperFarmsClient farms={cards} />
    </div>
  )
}
