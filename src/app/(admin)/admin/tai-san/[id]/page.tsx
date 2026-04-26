import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { getFarmContext } from '@/lib/multitenancy/farm-context'
import { getAsset } from '@/lib/assets/queries'
import { AssetDetailClient } from '@/components/admin/assets/AssetDetailClient'

export const revalidate = 0

type Params = Promise<{ id: string }>

export default async function AssetDetailPage({ params }: { params: Params }) {
  const ctx = await getFarmContext()
  if (!ctx) redirect('/auth/login')
  const { id } = await params
  const asset = await getAsset(id)
  if (!asset) notFound()

  return (
    <div className="space-y-3">
      <Link
        href="/admin/tai-san"
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Tài sản & CCDC
      </Link>

      <AssetDetailClient initialAsset={asset} />
    </div>
  )
}
