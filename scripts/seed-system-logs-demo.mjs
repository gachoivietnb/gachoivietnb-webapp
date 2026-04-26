#!/usr/bin/env node
/**
 * Seed sample system_logs để Super Admin có gì xem ngay khi vào dashboard.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing env'); process.exit(1) }
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const minsAgo = (m) => new Date(Date.now() - m * 60 * 1000).toISOString()

const samples = [
  // ==== Recent (last 24h) ====
  {
    level: 'warn', category: 'security',
    message: 'Signup rate limit exceeded — possible abuse/DDoS',
    ip_address: '203.162.45.123', path: '/api/auth/farm-signup', http_status: 429,
    user_email: 'spammer123@mailinator.com',
    context: { reason: '5 đăng ký từ cùng IP trong 1 giờ', retryAfterSec: 3600 },
    created_at: minsAgo(15),
  },
  {
    level: 'warn', category: 'security',
    message: 'Honeypot triggered on signup — likely bot',
    ip_address: '185.220.101.42', path: '/api/auth/farm-signup',
    user_email: 'fakeuser@tempmail.com',
    context: { website_url: 'https://spam.com', botCount: 1 },
    created_at: minsAgo(45),
  },
  {
    level: 'error', category: 'auth',
    message: 'Auth user creation failed',
    ip_address: '113.161.45.78', path: '/api/auth/farm-signup', http_status: 400,
    user_email: 'duplicate@gmail.com',
    context: { supabase_error: 'A user with this email address has already been registered' },
    created_at: minsAgo(120),
  },
  {
    level: 'info', category: 'auth',
    message: 'Successful signup — new farm trial',
    ip_address: '14.241.220.45', path: '/api/auth/farm-signup', http_status: 200,
    user_email: 'trai-demo-1@gmail.com',
    context: { farm_slug: 'trai-demo-1', tier: 'trial' },
    created_at: minsAgo(180),
  },
  {
    level: 'error', category: 'ai',
    message: 'Gemini API call failed — quota exceeded',
    path: '/api/ai/marketing/generate', http_status: 429,
    context: { error: 'RESOURCE_EXHAUSTED: Quota exceeded for daily request', model: 'gemini-2.0-flash-exp' },
    created_at: minsAgo(240),
  },
  // ==== Older (1-3 days ago) ====
  {
    level: 'critical', category: 'db',
    message: 'Database connection pool exhausted',
    http_status: 500,
    context: { active_connections: 95, max_pool: 100, wait_time_ms: 3500 },
    created_at: minsAgo(60 * 36),
  },
  {
    level: 'error', category: 'push',
    message: 'Push notification send failed for 3 subscriptions',
    context: { reason: '410 Gone — endpoints expired', count: 3 },
    created_at: minsAgo(60 * 24),
  },
  {
    level: 'warn', category: 'storage',
    message: 'Upload rejected — file too large',
    ip_address: '171.231.95.20', path: '/api/diary/upload', http_status: 400,
    user_email: 'user-test@gmail.com',
    context: { size_mb: 8.2, max_mb: 5 },
    created_at: minsAgo(60 * 48),
  },
  {
    level: 'warn', category: 'security',
    message: '5 failed login attempts from same IP',
    ip_address: '45.146.165.92', path: '/auth/login',
    context: { failed_emails: ['admin@test.com', 'root@test.com', 'admin@admin.com'], attempts: 5 },
    created_at: minsAgo(60 * 60),
  },
  {
    level: 'error', category: 'api',
    message: 'Backup export timeout — table too large',
    path: '/api/admin/backup-all', http_status: 504,
    user_email: 'haunau486@gmail.com',
    context: { table: 'vaccinations', rows: 1920, duration_ms: 30000 },
    created_at: minsAgo(60 * 72),
  },
  {
    level: 'info', category: 'cron',
    message: 'Daily prune completed — 12 old logs removed',
    context: { deleted: 12, days_keep: 90 },
    created_at: minsAgo(60 * 24 * 5),
  },
  {
    level: 'warn', category: 'payment',
    message: 'Payment confirmation pending — auto-active failed',
    user_email: 'paying-customer@gmail.com',
    context: { order_id: 'PO-2026-0042', amount: 499000, days_pending: 2 },
    created_at: minsAgo(60 * 24 * 4),
  },
]

console.log(`🩺 Seeding ${samples.length} sample logs...`)
const { error } = await sb.from('system_logs').insert(samples)
if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
console.log('✓ Done')
