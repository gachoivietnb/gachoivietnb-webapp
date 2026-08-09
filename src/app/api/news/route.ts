import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { slugifyVi } from '@/lib/utils/slugify'
import { revalidatePublicNews } from '@/lib/cache/revalidate-public'

async function requireChuTrai() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, supabase }
  const { data: p } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (p?.role !== 'chu_trai') return { error: 'Chỉ chủ trại', status: 403, supabase }
  return { supabase, user }
}

const ArticleSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  body_markdown: z.string().default(''),
  cover_image_url: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  category: z.enum(['tin-tuc', 'kinh-nghiem', 'su-kien', 'giong-ga', 'cham-soc']).default('tin-tuc'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  source_url: z.string().optional(),
  source_name: z.string().optional(),
  seo_title: z.string().max(200).optional(),
  seo_description: z.string().max(300).optional(),
})

export async function POST(request: Request) {
  const auth = await requireChuTrai()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = ArticleSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  let slug = parsed.data.slug || slugifyVi(parsed.data.title)
  // Kiểm tra unique, nếu trùng thì thêm -2, -3...
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`
    const { data: exists } = await auth.supabase
      .from('news_articles')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!exists) {
      slug = candidate
      break
    }
  }

  const { data, error } = await auth.supabase
    .from('news_articles')
    .insert({
      ...parsed.data,
      slug,
      cover_image_url: parsed.data.cover_image_url || null,
      author_id: auth.user.id,
    } as never)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePublicNews()
  return NextResponse.json({ data })
}
