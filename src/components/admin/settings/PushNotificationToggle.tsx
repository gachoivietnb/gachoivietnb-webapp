'use client'

import { useEffect, useState } from 'react'

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buffer
}

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true)
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((s) => setSubscribed(!!s))
      )
    }
  }, [])

  async function subscribe() {
    setLoading(true)
    setMsg(null)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMsg('Bạn chưa cho phép thông báo')
        setLoading(false)
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setMsg('VAPID key chưa cấu hình')
        setLoading(false)
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      setSubscribed(true)
      setMsg('✓ Đã bật thông báo trên thiết bị này')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Lỗi')
    }
    setLoading(false)
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
      setSubscribed(false)
      setMsg('Đã tắt thông báo')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Lỗi')
    }
    setLoading(false)
  }

  async function testPush() {
    setLoading(true)
    const res = await fetch('/api/push/test', { method: 'POST' })
    const json = await res.json()
    setMsg(`Đã gửi ${json.sent ?? 0} notification${json.reason ? ` (${json.reason})` : ''}`)
    setLoading(false)
  }

  if (!supported) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Trình duyệt không hỗ trợ thông báo</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {subscribed ? (
          <button
            onClick={unsubscribe}
            disabled={loading}
            className="bg-red-500 text-white rounded px-4 py-2 text-sm hover:bg-red-600 disabled:opacity-50"
          >
            🔕 Tắt thông báo
          </button>
        ) : (
          <button
            onClick={subscribe}
            disabled={loading}
            className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            🔔 Bật thông báo trên thiết bị này
          </button>
        )}
        {subscribed && (
          <button
            onClick={testPush}
            disabled={loading}
            className="border border-gray-300 dark:border-gray-600 rounded px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            🧪 Test push
          </button>
        )}
      </div>

      {msg && <div className="text-sm text-gray-600 dark:text-gray-400">{msg}</div>}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        💡 Cần HTTPS hoặc localhost. iOS cần "Add to Home Screen" trước. Khi có cảnh báo (dịch bệnh, kho hết...) sẽ push trực tiếp.
      </p>
    </div>
  )
}
