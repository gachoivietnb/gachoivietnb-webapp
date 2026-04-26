import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createAdminClient } from '@/lib/multitenancy/super-admin'
import { BackupManagerClient } from '@/components/admin/backup/BackupManagerClient'

export const revalidate = 0

export default async function BackupPage() {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')

  if (ctx.profile.role !== 'chu_trai') {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🔒</div>
        <h1 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-1">
          Chỉ chủ trại được sao lưu / khôi phục
        </h1>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Liên hệ chủ trại để được hỗ trợ thao tác này.
        </p>
      </div>
    )
  }

  const admin = createAdminClient()
  const { data: farmRow } = await admin
    .from('farms')
    .select('last_backup_at, name, slug')
    .eq('id', ctx.farm.id)
    .maybeSingle()

  const lastBackupAt =
    (farmRow as { last_backup_at: string | null } | null)?.last_backup_at ?? null
  const farmName = (farmRow as { name: string } | null)?.name ?? ctx.farm.name

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          💾 Sao lưu & Khôi phục
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Bảo vệ dữ liệu trại — sao lưu định kỳ, khôi phục nhanh khi cần
        </p>
      </div>

      <BackupManagerClient farmName={farmName} lastBackupAt={lastBackupAt} />
    </div>
  )
}
