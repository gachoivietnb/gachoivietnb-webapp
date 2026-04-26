'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { FarmDataCounts } from '@/lib/admin/farm-data-ops'

type Farm = { id: string; name: string; slug: string; tier: string; owner_id: string | null }
type Props = {
  farms: Farm[]
  initialCounts: Record<string, FarmDataCounts>
}

export function FarmDataManagerClient({ farms, initialCounts }: Props) {
  const router = useRouter()
  const [counts] = useState(initialCounts)
  const [busyFarm, setBusyFarm] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<{
    farm: Farm
    action: 'wipe' | 'seed'
  } | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  async function execute(farm: Farm, action: 'wipe' | 'seed') {
    setBusyFarm(farm.id)
    setToast(null)
    try {
      const r = await fetch('/api/super-admin/farm-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, farmId: farm.id }),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        setToast({ kind: 'err', msg: 'Lỗi: ' + (j.error ?? `HTTP ${r.status}`) })
      } else {
        setToast({
          kind: 'ok',
          msg: action === 'wipe' ? '✓ Đã xoá toàn bộ dữ liệu trại' : '✓ Đã nạp dữ liệu demo',
        })
        startTransition(() => router.refresh())
      }
    } catch (e) {
      setToast({ kind: 'err', msg: 'Lỗi kết nối: ' + (e instanceof Error ? e.message : 'unknown') })
    } finally {
      setBusyFarm(null)
      setConfirm(null)
      setConfirmText('')
    }
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {farms.map((f) => {
          const c = counts[f.id] ?? {
            chickens: 0, customers: 0, sales_orders: 0, expenses: 0,
            diary_entries: 0, cash_transactions: 0, news_articles: 0, assets: 0, alerts: 0,
          }
          const total = c.chickens + c.customers + c.sales_orders + c.expenses + c.diary_entries +
            c.cash_transactions + c.news_articles + c.assets
          const isEmpty = total === 0
          const busy = busyFarm === f.id || isPending

          return (
            <section
              key={f.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
            >
              <div className="h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {f.name}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">{f.slug}</p>
                  </div>
                  <span
                    className={
                      'text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ' +
                      (isEmpty
                        ? 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-900/40 dark:border-gray-700 dark:text-gray-400'
                        : 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300')
                    }
                  >
                    {isEmpty ? 'TRỐNG' : 'CÓ DỮ LIỆU'}
                  </span>
                </div>

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

                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirm({ farm: f, action: 'seed' })}
                    disabled={busy}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 transition"
                  >
                    🌱 Nạp dữ liệu demo
                  </button>
                  <button
                    onClick={() => setConfirm({ farm: f, action: 'wipe' })}
                    disabled={busy || isEmpty}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 transition"
                  >
                    🗑️ Xoá dữ liệu
                  </button>
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
            <div className="text-3xl mb-2">{confirm.action === 'wipe' ? '⚠️' : '🌱'}</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
              {confirm.action === 'wipe' ? 'Xoá toàn bộ dữ liệu?' : 'Nạp dữ liệu demo?'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Trại: <b>{confirm.farm.name}</b>
            </p>

            {confirm.action === 'wipe' ? (
              <>
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg p-3 mb-3 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                  <p className="font-semibold">Sẽ XOÁ vĩnh viễn:</p>
                  <p>Tất cả gà, khách, đơn bán/mua, chi phí, nhật ký, tài sản, lịch tiêm, kho thuốc/cám, sales orders...</p>
                  <p className="font-semibold mt-2">Sẽ GIỮ:</p>
                  <p>Cấu trúc khu/lồng, vaccines, expense_categories, profiles user, cash_accounts (về số dư 0).</p>
                </div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Gõ <code className="bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded text-rose-600 dark:text-rose-400">XOÁ</code> để xác nhận:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="XOÁ"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg text-sm"
                  autoFocus
                />
              </>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Sẽ thêm dữ liệu demo (~80 gà, khách, đơn bán, chi phí, nhật ký, tài sản, tin tức) vào trại nếu chưa có.
                Bảng đã có data sẽ được giữ nguyên.
              </p>
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
                  busyFarm === confirm.farm.id ||
                  (confirm.action === 'wipe' && confirmText !== 'XOÁ')
                }
                className={
                  'flex-1 text-white text-sm font-semibold rounded-lg px-3 py-2 disabled:opacity-50 ' +
                  (confirm.action === 'wipe' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700')
                }
              >
                {busyFarm === confirm.farm.id
                  ? '⏳ Đang xử lý...'
                  : confirm.action === 'wipe'
                    ? '🗑️ Xoá ngay'
                    : '🌱 Nạp ngay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
