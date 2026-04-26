import { createClient } from '@/lib/supabase/server'
import { GiaPhaIndexClient, type ChickenNode } from '@/components/admin/pedigree/GiaPhaIndexClient'

export default async function GiaPhaIndexPage() {
  const supabase = await createClient()

  const [chickensRes, breedsRes] = await Promise.all([
    supabase
      .from('chickens_with_details')
      .select(`
        id, chicken_code, name, gender, status, weight_kg, age_months, tag_number,
        breed_code, breed_name, breed_tier,
        parent_male_id, parent_female_id,
        parent_male_code, parent_male_name,
        parent_female_code, parent_female_name,
        created_at
      `)
      .order('chicken_code')
      .limit(2000),
    supabase.from('breeds').select('code, name_vi').eq('is_active', true).order('display_order'),
  ])

  type Row = {
    id: string
    chicken_code: string
    name: string | null
    gender: string | null
    status: string
    weight_kg: number | null
    age_months: number | null
    tag_number: string | null
    breed_code: string | null
    breed_name: string | null
    breed_tier: string | null
    parent_male_id: string | null
    parent_female_id: string | null
    parent_male_code: string | null
    parent_male_name: string | null
    parent_female_code: string | null
    parent_female_name: string | null
    created_at: string
  }

  const rows = (chickensRes.data ?? []) as Row[]

  // Compute pedigree depth + descendants count via BFS
  // Build parent map
  const parentMap = new Map<string, [string | null, string | null]>()
  for (const r of rows) parentMap.set(r.id, [r.parent_male_id, r.parent_female_id])

  // Memo depth (max generations of ancestors known)
  const depthCache = new Map<string, number>()
  function computeDepth(id: string, visiting: Set<string> = new Set()): number {
    if (depthCache.has(id)) return depthCache.get(id)!
    if (visiting.has(id)) return 0 // cycle guard
    visiting.add(id)
    const parents = parentMap.get(id)
    if (!parents) {
      depthCache.set(id, 0)
      return 0
    }
    const [m, f] = parents
    let d = 0
    if (m) d = Math.max(d, 1 + computeDepth(m, visiting))
    if (f) d = Math.max(d, 1 + computeDepth(f, visiting))
    visiting.delete(id)
    depthCache.set(id, d)
    return d
  }

  // Children count
  const childrenCount = new Map<string, number>()
  for (const r of rows) {
    if (r.parent_male_id) childrenCount.set(r.parent_male_id, (childrenCount.get(r.parent_male_id) ?? 0) + 1)
    if (r.parent_female_id) childrenCount.set(r.parent_female_id, (childrenCount.get(r.parent_female_id) ?? 0) + 1)
  }

  const chickens: ChickenNode[] = rows.map((r) => ({
    id: r.id,
    chicken_code: r.chicken_code,
    name: r.name,
    gender: r.gender,
    status: r.status,
    weight_kg: r.weight_kg,
    age_months: r.age_months,
    tag_number: r.tag_number,
    breed_code: r.breed_code,
    breed_name: r.breed_name,
    breed_tier: r.breed_tier,
    parent_male_id: r.parent_male_id,
    parent_male_code: r.parent_male_code,
    parent_male_name: r.parent_male_name,
    parent_female_id: r.parent_female_id,
    parent_female_code: r.parent_female_code,
    parent_female_name: r.parent_female_name,
    pedigree_depth: computeDepth(r.id),
    children_count: childrenCount.get(r.id) ?? 0,
    has_pedigree: !!(r.parent_male_id || r.parent_female_id),
  }))

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🌳 Gia phả đàn gà
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tra cứu cây phả hệ · Lọc thông minh theo giống, độ sâu phả · Click vào con gà bất kỳ để xem cây
        </p>
      </div>
      <GiaPhaIndexClient
        chickens={chickens}
        breeds={(breedsRes.data ?? []) as never}
      />
    </div>
  )
}
