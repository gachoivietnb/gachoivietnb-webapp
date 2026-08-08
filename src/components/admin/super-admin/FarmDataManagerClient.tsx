'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { FarmDataCounts, DemoGrant } from '@/lib/admin/farm-data-ops'

type Farm = { id: string; name: string; slug: string; tier: string; owner_id: string | null }
type Action = 'grant' | 'revoke' | 'reseed' | 'init_master' | 'wipe' | 'seed'

type Props = {
  masterFarm: Farm | null
  masterCounts: FarmDataCounts | null
  otherFarms: Farm[]
  countsByFarm: Record<string, FarmDataCounts>
  grantByFarm: Record<string, DemoGrant>
}

const EMPTY_COUNTS: FarmDataCounts = {
  chickens: 0, customers: 0, sales_orders: 0, expenses: 0, diary_entries: 0,
  cash_transactions: 0, news_articles: 0, assets: 0, alerts: 0,
}

export function FarmDataManagerClient({
  masterFarm, masterCounts, otherFarms, countsByFarm, grantByFarm,
}: Props) {
  const router = useRouter()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<{
    farm: Farm | null
    action: Action
    title: string
    message: string
    requireText?: string
  } | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  async function execute(farm: Farm | null, action: Action) {
    const key = `${action}-${farm?.id ?? 'master'}`
    setBusyKey(key)
    setToast(null)
    try {
      const endpoint =
        action === 'wipe' || action === 'seed'
          ? '/api/super-admin/farm-data'
          : '/api/super-admin/demo-grants'
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, farmId: farm?.id }),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string; source?: string }
      if (!r.ok || !j.ok) {
        setToast({ kind: 'err', msg: 'Lỗi: ' + (j.error ?? `HTTP ${r.status}`) })
      } else {
        const successMsg: Record<Action, string> = {
          grant: `✓ Đã cấp quyền demo (${j.source === 'cloned' ? 'clone từ master' : 'sinh random'})`,
          revoke: '✓ Đã thu hồi demo — dữ liệu trại đã xoá',
          reseed: `✓ Đã reseed demo (${j.source === 'cloned' ? 'clone từ master' : 'sinh random'})`,
          init_master: '✓ Đã khởi tạo master demo',
          wipe: '✓ Đã xoá toàn bộ dữ liệu trại',
          seed: '✓ Đã nạp dữ liệu demo (random)',
        }
        setToast({ kind: 'ok', msg: successMsg[action] })
        startTransition(() => router.refresh())
      }
    } catch (e) {
      setToast({ kind: 'err', msg: 'Lỗi kết nối: ' + (e instanceof Error ? e.message : 'unknown') })
    } finally {
      setBusyKey(null)
      setConfirm(null)
      setConfirmText('')
    }
  }

  const masterTotal = masterCounts
    ? masterCounts.chickens + masterCounts.customers + masterCounts.sales_orders +
      masterCounts.expenses + masterCounts.diary_entries + masterCounts.cash_transactions
    : 0
  const masterEmpty = masterTotal === 0

  return (
    <>
      {toast && (
        <div
          className={
            'mb-3 rounded-lg p-3 text-sm border ' +
            (toast.kind === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200')
          }
        >
          {toast.msg}
        </div>
      )}

      {/* Master farm panel */}
      {masterFarm && (
        <section className="bg-white dark:bg-gray-800 border-2 border-violet-300 dark:border-violet-800 rounded-xl overflow-hidden mb-5">
          <div className="h-2 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600" />
          <div className="p-4 md:p-5">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 mb-1">
                  👑 MASTER
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {masterFarm.name}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                  {masterFarm.slug} · {masterFarm.id}
                </p>
              </div>
              <span
                className={
                  'text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ' +
                  (masterEmpty
                    ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300')
                }
              >
                {masterEmpty ? 'CHƯA KHỞI TẠO' : 'CÓ DỮ LIỆU GỐC'}
              </span>
            </div>

            <CountsGrid c={masterCounts ?? EMPTY_COUNTS} />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  setConfirm({
                    farm: null,
                    action: 'init_master',
                    title: masterEmpty ? 'Khởi tạo master demo?' : 'Reset master demo?',
                    message: masterEmpty
                      ? 'Master farm sẽ được nạp dữ liệu demo mặc định (~80 gà, khách, đơn, chi phí, nhật ký, tài sản, tin tức).'
                      : 'Master sẽ bị XOÁ rồi nạp lại dữ liệu demo mặc định. Nội dung tuỳ chỉnh trên master sẽ mất.',
                    requireText: masterEmpty ? undefined : 'RESET',
                  })
                }
                disabled={busyKey !== null || isPending}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-3 py-2"
              >
                {masterEmpty ? '🌱 Khởi tạo Master' : '♻️ Reset Master'}
              </button>
              <a
                href="/admin"
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg px-3 py-2"
              >
                🛠 Sửa master qua UI
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Other farms */}
      <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Các trại đăng ký ({otherFarms.length})
      </h2>
      {otherFarms.length === 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          Chưa có trại nào ngoài master.
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {otherFarms.map((f) => {
          const c = countsByFarm[f.id] ?? EMPTY_COUNTS
          const total = c.chickens + c.customers + c.sales_orders + c.expenses + c.diary_entries + c.cash_transactions
          const isEmpty = total === 0
          const grant = grantByFarm[f.id]
          const grantState =
            !grant ? 'never_granted'
              : grant.is_active ? 'active'
              : 'revoked'
          const busy = busyKey?.endsWith('-' + f.id) || isPending

          return (
            <section
              key={f.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
            >
              <div className={
                'h-1.5 ' +
                (grantState === 'active' ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : grantState === 'revoked' ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500')
              } />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {f.name}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                      {f.slug} · gói {f.tier}
                    </p>
                  </div>
                  <GrantBadge state={grantState} />
                </div>

                <CountsGrid c={c} />

                {grant && (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 space-y-0.5">
                    {grant.granted_at && (
                      <div>Cấp: {new Date(grant.granted_at).toLocaleDateString('vi-VN')}</div>
                    )}
                    {grant.last_reseeded_at && grant.last_reseeded_at !== grant.granted_at && (
                      <div>Reseed gần nhất: {new Date(grant.last_reseeded_at).toLocaleDateString('vi-VN')}</div>
                    )}
                    {grant.revoked_at && (
                      <div className="text-rose-600 dark:text-rose-400">
                        Thu hồi: {new Date(grant.revoked_at).toLocaleDateString('vi-VN')}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {grantState !== 'active' && (
                    <button
                      onClick={() =>
                        setConfirm({
                          farm: f,
                          action: 'grant',
                          title: 'Cấp quyền demo?',
                          message: `Trại "${f.name}" sẽ được clone toàn bộ dữ liệu demo từ master farm. Nếu trại đã có data thì có thể bị trùng — nên Revoke trước nếu muốn sạch.`,
                        })
                      }
                      disabled={busy}
                      className="flex-1 min-w-[110px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg px-3 py-2"
                    >
                      🌱 Cấp quyền
                    </button>
                  )}
                  {grantState === 'active' && (
                    <>
                      <button
                        onClick={() =>
                          setConfirm({
                            farm: f,
                            action: 'reseed',
                            title: 'Reseed demo từ master?',
                            message: `Sẽ XOÁ demo hiện tại của "${f.name}" rồi clone lại từ master. Dùng khi master vừa cập nhật mà bạn muốn farm cũng có bản mới.`,
                            requireText: 'RESEED',
                          })
                        }
                        disabled={busy}
                        className="flex-1 min-w-[110px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg px-3 py-2"
                      >
                        ♻️ Reseed
                      </button>
                      <button
                        onClick={() =>
                          setConfirm({
                            farm: f,
                            action: 'revoke',
                            title: 'Thu hồi demo?',
                            message: `Toàn bộ data demo ở "${f.name}" sẽ bị XOÁ vĩnh viễn. Master farm vẫn nguyên — có thể cấp lại sau.`,
                            requireText: 'THU HỒI',
                          })
                        }
                        disabled={busy || isEmpty}
                        className="flex-1 min-w-[110px] bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg px-3 py-2"
                      >
                        🗑️ Thu hồi
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-5">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              {confirm.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {confirm.message}
            </p>

            {confirm.requireText && (
              <>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Gõ <code className="bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded text-rose-600 dark:text-rose-400">{confirm.requireText}</code> để xác nhận:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirm.requireText}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg text-sm"
                  autoFocus
                />
              </>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setConfirm(null)
                  setConfirmText('')
                }}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg px-3 py-2"
              >
                Huỷ
              </button>
              <button
                onClick={() => execute(confirm.farm, confirm.action)}
                disabled={
                  busyKey !== null ||
                  (confirm.requireText !== undefined && confirmText !== confirm.requireText)
                }
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-3 py-2"
              >
                {busyKey !== null ? '⏳ Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function GrantBadge({ state }: { state: 'never_granted' | 'active' | 'revoked' }) {
  const meta = {
    never_granted: { label: 'CHƯA CẤP', cls: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300' },
    active: { label: 'ĐANG DÙNG', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300' },
    revoked: { label: 'ĐÃ THU HỒI', cls: 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-900/40 dark:border-gray-700 dark:text-gray-400' },
  }[state]
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

function CountsGrid({ c }: { c: FarmDataCounts }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
      <CountTile label="Gà" value={c.chickens} icon="🐓" />
      <CountTile label="Khách" value={c.customers} icon="👥" />
      <CountTile label="Đơn" value={c.sales_orders} icon="📦" />
      <CountTile label="Chi phí" value={c.expenses} icon="💸" />
      <CountTile label="Nhật ký" value={c.diary_entries} icon="📔" />
      <CountTile label="Quỹ" value={c.cash_transactions} icon="💰" />
      <CountTile label="Tin" value={c.news_articles} icon="📰" />
      <CountTile label="Tài sản" value={c.assets} icon="🛠" />
      <CountTile label="Alerts" value={c.alerts} icon="🔔" />
    </div>
  )
}

function CountTile({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2">
      <div className="text-base">{icon}</div>
      <div className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-100">{value}</div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  )
}
