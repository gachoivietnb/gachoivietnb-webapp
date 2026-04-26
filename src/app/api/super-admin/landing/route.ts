import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, createAdminClient } from '@/lib/multitenancy/super-admin'
import {
  PricingArraySchema,
  TestimonialsArraySchema,
  FaqsArraySchema,
  DEFAULT_PRICING,
  DEFAULT_TESTIMONIALS,
  DEFAULT_FAQS,
} from '@/lib/landing/content'

const PatchSchema = z.discriminatedUnion('key', [
  z.object({ key: z.literal('pricing'), value: PricingArraySchema }),
  z.object({ key: z.literal('testimonials'), value: TestimonialsArraySchema }),
  z.object({ key: z.literal('faqs'), value: FaqsArraySchema }),
])

export async function GET() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data } = await admin.from('landing_settings').select('key, value, updated_at')
  const rows = (data ?? []) as Array<{ key: string; value: unknown; updated_at: string }>

  const map = new Map(rows.map((r) => [r.key, r]))

  return NextResponse.json({
    data: {
      pricing: {
        value: map.get('pricing')?.value ?? DEFAULT_PRICING,
        updated_at: map.get('pricing')?.updated_at ?? null,
        is_default: !map.has('pricing'),
      },
      testimonials: {
        value: map.get('testimonials')?.value ?? DEFAULT_TESTIMONIALS,
        updated_at: map.get('testimonials')?.updated_at ?? null,
        is_default: !map.has('testimonials'),
      },
      faqs: {
        value: map.get('faqs')?.value ?? DEFAULT_FAQS,
        updated_at: map.get('faqs')?.updated_at ?? null,
        is_default: !map.has('faqs'),
      },
    },
  })
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('landing_settings')
    .upsert(
      {
        key: parsed.data.key,
        value: parsed.data.value,
        updated_by: auth.user.id,
      } as never,
      { onConflict: 'key' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(request.url)
  const key = url.searchParams.get('key')
  if (!key || !['pricing', 'testimonials', 'faqs'].includes(key)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('landing_settings').delete().eq('key', key)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, key, message: 'Đã xoá override → trang sẽ hiển thị defaults' })
}
