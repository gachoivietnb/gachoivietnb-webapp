# PROMPT CHO CLAUDE CODE — PHẦN 4: SỨC KHỎE + VẦN GÀ
## Dự án: Gà Chọi Việt Ninh Bình (gachoivietnb.com)

---

## 🎯 NHIỆM VỤ CỦA BẠN (Claude Code)

Build **5 sub-modules** quản lý hàng ngày của trang trại + hồ sơ thi đấu:

1. **Lịch tiêm phòng** — workflow đầy đủ + bulk tiêm + nhắc lịch tự động
2. **Theo dõi bệnh** — ghi ca bệnh + phát hiện dịch tự động
3. **Kho thuốc** — nhập/xuất + cảnh báo tồn kho + hết hạn
4. **Kho thức ăn** — nhập theo lô + tính chi phí/con/ngày
5. **Vần gà** — ghi kết quả + chấm điểm + hồ sơ thi đấu

**Sau khi hoàn thành Phần 4:**
- Hệ thống nhắc tiêm 12 con hôm nay → bulk xác nhận trong 1 click
- Đăng ký nhận push notification → sáng 7h nhận thông báo trên điện thoại
- Báo gà chết → nếu vượt ngưỡng → cảnh báo dịch tự động xuất hiện
- Nhập 50kg cám → kho tự cập nhật, cảnh báo khi còn dưới ngưỡng
- Ghi 5 buổi vần cho 1 con → biểu đồ điểm tích lũy hiển thị

---

## 📋 NHẮC LẠI QUY TẮC

1. **Tiếng Anh code, tiếng Việt UI**
2. **Mobile-first** — đặc biệt quan trọng vì nhân viên dùng điện thoại ngoài chuồng
3. **TypeScript strict**
4. **KHÔNG sửa schema cũ**
5. **Realtime updates qua Supabase Realtime** cho trang cảnh báo

---

## 📦 BƯỚC 1: CÀI THÊM PACKAGES

```bash
# Web Push
npm install web-push
npm install --save-dev @types/web-push

# Email service (chọn 1: Resend đơn giản nhất, có free tier 3000 emails/tháng)
npm install resend

# Đã có từ Phần 3: recharts cho biểu đồ
```

---

## 🗄️ BƯỚC 2: MIGRATION BỔ SUNG

Tạo file `supabase/migrations/20260401000001_phase4_health_training.sql`:

