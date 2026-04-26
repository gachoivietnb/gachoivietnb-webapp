import { createClient } from '@/lib/supabase/server'
import { MediaHubClient } from '@/components/admin/marketing/MediaHubClient'

export const revalidate = 0

export default async function MediaHubPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; breed?: string; q?: string; gender?: string; sort?: string }>
}) {
  const sp = await searchParams
  const filter = sp.filter ?? 'all'
  const breed = sp.breed ?? ''
  const q = (sp.q ?? '').trim()
  const gender = sp.gender ?? ''
  const sort = sp.sort ?? 'recent'

  const supabase = await createClient()

  let query = supabase
    .from('chickens_media_summary')
    .select('*')
    .in('status', ['dang_nuoi', 'dang_cach_ly'])
    .limit(300)

  if (sort === 'code') query = query.order('chicken_code', { ascending: true })
  else if (sort === 'most_media') query = query.order('media_count', { ascending: false })
  else if (sort === 'least_media') query = query.order('media_count', { ascending: true })
  else query = query.order('last_uploaded_at', { ascending: false, nullsFirst: false }).order('chicken_code')

  if (filter === 'no_media') query = query.eq('media_count', 0)
  else if (filter === 'has_media') query = query.gt('media_count', 0)
  else if (filter === 'has_approved') query = query.gt('approved_count', 0)
  else if (filter === 'need_review') query = query.gt('media_count', 0).eq('approved_count', 0)
  if (breed) query = query.eq('breed_code', breed)
  if (gender) query = query.eq('gender', gender)

  if (q) {
    // Search trong chicken_code OR name (ilike case-insensitive, wildcard 2 bên)
    const esc = q.replace(/[%_]/g, '\\$&')
    query = query.or(`chicken_code.ilike.%${esc}%,name.ilike.%${esc}%`)
  }

  const { data } = await query

  const { data: stats } = await supabase
    .from('chickens_media_summary')
    .select('media_count, approved_count, published_count')
    .in('status', ['dang_nuoi', 'dang_cach_ly'])

  const rows = (stats ?? []) as Array<{
    media_count: number
    approved_count: number
    published_count: number
  }>

  const total = rows.length
  const withMedia = rows.filter((r) => Number(r.media_count) > 0).length
  const withoutMedia = total - withMedia
  const totalMedia = rows.reduce((s, r) => s + Number(r.media_count), 0)
  const totalApproved = rows.reduce((s, r) => s + Number(r.approved_count), 0)
  const totalPublished = rows.reduce((s, r) => s + Number(r.published_count), 0)

  const { data: breeds } = await supabase
    .from('breeds')
    .select('code, name_vi')
    .eq('is_active', true)
    .order('display_order')

  return (
    <MediaHubClient
      summary={(data ?? []) as never}
      breeds={(breeds ?? []) as never}
      filter={filter}
      breedFilter={breed}
      q={q}
      gender={gender}
      sort={sort}
      stats={{
        total,
        withMedia,
        withoutMedia,
        totalMedia,
        totalApproved,
        totalPublished,
      }}
    />
  )
}
