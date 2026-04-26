import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

console.log('URL:', url)
console.log('Key:', key.substring(0, 30) + '...')

const supabase = createClient(url, key)

console.log('\n=== Test 1: list qr_tags (head=true, count exact) ===')
const r1 = await supabase.from('qr_tags').select('*', { count: 'exact', head: true })
console.log('count:', r1.count, 'error:', r1.error)

console.log('\n=== Test 2: find tag 0001 ===')
const r2 = await supabase.from('qr_tags').select('*').eq('tag_number', '0001').maybeSingle()
console.log('data:', r2.data, '\nerror:', r2.error)

console.log('\n=== Test 3: list 3 breeds ===')
const r3 = await supabase.from('breeds').select('code, name_vi').order('display_order').limit(3)
console.log('data:', r3.data, '\nerror:', r3.error)
