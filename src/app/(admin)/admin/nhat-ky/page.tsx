import { createClient } from '@/lib/supabase/server'
import { NhatKyClient, type Log } from '@/components/admin/activity-log/NhatKyClient'

export const revalidate = 0

export default async function NhatKyPage() {
  const supabase = await createClient()

  const { data, count } = await supabase
    .from('activity_logs_detailed')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(500)

  const logs = (data ?? []) as Log[]

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            📝 Nhật ký hoạt động
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sổ cái audit trail · Truy vết mọi thao tác · Lọc theo người, module, hành động, thời gian
          </p>
        </div>
      </div>

      <NhatKyClient logs={logs} totalCount={count ?? 0} />
    </div>
  )
}
