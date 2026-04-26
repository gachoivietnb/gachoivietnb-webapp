import 'server-only'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type {
  Asset,
  AssetEvent,
  AssetKind,
  AssetStatus,
  AssetWithValue,
  AssetEventType,
} from './types'

/* ============================================================
 * Validation schemas
 * ============================================================ */

const KIND_VALUES: AssetKind[] = ['tscd', 'ccdc']
const STATUS_VALUES: AssetStatus[] = [
  'dang_dung', 'cho_sua', 'hong', 'cho_ban', 'da_thanh_ly',
]
const EVENT_TYPE_VALUES: AssetEventType[] = [
  'purchase', 'maintenance', 'repair', 'incident', 'transfer',
  'status_change', 'inspection', 'liquidation', 'note',
]

export const AssetCreateSchema = z.object({
  kind: z.enum(KIND_VALUES as [AssetKind, ...AssetKind[]]),
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  category: z.string().max(40).nullable().optional(),
  quantity: z.number().int().min(0).default(1),
  unit: z.string().max(20).default('cái'),
  area_id: z.string().uuid().nullable().optional(),
  responsible_user_id: z.string().uuid().nullable().optional(),
  location_note: z.string().max(200).nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  purchase_price: z.number().int().min(0).default(0),
  supplier_name: z.string().max(120).nullable().optional(),
  invoice_number: z.string().max(60).nullable().optional(),
  warranty_until: z.string().nullable().optional(),
  useful_life_months: z.number().int().min(1).nullable().optional(),
  salvage_value: z.number().int().min(0).default(0),
  brand: z.string().max(80).nullable().optional(),
  model: z.string().max(80).nullable().optional(),
  serial_number: z.string().max(80).nullable().optional(),
  image_url: z.string().max(500).nullable().optional(),
  status: z.enum(STATUS_VALUES as [AssetStatus, ...AssetStatus[]]).default('dang_dung'),
  last_maintenance_date: z.string().nullable().optional(),
  next_maintenance_date: z.string().nullable().optional(),
  maintenance_interval_months: z.number().int().min(1).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const AssetUpdateSchema = AssetCreateSchema.partial()
export type AssetCreateInput = z.infer<typeof AssetCreateSchema>
export type AssetUpdateInput = z.infer<typeof AssetUpdateSchema>

export const EventCreateSchema = z.object({
  event_type: z.enum(EVENT_TYPE_VALUES as [AssetEventType, ...AssetEventType[]]),
  event_date: z.string(),
  cost: z.number().int().min(0).default(0),
  description: z.string().max(2000).nullable().optional(),
  next_due_date: z.string().nullable().optional(),
})
export type EventCreateInput = z.infer<typeof EventCreateSchema>

/* ============================================================
 * Queries
 * ============================================================ */

export async function listAssets(filter?: {
  kind?: AssetKind
  status?: AssetStatus
  search?: string
  limit?: number
}): Promise<AssetWithValue[]> {
  const supabase = await createClient()
  let q = supabase
    .from('assets_with_value')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filter?.limit ?? 500)
  if (filter?.kind) q = q.eq('kind', filter.kind)
  if (filter?.status) q = q.eq('status', filter.status)
  if (filter?.search) q = q.or(`name.ilike.%${filter.search}%,code.ilike.%${filter.search}%`)
  const { data } = await q
  return ((data as AssetWithValue[] | null) ?? [])
}

export async function getAsset(id: string): Promise<AssetWithValue | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('assets_with_value')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data as AssetWithValue | null) ?? null
}

export async function listEvents(assetId: string): Promise<AssetEvent[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('asset_events')
    .select('*')
    .eq('asset_id', assetId)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)
  return ((data as AssetEvent[] | null) ?? [])
}

export async function createAsset(
  input: AssetCreateInput,
  userId: string
): Promise<Asset> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .insert(input as never)
    .select('*')
    .single()
  if (error || !data) throw new Error('Lỗi tạo tài sản: ' + (error?.message ?? 'unknown'))

  // Auto-create purchase event nếu có purchase_date + price
  const asset = data as Asset
  if (asset.purchase_date && asset.purchase_price > 0) {
    await supabase.from('asset_events').insert({
      asset_id: asset.id,
      event_type: 'purchase',
      event_date: asset.purchase_date,
      cost: asset.purchase_price,
      description: `Ghi nhận mua mới · ${asset.supplier_name ?? '—'}`,
      performed_by: userId,
    } as never)
  }
  return asset
}