```sql
-- =====================================================
-- PHASE 4: HEALTH & TRAINING
-- =====================================================

-- =====================================================
-- 1. PUSH SUBSCRIPTIONS (cho web push)
-- =====================================================

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subs" ON push_subscriptions FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- 2. AUTO-UPDATE STOCK khi có transaction
-- =====================================================

-- Medicine
CREATE OR REPLACE FUNCTION update_medicine_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE medicines SET current_stock = current_stock +
      CASE WHEN NEW.transaction_type = 'nhap' THEN NEW.quantity ELSE -NEW.quantity END
    WHERE id = NEW.medicine_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE medicines SET current_stock = current_stock -
      CASE WHEN OLD.transaction_type = 'nhap' THEN OLD.quantity ELSE -OLD.quantity END
    WHERE id = OLD.medicine_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_medicine_stock
  AFTER INSERT OR DELETE ON medicine_transactions
  FOR EACH ROW EXECUTE FUNCTION update_medicine_stock();

-- Feed
CREATE OR REPLACE FUNCTION update_feed_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feeds SET current_stock = current_stock +
      CASE WHEN NEW.transaction_type = 'nhap' THEN NEW.quantity ELSE -NEW.quantity END
    WHERE id = NEW.feed_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feeds SET current_stock = current_stock -
      CASE WHEN OLD.transaction_type = 'nhap' THEN OLD.quantity ELSE -OLD.quantity END
    WHERE id = OLD.feed_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feed_stock
  AFTER INSERT OR DELETE ON feed_transactions
  FOR EACH ROW EXECUTE FUNCTION update_feed_stock();

-- =====================================================
-- 3. STOCK ALERTS (tự tạo alert khi tồn kho thấp)
-- =====================================================

CREATE OR REPLACE FUNCTION check_medicine_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Cảnh báo khi xuống dưới ngưỡng
  IF NEW.current_stock <= NEW.min_stock_alert AND NEW.current_stock > 0
     AND (OLD.current_stock IS NULL OR OLD.current_stock > NEW.min_stock_alert) THEN
    INSERT INTO alerts (alert_type, priority, title, message, related_entity_type, related_entity_id)
    VALUES (
      'kho_thuoc_thap',
      'cao',
      'Tồn kho thuốc thấp: ' || NEW.name_vi,
      'Còn ' || NEW.current_stock || ' ' || NEW.unit || ' (ngưỡng ' || NEW.min_stock_alert || ')',
      'medicines',
      NEW.id
    );
  END IF;

  -- Cảnh báo khi hết
  IF NEW.current_stock <= 0 AND (OLD.current_stock IS NULL OR OLD.current_stock > 0) THEN
    INSERT INTO alerts (alert_type, priority, title, message, related_entity_type, related_entity_id)
    VALUES (
      'kho_thuoc_het',
      'khan_cap',
      'HẾT thuốc: ' || NEW.name_vi,
      'Cần nhập thêm ngay',
      'medicines',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_medicine_stock_alert
  AFTER UPDATE OF current_stock ON medicines
  FOR EACH ROW EXECUTE FUNCTION check_medicine_stock_alert();

-- Tương tự cho feeds
CREATE OR REPLACE FUNCTION check_feed_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stock <= NEW.min_stock_alert AND NEW.current_stock > 0
     AND (OLD.current_stock IS NULL OR OLD.current_stock > NEW.min_stock_alert) THEN
    INSERT INTO alerts (alert_type, priority, title, message, related_entity_type, related_entity_id)
    VALUES (
      'kho_thuc_an_thap',
      'cao',
      'Tồn kho thức ăn thấp: ' || NEW.name_vi,
      'Còn ' || NEW.current_stock || ' ' || NEW.unit,
      'feeds',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_feed_stock_alert
  AFTER UPDATE OF current_stock ON feeds
  FOR EACH ROW EXECUTE FUNCTION check_feed_stock_alert();

-- =====================================================
-- 4. OUTBREAK DETECTION (phát hiện dịch tự động)
-- =====================================================

-- Khi 1 con gà chết, kiểm tra tỷ lệ chết khu đó
CREATE OR REPLACE FUNCTION check_outbreak_on_death()
RETURNS TRIGGER AS $$
DECLARE
  v_area_id UUID;
  v_area_name TEXT;
  v_total_in_area INT;
  v_deaths_today INT;
  v_baseline_avg NUMERIC;
  v_threshold_pct NUMERIC := 2.0;  -- 2% tổng đàn
  v_threshold_multi NUMERIC := 3.0;  -- 3× baseline
BEGIN
  -- Chỉ trigger khi status chuyển sang 'chet'
  IF NEW.status != 'chet' OR (OLD.status IS NOT NULL AND OLD.status = 'chet') THEN
    RETURN NEW;
  END IF;

  -- Lấy area của gà
  SELECT a.id, a.name_vi INTO v_area_id, v_area_name
  FROM cages cg
  JOIN cage_rows cr ON cr.id = cg.row_id
  JOIN areas a ON a.id = cr.area_id
  WHERE cg.id = NEW.cage_id;

  IF v_area_id IS NULL THEN RETURN NEW; END IF;

  -- Đếm tổng gà đang nuôi trong khu
  SELECT COUNT(*) INTO v_total_in_area
  FROM chickens c
  JOIN cages cg ON cg.id = c.cage_id
  JOIN cage_rows cr ON cr.id = cg.row_id
  WHERE cr.area_id = v_area_id AND c.status IN ('dang_nuoi', 'dang_cach_ly');

  -- Đếm chết hôm nay trong khu
  SELECT COUNT(*) INTO v_deaths_today
  FROM chickens c
  JOIN cages cg ON cg.id = c.cage_id
  JOIN cage_rows cr ON cr.id = cg.row_id
  WHERE cr.area_id = v_area_id
    AND c.status = 'chet'
    AND c.status_date = CURRENT_DATE;

  -- Baseline: trung bình chết/ngày trong 30 ngày trước (loại hôm nay)
  SELECT COALESCE(AVG(daily_count), 0) INTO v_baseline_avg
  FROM (
    SELECT COUNT(*) AS daily_count
    FROM chickens c
    JOIN cages cg ON cg.id = c.cage_id
    JOIN cage_rows cr ON cr.id = cg.row_id
    WHERE cr.area_id = v_area_id
      AND c.status = 'chet'
      AND c.status_date >= CURRENT_DATE - INTERVAL '30 days'
      AND c.status_date < CURRENT_DATE
    GROUP BY c.status_date
  ) sub;

  -- Trigger alert nếu vượt ngưỡng
  IF v_total_in_area > 0 AND (
       (v_deaths_today::NUMERIC / v_total_in_area) * 100 >= v_threshold_pct
       OR (v_baseline_avg > 0 AND v_deaths_today >= v_baseline_avg * v_threshold_multi)
     )
     -- Không tạo alert trùng trong cùng ngày cùng khu
     AND NOT EXISTS (
       SELECT 1 FROM alerts
       WHERE alert_type = 'dich_benh'
         AND related_entity_id = v_area_id
         AND created_at::DATE = CURRENT_DATE
     )
  THEN
    INSERT INTO alerts (
      alert_type, priority, title, message,
      related_entity_type, related_entity_id
    ) VALUES (
      'dich_benh',
      'khan_cap',
      '⚠️ NGHI DỊCH BỆNH tại ' || v_area_name,
      'Hôm nay có ' || v_deaths_today || ' gà chết / tổng ' || v_total_in_area
        || ' (baseline 30 ngày: ' || ROUND(v_baseline_avg, 1) || '/ngày). Cần kiểm tra ngay.',
      'areas',
      v_area_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_outbreak
  AFTER UPDATE OF status ON chickens
  FOR EACH ROW EXECUTE FUNCTION check_outbreak_on_death();

-- =====================================================
-- 5. VACCINATION VIEWS (để query nhanh)
-- =====================================================

CREATE OR REPLACE VIEW vaccinations_due AS
SELECT
  v.id AS vaccination_id,
  v.scheduled_date,
  v.status,
  c.id AS chicken_id,
  c.chicken_code,
  c.name AS chicken_name,
  c.cage_id,
  cg.full_code AS cage_code,
  a.name_vi AS area_name,
  vc.id AS vaccine_id,
  vc.name_vi AS vaccine_name,
  vc.is_required,
  CURRENT_DATE - v.scheduled_date AS days_overdue
FROM vaccinations v
JOIN chickens c ON c.id = v.chicken_id
JOIN vaccines vc ON vc.id = v.vaccine_id
LEFT JOIN cages cg ON cg.id = c.cage_id
LEFT JOIN cage_rows cr ON cr.id = cg.row_id
LEFT JOIN areas a ON a.id = cr.area_id
WHERE v.status = 'cho_tiem'
  AND c.status IN ('dang_nuoi', 'dang_cach_ly')
ORDER BY v.scheduled_date;

-- =====================================================
-- 6. FEED COST PER CHICKEN PER DAY
-- =====================================================

CREATE OR REPLACE FUNCTION feed_cost_per_chicken_per_day(
  p_month_start DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE
) RETURNS TABLE (
  area_id UUID,
  area_name TEXT,
  total_cost DECIMAL,
  total_chickens INT,
  total_days INT,
  cost_per_chicken_per_day DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH month_costs AS (
    SELECT
      ft.related_area_id,
      SUM(ft.cost) AS total_cost
    FROM feed_transactions ft
    WHERE ft.transaction_type = 'xuat'
      AND ft.transaction_date >= p_month_start
      AND ft.transaction_date < p_month_start + INTERVAL '1 month'
    GROUP BY ft.related_area_id
  ),
  area_chickens AS (
    SELECT
      a.id AS area_id,
      COUNT(DISTINCT c.id) AS chicken_count
    FROM areas a
    LEFT JOIN cage_rows cr ON cr.area_id = a.id
    LEFT JOIN cages cg ON cg.row_id = cr.id
    LEFT JOIN chickens c ON c.cage_id = cg.id AND c.status IN ('dang_nuoi', 'dang_cach_ly')
    GROUP BY a.id
  )
  SELECT
    a.id,
    a.name_vi,
    COALESCE(mc.total_cost, 0)::DECIMAL,
    COALESCE(ac.chicken_count, 0)::INT,
    EXTRACT(DAY FROM (LEAST(CURRENT_DATE, (p_month_start + INTERVAL '1 month' - INTERVAL '1 day'))::DATE - p_month_start + 1))::INT,
    CASE
      WHEN ac.chicken_count > 0 AND mc.total_cost > 0
      THEN (mc.total_cost / ac.chicken_count / EXTRACT(DAY FROM (LEAST(CURRENT_DATE, (p_month_start + INTERVAL '1 month' - INTERVAL '1 day'))::DATE - p_month_start + 1)))::DECIMAL
      ELSE 0
    END
  FROM areas a
  LEFT JOIN month_costs mc ON mc.related_area_id = a.id
  LEFT JOIN area_chickens ac ON ac.area_id = a.id
  WHERE a.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRAINING STATS VIEW
-- =====================================================

CREATE OR REPLACE VIEW chicken_training_stats AS
SELECT
  c.id AS chicken_id,
  c.chicken_code,
  c.name,
  COUNT(ts.id) AS total_sessions,
  COUNT(*) FILTER (WHERE ts.result = 'thang') AS wins,
  COUNT(*) FILTER (WHERE ts.result = 'thua') AS losses,
  COUNT(*) FILTER (WHERE ts.result = 'hoa') AS draws,
  ROUND(AVG(ts.score_strength)::NUMERIC, 1) AS avg_strength,
  ROUND(AVG(ts.score_appearance)::NUMERIC, 1) AS avg_appearance,
  ROUND(AVG(ts.score_aggression)::NUMERIC, 1) AS avg_aggression,
  ROUND(AVG(ts.score_total)::NUMERIC, 1) AS avg_total,
  MAX(ts.session_date) AS last_session_date
FROM chickens c
LEFT JOIN training_sessions ts ON ts.chicken_id = c.id
GROUP BY c.id, c.chicken_code, c.name;

-- Top performers view
CREATE OR REPLACE VIEW top_training_performers AS
SELECT *
FROM chicken_training_stats
WHERE total_sessions >= 3
ORDER BY avg_total DESC
LIMIT 50;
```

