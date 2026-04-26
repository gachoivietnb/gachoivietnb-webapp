import { requireSuperAdmin, createAdminClient } from '@/lib/multitenancy/super-admin'
import { readFarmDataCounts } from '@/lib/admin/farm-data-ops'
import { FarmDataManagerClient } from '@/components/admin/super-admin/FarmDataManagerClient'

export const revalidate = 0

export default async function FarmDataPage() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
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
  const farmList = (farms ?? []) as Array<{ id: string; name: string; slug: string; tier: string; owner_id: string | null }>

  const countsList = await Promise.all(
    farmList.map(async (f) => ({ farmId: f.id, counts: await readFarmDataCounts(admin, f.id) }))
  )
  const countsByFarm = Object.fromEntries(countsList.map((x) => [x.farmId, x.counts]))

  return (
    <div>
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 mb-2">
          👑 Super Admin
        </div>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🗄️ Quản lý dữ liệu trại
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Nạp dữ liệu demo để xem tính năng · Hoặc xoá toàn bộ để bắt đầu khai báo dữ liệu thật
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-2">
          <span className="text-xl shrink-0">⚠️</span>
          <div className="text-sm text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold">Lưu ý quan trọng</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              <li>
                <b>Xoá dữ liệu</b>: gỡ tất cả gà, khách, đơn hàng, chi phí, nhật ký, tài sản... <b>không phục hồi được</b>.
                Giữ lại: areas, cages, vaccines, accounts, profiles, kho thuốc/cám sẽ về 0.
              </li>
              <li>
                <b>Nạp lại demo</b>: chỉ thêm vào nếu chưa có (skip nếu đã tồn tại). Muốn nạp lại sạch → <b>xoá trước</b> rồi nạp.
              </li>
              <li>Mỗi trại độc lập — thao tác trại này không ảnh hưởng trại khác.</li>
            </ul>
          </div>
        </div>
      </div>

      <FarmDataManagerClient farms={farmList} initialCounts={countsByFarm} />
    </div>
  )
}
