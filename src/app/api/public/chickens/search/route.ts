import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { publicError, rateLimitResponse } from '@/lib/security/errors'

function parseSmartQuery(query: string): {
  cleanText: string
  filters: Record<string, number | string[]>
} {
  const filters: Record<string, number | string[]> = {}
  let clean = query

  const sessionsMatch = query.match(/(\d+)\s*buổi\s*vần|vần\s*(\d+)\s*buổi/i)
  if (sessionsMatch) {
    filters.min_training_sessions = parseInt(sessionsMatch[1] ?? sessionsMatch[2])
    clean = clean.replace(sessionsMatch[0], '')
  }

  const generationsMatch = query.match(/(\d+)\s*đời\s*gia\s*phả|gia\s*phả\s*(\d+)\s*đời/i)
  if (generationsMatch) {
    filters.min_generations = parseInt(generationsMatch[1] ?? generationsMatch[2])
    clean = clean.replace(generationsMatch[0], '')
  }

  const breedKeywords: Record<string, string> = {
    asil: 'ASIL',
    'mã lai': 'MLAI',
    malai: 'MLAI',
    peru: 'PERU',
    nòi: 'NOI',
    noi: 'NOI',
    tre: 'TRE',
    'tân châu': 'TANC',
    tanchau: 'TANC',
    'lai f1': 'LAIF1',
  }
  const lowerQuery = clean.toLowerCase()
  for (const [keyword, code] of Object.entries(breedKeywords)) {
    if (lowerQuery.includes(keyword)) {
      filters.breed_codes = [code]
      clean = clean.replace(new RegExp(keyword, 'gi'), '')
      break
    }
  }

  return { cleanText: clean.trim(), filters }
}

export async function GET(request: Request) {
  const rl = rateLimit(request, { namespace: 'public-search', limit: 60, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').slice(0, 100)
  const breeds = searchParams.get('breeds')?.split(',') || null
  const ageMin = searchParams.get('age_min') ? parseInt(searchParams.get('age_min')!) : null
  const ageMax = searchParams.get('age_max') ? parseInt(searchParams.get('age_max')!) : null
  const priceMin = searchParams.get('price_min') ? parseFloat(searchParams.get('price_min')!) : null
  const priceMax = searchParams.get('price_max') ? parseFloat(searchParams.get('price_max')!) : null
  const minSessions = searchParams.get('min_sessions')
    ? parseInt(searchParams.get('min_sessions')!)
    : null
  const minGen = searchParams.get('min_generations')
    ? parseInt(searchParams.get('min_generations')!)
    : null
  const gender = searchParams.get('gender')
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  let smartFilters: Record<string, number | string[]> = {}
  let cleanText = q
  if (q && !breeds && !minSessions && !minGen) {
    const parsed = parseSmartQuery(q)
    smartFilters = parsed.filters
    cleanText = parsed.cleanText
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('search_public_chickens' as never, {
    p_text: cleanText || null,
    p_breed_codes: breeds ?? (smartFilters.breed_codes as string[] | undefined) ?? null,
    p_age_min_months: ageMin,
    p_age_max_months: ageMax,
    p_price_min: priceMin,
    p_price_max: priceMax,
    p_min_training_sessions:
      minSessions ?? (smartFilters.min_training_sessions as number | undefined) ?? null,
    p_min_generations:
      minGen ?? (smartFilters.min_generations as number | undefined) ?? null,
    p_gender: gender,
    p_offset: offset,
    p_limit: limit,
  } as never)

  if (error) return publicError(500, 'Lỗi tìm kiếm, vui lòng thử lại', error)
  return NextResponse.json({ data, parsed: { cleanText, smartFilters } })
}