---

## 🔑 BƯỚC 3: SETUP WEB PUSH

### Generate VAPID keys (làm 1 lần)

```bash
npx web-push generate-vapid-keys
```

Lưu vào `.env.local`:
```bash
VAPID_PUBLIC_KEY=BG...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@gachoivietnb.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BG...   # public key cho client

# Email (Resend)
RESEND_API_KEY=re_xxx
RESEND_FROM=alerts@gachoivietnb.com   # cần verify domain ở Resend
ADMIN_EMAIL=admin@gachoivietnb.com    # email chủ trại nhận alert

# Cron secret (để bảo vệ endpoint cron)
CRON_SECRET=random-string-generate-yourself
```

### Service Worker `public/sw.js`

```javascript
self.addEventListener('push', function (event) {
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: data.url || '/admin' },
    tag: data.tag,
    requireInteraction: data.priority === 'khan_cap',
  }
  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

### Component subscribe

`src/components/admin/health/PushNotificationToggle.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true)
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
      )
    }
  }, [])

  async function subscribe() {
    const reg = await navigator.serviceWorker.register('/sw.js')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    })

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    })
    setSubscribed(true)
  }

  async function unsubscribe() {
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
  }

  if (!supported) return <p className="text-sm text-gray-500">Trình duyệt không hỗ trợ thông báo</p>

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      className={`px-4 py-2 rounded ${subscribed ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}
    >
      {subscribed ? 'Tắt thông báo' : 'Bật thông báo trên thiết bị này'}
    </button>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}
```

### `src/app/api/push/subscribe/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await request.json()

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  }, { onConflict: 'endpoint' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const { endpoint } = await request.json()
  const supabase = await createClient()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  return NextResponse.json({ success: true })
}
```

### `src/lib/push/sender.ts`

```typescript
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; priority?: string; tag?: string }
) {
  const supabase = await createClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  await Promise.all(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      ).catch(err => {
        if (err.statusCode === 410) {
          // Subscription expired, remove
          supabase.from('push_subscriptions').delete().eq('id', s.id)
        }
      })
    )
  )
}

