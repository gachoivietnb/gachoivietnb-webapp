'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function SupplierActions({ supplierId, canWrite }: { supplierId: string; canWrite: boolean }) {
  const router = useRouter()

  return (
    <div className="flex gap-2 flex-wrap">
      <Link
        href={`/admin/mua-vao/them-moi?supplier=${supplierId}`}
        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold shadow"
      >
        + Phiếu mua
      </Link>
      {canWrite && (
        <Link
          href={`/admin/nha-cung-cap/${supplierId}?edit=1`}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          ✏️ Sửa
        </Link>
      )}
    </div>
  )
}
