import 'server-only'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type {
  DiaryCategory,
  DiaryEntry,
  DiaryEntryWithMeta,
  DiaryMood,
} from './types'

const CATEGORIES: DiaryCategory[] = [
  'cham_soc', 'cho_an', 've_sinh', 'huan_luyen', 'sinh_san',
  'thu_y', 'kinh_doanh', 'su_co', 'quan_sat', 'cong_viec', 'khac',
]
const MOODS: DiaryMood[] = ['rat_tot', 'tot', 'binh_thuong', 'lo_lang', 'rat_xau']

export const DiaryCreateSchema = z.object({
  title: z.string().max(200).nullable().optional(),
  content: z.string().min(1).max(10000),
  category: z.enum(CATEGORIES as [DiaryCategory, ...DiaryCategory[]]).default('cong_viec'),
  mood: z.enum(MOODS as [DiaryMood, ...DiaryMood[]]).nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).default([]),
  related_chicken_id: z.string().uuid().nullable().optional(),
  related_area_id: z.string().uuid().nullable().optional(),
  diary_date: z.string().optional(),
  weather: z.string().max(40).nullable().optional(),
  attachments: z.array(z.string()).max(10).default([]),
  is_pinned: z.boolean().default(false),
})

export const DiaryUpdateSchema = DiaryCreateSchema.partial()
export type DiaryCreateInput = z.infer<typeof DiaryCreateSchema>
export type DiaryUpdateInput = z.infer<typeof DiaryUpdateSchema>

export async function listDiaryEntries(filter?: {
  category?: DiaryCategory
  mood?: DiaryMood
  authorId?: string
  fromDate?: string
  toDate?: string
  search?: string
  tag?: string
  pinnedFirst?: boolean
  limit?: number
}): Promise<DiaryEntryWithMeta[]> {
  const supabase = await createClient()
  let q = supabase
    .from('diary_entries')
    .select(
      'id, farm_id, author_id, title, content, category, mood, tags, related_chicken_id, related_area_id, diary_date, weather, attachments, is_pinned, created_at, updated_at, author:profiles!author_id(full_name), chicken:chickens(tag_number), area:areas(name_vi), comments:diary_comments(count)'
    )
    .limit(filter?.limit ?? 200)
  if (filter?.pinnedFirst !== false) {
    q = q
      .order('is_pinned', { ascending: false })
      .order('diary_date', { ascending: false })
      .order('created_at', { ascending: false })
  } else {
    q = q.order('diary_date', { ascending: false }).order('created_at', { ascending: false })
  }
  if (filter?.category) q = q.eq('category', filter.category)
  if (filter?.mood) q = q.eq('mood', filter.mood)
  if (filter?.authorId) q = q.eq('author_id', filter.authorId)
  if (filter?.fromDate) q = q.gte('diary_date', filter.fromDate)
  if (filter?.toDate) q = q.lte('diary_date', filter.toDate)
  if (filter?.search) q = q.or(`title.ilike.%${filter.search}%,content.ilike.%${filter.search}%`)
  if (filter?.tag) q = q.contains('tags', [filter.tag])

  const { data } = await q
  type Row = DiaryEntry & {
    author: { full_name: string } | null
    chicken: { tag_number: string } | null
    area: { name_vi: string } | null
    comments: Array<{ count: number }> | null
  }
  return ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    farm_id: r.farm_id,
    author_id: r.author_id,
    title: r.title,
    content: r.content,
    category: r.category,
    mood: r.mood,
    tags: r.tags,
    related_chicken_id: r.related_chicken_id,
    related_area_id: r.related_area_id,
    diary_date: r.diary_date,
    weather: r.weather,
    attachments: r.attachments,
    is_pinned: r.is_pinned,
    created_at: r.created_at,
    updated_at: r.updated_at,
    author_name: r.author?.full_name ?? null,
    chicken_tag: r.chicken?.tag_number ?? null,
    area_name: r.area?.name_vi ?? null,
    comment_count: r.comments?.[0]?.count ?? 0,
  }))
}

export async function createDiaryEntry(
  input: DiaryCreateInput,
  authorId: string
): Promise<DiaryEntry> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('diary_entries')
    .insert({ ...input, author_id: authorId } as never)
    .select('*')
    .single()
  if (error || !data) {
    throw new Error('Lỗi tạo nhật ký: ' + (error?.message ?? 'unknown'))
  }
  return data as DiaryEntry
}

export async function updateDiaryEntry(id: string, patch: DiaryUpdateInput): Promise<DiaryEntry> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('diary_entries')
    .update(patch as never)
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) {
    throw new Error('Lỗi cập nhật: ' + (error?.message ?? 'unknown'))
  }
  return data as DiaryEntry
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('diary_entries').delete().eq('id', id)
  if (error) throw new Error('Lỗi xoá: ' + error.message)
}

export type DiaryKpi = {
  total: number
  thisWeek: number
  thisMonth: number
  incidents: number
  pinned: number
  byCategory: Array<{ category: DiaryCategory; count: number }>
  recentTags: Array<{ tag: string; count: number }>
}

export async function getDiaryKpi(): Promise<DiaryKpi> {
  const all = await listDiaryEntries({ limit: 2000 })
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(today)
  monthAgo.setDate(monthAgo.getDate() - 30)
  const w = weekAgo.toISOString().slice(0, 10)
  const m = monthAgo.toISOString().slice(0, 10)

  const result: DiaryKpi = {
    total: all.length,
    thisWeek: 0,
    thisMonth: 0,
    incidents: 0,
    pinned: 0,
    byCategory: [],
    recentTags: [],
  }
  const catMap = new Map<DiaryCategory, number>()
  const tagMap = new Map<string, number>()
  for (const e of all) {
    if (e.diary_date >= w) result.thisWeek++
    if (e.diary_date >= m) result.thisMonth++
    if (e.category === 'su_co') result.incidents++
    if (e.is_pinned) result.pinned++
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + 1)
    for (const t of e.tags) {
      tagMap.set(t, (tagMap.get(t) ?? 0) + 1)
    }
  }
  result.byCategory = [...catMap.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
  result.recentTags = [...tagMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
  return result
}
