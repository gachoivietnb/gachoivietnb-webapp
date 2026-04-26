import Link from 'next/link'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createAdminClient } from '@/lib/multitenancy/super-admin'

/**
 * Server component — render a reminder banner if it's been >=30 days
 * since last_backup_at, or if the farm has never backed up.
 *
 * Only shown to chu_trai (others can't perform the backup anyway).
 */
export async function BackupReminderBanner() {
  const ctx = await getFarmContext()
  if (!ctx) return null
  if (ctx.profile.role !== 'chu_trai') return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('farms')
    .select('last_backup_at, created_at')
    .eq('id', ctx.farm.id)
    .maybeSingle()

  const row = data as { last_backup_at: string | null; created_at: string } | null
  if (!row) return null

  const lastBackup = row.last_backup_at ? new Date(row.last_backup_at) : null
  const farmAge = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000)
  // Don't bug brand-new farms in their first week
  if (!lastBackup && farmAge < 7) return null

  const days = lastBackup
    ? Math.floor((Date.now() - lastBackup.getTime()) / 86400000)
    : null

  // Show banner if never backed up OR last backup >=30 days ago
  if (lastBackup && (days === null || days < 30)) return null

  const message = !lastBackup
    ? 'Trại của bạn chưa có bản sao lưu nào — Hãy backup ngay để bảo vệ dữ liệu!'
    : `Đã ${days} ngày kể từ lần sao lưu cuối — Nên backup ngay để phòng mất dữ liệu.`

  return (
    <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3 md:p-4 mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-2xl shrink-0">⚠️</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
            💾 Nhắc nhở sao lưu dữ liệu
          </div>
          <div className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
            {message}
          </div>
        </div>
        <Link
          href="/admin/sao-luu"
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold rounded-lg px-3 py-2 shadow shrink-0"
        >
          📥 Sao lưu ngay
        </Link>
      </div>
    </div>
  )
}
