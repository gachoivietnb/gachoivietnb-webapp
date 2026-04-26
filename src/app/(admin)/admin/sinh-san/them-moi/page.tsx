import { createClient } from '@/lib/supabase/server'
import { NewLitterForm } from '@/components/admin/breeding/NewLitterForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const revalidate = 0

export default async function NewLitterPage() {
  const supabase = await createClient()

  const [femalesRes, malesRes, cagesRes] = await Promise.all([
    supabase.from('available_females').select('*').order('chicken_code'),
    supabase.from('available_males').select('*').order('chicken_code'),
    supabase
      .from('cages')
      .select('id, full_code, status, cage_rows(code, areas(code, name_vi, type))')
      .order('full_code')
      .limit(500),
  ])

  const females = (femalesRes.data ?? []) as never[]
  const males = (malesRes.data ?? []) as never[]
  const cages = (cagesRes.data ?? []) as never[]

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link
            href="/admin/sinh-san"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Sinh sản
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            🥚 Ghép đôi mới
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            <strong className="text-pink-600 dark:text-pink-400">{females.length}</strong> mái sẵn sàng ·
            <strong className="text-blue-600 dark:text-blue-400 ml-1">{males.length}</strong> đực sẵn sàng ·
            Ngày nở dự kiến tự tính + 21 ngày
          </p>
        </div>
      </div>

      <NewLitterForm females={females} males={males} cages={cages} />
    </div>
  )
}
