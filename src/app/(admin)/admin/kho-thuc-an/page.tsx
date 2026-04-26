import { createClient } from '@/lib/supabase/server'
import { FeedsManager } from '@/components/admin/health/FeedsManager'

export default async function KhoThucAnPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('feeds').select('*').eq('is_active', true).order('name_vi')

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          🌾 Kho thức ăn
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Theo dõi tồn kho thức ăn · Cảnh báo sắp hết · Lọc thông minh · Phân bổ giá trị
        </p>
      </div>
      <FeedsManager items={(data ?? []) as never} />
    </div>
  )
}
