import { createClient } from '@/lib/supabase/server'
import { NewOrderForm } from '@/components/admin/sales/NewOrderForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const revalidate = 0

export default async function NewOrderPage() {
  const supabase = await createClient()
  const [chickensRes, customersRes] = await Promise.all([
    supabase
      .from('chickens_with_details')
      .select('id, chicken_code, name, breed_name, listed_price, age_months')
      .eq('status', 'dang_nuoi')
      .eq('is_reserved', false)
      .order('chicken_code')
      .limit(500),
    supabase
      .from('customers')
      .select('id, name, phone')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const chickens = (chickensRes.data ?? []) as never[]

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link
            href="/admin/ban-ra"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Bán ra
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            💵 Đơn hàng mới
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            <strong className="text-emerald-600 dark:text-emerald-400">{chickens.length}</strong>{' '}
            con đang chờ bán · Hỏi mua = không giữ chỗ · Đặt cọc = lock con cho khách
          </p>
        </div>
      </div>

      <NewOrderForm
        chickens={chickens}
        customers={(customersRes.data ?? []) as never}
      />
    </div>
  )
}
