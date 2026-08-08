import { requireSuperAdmin, createAdminClient } from '@/lib/multitenancy/super-admin'
import {
  readFarmDataCounts,
  listDemoGrants,
  MASTER_FARM_ID,
  type DemoGrant,
  type FarmDataCounts,
} from '@/lib/admin/farm-data-ops'
import { FarmDataManagerClient } from '@/components/admin/super-admin/FarmDataManagerClient'

export const revalidate = 0

export default async function FarmDataPage() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-5 md:p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🚫</div>
        <h1 className="text-lg font-bold text-rose-900 dark:text-rose-200 mb-1">Không có quyền</h1>
        <p className="text-sm text-rose-800 dark:text-rose-300">Trang này chỉ dành cho Super Admin.</p>
      </div>
    )
  }

  const admin = createAdminClient()
  const { data: farms } = await admin
    .from('farms')
    .select('id, name, slug, tier, owner_id')
    .order('name')
  const allFarms = (farms ?? []) as Array<{
    id: string; name: string; slug: string; tier: string; owner_id: string | null
  }>

  const masterFarm = allFarms.find((f) => f.id === MASTER_FARM_ID) ?? null
  const otherFarms = allFarms.filter((f) => f.id !== MASTER_FARM_ID)

  const [masterCounts, otherCountsList, grants] = await Promise.all([
    masterFarm ? readFarmDataCounts(admin, MASTER_FARM_ID) : Promise.resolve(null),
    Promise.all(
      otherFarms.map(async (f) => ({ farmId: f.id, counts: await readFarmDataCounts(admin, f.id) }))
    ),
    listDemoGrants(admin),
  ])

  const countsByFarm: Record<string, FarmDataCounts> = Object.fromEntries(
    otherCountsList.map((x) => [x.farmId, x.counts])
  )
  const grantByFarm: Record<string, DemoGrant> = Object.fromEntries(
    grants.map((g) => [g.farm_id, g])
  )

  return (
    <div>
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 mb-2">
          👑 Super Admin
        </div>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🗄️ Quản lý dữ liệu demo
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Master farm là kho dữ liệu demo gốc · Cấp quyền (Grant) để clone sang trại khác · Trại có thể xoá demo của họ, master vẫn còn nguyên
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-2">
          <span className="text-xl shrink-0">💡</span>
          <div className="text-sm text-blue-900 dark:text-blue-200 space-y-1">
            <p className="font-semibold">Mô hình mới: Master + Clone-on-Grant</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              <li><b>Master farm</b> là kho dữ liệu demo gốc do super admin sở hữu — không bao giờ bị xoá.</li>
              <li><b>Cấp quyền (Grant)</b>: clone toàn bộ data từ master sang trại đó (UUID mới, dữ liệu y hệt master).</li>
              <li><b>Reseed</b>: xoá demo hiện tại của trại rồi clone lại từ master.</li>
              <li><b>Thu hồi (Revoke)</b>: xoá demo của trại — master vẫn nguyên.</li>
              <li>Nếu master rỗng, hệ thống sẽ tự sinh demo random (fallback). Nhấn <b>Khởi tạo Master</b> để nạp demo gốc.</li>
            </ul>
          </div>
        </div>
      </div>

      <FarmDataManagerClient
        masterFarm={masterFarm}
        masterCounts={masterCounts}
        otherFarms={otherFarms}
        countsByFarm={countsByFarm}
        grantByFarm={grantByFarm}
      />
    </div>
  )
}
