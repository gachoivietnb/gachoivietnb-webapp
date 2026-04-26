'use client'

import { useEffect, useState } from 'react'
import { getQueueCount, processQueue } from '@/lib/offline/queue'

export function OnlineStatusBar() {
  const [online, setOnline] = useState(true)
  const [queueCount, setQueueCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    setOnline(navigator.onLine)
    refreshCount()

    const handleOnline = async () => {
      setOnline(true)
      setFlash('Đã kết nối lại — đang đồng bộ...')
      await sync()
    }
    const handleOffline = () => {
      setOnline(false)
      setFlash('Mất kết nối — đang lưu offline')
      window.setTimeout(() => setFlash(null), 3000)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const interval = window.setInterval(refreshCount, 10000)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.clearInterval(interval)
    }
  }, [])

  async function refreshCount() {
    try {
      setQueueCount(await getQueueCount())
    } catch {
      setQueueCount(0)
    }
  }

  async function sync() {
    if (syncing) return
    setSyncing(true)
    try {
      const res = await processQueue()
      setQueueCount(res.remaining)
      if (res.processed > 0) setFlash(`✓ Đã đồng bộ ${res.processed} yêu cầu`)
      else if (res.failed > 0) setFlash(`${res.failed} yêu cầu lỗi — sẽ thử lại`)
      else setFlash(null)
    } finally {
      setSyncing(false)
      window.setTimeout(() => setFlash(null), 3000)
    }
  }

  if (online && queueCount === 0 && !flash) return null

  const bg = !online
    ? 'bg-red-500 text-white'
    : queueCount > 0
      ? 'bg-amber-500 text-white'
      : 'bg-green-500 text-white'

  return (
    <div
      className={`fixed bottom-20 md:bottom-4 left-4 z-40 rounded-lg px-3 py-2 text-xs shadow-lg ${bg}`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-white dark:bg-gray-800 animate-pulse" />
        {!online && <span>⚠️ Offline</span>}
        {online && queueCount > 0 && (
          <span>
            🔄 {queueCount} yêu cầu chờ đồng bộ
            {!syncing && (
              <button onClick={sync} className="ml-2 underline">
                Thử lại
              </button>
            )}
          </span>
        )}
        {flash && <span>— {flash}</span>}
      </div>
    </div>
  )
}
