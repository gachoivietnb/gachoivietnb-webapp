import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/utils/constants'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/ban`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/giong`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/thu-vien`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/tin-tuc`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/lien-he`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const [chickensRes, articlesRes] = await Promise.all([
    supabase
      .from('public_chickens')
      .select('tag_number, created_at')
      .eq('is_for_sale', true)
      .eq('status', 'dang_nuoi')
      .not('tag_number', 'is', null),
    supabase
      .from('news_articles')
      .select('slug, published_at, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1000),
  ])

  const chickenPages = ((chickensRes.data ?? []) as Array<{
    tag_number: string
    created_at: string
  }>).map((c) => ({
    url: `${SITE_URL}/ga/${c.tag_number}`,
    lastModified: new Date(c.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const articlePages = ((articlesRes.data ?? []) as Array<{
    slug: string
    published_at: string | null
    updated_at: string
  }>).map((a) => ({
    url: `${SITE_URL}/tin-tuc/${a.slug}`,
    lastModified: new Date(a.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...chickenPages, ...articlePages]
}
