import { createClient } from '@/lib/supabase/server'
import { BulkChickenForm } from '@/components/admin/chickens/BulkChickenForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function BulkChickenPage() {
  const supabase = await createClient()
  const { data: breeds } = await supabase
    .from('breeds')
    .select('id, code, name_vi')
    .eq('is_active', true)
    .order('display_order')

  return (
    <div>
      <Link
        href="/admin/ho-so-ga"
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </Link>

      <h1 className="text-2xl font-medium mb-2">Nhập hàng loạt</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Tạo nhiều con gà cùng lúc (tối đa 200/lần). Mã gà tự sinh.
      </p>

      <BulkChickenForm breeds={(breeds ?? []) as never} />
    </div>
  )
}
