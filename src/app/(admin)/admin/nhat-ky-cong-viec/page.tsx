import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createClient } from '@/lib/supabase/server'
import { listDiaryEntries, getDiaryKpi } from '@/lib/diary/queries'
import { DiaryClient } from '@/components/admin/diary/DiaryClient'

export const revalidate = 0

export default async function DiaryPage() {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')

  const supabase = await createClient()
  const today = new Date()
  const monthAgo = new Date(today)
  monthAgo.setDate(monthAgo.getDate() - 30)

  const [entries, kpi, profilesRes, areasRes] = await Promise.all([
    listDiaryEntries({ fromDate: monthAgo.toISOString().slice(0, 10), limit: 200 }),
    getDiaryKpi(),
    supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name'),
    supabase.from('areas').select('id, code, name:name_vi').order('code'),
  ])

  type Profile = { id: string; full_name: string }
  type Area = { id: string; code: string; name: string }
  const profiles = (profilesRes.data as Profile[] | null) ?? []
  const areas = (areasRes.data as Area[] | null) ?? []

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          📔 Nhật ký công việc
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ghi lại hoạt động hằng ngày · quan sát · sự việc xảy ra · ghim các entry quan trọng để xem lại
        </p>
      </div>

      <DiaryClient
        initialEntries={entries}
        initialKpi={kpi}
        profiles={profiles}
        areas={areas}
        currentUserId={ctx.user.id}
        isOwner={ctx.profile.role === 'chu_trai'}
      />
    </div>
  )
}