export async function sendPushToAllAdmins(payload: { title: string; body: string; url?: string }) {
  const supabase = await createClient()
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'chu_trai')

  if (!admins) return
  await Promise.all(admins.map(a => sendPushToUser(a.id, payload)))
}
```

---

## 🔌 BƯỚC 4: API ROUTES — TIÊM PHÒNG

### `src/app/api/vaccinations/due/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const range = searchParams.get('range') || 'today'  // today / week / overdue / all

  const supabase = await createClient()
  let query = supabase.from('vaccinations_due').select('*')

  const today = new Date().toISOString().split('T')[0]
  if (range === 'today') {
    query = query.eq('scheduled_date', today)
  } else if (range === 'week') {
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() + 7)
    query = query.lte('scheduled_date', weekEnd.toISOString().split('T')[0])
  } else if (range === 'overdue') {
    query = query.lt('scheduled_date', today)
  }

  const { data, error } = await query.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
```

### `src/app/api/vaccinations/confirm/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  vaccination_ids: z.array(z.string().uuid()).min(1).max(200),
  actual_date: z.string().optional(),
  batch_number: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { vaccination_ids, actual_date, batch_number, notes } = parsed.data

  const { data, error } = await supabase
    .from('vaccinations')
    .update({
      status: 'da_tiem',
      actual_date: actual_date || new Date().toISOString().split('T')[0],
      performed_by: user.id,
      batch_number,
      notes,
    })
    .in('id', vaccination_ids)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count: data?.length || 0 })
}
```

### `src/app/api/vaccinations/skip/route.ts`

Tương tự confirm nhưng set status = 'bo_qua' với lý do.

---

## 🔌 BƯỚC 5: API ROUTES — KHO THUỐC + KHO THỨC ĂN

### `src/app/api/medicines/route.ts`

GET (list with filters) + POST (create new medicine)

### `src/app/api/medicines/[id]/route.ts`

GET single + PATCH update + DELETE

### `src/app/api/medicines/[id]/transactions/route.ts`

GET history + POST new transaction:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  transaction_type: z.enum(['nhap', 'xuat']),
  quantity: z.number().positive(),
  cost: z.number().optional(),
  related_chicken_id: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { data, error } = await supabase
    .from('medicine_transactions')
    .insert({ ...parsed.data, medicine_id: id, performed_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

### `src/app/api/feeds/...` — TƯƠNG TỰ

Tạo các API routes tương tự cho feeds.

### `src/app/api/feeds/cost-per-chicken/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')  // YYYY-MM-01 or null
  const monthStart = month || new Date().toISOString().split('-').slice(0, 2).join('-') + '-01'

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('feed_cost_per_chicken_per_day', {
    p_month_start: monthStart,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

---

## 🔌 BƯỚC 6: API ROUTES — BỆNH + VẦN GÀ

### `src/app/api/diseases/route.ts`

POST tạo ca bệnh mới (chicken_id, symptoms, diagnosis, treatment).

### `src/app/api/diseases/[id]/route.ts`

PATCH cập nhật outcome khi gà khỏi/chết.

### `src/app/api/training-sessions/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  chicken_id: z.string().uuid(),
  session_date: z.string(),
  opponent_chicken_id: z.string().uuid().optional(),
  opponent_name: z.string().optional(),
  duration_minutes: z.number().int().optional(),
  score_strength: z.number().min(0).max(10),
  score_appearance: z.number().min(0).max(10),
  score_aggression: z.number().min(0).max(10),
  result: z.enum(['thang', 'thua', 'hoa']).optional(),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  // Tự sinh session_number = current count + 1 cho chicken
  const { count } = await supabase
    .from('training_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('chicken_id', parsed.data.chicken_id)

  const { data, error } = await supabase
    .from('training_sessions')
    .insert({
      ...parsed.data,
      session_number: (count || 0) + 1,
      performed_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger AI cập nhật bio (Phần 7 sẽ implement)
  // Hiện tại chỉ note: bio cần re-generate
  await supabase
    .from('chickens')
    .update({ ai_description_updated_at: null })
    .eq('id', parsed.data.chicken_id)

  return NextResponse.json({ data })
}
```

### `src/app/api/training-sessions/[chickenId]/stats/route.ts`

GET stats từ view `chicken_training_stats`.

### `src/app/api/training/top-performers/route.ts`

GET từ view `top_training_performers`.

---

## 🕐 BƯỚC 7: CRON JOB NHẮC TIÊM

### `src/app/api/cron/daily-vaccination-reminder/route.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { sendPushToAllAdmins } from '@/lib/push/sender'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().split('T')[0]

  // Lấy danh sách cần tiêm hôm nay
  const { data: dueToday } = await supabase
    .from('vaccinations_due')
    .select('*')
    .eq('scheduled_date', today)

  // Lấy danh sách quá hạn
  const { data: overdue } = await supabase
    .from('vaccinations_due')
    .select('*')
    .lt('scheduled_date', today)

  if (!dueToday?.length && !overdue?.length) {
    return NextResponse.json({ message: 'No vaccinations to remind' })
  }

  const todayCount = dueToday?.length || 0
  const overdueCount = overdue?.length || 0

  // Group by vaccine
  const groupByVaccine = (items: any[]) => {
    const map = new Map<string, number>()
    items.forEach(i => map.set(i.vaccine_name, (map.get(i.vaccine_name) || 0) + 1))
    return Array.from(map.entries()).map(([name, count]) => `${name}: ${count} con`).join(', ')
  }

  const todaySummary = dueToday?.length ? groupByVaccine(dueToday) : ''
  const overdueSummary = overdue?.length ? groupByVaccine(overdue) : ''

  // 1. Push notification
  await sendPushToAllAdmins({
    title: `💉 Tiêm phòng hôm nay: ${todayCount} con${overdueCount ? ` (+${overdueCount} quá hạn)` : ''}`,
    body: todaySummary || `${overdueCount} con quá hạn cần xử lý`,
    url: '/admin/tiem-phong',
  })

  // 2. Email
  if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: process.env.ADMIN_EMAIL,
      subject: `🐓 Lịch tiêm phòng ${today} — ${todayCount} con cần tiêm`,
      html: `
        <h2>Tiêm phòng ngày ${today}</h2>
        <p><strong>Hôm nay:</strong> ${todaySummary || 'Không có'}</p>
        <p><strong>Quá hạn:</strong> ${overdueSummary || 'Không có'}</p>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/tiem-phong">Xem chi tiết</a></p>
      `,
    })
  }

  return NextResponse.json({ todayCount, overdueCount })
}
```

### Setup Vercel Cron — `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-vaccination-reminder",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Lưu ý:** schedule là UTC. `0 0 * * *` = 00:00 UTC = 7:00 sáng VN. Vercel free tier hỗ trợ cron daily.

