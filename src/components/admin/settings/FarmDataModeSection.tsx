'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  initialMode: 'demo' | 'real'
  switchedAt: string | null
}

export function FarmDataModeSection({ initialMode, switchedAt }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState(initialMode)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  function showToast(kind: 'ok' | 'err', msg: string) {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 6000)
  }

  async function switchToReal() {
    setBusy(true)
    try {
      const r = await fetch('/api/admin/farm-data-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'XOA-DEMO' }),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string; message?: string }
      if (!r.ok || !j.ok) {
        showToast('err', '❌ ' + (j.message ?? j.error ?? `HTTP ${r.status}`))
        return
      }
      setMode('real')
      setShowConfirm(false)
      setConfirmText('')
      showToast('ok', '✅ Đã chuyển sang chế độ DỮ LIỆU THẬT — bắt đầu khai báo dữ liệu trại của bạn!')
      startTransition(() => router.refresh())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={
            'rounded-lg p-3 text-sm border ' +
            (toast.kind === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200')
          }
        >
          {toast.msg}
        </div>
      )}

      {/* Current mode card */}
      <div
        className={
          'relative overflow-hidden rounded-2xl border p-4 md:p-5 ' +
          (mode === 'demo'
            ? 'bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-900'
            : 'bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-900')
        }
      >
        <div className="flex items-start gap-3">
          <div className="text-4xl">{mode === 'demo' ? '🎓' : '✅'}</div>
          <div className="flex-1">
            <div
              className={
                'text-[10px] uppercase font-bold tracking-widest ' +
                (mode === 'demo' ? 'text-blue-700 dark:text-blue-300' : 'text-emerald-700 dark:text-emerald-300')
              }
            >
              {mode === 'demo' ? 'Đang dùng dữ liệu' : 'Trại đang dùng'}
            </div>
            <div
              className={
                'text-xl md:text-2xl font-extrabold mt-0.5 ' +
                (mode === 'demo' ? 'text-blue-900 dark:text-blue-100' : 'text-emerald-900 dark:text-emerald-100')
              }
            >
              {mode === 'demo' ? 'DỮ LIỆU DEMO' : 'DỮ LIỆU THẬT'}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5 leading-relaxed">
              {mode === 'demo' ? (
                <>
                  Bạn đang trải nghiệm phần mềm với <b>dữ liệu mẫu</b>: 80 con gà, khách hàng, đơn bán, nhật ký...
                  Mọi thao tác đều có sẵn để bạn khám phá tính năng. Khi đã quen → chuyển sang dữ liệu thật để bắt đầu nhập của trại bạn.
                </>
              ) : (
                <>
                  Trại đã chuyển sang <b>dữ liệu thật</b>. Mọi gà, khách hàng, đơn hàng bạn nhập từ giờ đều là dữ liệu thực của trại.
                  {switchedAt && (
                    <>
                      <br />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Chuyển vào lúc: {new Date(switchedAt).toLocaleString('vi-VN')}
                      </span>
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Action / status */}
      {mode === 'demo' ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 md:p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            🚀 Sẵn sàng cho dữ liệu thật?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
            Khi bạn đã quen với phần mềm và muốn bắt đầu quản lý trại thật:
          </p>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5 mb-4 list-disc pl-5">
            <li>Toàn bộ dữ liệu demo sẽ bị <b className="text-rose-600 dark:text-rose-400">xoá vĩnh viễn</b></li>
            <li>Cấu trúc khu/lồng + danh mục thuốc/cám/vaccine/khách hàng <b>được giữ</b> để dùng tiếp</li>
            <li>QR tags reset về trạng thái chưa gắn → bạn gắn lại cho gà thật của trại</li>
            <li className="text-rose-700 dark:text-rose-300 font-semibold">
              ⚠️ Thao tác này CHỈ ĐƯỢC LÀM 1 LẦN — không thể quay lại demo nữa
            </li>
          </ul>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-bold rounded-xl px-5 py-2.5 shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              ✨ Chuyển sang dữ liệu thật
            </button>
          ) : (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-4">
              <div className="text-sm font-bold text-rose-900 dark:text-rose-200 mb-2">
                ⚠️ Xác nhận xoá demo
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-300 mb-3">
                Tất cả 80 gà, khách, đơn bán, nhật ký, ảnh demo... sẽ bị xoá vĩnh viễn.
                Sau đó bạn không thể quay lại demo nữa. Hãy chắc chắn.
              </p>
              <label className="block text-xs font-semibold text-rose-900 dark:text-rose-200 mb-1.5">
                Gõ <code className="bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded font-mono text-rose-700 dark:text-rose-300">XOA-DEMO</code> để xác nhận:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="XOA-DEMO"
                autoFocus
                className="w-full px-3 py-2 border-2 border-rose-300 dark:border-rose-800 dark:bg-gray-900 rounded-lg text-sm font-mono"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setShowConfirm(false)
                    setConfirmText('')
                  }}
                  disabled={busy}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg px-3 py-2 disabled:opacity-50"
                >
                  Huỷ
                </button>
                <button
                  onClick={switchToReal}
                  disabled={busy || confirmText !== 'XOA-DEMO'}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg px-3 py-2"
                >
                  {busy ? '⏳ Đang xoá...' : '🗑️ Xoá demo & chuyển sang thật'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-xl shrink-0">🔒</span>
            <div className="text-sm text-emerald-900 dark:text-emerald-200">
              <b>Đã khoá chế độ dữ liệu.</b> Trại của bạn không thể quay lại demo. Mọi dữ liệu từ giờ là dữ liệu thật, được lưu vĩnh viễn.
              <br />
              <span className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                💡 Cần backup định kỳ? Vào tab "Sao lưu dữ liệu" để tải Excel toàn bộ.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
