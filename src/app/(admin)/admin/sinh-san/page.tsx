import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { SinhSanIndexClient, type LitterNode } from '@/components/admin/breeding/SinhSanIndexClient'

export default async function SinhSanPage() {
  const supabase = await createClient()

  const [littersRes, breedsRes] = await Promise.all([
    supabase
      .from('breeding_litters')
      .select(
        `
        id, litter_code, paired_date, expected_hatch_date, hatched_date,
        eggs_total, eggs_fertile, hatched_count, status, notes,
        female:chickens!breeding_litters_female_id_fkey (
          id, chicken_code, name, breed:breeds(code, name_vi)
        )
        `
      )
      .order('paired_date', { ascending: false })
      .limit(500),
    supabase.from('breeds').select('code, name_vi').eq('is_active', true).order('display_order'),
  ])

  type Row = {
    id: string
    litter_code: string
    paired_date: string
    expected_hatch_date: string | null
    hatched_date: string | null
    eggs_total: number
    eggs_fertile: number
    hatched_count: number
    status: string
    notes: string | null
    female: {
      id: string
      chicken_code: string
      name: string | null
      breed: { code: string | null; name_vi: string } | null
    } | null
  }

  const rows = (littersRes.data ?? []) as Row[]

  const today = new Date()

  const litters: LitterNode[] = rows.map((r) => {
    const fertileRate =
      r.eggs_total > 0 ? Math.round((r.eggs_fertile / r.eggs_total) * 100) : null
    const hatchRate =
      r.eggs_fertile > 0
        ? Math.round((r.hatched_count / r.eggs_fertile) * 100)
        : r.eggs_total > 0
          ? Math.round((r.hatched_count / r.eggs_total) * 100)
          : null
    const daysLeft = r.expected_hatch_date
      ? Math.ceil(
          (new Date(r.expected_hatch_date).getTime() - today.getTime()) / (86400 * 1000)
        )
      : null
    const incubationDays = r.expected_hatch_date
      ? Math.max(
          1,
          Math.round(
            (new Date(r.expected_hatch_date).getTime() - new Date(r.paired_date).getTime()) /
              (86400 * 1000)
          )
        )
      : 21
    const elapsedDays = Math.max(
      0,
      Math.round((today.getTime() - new Date(r.paired_date).getTime()) / (86400 * 1000))
    )
    const progressPct =
      r.status === 'da_no'
        ? 100
        : r.status === 'that_bai'
          ? 0
          : Math.min(100, Math.round((elapsedDays / incubationDays) * 100))

    return {
      id: r.id,
      litter_code: r.litter_code,
      paired_date: r.paired_date,
      expected_hatch_date: r.expected_hatch_date,
      hatched_date: r.hatched_date,
      eggs_total: r.eggs_total,
      eggs_fertile: r.eggs_fertile,
      hatched_count: r.hatched_count,
      status: r.status,
      notes: r.notes,
      female_id: r.female?.id ?? null,
      female_code: r.female?.chicken_code ?? null,
      female_name: r.female?.name ?? null,
      breed_code: r.female?.breed?.code ?? null,
      breed_name: r.female?.breed?.name_vi ?? null,
      fertile_rate: fertileRate,
      hatch_rate: hatchRate,
      days_left: daysLeft,
      progress_pct: progressPct,
      elapsed_days: elapsedDays,
    }
  })

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🥚 Sinh sản
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quản lý lứa ghép · Lọc thông minh · Theo dõi tiến độ ấp trứng từng lứa
          </p>
        </div>
        <Link
          href="/admin/sinh-san/them-moi"
          className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Ghép đôi mới
        </Link>
      </div>

      <SinhSanIndexClient
        litters={litters}
        breeds={(breedsRes.data ?? []) as never}
      />
    </div>
  )
}