---

## 🧩 BƯỚC 8: COMPONENTS

### Components tiêm phòng

- `VaccinationDueList.tsx` — list cần tiêm với checkbox bulk
- `VaccinationConfirmModal.tsx` — modal xác nhận với batch number
- `VaccinationHistory.tsx` — lịch sử tiêm của 1 con (trong tab chi tiết gà)

### Components bệnh

- `DiseaseForm.tsx` — form ghi ca bệnh
- `DiseaseHistoryList.tsx` — lịch sử bệnh
- `OutbreakAlert.tsx` — banner cảnh báo dịch (lấy từ alerts)

### Components kho

- `MedicineList.tsx` — table với stock, low-stock highlight
- `MedicineTransactionForm.tsx` — form nhập/xuất
- `StockChart.tsx` — biểu đồ tồn kho theo thời gian
- `FeedList.tsx` + `FeedTransactionForm.tsx` — tương tự
- `FeedCostCard.tsx` — hiển thị chi phí thức ăn/con/ngày theo khu

### Components vần gà

- `TrainingSessionForm.tsx` — form ghi buổi vần với 3 slider điểm
- `TrainingSessionsList.tsx` — list các buổi vần
- `TrainingScoreChart.tsx` — biểu đồ điểm theo thời gian (Recharts line chart)
- `TopPerformersTable.tsx` — top 50 gà điểm cao

