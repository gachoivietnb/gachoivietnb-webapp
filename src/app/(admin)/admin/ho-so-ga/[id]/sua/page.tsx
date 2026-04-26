import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ChickenEditForm } from '@/components/admin/chickens/ChickenEditForm'

export default async function EditChickenPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: chicken } = await supabase
    .from('chickens')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!chicken) notFound()

  const [breedsRes, cagesRes] = await Promise.all([
    supabase.from('breeds').select('id, code, name_vi').eq('is_active', true).order('display_order'),
    supabase.from('cages').select('id, full_code, status').order('full_code').limit(500),
  ])

  return (
    <div>
      <Link
        href={`/admin/ho-so-ga/${id}`}
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại chi tiết
      </Link>

      <h1 className="text-2xl font-medium mb-4">Sửa hồ sơ gà</h1>

      <ChickenEditForm
        chicken={chicken as never}
        breeds={(breedsRes.data ?? []) as never}
        cages={(cagesRes.data ?? []) as never}
      />
    </div>
  )
}
