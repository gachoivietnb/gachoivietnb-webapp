import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/sender'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await sendPushToUser(user.id, {
    title: '🐓 Test notification',
    body: 'Nếu bạn thấy thông báo này, push đang hoạt động!',
    url: '/admin',
  })

  return NextResponse.json(result)
}
