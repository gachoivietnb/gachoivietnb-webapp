import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { NewsEditor } from '@/components/admin/news/NewsEditor'

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('news_articles').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()
  return <NewsEditor mode="edit" article={data as never} />
}