---

## 📄 BƯỚC 9: PAGES

### `/admin/tiem-phong/page.tsx`

Tabs:
- **Hôm nay** (default) — list + nút "Xác nhận tiêm tất cả"
- **Tuần này** — group by date
- **Quá hạn** — đỏ, ưu tiên cao
- **Đã tiêm** — lịch sử

UI mobile-first:
- Mỗi item card có: ảnh gà nhỏ, mã, vaccine name, ngày dự kiến, checkbox
- Bottom sticky bar khi đã chọn ≥ 1: "Xác nhận tiêm X con"

### `/admin/tiem-phong/cai-dat`

Cài đặt cá nhân:
- Toggle push notification (component PushNotificationToggle)
- Cài giờ nhận email (mặc định 7:00 sáng)

### `/admin/kho-thuoc/page.tsx`

- Stats: tổng số loại, sắp hết hạn, dưới ngưỡng
- Table medicines với nút nhập/xuất nhanh
- Filter: low stock / expiring

### `/admin/kho-thuoc/[id]/page.tsx`

Chi tiết:
- Thông tin thuốc + stock current
- Lịch sử transactions (nhập/xuất)
- Biểu đồ tồn kho 30 ngày qua

### `/admin/kho-thuc-an/page.tsx` + `/admin/kho-thuc-an/[id]/page.tsx`

