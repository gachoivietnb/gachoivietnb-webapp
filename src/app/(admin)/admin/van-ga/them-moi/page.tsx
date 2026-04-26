import { createClient } from '@/lib/supabase/server'
import { NewTrainingForm } from '@/components/admin/health/NewTrainingForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewTrainingPage() {
  const supabase = await createClient()
  const [chickensRes, breedsRes] = await Promise.all([
    supabase
      .from('chickens_with_details')
      .select(`
        id, chicken_code, name, age_months, weight_kg, gender, status,
        breed_code, breed_name, tag_number
      `)
      .eq('status', 'dang_nuoi')
      .order('chicken_code')
      .limit(500),
    supabase.from('breeds').select('code, name_vi').eq('is_active', true).order('display_order'),
  ])

  return (
    <div>
      <Link href="/admin/van-ga" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Link>

      <h1 className="text-2xl font-medium mb-2">Ghi buổi vần</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Chấm 3 điểm (0-10), điểm tổng tự tính = trung bình cộng.
      </p>

      <NewTrainingForm
        chickens={(chickensRes.data ?? []) as never}
        breeds={(breedsRes.data ?? []) as never}
      />
    </div>
  )
}
