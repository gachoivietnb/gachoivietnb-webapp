import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireSuperAdmin } from '@/lib/multitenancy/super-admin'
import { listAllOrders } from '@/lib/payment/orders'
import { OrdersListClient } from '@/components/admin/super-admin/orders/OrdersListClient'

export const revalidate = 0

export default async function OrdersPage() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🚫</div>
        <p className="text-rose-800 dark:text-rose-300">Không có quyền truy cập.</p>
      </div>
    )
  }

  const orders = await listAllOrders({ limit: 200 })

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <Link
            href="/admin/super-admin"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Super Admin
          </Link>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            📥 Đơn hàng SaaS
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Đối chiếu app ngân hàng → click "Xác nhận đã nhận" để kích hoạt gói cho khách.
            Hệ thống sẽ tự động set tier + gia hạn subscription.
          </p>
        </div>
        <Link
          href="/admin/super-admin/payments"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline self-center"
        >
          ⚙️ Cài đặt thanh toán
        </Link>
      </div>

      <OrdersListClient initialOrders={orders} />
    </div>
  )
}
