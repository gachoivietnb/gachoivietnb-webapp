import { createClient } from '@/lib/supabase/server'
import { ReviewForm } from '@/components/public/ReviewForm'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Đánh giá đơn hàng | Gà Chọi Việt NB' }

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('customer_reviews')
    .select('*, customer:customers(name), sales_order:sales_orders(order_code)')
    .eq('review_token', token)
    .maybeSingle()

  if (!data) notFound()
  const r = data as {
    reviewed_at: string | null
    token_expires_at: string
    rating: number | null
    comment: string | null
    customer: { name: string } | null
    sales_order: { order_code: string } | null
  }

  if (r.reviewed_at) {
    return (
      <div className="max-w-md mx-auto p-4 md:p-8 text-center">
        <div className="text-5xl mb-3">✅</div>
        <h1 className="text-xl font-medium">Đã gửi đánh giá</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Cảm ơn bạn!</p>
        {r.rating && (
          <div className="mt-4 text-3xl">{'⭐'.repeat(r.rating)}</div>
        )}
      </div>
    )
  }

  if (new Date(r.token_expires_at) < new Date()) {
    return (
      <div className="max-w-md mx-auto p-4 md:p-8 text-center">
        <div className="text-5xl mb-3">⏰</div>
        <h1 className="text-xl font-medium">Link đã hết hạn</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Vui lòng liên hệ trang trại để được gửi link mới.</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-medium mb-2">Đánh giá đơn hàng</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Cảm ơn <strong>{r.customer?.name ?? 'quý khách'}</strong> đã mua hàng (đơn{' '}
        <strong>{r.sales_order?.order_code}</strong>). Đánh giá của bạn giúp trang trại cải thiện dịch vụ.
      </p>

      <ReviewForm token={token} />
    </div>
  )
}
