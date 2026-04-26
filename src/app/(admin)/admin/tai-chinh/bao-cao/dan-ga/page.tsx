import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { createClient } from '@/lib/supabase/server'
import { ChickensReportClient, type ChickenReportData } from '@/components/admin/reports/ChickensReportClient'

export const revalidate = 0

type SearchParams = Promise<{ from?: string; to?: string }>

export default async function ChickensReportPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')

  const sp = await searchParams
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const todayStr = today.toISOString().slice(0, 10)

  const fromDate = sp.from ?? monthStart
  const toDate = sp.to ?? todayStr

  const supabase = await createClient()

  // Lấy snapshot hiện tại + các giao dịch trong khoảng
  const [chickensRes, breedsRes, areasRes] = await Promise.all([
    supabase
      .from('chickens')
      .select('id, status, gender, breed_id, area_id, hatch_date, death_date, sale_date, sale_price, cost_basis, age_months')
      .limit(10000),
    supabase.from('breeds').select('id, name_vi').order('name_vi'),
    supabase.from('areas').select('id, code, name_vi').order('code'),
  ])

  type Chicken = {
    id: string
    status: string
    gender: string | null
    breed_id: string | null
    area_id: string | null
    hatch_date: string | null
    death_date: string | null
    sale_date: string | null
    sale_price: number | null
    cost_basis: number | null
    age_months: number | null
  }
  type Breed = { id: string; name_vi: string }
  type Area = { id: string; code: string; name_vi: string }

  const chickens = (chickensRes.data as Chicken[] | null) ?? []
  const breeds = (breedsRes.data as Breed[] | null) ?? []
  const areas = (areasRes.data as Area[] | null) ?? []

  const breedMap = new Map(breeds.map((b) => [b.id, b.name_vi]))
  const areaMap = new Map(areas.map((a) => [a.id, `${a.code} · ${a.name_vi}`]))

  // Helpers ngày
  function within(date: string | null, from: string, to: string): boolean {
    if (!date) return false
    return date >= from && date <= to
  }
  function before(date: string | null, dateRef: string): boolean {
    if (!date) return false
    return date < dateRef
  }

  // ====== Số liệu ======
  // Đầu kỳ = số gà còn sống (không chết, không bán) tính đến trước fromDate
  // = đã hatch trước from + (chưa chết hoặc chết sau ngày from) + (chưa bán hoặc bán sau ngày from)
  const beginCount = chickens.filter((c) => {
    if (!c.hatch_date || c.hatch_date >= fromDate) return false
    if (c.death_date && c.death_date < fromDate) return false
    if (c.sale_date && c.sale_date < fromDate) return false
    return true
  }).length

  // Sinh trong kỳ (hatched in range)
  const hatchedInRange = chickens.filter((c) => within(c.hatch_date, fromDate, toDate))
  const hatched = hatchedInRange.length

  // Bán trong kỳ
  const soldInRange = chickens.filter((c) => within(c.sale_date, fromDate, toDate))
  const sold = soldInRange.length
  const revenue = soldInRange.reduce((s, c) => s + Number(c.sale_price ?? 0), 0)
  const cogs = soldInRange.reduce((s, c) => s + Number(c.cost_basis ?? 0), 0)
  const profit = revenue - cogs
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0

  // Chết trong kỳ
  const diedInRange = chickens.filter((c) => within(c.death_date, fromDate, toDate))
  const died = diedInRange.length

  // Cuối kỳ
  const endCount = chickens.filter((c) => {
    if (!c.hatch_date || c.hatch_date > toDate) return false
    if (c.death_date && c.death_date <= toDate) return false
    if (c.sale_date && c.sale_date <= toDate) return false
    return true
  }).length

  // Tỷ lệ sống = end / (begin + hatched)
  const survivalRate = beginCount + hatched > 0
    ? (endCount / (beginCount + hatched)) * 100
    : 100
  const mortalityRate = beginCount + hatched > 0
    ? (died / (beginCount + hatched)) * 100
    : 0

  // ====== Theo giống ======
  type GroupRow = { id: string; name: string; count: number; sold: number; died: number; revenue: number }
  const byBreedMap = new Map<string, GroupRow>()
  for (const c of chickens) {
    if (!c.breed_id) continue
    const isAlive = !c.death_date && !c.sale_date && c.hatch_date && c.hatch_date <= toDate
    const isSoldInRange = within(c.sale_date, fromDate, toDate)
    const isDiedInRange = within(c.death_date, fromDate, toDate)
    if (!isAlive && !isSoldInRange && !isDiedInRange) continue
    const cur = byBreedMap.get(c.breed_id) ?? { id: c.breed_id, name: breedMap.get(c.breed_id) ?? '—', count: 0, sold: 0, died: 0, revenue: 0 }
    if (isAlive) cur.count++
    if (isSoldInRange) {
      cur.sold++
      cur.revenue += Number(c.sale_price ?? 0)
    }
    if (isDiedInRange) cur.died++
    byBreedMap.set(c.breed_id, cur)
  }
  const byBreed = [...byBreedMap.values()].sort((a, b) => b.count - a.count)

  // ====== Theo khu ======
  const byAreaMap = new Map<string, GroupRow>()
  for (const c of chickens) {
    if (!c.area_id) continue
    const isAlive = !c.death_date && !c.sale_date && c.hatch_date && c.hatch_date <= toDate
    if (!isAlive) continue
    const cur = byAreaMap.get(c.area_id) ?? { id: c.area_id, name: areaMap.get(c.area_id) ?? '—', count: 0, sold: 0, died: 0, revenue: 0 }
    cur.count++
    byAreaMap.set(c.area_id, cur)
  }
  const byArea = [...byAreaMap.values()].sort((a, b) => b.count - a.count)

  // ====== Theo trạng thái snapshot hiện tại ======
  const byStatus: Record<string, number> = {}
  for (const c of chickens) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1
  }

  const data: ChickenReportData = {
    fromDate,
    toDate,
    beginCount,
    hatched,
    sold,
    died,
    endCount,
    revenue,
    cogs,
    profit,
    margin,
    survivalRate,
    mortalityRate,
    byBreed,
    byArea,
    byStatus,
    totalChickens: chickens.length,
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4 print:hidden">
        <div>
          <Link
            href="/admin/tai-chinh"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Báo cáo tổng hợp
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🐓 Báo cáo về đàn gà
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Đầu kỳ · sinh · bán · chết · cuối kỳ · theo giống · theo khu · {fromDate} → {toDate}
          </p>
        </div>
      </div>

      <ChickensReportClient data={data} />
    </div>
  )
}
