import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { VanGaClient } from '@/components/admin/health/VanGaClient'

export default async function VanGaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  const [rankingRes, sessionsRes, breedsRes, monthCountRes, chickensRes] = await Promise.all([
    supabase.from('top_training_performers').select('*').limit(100),
    supabase
      .from('training_sessions')
      .select(`
        id,
        session_date,
        duration_minutes,
        score_strength,
        score_appearance,
        score_aggression,
        result,
        opponent_name,
        notes,
        chickens:chickens!training_sessions_chicken_id_fkey (
          id, chicken_code, name, breed_code, status,
          breeds (name_vi, code)
        )
      `)
      .order('session_date', { ascending: false })
      .limit(500),
    supabase.from('breeds').select('code, name_vi').eq('is_active', true).order('display_order'),
    supabase
      .from('training_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('session_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]),
    supabase.from('chickens').select('id, breed_code'),
  ])

  // Enrich ranking with breed_code (view missing this column)
  const breedById = new Map<string, string | null>(
    ((chickensRes.data ?? []) as Array<{ id: string; breed_code: string | null }>).map(
      (c) => [c.id, c.breed_code]
    )
  )
  const rankingWithBreed = ((rankingRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    ...r,
    breed_code: breedById.get(r.chicken_id as string) ?? null,
  }))

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5 gap-3">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🥊 Vần gà
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Bảng xếp hạng chiến kê · Lọc thông minh · Theo dõi tiến độ luyện tập
          </p>
        </div>
        <Link
          href="/admin/van-ga/them-moi"
          className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Ghi buổi vần
        </Link>
      </div>

      <VanGaClient
        initialTab={(sp.tab as 'ranking' | 'sessions') ?? 'ranking'}
        initialQuery={sp.q ?? ''}
        ranking={rankingWithBreed as never}
        sessions={(sessionsRes.data ?? []) as never}
        breeds={(breedsRes.data ?? []) as never}
      />
    </div>
  )
}
