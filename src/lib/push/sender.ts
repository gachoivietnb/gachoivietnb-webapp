import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@gachoivietnb.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

type PushPayload = {
  title: string
  body: string
  url?: string
  priority?: string
  tag?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!process.env.VAPID_PUBLIC_KEY) return { sent: 0, reason: 'VAPID not configured' }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId)
  if (!subs || subs.length === 0) return { sent: 0, reason: 'No subscriptions' }

  const rows = subs as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>
  let sent = 0

  await Promise.all(
    rows.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        )
        sent++
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        if (e.statusCode === 410 || e.statusCode === 404) {
          // Subscription expired, remove
          await supabase.from('push_subscriptions').delete().eq('id', s.id)
        }
      }
    })
  )

  return { sent }
}

export async function sendPushToAllAdmins(payload: PushPayload) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'chu_trai')
  if (!admins) return { sent: 0 }

  let total = 0
  for (const a of admins as Array<{ id: string }>) {
    const r = await sendPushToUser(a.id, payload)
    total += r.sent ?? 0
  }
  return { sent: total }
}
