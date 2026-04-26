import { createClient } from '@/lib/supabase/server'
import { BreedsManager } from '@/components/admin/breeds/BreedsManager'

export const revalidate = 0

type Breed = {
  id: string
  code: string
  name_vi: string
  origin: string | null
  description: string | null
  characteristics: Record<string, unknown> | null
  tier: string
  default_avatar_url: string | null
  is_active: boolean
  display_order: number
  chicken_count?: number
}

export default async function BreedsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single<{ role: string }>()

  const canEdit = profile?.role === 'chu_trai'

  const [{ data: breeds }, { data: counts }] = await Promise.all([
    supabase.from('breeds').select('*').order('display_order').order('name_vi'),
    supabase.from('chickens').select('breed_id').not('breed_id', 'is', null),
  ])

  const countsByBreed: Record<string, number> = {}
  for (const row of ((counts ?? []) as Array<{ breed_id: string }>)) {
    countsByBreed[row.breed_id] = (countsByBreed[row.breed_id] ?? 0) + 1
  }

  const enrichedBreeds: Breed[] = ((breeds ?? []) as Breed[]).map((b) => ({
    ...b,
    chicken_count: countsByBreed[b.id] ?? 0,
  }))

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🧬 Thư viện giống gà
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Quản lý các giống gà · Lọc thông minh · Theo dõi phân bổ đàn theo giống
        </p>
      </div>
      <BreedsManager initialBreeds={enrichedBreeds} canEdit={canEdit} />
    </div>
  )
}
