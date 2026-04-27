'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ResultBadge } from './CombatBadges'
import { TOURNAMENT_TYPE_META, RULES_META, RESULT_META, RESULT_METHOD_META, INJURY_META } from '@/lib/thi-dau/types'

type Match = {
  id: string
  match_code: string | null
  match_date: string
  match_time: string | null
  chicken_id: string
  chicken: { id: string; chicken_code: string; name: string | null; image_url: string | null; breeds: { name_vi: string } | { name_vi: string }[] | null } | null
  tournament: { id: string; name: string; type: string; venue: string | null; location: string | null } | null
  opponent_name: string
  opponent_owner: string | null
  opponent_breed: string | null
  opponent_origin: string | null
  opponent_weight_kg: number | null
  opponent_photo_url: string | null
  self_weight_kg: number | null
  rules: 'don' | 'cua'
  spurs_type: string
  weight_class: string | null
  rounds_planned: number | null
  is_ho_doc: boolean
  result: keyof typeof RESULT_META | null
  result_method: keyof typeof RESULT_METHOD_META | null
  result_round: number | null
  rounds_actual: number
  total_duration_minutes: number | null
  injury_self: keyof typeof INJURY_META
  injury_notes: string | null
  recovery_days: number | null
  prize_money: number
  betting_amount: number
  betting_won: number
  photo_urls: string[]
  video_url: string | null
  referee_name: string | null
  match_quality: number | null
  highlight_moments: string[]
  internal_notes: string | null
  public_notes: string | null
  is_public: boolean
  is_pinned: boolean
}

type Round = {
  id: string
  round_number: number
  duration_seconds: number | null
  self_strikes: number
  opp_strikes: number
  self_knockdowns: number
  opp_knockdowns: number
  self_blood_level: number
  opp_blood_level: number
  notable_strikes: string[]
  notes: string | null
}

const fmtVnd = (n: number) => Number(n || 0).toLocaleString('vi-VN')

