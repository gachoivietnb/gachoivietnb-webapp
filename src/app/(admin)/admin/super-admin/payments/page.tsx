import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireSuperAdmin } from '@/lib/multitenancy/super-admin'
import { getPaymentSettings } from '@/lib/payment/settings'
import { PaymentSettingsClient } from '@/components/admin/super-admin/payments/PaymentSettingsClient'

export const revalidate = 0

export default async function PaymentSettingsPage() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-5 md:p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🚫</div>
        <p className="text-rose-800 dark:text-rose-300">Không có quyền truy cập.</p>
      </div>
    )
  }

  const settings = await getPaymentSettings()

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
            💳 Cài đặt thanh toán
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tài khoản nhận tiền của bạn (SaaS owner) — sẽ hiển thị cho khách trên trang thanh toán.
          </p>
        </div>
        <Link
          href="/admin/super-admin/orders"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline self-center"
        >
          Xem đơn hàng →
        </Link>
      </div>

      <PaymentSettingsClient initial={settings} />
    </div>
  )
}
