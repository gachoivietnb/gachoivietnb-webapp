import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PedigreeTree } from '@/components/admin/pedigree/PedigreeTree'

export default async function PedigreePage({
  params,
}: {
  params: Promise<{ chickenId: string }>
}) {
  const { chickenId } = await params
  const supabase = await createClient()

  const { data: chicken } = await supabase
    .from('chickens_with_details')
    .select('id, chicken_code, name, breed_name, tag_number')
    .eq('id', chickenId)
    .maybeSingle()

  if (!chicken) notFound()
  const c = chicken as {
    id: string
    chicken_code: string
    name: string | null
    breed_name: string | null
    tag_number: string | null
  }

  return (
    <div>
      <Link
        href={`/admin/ho-so-ga/${chickenId}`}
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại hồ sơ
      </Link>

      <h1 className="text-2xl font-medium">Gia phả — {c.name ?? c.chicken_code}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {c.breed_name}
        {c.tag_number ? ` · Thẻ #${c.tag_number}` : ''}
      </p>

      <PedigreeTree chickenId={chickenId} />
    </div>
  )
}