export function MatchDetailClient({
  match: m,
  rounds,
  canWrite,
  canDelete,
}: {
  match: Match
  rounds: Round[]
  canWrite: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const chick = m.chicken
  const breed = chick?.breeds
    ? Array.isArray(chick.breeds) ? chick.breeds[0]?.name_vi : chick.breeds.name_vi
    : null
  const tour = m.tournament
  const tourMeta = tour ? TOURNAMENT_TYPE_META[tour.type as keyof typeof TOURNAMENT_TYPE_META] : null
  const rulesMeta = RULES_META[m.rules]
  const resultMeta = m.result ? RESULT_META[m.result] : null

  async function handleDelete() {
    if (!confirm('Xoá trận đấu này? Sao và tier của gà sẽ tự cập nhật.')) return
    setBusy(true)
    const res = await fetch(`/api/matches?id=${m.id}`, { method: 'DELETE' })
    if (!res.ok) {
      alert('Lỗi xoá')
      setBusy(false)
      return
    }
    router.push('/admin/thi-dau')
  }

  return (
    <div className="space-y-4">
      {/* Tournament banner */}
      {tour && tourMeta && (
        <div className={`rounded-xl p-3 bg-gradient-to-r ${
          tourMeta.tone === 'rose' ? 'from-rose-100 to-pink-100 dark:from-rose-950/40 dark:to-pink-950/40' :
          tourMeta.tone === 'amber' ? 'from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40' :
          tourMeta.tone === 'purple' ? 'from-purple-100 to-violet-100 dark:from-purple-950/40 dark:to-violet-950/40' :
          tourMeta.tone === 'blue' ? 'from-blue-100 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/40' :
          'from-gray-100 to-slate-100 dark:from-gray-800 dark:to-slate-800'
        } border border-amber-200 dark:border-amber-900 text-center`}>
          <div className="text-xl mb-0.5">{tourMeta.emoji} {tourMeta.label}</div>
          <Link href={`/admin/thi-dau/giai-dau/${tour.id}`} className="font-bold text-lg hover:underline">{tour.name}</Link>
          {(tour.venue || tour.location) && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              📍 {[tour.venue, tour.location].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      )}

      {/* Date + match code */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div>
          📅 {m.match_date.split('-').reverse().join('/')}
          {m.match_time && ` · 🕐 ${m.match_time.slice(0, 5)}`}
          {' · '}<span className="font-mono">{m.match_code}</span>
        </div>
        <div className="flex gap-2">
          {m.is_pinned && <span>📌 Ghim</span>}
          {!m.is_public && <span>🔒 Riêng tư</span>}
        </div>
      </div>

      {/* Fight card hero */}
      <div className="bg-gradient-to-br from-gray-900 via-red-950 to-gray-900 rounded-2xl p-6 text-white shadow-2xl">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
          {/* Self */}
          <div className="text-center">
            <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden border-4 border-blue-400 shadow-2xl bg-gray-800">
              {chick?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={chick.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🐓</div>
              )}
            </div>
            <Link
              href={`/admin/ho-so-ga/${chick?.id}`}
              className="block font-extrabold text-xl mt-2 hover:text-blue-300"
            >
              {chick?.name || chick?.chicken_code}
            </Link>
            <div className="text-xs text-gray-300">{chick?.chicken_code}</div>
            {breed && <div className="text-xs text-gray-400 mt-0.5">{breed}</div>}
            {m.self_weight_kg && (
              <div className="text-sm font-bold text-blue-300 mt-1">{m.self_weight_kg} kg</div>
            )}
          </div>

          {/* Center VS + result */}
          <div className="text-center px-2">
            <div className="text-4xl md:text-6xl font-black opacity-30">VS</div>
            <div className="text-xs text-gray-300 uppercase tracking-widest mt-1">
              {rulesMeta.emoji} {rulesMeta.label}
              {m.is_ho_doc && ' · ⚡ Hồ độc'}
            </div>
            {resultMeta && (
              <div className="mt-3">
                <ResultBadge result={m.result!} large />
                {m.result_method && (
                  <div className="text-[11px] text-gray-300 mt-1">
                    {RESULT_METHOD_META[m.result_method].emoji} {RESULT_METHOD_META[m.result_method].label}
                    {m.result_round && ` · Hồ ${m.result_round}`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Opponent */}
          <div className="text-center">
            <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden border-4 border-red-400 shadow-2xl bg-gray-800">
              {m.opponent_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.opponent_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🐔</div>
              )}
            </div>
            <div className="font-extrabold text-xl mt-2">{m.opponent_name}</div>
            {m.opponent_owner && (
              <div className="text-xs text-gray-300">{m.opponent_owner}</div>
            )}
            {m.opponent_breed && <div className="text-xs text-gray-400 mt-0.5">{m.opponent_breed}</div>}
            {m.opponent_origin && <div className="text-[10px] text-gray-500 mt-0.5">📍 {m.opponent_origin}</div>}
            {m.opponent_weight_kg && (
              <div className="text-sm font-bold text-red-300 mt-1">{m.opponent_weight_kg} kg</div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-sm">
          {m.rounds_actual > 0 && (
            <Stat icon="🔄" label="Tổng hồ" value={`${m.rounds_actual}/${m.rounds_planned ?? '?'}`} />
          )}
          {m.total_duration_minutes && (
            <Stat icon="⏱" label="Thời gian" value={`${m.total_duration_minutes}p`} />
          )}
          {m.match_quality && (
            <Stat icon="⭐" label="Chất lượng" value={'★'.repeat(m.match_quality)} />
          )}
          {m.injury_self && (
            <Stat
              icon={INJURY_META[m.injury_self].emoji}
              label="Thương tích"
              value={INJURY_META[m.injury_self].label}
            />
          )}
        </div>
      </div>

      {/* Highlights */}
      {m.highlight_moments && m.highlight_moments.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-4">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5">⚡ Highlight moments</h3>
          <ul className="space-y-1">
            {m.highlight_moments.map((h, i) => (
              <li key={i} className="text-sm text-gray-800 dark:text-gray-200">
                • {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Round-by-round */}
      {rounds.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5">🥊 Chi tiết từng hồ</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase text-gray-500 border-b">
                <tr>
                  <th className="text-left p-2">Hồ</th>
                  <th className="text-center p-2">Cú đá (mình)</th>
                  <th className="text-center p-2">Cú đá (đối)</th>
                  <th className="text-center p-2">Knockdown</th>
                  <th className="text-center p-2">Máu</th>
                  <th className="text-left p-2">Highlight</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="p-2 font-bold">Hồ {r.round_number}</td>
                    <td className="p-2 text-center">{r.self_strikes}</td>
                    <td className="p-2 text-center">{r.opp_strikes}</td>
                    <td className="p-2 text-center">
                      <span className="text-blue-600">{r.self_knockdowns}</span>
                      {' / '}
                      <span className="text-red-600">{r.opp_knockdowns}</span>
                    </td>
                    <td className="p-2 text-center">
                      {'🩸'.repeat(r.self_blood_level)}/{'🩸'.repeat(r.opp_blood_level)}
                    </td>
                    <td className="p-2 text-xs">{r.notable_strikes?.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Media */}
      {(m.photo_urls.length > 0 || m.video_url) && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5">📷 Hình ảnh & Video</h3>
          {m.video_url && (
            <a href={m.video_url} target="_blank" rel="noreferrer" className="block mb-2 text-sm text-blue-600 hover:underline">
              🎬 Xem video full trận →
            </a>
          )}
          {m.photo_urls.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {m.photo_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {m.public_notes && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3">
            <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">🌐 Ghi chú công khai</div>
            <p className="text-sm text-gray-800 dark:text-gray-200">{m.public_notes}</p>
          </div>
        )}
        {m.internal_notes && (
          <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">📝 Ghi chú nội bộ</div>
            <p className="text-sm text-gray-800 dark:text-gray-200">{m.internal_notes}</p>
          </div>
        )}
      </div>

      {/* Tài chính (riêng tư) */}
      {(m.prize_money > 0 || m.betting_amount > 0 || m.betting_won !== 0) && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3">
          <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">💰 Tài chính (chỉ nội bộ thấy)</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Money label="Tiền giải" value={m.prize_money} />
            <Money label="Đã cược" value={m.betting_amount} />
            <Money label="Thắng/Thua cược" value={m.betting_won} signed />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Link
          href="/admin/thi-dau"
          className="text-sm text-gray-600 hover:underline"
        >
          ← Về danh sách
        </Link>
        <div className="ml-auto flex gap-2">
          {canWrite && (
            <Link
              href={`/admin/thi-dau/them-tran?match=${m.id}`}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              ✏️ Sửa
            </Link>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="border border-red-200 text-red-600 rounded-lg px-3 py-1.5 text-sm hover:bg-red-50 disabled:opacity-50"
            >
              🗑 Xoá
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-lg p-2">
      <div className="text-lg">{icon}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  )
}

function Money({ label, value, signed }: { label: string; value: number; signed?: boolean }) {
  const sign = signed ? (value > 0 ? '+' : value < 0 ? '' : '') : ''
  const cls = signed ? (value > 0 ? 'text-emerald-700' : value < 0 ? 'text-red-700' : '') : 'text-amber-700'
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400 font-semibold">{label}</div>
      <div className={`font-bold tabular-nums ${cls}`}>{sign}{fmtVnd(Math.abs(value))}đ</div>
    </div>
  )
}
