'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LitterDeleteButton({
  litterId,
  graduatedCount,
}: {
  litterId: string
  graduatedCount: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const blocked = graduatedCount > 0

  async function del() {
    if (!window.confirm('Xóa lứa này?\n\nNhóm gà con (chick_group) của lứa cũng bị xóa. Không thể hoàn tác.')) return
    setBusy(true)
    const res = await fetch(`/api/breeding/litters/${litterId}`, { method: 'DELETE' })
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (!res.ok) {
      window.alert(j.error ?? `Lỗi xóa (HTTP ${res.status})`)
      return
    }
    router.push('/admin/sinh-san')
  }

  if (blocked) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
        🔒 Không xóa được lứa — đã có {graduatedCount} gà con tốt nghiệp thành hồ sơ gà.
      </div>
    )
  }

  return (
    <button
      onClick={del}
      disabled={busy}
      className="inline-flex items-center gap-1 text-sm rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 px-3 py-1.5 font-medium"
    >
      {busy ? '⏳ Đang xóa…' : '🗑️ Xóa lứa'}
    </button>
  )
}
