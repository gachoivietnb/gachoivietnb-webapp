import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChickenStatusBadge } from '@/components/admin/chickens/ChickenStatusBadge'
import { PedigreeTree } from '@/components/admin/pedigree/PedigreeTree'
import { MediaUploader } from '@/components/admin/media/MediaUploader'
import { MediaGallery } from '@/components/admin/media/MediaGallery'
import { ChickenAchievementSection } from '@/components/admin/thi-dau/ChickenAchievementSection'
import { formatDate, formatVnd, formatAge } from '@/lib/utils/format'
import { ArrowLeft } from 'lucide-react'

type ChickenDetail = {
  id: string
  chicken_code: string
  name: string | null
  breed_name: string | null
  breed_code: string | null
  breed_tier: string | null
  gender: string
  birth_date: string | null
  source: string
  status: string
  age_months: number | null
  weight_kg: number | null
  color: string | null
  tag_number: string | null
  cage_full_code: string | null
  area_code: string | null
  cost_purchase: number | null
  listed_price: number | null
  is_for_sale: boolean
  description: string | null
  main_photo_url: string | null
  notes: string | null
  parent_male_code: string | null
  parent_female_code: string | null
  parent_male_id: string | null
  parent_female_id: string | null
  created_at: string
}

export default async function ChickenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('chickens_with_details')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!data) notFound()
  const c = data as unknown as ChickenDetail

  const { data: vax } = await supabase
    .from('vaccinations')
    .select('id, scheduled_date, actual_date, status, vaccines(name_vi, code)')
    .eq('chicken_id', id)
    .order('scheduled_date')

  const { data: media } = await supabase
    .from('chicken_media')
    .select('*')
    .eq('chicken_id', id)
    .order('display_order')

  return (
    <div>
      <Link
        href="/admin/ho-so-ga"
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </Link>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="md:w-56 flex-shrink-0">
          {c.main_photo_url ? (
            <img
              src={c.main_photo_url}
              alt={c.chicken_code}
              className="w-full aspect-square object-cover rounded-lg border border-gray-200 dark:border-gray-700"
            />
          ) : (
            <div className="w-full aspect-square rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-7xl">
              🐓
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-medium">{c.name || c.chicken_code}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Mã: {c.chicken_code}
                {c.tag_number ? ` · Thẻ #${c.tag_number}` : ''}
              </p>
            </div>
            <ChickenStatusBadge status={c.status} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 text-sm">
            <Info label="Giống" value={c.breed_name} />
            <Info label="Giới tính" value={formatGender(c.gender)} />
            <Info label="Tuổi" value={c.birth_date ? formatAge(c.birth_date) : '—'} />
            <Info label="Cân nặng" value={c.weight_kg ? `${c.weight_kg} kg` : '—'} />
            <Info label="Màu" value={c.color} />
            <Info label="Chuồng" value={c.cage_full_code} />
            <Info label="Nguồn" value={c.source === 'mua' ? 'Mua' : 'Nở tại trại'} />
            <Info label="Giá mua" value={c.cost_purchase ? formatVnd(c.cost_purchase) : '—'} />
            <Info label="Ngày tạo" value={formatDate(c.created_at)} />
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            {c.is_for_sale ? (
              <span className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                🏷️ Đang bán · {formatVnd(c.listed_price)}
              </span>
            ) : null}
            <Link
              href={`/admin/ho-so-ga/${c.id}/sua`}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              ✏️ Sửa hồ sơ
            </Link>
          </div>
        </div>
      </div>

      <Section title="🏆 Thành tích thi đấu">
        <ChickenAchievementSection chickenId={c.id} />
      </Section>

      <Section title="Gia phả">
        <PedigreeTree chickenId={c.id} initialDepth={3} />
      </Section>

      <Section title="Tiêm phòng">
        {vax && vax.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {(vax as Array<{
              id: string
              scheduled_date: string
              actual_date: string | null
              status: string
              vaccines: { name_vi?: string } | null
            }>).map((v) => (
              <li key={v.id} className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span>{v.vaccines?.name_vi ?? 'Vaccine'}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {v.status === 'da_tiem'
                    ? `✅ ${formatDate(v.actual_date)}`
                    : `⏳ lên lịch ${formatDate(v.scheduled_date)}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Chưa có lịch tiêm (cần ngày sinh để auto-lên lịch).</p>
        )}
      </Section>

      <Section title={`📸 Hình ảnh & Video ${media && media.length > 0 ? `(${media.length})` : ''}`}>
        <MediaGallery media={(media ?? []) as never} />
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <MediaUploader chickenId={c.id} chickenCode={c.chicken_code} />
        </div>
      </Section>

      {c.description && (
        <Section title="Mô tả">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{c.description}</p>
        </Section>
      )}

      {c.notes && (
        <Section title="Ghi chú">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{c.notes}</p>
        </Section>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="font-medium">{value ?? '—'}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h2>
      {children}
    </section>
  )
}

function ParentCard({
  label,
  code,
  id,
}: {
  label: string
  code: string | null
  id: string | null
}) {
  if (!code || !id) {
    return (
      <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded p-3 text-center text-sm text-gray-400 dark:text-gray-500">
        {label}: chưa có dữ liệu
      </div>
    )
  }
  return (
    <Link
      href={`/admin/ho-so-ga/${id}`}
      className="border border-gray-200 dark:border-gray-700 rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="font-medium">{code}</div>
    </Link>
  )
}

function formatGender(g: string) {
  if (g === 'trong') return 'Trống'
  if (g === 'mai') return 'Mái'
  return 'Chưa xác định'
}