Tương tự kho thuốc.

Thêm widget: chi phí thức ăn/con/ngày theo khu (dùng `feed_cost_per_chicken_per_day`).

### `/admin/benh/page.tsx`

- List ca bệnh đang điều trị + đã khỏi
- Filter: outcome
- Form quick-add ca bệnh
- Banner đỏ ở trên nếu có outbreak alert chưa xử lý

### `/admin/van-ga/page.tsx`

- Stats: tổng buổi vần tháng này, top 5 performers
- Table top performers (link đến chi tiết gà)
- Nút "Ghi buổi vần mới"

### `/admin/van-ga/them-moi/page.tsx`

Form ghi buổi vần:
- ChickenSelect (search)
- Date picker
- 3 sliders điểm 0-10
- Score total tự tính (avg)
- Result radio: thắng/thua/hoa
- Optional: opponent
- Notes

---

## 🔗 BƯỚC 10: TÍCH HỢP VỚI HỒ SƠ GÀ

Cập nhật trang chi tiết gà `/admin/ho-so-ga/[id]` (Phần 2):

**Tab "Sức khỏe"** giờ render:
- VaccinationHistory (8 mũi với status)
- DiseaseHistoryList
- Nút "Ghi ca bệnh mới"

**Tab "Vần gà"** giờ render:
- TrainingSessionsList (sorted by session_date)
- TrainingScoreChart (4 lines: strength, appearance, aggression, total)
- Stats từ view `chicken_training_stats`
- Nút "Ghi buổi vần mới"

---

## ✅ CHECKLIST PHẦN 4

### Tiêm phòng
- [ ] Tạo gà mới với birth_date hôm nay → tự có 8 vaccinations với scheduled_date đúng (+1, +7, +14...)
- [ ] Trang `/admin/tiem-phong` tab "Hôm nay" hiển thị đúng
- [ ] Bulk tiêm 5 con cùng vaccine → tất cả chuyển status `da_tiem`
- [ ] Setup VAPID keys + service worker → bật notification trên Chrome mobile
- [ ] Test cron manual: GET `/api/cron/daily-vaccination-reminder` với header `Authorization: Bearer <CRON_SECRET>` → nhận push + email