export async function updateAsset(id: string, patch: AssetUpdateInput): Promise<Asset> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('assets')
    .update(patch as never)
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) throw new Error('Lỗi cập nhật: ' + (error?.message ?? 'unknown'))
  return data as Asset
}

export async function deleteAsset(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw new Error('Lỗi xoá: ' + error.message)
}

export async function createEvent(
  assetId: string,
  input: EventCreateInput,
  userId: string
): Promise<AssetEvent> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('asset_events')
    .insert({
      asset_id: assetId,
      ...input,
      performed_by: userId,
    } as never)
    .select('*')
    .single()
  if (error || !data) throw new Error('Lỗi tạo sự kiện: ' + (error?.message ?? 'unknown'))

  // Side effects:
  // - maintenance → cập nhật last_maintenance_date + next_maintenance_date
  // - status_change → expect description chứa status mới? Để client gửi PATCH riêng.
  if (input.event_type === 'maintenance') {
    await supabase
      .from('assets')
      .update({
        last_maintenance_date: input.event_date,
        next_maintenance_date: input.next_due_date ?? null,
      } as never)
      .eq('id', assetId)
  } else if (input.event_type === 'liquidation') {
    await supabase
      .from('assets')
      .update({ status: 'da_thanh_ly' } as never)
      .eq('id', assetId)
  }

  return data as AssetEvent
}

export async function deleteEvent(eventId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('asset_events').delete().eq('id', eventId)
  if (error) throw new Error('Lỗi xoá sự kiện: ' + error.message)
}

/* ============================================================
 * Aggregate / KPI
 * ============================================================ */

export type AssetKpi = {
  totalCount: number
  totalValue: number
  totalAcquired: number
  tscdCount: number
  ccdcCount: number
  inUseCount: number
  needMaintenance: number    // overdue + due_soon
  brokenCount: number
  liquidatedCount: number
  byCategory: Array<{ category: string | null; count: number; total_value: number }>
  byArea: Array<{ area_id: string | null; area_name: string | null; count: number; total_value: number }>
}

export async function getAssetKpi(): Promise<AssetKpi> {
  const all = await listAssets({ limit: 2000 })

  const result: AssetKpi = {
    totalCount: 0,
    totalValue: 0,
    totalAcquired: 0,
    tscdCount: 0,
    ccdcCount: 0,
    inUseCount: 0,
    needMaintenance: 0,
    brokenCount: 0,
    liquidatedCount: 0,
    byCategory: [],
    byArea: [],
  }
  const catMap = new Map<string | null, { count: number; total_value: number }>()
  const areaMap = new Map<string | null, { area_name: string | null; count: number; total_value: number }>()

  for (const a of all) {
    if (a.status === 'da_thanh_ly') {
      result.liquidatedCount++
      continue
    }
    result.totalCount++
    result.totalValue += Number(a.current_value)
    result.totalAcquired += Number(a.purchase_price)
    if (a.kind === 'tscd') result.tscdCount++
    else result.ccdcCount++
    if (a.status === 'dang_dung') result.inUseCount++
    if (a.status === 'hong') result.brokenCount++
    if (a.maintenance_status === 'overdue' || a.maintenance_status === 'due_soon') {
      result.needMaintenance++
    }

    const c = catMap.get(a.category) ?? { count: 0, total_value: 0 }
    c.count += 1
    c.total_value += Number(a.current_value)
    catMap.set(a.category, c)

    const ar = areaMap.get(a.area_id) ?? { area_name: a.area_name, count: 0, total_value: 0 }
    ar.count += 1
    ar.total_value += Number(a.current_value)
    areaMap.set(a.area_id, ar)
  }

  result.byCategory = [...catMap.entries()].map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total_value - a.total_value)
  result.byArea = [...areaMap.entries()].map(([area_id, v]) => ({ area_id, ...v }))
    .sort((a, b) => b.total_value - a.total_value)

  return result
}

export async function nextAssetCode(kind: AssetKind): Promise<string> {
  const supabase = await createClient()
  const prefix = kind === 'tscd' ? 'TSCD' : 'CCDC'
  const { data } = await supabase
    .from('assets')
    .select('code')
    .ilike('code', `${prefix}-%`)
    .order('code', { ascending: false })
    .limit(1)
  type Row = { code: string }
  const last = (data as Row[] | null)?.[0]?.code
  if (!last) return `${prefix}-001`
  const m = last.match(/(\d+)$/)
  const n = m ? Number(m[1]) + 1 : 1
  return `${prefix}-${n.toString().padStart(3, '0')}`
}
