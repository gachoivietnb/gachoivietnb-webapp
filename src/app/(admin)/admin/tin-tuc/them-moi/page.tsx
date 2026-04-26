import { NewsEditor } from '@/components/admin/news/NewsEditor'
import { AiNewsStudio } from '@/components/admin/news/AiNewsStudio'

export default async function NewNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const sp = await searchParams
  if (sp.mode === 'ai') return <AiNewsStudio />
  return <NewsEditor mode="create" />
}
