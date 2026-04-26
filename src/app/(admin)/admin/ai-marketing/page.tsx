import { createClient } from '@/lib/supabase/server'
import { AiMarketingPanel } from '@/components/admin/ai/AiMarketingPanel'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/utils/format'

export const revalidate = 0

const TYPE_META: Record<
  string,
  { label: string; emoji: string; cls: string; bar: string }
> = {
  bio: {
    label: 'Bio gà',
    emoji: '📝',
    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    bar: 'from-blue-400 to-indigo-500',
  },
  zalo_post: {
    label: 'Bài Zalo',
    emoji: '💬',
    cls: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900',
    bar: 'from-cyan-400 to-blue-500',
  },
}

export default async function AiMarketingPage() {
  const supabase = await createClient()

  const [aiEnabledRes, geminiKeyRes, geminiModelRes, recentRes, countRes] = await Promise.all([
    supabase.from('system_settings').select('value').eq('key', 'ai_enabled').maybeSingle(),
    supabase.from('system_settings').select('value').eq('key', 'gemini_api_key').maybeSingle(),
    supabase.from('system_settings').select('value').eq('key', 'gemini_model').maybeSingle(),
    supabase
      .from('ai_generations')
      .select(
        'id, generation_type, model_used, output_text, created_at, related_entity_id, prompt_summary'
      )
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ])

  const aiEnabled = Boolean((aiEnabledRes.data as { value: { value?: boolean } } | null)?.value?.value)
  const keyConfigured = Boolean(
    (geminiKeyRes.data as { value: { value?: string } } | null)?.value?.value
  )
  const model =
    (geminiModelRes.data as { value: { value?: string } } | null)?.value?.value ??
    'gemini-2.0-flash'
  const recent = (recentRes.data ?? []) as Array<{
    id: string
    generation_type: string
    model_used: string
    output_text: string
    created_at: string
    prompt_summary: string | null
  }>

  const { data: mediaStats } = await supabase
    .from('chickens_media_summary')
    .select('media_count, approved_count')
    .in('status', ['dang_nuoi', 'dang_cach_ly'])

  const m = (mediaStats ?? []) as Array<{ media_count: number; approved_count: number }>
  const mTotal = m.length
  const mWithout = m.filter((x) => Number(x.media_count) === 0).length
  const mApproved = m.reduce((s, x) => s + Number(x.approved_count), 0)
  const mediaPct = mTotal > 0 ? ((mTotal - mWithout) / mTotal) * 100 : 0

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            ✨ AI Marketing
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tự động sinh nội dung Zalo / Facebook / Website cho gà bằng AI · Tích hợp media đã duyệt
          </p>
        </div>
      </div>

      {!keyConfigured || !aiEnabled ? (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                {!keyConfigured ? 'Chưa cấu hình AI' : 'AI đang TẮT'}
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                {!keyConfigured
                  ? 'Vào Cài đặt → Tích hợp AI để cấu hình kết nối AI (miễn phí ~1500 lần dùng/ngày, đủ cho 1 trại).'
                  : 'AI đã được cấu hình nhưng chưa bật. Vào Cài đặt → Tích hợp AI tick "Bật AI".'}
              </p>
              <Link
                href="/admin/cai-dat"
                className="inline-flex items-center gap-1 mt-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow hover:shadow-md"
              >
                ⚙️ Mở Cài đặt →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AI đang BẬT
          </span>
          <span className="text-xs text-emerald-800 dark:text-emerald-200">
            Model <code className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-[11px] font-mono">{model}</code>
          </span>
          <span className="text-xs text-emerald-800 dark:text-emerald-200 ml-auto">
            🤖 Đã generate <strong>{countRes.count ?? 0}</strong> lần / 30 ngày qua
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Kpi
          label="Generation 30N"
          value={String(countRes.count ?? 0)}
          icon="🤖"
          tone="from-violet-500 to-purple-500"
          pulse={(countRes.count ?? 0) > 0}
        />
        <Kpi
          label="Gà có media"
          value={`${mTotal - mWithout}/${mTotal}`}
          icon="📸"
          tone={
            mediaPct >= 80
              ? 'from-emerald-500 to-teal-500'
              : mediaPct >= 50
                ? 'from-blue-500 to-indigo-500'
                : 'from-amber-500 to-orange-500'
          }
          sub={`${mediaPct.toFixed(0)}% phủ sóng`}
        />
        <Kpi
          label="Media đã duyệt"
          value={String(mApproved)}
          icon="✓"
          tone="from-emerald-500 to-teal-500"
        />
        <Kpi
          label="Gà chưa có media"
          value={String(mWithout)}
          icon="⚠️"
          tone="from-rose-500 to-red-500"
          pulse={mWithout > 0}
          sub="Cần chụp/quay"
        />
      </div>

      <Link
        href="/admin/ai-marketing/media"
        className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition block mb-4"
      >
        <div className="h-1.5 bg-gradient-to-r from-pink-500 via-rose-500 to-violet-500" />
        <div className="p-4 flex items-center gap-3 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white text-2xl flex items-center justify-center shadow">
            📸
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition">
              Kho ảnh / video gà
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Upload · duyệt · watermark · gắn vào AI để sinh post · {mApproved} đã duyệt ·{' '}
              {mWithout} con chưa có
            </p>
          </div>
          <span className="text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform text-sm font-semibold">
            Mở →
          </span>
        </div>
      </Link>

      <AiMarketingPanel enabled={aiEnabled && keyConfigured} />

      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mt-4">
        <div className="h-1.5 bg-gradient-to-r from-slate-400 to-gray-500" />
        <div className="p-4">
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              📜 Lịch sử generation gần đây
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {recent.length} bản ghi mới nhất
            </span>
          </div>
          {recent.length === 0 ? (
            <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
              <div className="text-3xl mb-1">🤖</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Chưa có lần generation nào — dùng panel bên trên để tạo content đầu tiên.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recent.map((g) => {
                const meta = TYPE_META[g.generation_type] ?? {
                  label: g.generation_type,
                  emoji: '🔮',
                  cls: 'bg-gray-100 text-gray-600 border-gray-200',
                  bar: 'from-gray-400 to-gray-500',
                }
                return (
                  <li
                    key={g.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-300 transition"
                  >
                    <div className={`h-1 bg-gradient-to-r ${meta.bar}`} />
                    <div className="p-3">
                      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${meta.cls}`}>
                            {meta.emoji} {meta.label}
                          </span>
                          {g.prompt_summary && (
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[280px]">
                              · {g.prompt_summary}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-gray-400">
                            {g.model_used}
                          </span>
                        </div>
                        <span
                          className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap"
                          title={formatDateTime(g.created_at)}
                        >
                          {formatDate(g.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 leading-relaxed">
                        {g.output_text}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
  pulse,
  sub,
}: {
  label: string
  value: string
  icon: string
  tone: string
  pulse?: boolean
  sub?: string
}) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5">
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${tone} opacity-15 blur-xl ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
          {value}
        </div>
        {sub && (
          <div className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}
