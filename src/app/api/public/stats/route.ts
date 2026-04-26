import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.from('public_farm_stats').select('*').maybeSingle()
  return NextResponse.json({ data })
}
