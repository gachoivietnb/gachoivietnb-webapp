import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { getOrder } from '@/lib/payment/orders'
import { getPaymentSettings, publicPaymentInfo } from '@/lib/payment/settings'
import { PaymentClient } from '@/components/admin/payment/PaymentClient'

export const revalidate = 0

type Params = Promise<{ orderId: string }>

export default async function PaymentPage({ params }: { params: Params }) {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')

  const { orderId } = await params
  const order = await getOrder(orderId)
  if (!order) notFound()
  if (order.farm_id !== ctx.farm.id) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🚫</div>
        <p className="text-rose-800 dark:text-rose-300">Bạn không có quyền xem đơn này.</p>
      </div>
    )
  }

  const settings = await getPaymentSettings()
  const payment = publicPaymentInfo(settings)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5">
        <Link
          href="/admin/upgrade"
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại chọn gói
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          💳 Thanh toán đơn hàng
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Quét QR hoặc chuyển khoản theo thông tin bên dưới. Hệ thống tự động kiểm tra trạng thái.
        </p>
      </div>

      <PaymentClient initialOrder={order} payment={payment} />
    </div>
  )
}
