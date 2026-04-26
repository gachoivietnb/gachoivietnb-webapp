#!/usr/bin/env node
/**
 * Reset password cho tài khoản super-admin để test local.
 *
 * Cách chạy:
 *   cd E:/GaChoiVietNB/WebApp
 *   node scripts/create-super-admin.mjs
 *
 * Script tận dụng user admin@gachoivietnb.com đã tồn tại sẵn trong DB
 * (role=chu_trai), chỉ reset password — tránh chạy auth.admin.createUser
 * (trigger handle_new_user đang lỗi trên DB local).
 *
 * Nếu user EMAIL không tồn tại, script sẽ thử tạo mới (có thể thất bại
 * nếu trigger đang lỗi → khi đó cần fix migration trước).
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadDotEnv(file) {
  try {
    const raw = readFileSync(file, 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // ignore
  }
}
loadDotEnv(resolve(__dirname, '..', '.env.local'))

// ============ CONFIG ============
const EMAIL = 'admin@gachoivietnb.com'
const PASSWORD = 'SuperAdmin@2026'
const FULL_NAME = 'Super Admin (Hậu)'
// ================================

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log('🔐 Connecting to Supabase:', url)

const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
if (listErr) {
  console.error('❌ Không list được users:', listErr.message)
  process.exit(1)
}

const existing = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())

let userId

if (existing) {
  console.log('ℹ️  User đã tồn tại:', existing.id)
  console.log('🔄 Reset password & confirm email...')
  const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: FULL_NAME },
  })
  if (updErr) {
    console.error('❌ Lỗi update user:', updErr.message)
    process.exit(1)
  }
  userId = existing.id
} else {
  console.log('➕ User chưa có — thử tạo mới...')
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: FULL_NAME },
  })
  if (createErr || !created?.user) {
    console.error('❌ Lỗi tạo user:', createErr?.message)
    console.error('   → Có thể trigger handle_new_user đang lỗi.')
    console.error('   → Hãy apply migration 20260901000016_update_handle_new_user.sql trước.')
    process.exit(1)
  }
  userId = created.user.id
}

// Đảm bảo profile có role chu_trai (tài khoản admin@gachoivietnb.com đã có sẵn,
// nhưng vẫn upsert để chắc chắn role đúng)
console.log('👤 Đảm bảo profile.role = chu_trai...')

const profilePayload = {
  id: userId,
  full_name: FULL_NAME,
  role: 'chu_trai',
  is_active: true,
}

let { error: profileErr } = await admin
  .from('profiles')
  .update(profilePayload)
  .eq('id', userId)

if (profileErr) {
  console.error('⚠️  Lỗi update profile:', profileErr.message)
  console.log('   (bỏ qua — user vẫn login được, chỉ là role có thể chưa chuẩn)')
}

console.log('')
console.log('═══════════════════════════════════════════')
console.log('✅ TÀI KHOẢN SUPER ADMIN ĐÃ SẴN SÀNG')
console.log('═══════════════════════════════════════════')
console.log('  Email:     ', EMAIL)
console.log('  Password:  ', PASSWORD)
console.log('  Role:      chu_trai')
console.log('  User ID:   ', userId)
console.log('')
console.log('📋 BƯỚC TIẾP THEO:')
console.log('')
console.log('1. Mở .env.local và thêm/cập nhật dòng:')
console.log('   SUPER_ADMIN_EMAILS=' + EMAIL)
console.log('')
console.log('2. Restart dev server (Ctrl+C rồi `npm run dev`)')
console.log('')
console.log('3. Login tại: http://localhost:3000/auth/login')
console.log('')
console.log('4. Vào sidebar → 👑 SaaS Owner → ✏️ Landing /phan-mem')
console.log('═══════════════════════════════════════════')
