import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  requireSuperAdmin,
  createAdminClient,
} from '@/lib/multitenancy/super-admin'
import {
  DEFAULT_PRICING,
  DEFAULT_TESTIMONIALS,
  DEFAULT_FAQS,
  type PricingTier,
  type Testimonial,
  type Faq,
} from '@/lib/landing/content'
import { LandingEditorClient } from '@/components/admin/super-admin/landing/LandingEditorClient'

export const revalidate = 0

type RowMeta = {
  value: unknown
  updated_at: string | null
}

export default async function LandingEditorPage() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
        <div className="text-5xl mb-3">🚫</div>
        <p className="text-rose-800 dark:text-rose-300">Không có quyền truy cập.</p>
      </div>
    )
  }

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('landing_settings')
    .select('key, value, updated_at')
  const map = new Map<string, RowMeta>()
  for (const r of (rows ?? []) as Array<{
    key: string
    value: unknown
    updated_at: string
  }>) {
    map.set(r.key, { value: r.value, updated_at: r.updated_at })
  }

  const pricing = (map.get('pricing')?.value ?? DEFAULT_PRICING) as PricingTier[]
  const testimonials = (map.get('testimonials')?.value ?? DEFAULT_TESTIMONIALS) as Testimonial[]
  const faqs = (map.get('faqs')?.value ?? DEFAULT_FAQS) as Faq[]

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
            ✏️ Chỉnh sửa Landing /phan-mem
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            3 phần động: Pricing · Testimonials · FAQ. Phần khác (hero, features, pain points)
            vẫn ở code — đổi cần redeploy.
          </p>
        </div>
        <Link
          href="/phan-mem"
          target="_blank"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline self-center"
        >
          Xem trang public ↗
        </Link>
      </div>

      <LandingEditorClient
        initialPricing={pricing}
        initialTestimonials={testimonials}
        initialFaqs={faqs}
        meta={{
          pricing: {
            updated_at: map.get('pricing')?.updated_at ?? null,
            is_default: !map.has('pricing'),
          },
          testimonials: {
            updated_at: map.get('testimonials')?.updated_at ?? null,
            is_default: !map.has('testimonials'),
          },
          faqs: {
            updated_at: map.get('faqs')?.updated_at ?? null,
            is_default: !map.has('faqs'),
          },
        }}
      />
    </div>
  )
}
