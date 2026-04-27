import { redirect } from 'next/navigation'
import { getCurrentUserPermissions } from '@/lib/rbac/guard'
import { SupplierForm } from '@/components/admin/suppliers/SupplierForm'

export const revalidate = 0

export default async function NewSupplierPage() {
  const ctx = await getCurrentUserPermissions()
  if (!ctx) redirect('/auth/login')
  if (!ctx.can('nha_cung_cap', 'write')) {
    return <div className="text-sm text-gray-500">Không có quyền.</div>
  }
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">🏭 Thêm nhà cung cấp mới</h1>
      <p className="text-sm text-gray-500 mb-4">Khai báo NCC với 7 phân loại + thông tin liên hệ + tài khoản NH + đánh giá</p>
      <SupplierForm editing={null} />
    </div>
  )
}