### Kho thuốc
- [ ] Tạo 1 medicine với min_stock_alert = 100
- [ ] Nhập 500 → current_stock = 500
- [ ] Xuất 450 → current_stock = 50 → tự tạo alert "kho_thuoc_thap"
- [ ] Alert xuất hiện trong bảng `alerts`
- [ ] Xuất tiếp 50 → current_stock = 0 → alert "kho_thuoc_het" priority `khan_cap`
- [ ] Xóa 1 transaction → stock được khôi phục

### Kho thức ăn
- [ ] Tương tự kho thuốc
- [ ] `/api/feeds/cost-per-chicken` trả về số liệu hợp lý
- [ ] Hiển thị widget cost/con/ngày trên dashboard kho

### Bệnh + Phát hiện dịch
- [ ] Tạo ca bệnh cho 1 con gà
- [ ] Đánh dấu 5 con gà cùng khu chết hôm nay (status = chet, status_date = today)
- [ ] Nếu khu < 250 con (5/250 = 2%): tự tạo alert `dich_benh` priority `khan_cap`
- [ ] Test trùng: gà thứ 6 chết → KHÔNG tạo alert thứ 2 cùng ngày cùng khu

### Vần gà
- [ ] Ghi 3 buổi vần cho 1 con gà → session_number tự sinh 1, 2, 3
- [ ] score_total tự tính = (strength+appearance+aggression)/3
- [ ] Tab "Vần gà" trong chi tiết gà hiển thị biểu đồ + stats
- [ ] `/admin/van-ga` hiển thị top performers (≥3 buổi vần)

### Push notification
- [ ] Bật notification trên điện thoại → có dòng push_subscriptions trong DB
- [ ] Trigger cron manual → nhận notification trên màn hình điện thoại
- [ ] Click notification → mở app /admin/tiem-phong

---

## 🚨 LƯU Ý TRIỂN KHAI

1. **Service Worker cần HTTPS** (trừ localhost). Vercel auto-HTTPS nên OK trên production.

2. **iOS Safari hỗ trợ Web Push từ iOS 16.4+** — yêu cầu PWA "Add to Home Screen" trước. Android Chrome OK luôn.

3. **Resend setup:**
   - Đăng ký tài khoản tại resend.com
   - Verify domain gachoivietnb.com (thêm DNS records)
   - Lấy API key
   - Free tier: 3000 emails/tháng — quá đủ cho 1 trang trại

4. **Vercel Cron trên free tier:**
   - Hỗ trợ schedule daily, không hỗ trợ schedule mỗi giờ
   - Nếu cần phong phú hơn → dùng Supabase Edge Functions với pg_cron (Pro plan)

5. **Phát hiện dịch:**
   - Ngưỡng 2% và 3× baseline có thể quá nhạy ban đầu (ít data)
   - Có thể cấu hình qua `system_settings.alert_thresholds` (đã set ở Phần 1)
   - Có thể disable trigger trong vài tháng đầu nếu báo nhầm nhiều

6. **Stock trigger có thể bị race condition** với insert đồng thời nhiều transaction. Trong thực tế hiếm xảy ra với 1 trang trại.

7. **Training sessions update bio trigger:**
   - Phần 4 chỉ set `ai_description_updated_at = null` để đánh dấu cần re-generate
   - Phần 7 sẽ implement logic gọi Gemini tự viết bio mới

8. **Mobile UX cho bulk vaccination:**
   - Nút check toàn bộ ở header
   - Sticky bottom bar khi đã chọn ≥1
   - Modal confirm full-screen trên mobile

---

## 📦 OUTPUT MONG ĐỢI

Sau Phần 4:
- Hệ thống tự nhắc tiêm phòng hàng ngày qua push + email
- Bulk xác nhận tiêm trong 1 click
- Kho thuốc + kho thức ăn cập nhật realtime
- Phát hiện dịch tự động
- Hồ sơ thi đấu đầy đủ với biểu đồ

**Phần 4 + Phần 5 độc lập với nhau** — sau khi Phần 4 xong, có thể làm Phần 5 (Mua bán + Tài chính).

**Báo lại khi xong, tôi chuẩn bị Phần 5!**
