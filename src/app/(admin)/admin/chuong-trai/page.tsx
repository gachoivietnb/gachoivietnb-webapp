import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ChuongTraiClient, type CageNode, type RowNode, type AreaNode } from '@/components/admin/cages/ChuongTraiClient'

export default async function ChuongTraiPage() {
  const supabase = await createClient()

  const [areasRes, rowsRes, cagesRes, chickensRes] = await Promise.all([
    supabase.from('areas').select('*').eq('is_active', true).order('display_order'),
    supabase.from('cage_rows').select('*').eq('is_active', true).order('code'),
    supabase
      .from('cages')
      .select('id, row_id, code, full_code, capacity, status')
      .order('full_code'),
    supabase
      .from('chickens')
      .select('id, cage_id, status')
      .in('status', ['dang_nuoi', 'dang_cach_ly'])
      .not('cage_id', 'is', null)
      .limit(5000),
  ])

  type AreaRaw = { id: string; code: string; name_vi: string; type: string }
  type RowRaw = { id: string; area_id: string; code: string; name_vi: string | null }
  type CageRaw = { id: string; row_id: string; code: string; full_code: string; capacity: number; status: string }
  type ChickenLoc = { id: string; cage_id: string | null; status: string }

  const areas = (areasRes.data ?? []) as AreaRaw[]
  const rowsR = (rowsRes.data ?? []) as RowRaw[]
  const cagesR = (cagesRes.data ?? []) as CageRaw[]
  const chickens = (chickensRes.data ?? []) as ChickenLoc[]

  // Count chickens per cage
  const occupancyMap = new Map<string, number>()
  for (const c of chickens) {
    if (!c.cage_id) continue
    occupancyMap.set(c.cage_id, (occupancyMap.get(c.cage_id) ?? 0) + 1)
  }

  // Build tree with computed status
  const cagesByRow = new Map<string, CageNode[]>()
  for (const c of cagesR) {
    const occ = occupancyMap.get(c.id) ?? 0
    let computedStatus: CageNode['computed_status'] = 'trong'
    if (c.status === 'bao_tri') computedStatus = 'bao_tri'
    else if (occ >= c.capacity) computedStatus = 'day'
    else if (occ > 0) computedStatus = 'co_ga'
    const node: CageNode = {
      id: c.id,
      code: c.code,
      full_code: c.full_code,
      capacity: c.capacity,
      status: c.status,
      occupancy: occ,
      computed_status: computedStatus,
      row_id: c.row_id,
    }
    const arr = cagesByRow.get(c.row_id) ?? []
    arr.push(node)
    cagesByRow.set(c.row_id, arr)
  }

  const rowsByArea = new Map<string, RowNode[]>()
  for (const r of rowsR) {
    const cgs = cagesByRow.get(r.id) ?? []
    const totalCap = cgs.reduce((s, c) => s + c.capacity, 0)
    const totalOcc = cgs.reduce((s, c) => s + c.occupancy, 0)
    const node: RowNode = {
      id: r.id,
      code: r.code,
      name_vi: r.name_vi,
      area_id: r.area_id,
      cages: cgs,
      total_capacity: totalCap,
      total_occupancy: totalOcc,
      occupancy_pct: totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0,
    }
    const arr = rowsByArea.get(r.area_id) ?? []
    arr.push(node)
    rowsByArea.set(r.area_id, arr)
  }

  const tree: AreaNode[] = areas.map((a) => {
    const rs = rowsByArea.get(a.id) ?? []
    const cages = rs.flatMap((r) => r.cages)
    const totalCap = cages.reduce((s, c) => s + c.capacity, 0)
    const totalOcc = cages.reduce((s, c) => s + c.occupancy, 0)
    return {
      id: a.id,
      code: a.code,
      name_vi: a.name_vi,
      type: a.type,
      rows: rs,
      cages,
      total_capacity: totalCap,
      total_occupancy: totalOcc,
      occupancy_pct: totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0,
    }
  })

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🏠 Chuồng trại
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Bản đồ trực quan khu/dãy/chuồng · Lọc thông minh · Theo dõi tỉ lệ lấp đầy
          </p>
        </div>
        <Link
          href="/admin/chuong-trai/quan-ly"
          className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Quản lý khu/dãy/chuồng
        </Link>
      </div>

      <ChuongTraiClient tree={tree} />
    </div>
  )
}
