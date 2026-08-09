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
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-5 md:p-8 text-center max-w-lg mx-auto mt-10">
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
  const [farmRes, historyRes] = await Promise.all([
    admin
      .from('farms')
      .select('last_backup_at, name, slug')
      .eq('id', ctx.farm.id)
      .maybeSingle(),
    admin
      .from('system_logs')
      .select('id, level, message, context, created_at, user_email')
      .eq('farm_id', ctx.farm.id)
      .or('message.ilike.%Backup%,message.ilike.%backup%,message.ilike.%restored from%')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const farmRow = farmRes.data as { last_backup_at: string | null; name: string } | null
  const lastBackupAt = farmRow?.last_backup_at ?? null
  const farmName = farmRow?.name ?? ctx.farm.name

  type LogRow = {
    id: string
    level: string
    message: string
    context: Record<string, unknown> | null
    created_at: string
    user_email: string | null
  }
  const history = (historyRes.data ?? []) as LogRow[]

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          💾 Sao lưu & Khôi phục
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Bảo vệ dữ liệu trại — nhiều định dạng để bạn yên tâm tuyệt đối
        </p>
      </div>

      <BackupManagerClient
        farmName={farmName}
        lastBackupAt={lastBackupAt}
        history={history.map((h) => ({
          id: h.id,
          level: h.level,
          message: h.message,
          created_at: h.created_at,
          user_email: h.user_email,
          size_kb:
            (h.context as { size_kb?: number } | null)?.size_kb ?? null,
        }))}
      />
    </div>
  )
}
