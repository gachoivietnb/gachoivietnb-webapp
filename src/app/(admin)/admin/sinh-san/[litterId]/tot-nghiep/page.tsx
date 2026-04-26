import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { GraduateForm } from '@/components/admin/breeding/GraduateForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function GraduatePage({
  params,
}: {
  params: Promise<{ litterId: string }>
}) {
  const { litterId } = await params
  const supabase = await createClient()

  const { data: litter } = await supabase
    .from('breeding_litters')
    .select('id, litter_code, status, hatched_count, male_ids, cage_id, female_id')
    .eq('id', litterId)
    .maybeSingle()

  if (!litter) notFound()
  const l = litter as { id: string; litter_code: string; status: string; hatched_count: number; male_ids: string[] }
  if (l.status !== 'da_no') {
    return (
      <div className="p-8 text-center text-gray-600 dark:text-gray-400">
        Lứa chưa nở. Quay lại{' '}
        <Link href={`/admin/sinh-san/${litterId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
          chi tiết lứa
        </Link>
      </div>
    )
  }

  const [breedsRes, tagsRes, malesRes, cagesRes] = await Promise.all([
    supabase.from('breeds').select('id, code, name_vi').eq('is_active', true).order('display_order'),
    supabase.from('qr_tags').select('id, tag_number').eq('status', 'chua_su_dung').order('tag_number').limit(100),
    l.male_ids?.length
      ? supabase.from('chickens').select('id, chicken_code, name').in('id', l.male_ids)
      : Promise.resolve({ data: [] }),
    supabase.from('cages').select('id, full_code').eq('status', 'trong').order('full_code').limit(200),
  ])

  return (
    <div>
      <Link
        href={`/admin/sinh-san/${litterId}`}
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại lứa {l.litter_code}
      </Link>

      <h1 className="text-2xl font-medium mb-2">Tốt nghiệp gà con</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Lứa {l.litter_code} đã nở {l.hatched_count} con. Chuyển từng con thành hồ sơ riêng có mã.
      </p>

      <GraduateForm
        litterId={litterId}
        hatchedCount={l.hatched_count}
        breeds={(breedsRes.data ?? []) as never}
        availableTags={(tagsRes.data ?? []) as never}
        males={(malesRes.data ?? []) as never}
        availableCages={(cagesRes.data ?? []) as never}
      />
    </div>
  )
}
