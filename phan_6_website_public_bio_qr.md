# PROMPT CHO CLAUDE CODE — PHẦN 6: WEBSITE PUBLIC + BIO QR
## Dự án: Gà Chọi Việt Ninh Bình (gachoivietnb.com)

---

## 🎯 NHIỆM VỤ CỦA BẠN (Claude Code)

Build **mặt tiền bán hàng** đầy đủ — đây là điểm tiếp xúc đầu tiên với khách:

1. **Trang chủ** — hero section, stats tự động, gà nổi bật, trust signals
2. **Danh sách gà bán** — filter, smart search, card grid, so sánh
3. **Trang bio QR** — render đẹp, thông tin đầy đủ, share Zalo/Facebook
4. **Thư viện giống** — đặc điểm 7 giống, số con realtime
5. **Trang liên hệ** — form → CRM, bản đồ, kênh liên hệ
6. **SEO + Sitemap** — đầy đủ, tự động

**Sau khi hoàn thành Phần 6:**
- Vào `gachoivietnb.com` thấy trang chủ đẹp, chuyên nghiệp
- Quét QR thẻ chân gà → ra trang bio đầy đủ thông tin trên điện thoại
- Khách xem 3 con gà, click "So sánh" → drawer hiện 3 cột so sánh
- Khách điền form liên hệ → tự tạo customer trong CRM, admin nhận notification
- Google index được tất cả trang gà bán
- Share link bio QR lên Zalo → hiện preview đẹp với ảnh gà

---

## 📋 NHẮC LẠI QUY TẮC

1. **Tiếng Anh code, tiếng Việt UI**
2. **Mobile-first** — quan trọng nhất ở Phần 6 vì khách chủ yếu xem trên điện thoại
3. **Server Components mặc định** cho SEO
4. **ISR cho trang bio QR** — `export const revalidate = 3600`
5. **TypeScript strict**
6. **Performance:** Next.js Image cho mọi ảnh

---

## 📦 BƯỚC 1: PACKAGES & CONFIG

### Cài thêm
```bash
# Không cần package mới, dùng những gì đã cài
```

### Cập nhật `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
    ],
  },
}

module.exports = nextConfig
```

---

## 🗄️ BƯỚC 2: MIGRATION BỔ SUNG

Tạo file `supabase/migrations/20260601000001_phase6_public.sql`:

```sql
-- =====================================================
-- PHASE 6: PUBLIC WEBSITE
-- =====================================================

-- =====================================================
-- 1. CONTACT INQUIRIES (form liên hệ public)
-- =====================================================

CREATE TABLE contact_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT,
  interested_in_chicken_id UUID REFERENCES chickens(id),  -- nếu hỏi về 1 con cụ thể
  interested_in_breed_id UUID REFERENCES breeds(id),
  customer_id UUID REFERENCES customers(id),  -- link khi tạo customer
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'moi',  -- moi / da_lien_he / da_chot / huy
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_contact_inquiries_status ON contact_inquiries(status);
CREATE INDEX idx_contact_inquiries_created ON contact_inquiries(created_at DESC);

ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Public chỉ có thể INSERT, không SELECT
CREATE POLICY "Public can submit inquiries" ON contact_inquiries FOR INSERT
  WITH CHECK (TRUE);
CREATE POLICY "Staff view all inquiries" ON contact_inquiries FOR SELECT
  USING (is_authenticated_staff());
CREATE POLICY "Staff manage inquiries" ON contact_inquiries FOR ALL
  USING (is_authenticated_staff());

-- =====================================================
-- 2. PUBLIC STATS VIEW (cho trang chủ)
-- =====================================================

CREATE OR REPLACE VIEW public_farm_stats AS
SELECT
  (SELECT COUNT(*) FROM chickens WHERE status IN ('dang_nuoi', 'dang_cach_ly')) AS total_chickens,
  (SELECT COUNT(*) FROM breeds WHERE is_active = TRUE) AS total_breeds,
  (SELECT COUNT(DISTINCT id) FROM customers WHERE total_purchased > 0) AS total_customers,
  (SELECT COUNT(*) FROM chickens WHERE is_for_sale = TRUE AND status = 'dang_nuoi') AS chickens_for_sale,
  (SELECT COUNT(*) FROM chickens WHERE source = 'no_tai_trai'
    AND created_at >= NOW() - INTERVAL '1 year') AS chickens_born_last_year;

-- =====================================================
-- 3. PUBLIC CHICKEN VIEW (chỉ con đang bán + thông tin public)
-- =====================================================

CREATE OR REPLACE VIEW public_chickens AS
SELECT
  c.id,
  c.chicken_code,
  c.name,
  qt.tag_number,
  b.id AS breed_id,
  b.code AS breed_code,
  b.name_vi AS breed_name,
  b.tier AS breed_tier,
  c.gender,
  c.birth_date,
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.birth_date))::INT AS age_months,
  c.weight_kg,
  c.color,
  c.listed_price,
  c.description,
  c.main_photo_url,
  c.created_at,
  c.is_for_sale,
  c.status,
  c.sale_date,
  -- Pedigree depth (số đời tổ tiên có dữ liệu)
  CASE
    WHEN c.parent_male_id IS NOT NULL OR c.parent_female_id IS NOT NULL THEN
      CASE
        WHEN EXISTS (
          SELECT 1 FROM chickens p1
          WHERE (p1.id = c.parent_male_id OR p1.id = c.parent_female_id)
            AND (p1.parent_male_id IS NOT NULL OR p1.parent_female_id IS NOT NULL)
        ) THEN 3
        ELSE 2
      END
    ELSE 1
  END AS pedigree_depth,
  -- Số mũi tiêm phòng đã hoàn thành
  (SELECT COUNT(*) FROM vaccinations v
    WHERE v.chicken_id = c.id AND v.status = 'da_tiem') AS vaccinations_done,
  -- Số buổi vần
  (SELECT COUNT(*) FROM training_sessions ts
    WHERE ts.chicken_id = c.id) AS training_sessions_count,
  -- Điểm vần trung bình
  (SELECT ROUND(AVG(ts.score_total)::NUMERIC, 1) FROM training_sessions ts
    WHERE ts.chicken_id = c.id) AS avg_training_score
FROM chickens c
LEFT JOIN breeds b ON b.id = c.breed_id
LEFT JOIN qr_tags qt ON qt.id = c.qr_tag_id;

-- =====================================================
-- 4. SEARCH FUNCTION với filter
-- =====================================================

CREATE OR REPLACE FUNCTION search_public_chickens(
  p_text TEXT DEFAULT NULL,
  p_breed_codes TEXT[] DEFAULT NULL,
  p_age_min_months INT DEFAULT NULL,
  p_age_max_months INT DEFAULT NULL,
  p_price_min DECIMAL DEFAULT NULL,
  p_price_max DECIMAL DEFAULT NULL,
  p_min_training_sessions INT DEFAULT NULL,
  p_min_generations INT DEFAULT NULL,
  p_gender chicken_gender DEFAULT NULL,
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 20
)
RETURNS SETOF public_chickens AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public_chickens pc
  WHERE pc.is_for_sale = TRUE
    AND pc.status = 'dang_nuoi'
    AND (p_text IS NULL
         OR pc.name ILIKE '%' || p_text || '%'
         OR pc.chicken_code ILIKE '%' || p_text || '%'
         OR pc.description ILIKE '%' || p_text || '%')
    AND (p_breed_codes IS NULL OR pc.breed_code = ANY(p_breed_codes))
    AND (p_age_min_months IS NULL OR pc.age_months >= p_age_min_months)
    AND (p_age_max_months IS NULL OR pc.age_months <= p_age_max_months)
    AND (p_price_min IS NULL OR pc.listed_price >= p_price_min)
    AND (p_price_max IS NULL OR pc.listed_price <= p_price_max)
    AND (p_min_training_sessions IS NULL OR pc.training_sessions_count >= p_min_training_sessions)
    AND (p_min_generations IS NULL OR pc.pedigree_depth >= p_min_generations)
    AND (p_gender IS NULL OR pc.gender = p_gender)
  ORDER BY
    CASE WHEN pc.breed_tier = 'cao_cap' THEN 1
         WHEN pc.breed_tier = 'trung_cap' THEN 2
         ELSE 3 END,
    pc.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. RLS cho public_chickens view
-- =====================================================

-- Note: VIEW không có RLS riêng, dùng RLS của bảng chickens (đã có)
-- public_chickens chỉ chứa is_for_sale=true nên public xem được qua chính sách hiện có

-- =====================================================
-- 6. BREED STATS VIEW
-- =====================================================

CREATE OR REPLACE VIEW public_breed_stats AS
SELECT
  b.id,
  b.code,
  b.name_vi,
  b.origin,
  b.description,
  b.tier,
  b.default_avatar_url,
  COUNT(c.id) FILTER (WHERE c.status IN ('dang_nuoi', 'dang_cach_ly')) AS current_count,
  COUNT(c.id) FILTER (WHERE c.is_for_sale = TRUE AND c.status = 'dang_nuoi') AS for_sale_count,
  ROUND(AVG(c.listed_price) FILTER (WHERE c.is_for_sale = TRUE)::NUMERIC, 0) AS avg_listed_price
FROM breeds b
LEFT JOIN chickens c ON c.breed_id = b.id
WHERE b.is_active = TRUE
GROUP BY b.id;
```

**Chạy migration trong Supabase SQL Editor.**

---

## 🔌 BƯỚC 3: API ROUTES PUBLIC

### `src/app/api/public/contact/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'

const ContactSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional().or(z.literal('')),
  message: z.string().max(2000).optional(),
  interested_in_chicken_id: z.string().uuid().optional(),
  interested_in_breed_id: z.string().uuid().optional(),
  honeypot: z.string().optional(),  // anti-spam
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = ContactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  // Anti-spam: nếu honeypot có dữ liệu = bot
  if (parsed.data.honeypot && parsed.data.honeypot.length > 0) {
    return NextResponse.json({ success: true })  // fake success
  }

  const supabase = await createClient()
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
  const userAgent = request.headers.get('user-agent')

  // Rate limiting đơn giản: check IP đã submit quá 5 lần/giờ
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('contact_inquiries')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', oneHourAgo)

  if (count && count >= 5) {
    return NextResponse.json({ error: 'Quá nhiều lần gửi, vui lòng thử lại sau' }, { status: 429 })
  }

  // Insert inquiry
  const { honeypot, ...inquiryData } = parsed.data
  const { data, error } = await supabase
    .from('contact_inquiries')
    .insert({ ...inquiryData, ip_address: ip, user_agent: userAgent })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Tạo customer nếu chưa có (theo SĐT)
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', inquiryData.phone)
    .maybeSingle()

  let customerId = existingCustomer?.id
  if (!customerId) {
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({
        name: inquiryData.name,
        phone: inquiryData.phone,
        email: inquiryData.email,
        source: 'website',
      })
      .select('id')
      .single()
    customerId = newCustomer?.id
  }

  if (customerId) {
    await supabase
      .from('contact_inquiries')
      .update({ customer_id: customerId })
      .eq('id', data.id)
  }

  // Send email notification cho admin
  if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: process.env.ADMIN_EMAIL,
      subject: `🐓 Khách mới hỏi mua: ${inquiryData.name}`,
      html: `
        <h3>Yêu cầu liên hệ mới</h3>
        <p><strong>Tên:</strong> ${inquiryData.name}</p>
        <p><strong>SĐT:</strong> ${inquiryData.phone}</p>
        ${inquiryData.email ? `<p><strong>Email:</strong> ${inquiryData.email}</p>` : ''}
        ${inquiryData.message ? `<p><strong>Tin nhắn:</strong> ${inquiryData.message}</p>` : ''}
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/khach-hang">Xem trong admin</a></p>
      `,
    }).catch(() => {})  // không throw nếu fail
  }

  return NextResponse.json({ success: true, data })
}
```

### `src/app/api/public/alerts/subscribe/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const SubscribeSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional(),
  breed_id: z.string().uuid().optional(),
  age_min_months: z.number().int().optional(),
  age_max_months: z.number().int().optional(),
  price_max: z.number().optional(),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = SubscribeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const supabase = await createClient()

  // Tạo hoặc lấy customer
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', parsed.data.phone)
    .maybeSingle()

  let customerId = existing?.id
  if (!customerId) {
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        source: 'website_alert',
      })
      .select('id')
      .single()
    customerId = newCustomer?.id
  }

  if (!customerId) return NextResponse.json({ error: 'Cannot create customer' }, { status: 500 })

  // Tạo alert subscription
  const { data, error } = await supabase
    .from('customer_alerts')
    .insert({
      customer_id: customerId,
      breed_filter: parsed.data.breed_id,
      age_min_months: parsed.data.age_min_months,
      age_max_months: parsed.data.age_max_months,
      price_max: parsed.data.price_max,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
```

### `src/app/api/public/chickens/search/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Smart search query parser
function parseSmartQuery(query: string): {
  cleanText: string
  filters: Record<string, any>
} {
  const filters: Record<string, any> = {}
  let clean = query

  // Detect "X buổi vần" hoặc "vần X buổi"
  const sessionsMatch = query.match(/(\d+)\s*buổi\s*vần|vần\s*(\d+)\s*buổi/i)
  if (sessionsMatch) {
    filters.min_training_sessions = parseInt(sessionsMatch[1] || sessionsMatch[2])
    clean = clean.replace(sessionsMatch[0], '')
  }

  // Detect "X đời gia phả"
  const generationsMatch = query.match(/(\d+)\s*đời\s*gia\s*phả|gia\s*phả\s*(\d+)\s*đời/i)
  if (generationsMatch) {
    filters.min_generations = parseInt(generationsMatch[1] || generationsMatch[2])
    clean = clean.replace(generationsMatch[0], '')
  }

  // Detect breed
  const breedKeywords: Record<string, string> = {
    'asil': 'ASIL', 'mã lai': 'MLAI', 'malai': 'MLAI',
    'peru': 'PERU', 'nòi': 'NOI', 'tre': 'TRE',
    'tân châu': 'TANC', 'tanchau': 'TANC',
  }
  const lowerQuery = clean.toLowerCase()
  for (const [keyword, code] of Object.entries(breedKeywords)) {
    if (lowerQuery.includes(keyword)) {
      filters.breed_codes = [code]
      clean = clean.replace(new RegExp(keyword, 'gi'), '')
      break
    }
  }

  return { cleanText: clean.trim(), filters }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const breeds = searchParams.get('breeds')?.split(',') || null
  const ageMin = searchParams.get('age_min') ? parseInt(searchParams.get('age_min')!) : null
  const ageMax = searchParams.get('age_max') ? parseInt(searchParams.get('age_max')!) : null
  const priceMin = searchParams.get('price_min') ? parseFloat(searchParams.get('price_min')!) : null
  const priceMax = searchParams.get('price_max') ? parseFloat(searchParams.get('price_max')!) : null
  const minSessions = searchParams.get('min_sessions') ? parseInt(searchParams.get('min_sessions')!) : null
  const minGen = searchParams.get('min_generations') ? parseInt(searchParams.get('min_generations')!) : null
  const gender = searchParams.get('gender')
  const offset = parseInt(searchParams.get('offset') || '0')
  const limit = parseInt(searchParams.get('limit') || '20')

  // Smart parse từ query nếu không có filter explicit
  let smartFilters = {}
  let cleanText = q
  if (q && !breeds && !minSessions && !minGen) {
    const parsed = parseSmartQuery(q)
    smartFilters = parsed.filters
    cleanText = parsed.cleanText
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('search_public_chickens', {
    p_text: cleanText || null,
    p_breed_codes: breeds || (smartFilters as any).breed_codes || null,
    p_age_min_months: ageMin,
    p_age_max_months: ageMax,
    p_price_min: priceMin,
    p_price_max: priceMax,
    p_min_training_sessions: minSessions || (smartFilters as any).min_training_sessions || null,
    p_min_generations: minGen || (smartFilters as any).min_generations || null,
    p_gender: gender || null,
    p_offset: offset,
    p_limit: limit,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, parsed: { cleanText, smartFilters } })
}
```

### `src/app/api/public/stats/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 3600  // cache 1h

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.from('public_farm_stats').select('*').single()
  return NextResponse.json({ data })
}
```

---

## 🧩 BƯỚC 4: COMPONENTS PUBLIC

### `src/components/public/Hero.tsx`

Hero section trang chủ:
- Background gradient hoặc ảnh
- Logo lớn + tên thương hiệu
- Tagline: "Trang trại gà chọi thuần chủng Ninh Bình"
- Sub-text: "Gia phả minh bạch · Tiêm phòng đầy đủ · Cam kết chất lượng"
- 2 CTA buttons: "Xem gà đang bán" + "Liên hệ Zalo"

### `src/components/public/StatsBand.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'

export async function StatsBand() {
  const supabase = await createClient()
  const { data: stats } = await supabase.from('public_farm_stats').select('*').single()

  if (!stats) return null

  const items = [
    { value: `${stats.total_chickens}+`, label: 'Con đang nuôi' },
    { value: stats.total_breeds, label: 'Giống thuần chủng' },
    { value: '5+', label: 'Năm kinh nghiệm' },  // hardcode hoặc setting
    { value: `${stats.total_customers}+`, label: 'Khách tin tưởng' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
      {items.map((item, i) => (
        <div key={i} className="text-center">
          <div className="text-3xl font-medium text-gray-900">{item.value}</div>
          <div className="text-sm text-gray-600 mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
```

### `src/components/public/ChickenCard.tsx`

Card 1 con gà:
- Ảnh main_photo_url (Next.js Image)
- Tên/mã
- Giống · tuổi
- Badges: tiêm đủ, gia phả X đời, vần Y buổi
- Giá listed_price
- Nút "Xem chi tiết" → /ga/[tag_number]
- Nút "+ So sánh" (toggle URL param)

### `src/components/public/TrustBadges.tsx`

Component reusable hiển thị badges uy tín cho 1 con gà:

```typescript
interface Props {
  vaccinationsDone: number
  pedigreeDepth: number
  trainingSessions: number
}

export function TrustBadges({ vaccinationsDone, pedigreeDepth, trainingSessions }: Props) {
  const badges = []

  if (vaccinationsDone >= 8) badges.push({ icon: '💉', label: 'Tiêm đủ 8 mũi', color: 'green' })
  if (vaccinationsDone >= 4 && vaccinationsDone < 8) badges.push({ icon: '💉', label: `Tiêm ${vaccinationsDone}/8`, color: 'amber' })

  if (pedigreeDepth >= 3) badges.push({ icon: '👨‍👩‍👧', label: `Gia phả ${pedigreeDepth} đời`, color: 'blue' })

  if (trainingSessions >= 5) badges.push({ icon: '🥊', label: `Vần ${trainingSessions} buổi`, color: 'purple' })

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b, i) => (
        <span
          key={i}
          className={`text-xs px-2 py-1 rounded-full font-medium bg-${b.color}-100 text-${b.color}-800`}
        >
          {b.icon} {b.label}
        </span>
      ))}
    </div>
  )
}
```

### `src/components/public/ChickenFilters.tsx`

Client component:
- Dropdown: giống (multi)
- Range slider: tuổi (tháng)
- Range slider: giá (VND)
- Number input: số buổi vần tối thiểu
- Số đời gia phả tối thiểu
- Update URL params khi thay đổi
- Mobile: drawer

### `src/components/public/ComparisonDrawer.tsx`

- Hiển thị nếu có ≥1 ID trong URL `?compare=id1,id2,id3`
- Drawer dưới (mobile) / sidebar phải (desktop)
- 2-3 cột so sánh:
  - Ảnh
  - Tên/giống
  - Tuổi
  - Giá
  - Pedigree depth
  - Số buổi vần
  - Điểm vần TB
- Nút "Xem chi tiết" cho từng con
- Nút "Liên hệ mua tất cả"

### `src/components/public/ContactForm.tsx`

Form đầy đủ:
- Tên, SĐT (required)
- Email (optional)
- Tin nhắn
- Honeypot field (hidden)
- Submit → POST /api/public/contact
- Toast success

### `src/components/public/AlertSubscribeForm.tsx`

Form subscribe:
- Tên, SĐT
- Chọn giống quan tâm
- Khoảng tuổi
- Giá tối đa
- Submit → POST /api/public/alerts/subscribe

### `src/components/public/PedigreePublic.tsx`

Tái sử dụng PedigreeTree từ Phần 3 nhưng:
- Click ô tổ tiên → đến `/ga/[tag_number]` (public) thay vì admin
- Style đẹp hơn cho public

### `src/components/public/ShareButtons.tsx`

```typescript
'use client'
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      alert('Đã copy link!')
    }
  }

  return (
    <div className="flex gap-2">
      <button onClick={handleShare} className="flex-1 bg-blue-500 text-white px-4 py-2 rounded">
        📤 Chia sẻ
      </button>
      <a
        href={`https://zalo.me/share?url=${encodeURIComponent(url)}`}
        target="_blank"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Zalo
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        className="bg-blue-700 text-white px-4 py-2 rounded"
      >
        Facebook
      </a>
    </div>
  )
}
```

### `src/components/public/StickyContactCTA.tsx`

Sticky bottom CTA cho trang bio QR:
- Hiển thị giá + nút "Liên hệ mua"
- Click → mở modal ContactForm với chicken_id pre-filled
- Hide khi scroll lên header

---

## 📄 BƯỚC 5: PAGES PUBLIC

### `/` — TRANG CHỦ

`src/app/(public)/page.tsx`:

```typescript
import { Metadata } from 'next'
import { Hero } from '@/components/public/Hero'
import { StatsBand } from '@/components/public/StatsBand'
import { FeaturedChickens } from '@/components/public/FeaturedChickens'
import { TrustSection } from '@/components/public/TrustSection'

export const metadata: Metadata = {
  title: 'Gà Chọi Việt Ninh Bình - Trang trại gà chọi thuần chủng',
  description: 'Cung cấp gà chọi giống thuần chủng từ Ninh Bình. Gia phả minh bạch, tiêm phòng đầy đủ, cam kết chất lượng. Asil, Mã Lai, Peru, Nòi và nhiều giống khác.',
  openGraph: {
    title: 'Gà Chọi Việt Ninh Bình',
    description: 'Trang trại gà chọi thuần chủng - gia phả minh bạch',
    url: 'https://gachoivietnb.com',
    siteName: 'Gà Chọi Việt NB',
    locale: 'vi_VN',
    type: 'website',
  },
  alternates: { canonical: 'https://gachoivietnb.com' },
}

export const revalidate = 3600

export default function HomePage() {
  return (
    <>
      <Hero />
      <section className="container mx-auto px-4">
        <StatsBand />
      </section>
      <FeaturedChickens />
      <TrustSection />
    </>
  )
}
```

`FeaturedChickens` — server component fetch top 4 gà bán mới nhất.

### `/ban` — DANH SÁCH BÁN

```typescript
import { Metadata } from 'next'
import { ChickenFilters } from '@/components/public/ChickenFilters'
import { ChickenSearchResults } from '@/components/public/ChickenSearchResults'
import { ComparisonDrawer } from '@/components/public/ComparisonDrawer'

export const metadata: Metadata = {
  title: 'Gà chọi đang bán | Gà Chọi Việt NB',
  description: 'Danh sách gà chọi giống đang có sẵn tại trang trại Gà Chọi Việt Ninh Bình. Asil, Mã Lai, Peru, Nòi với gia phả minh bạch.',
}

export default async function BanPage({
  searchParams,
}: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-medium mb-6">Gà chọi đang bán</h1>

      <div className="md:grid md:grid-cols-[280px_1fr] gap-6">
        <aside className="hidden md:block">
          <ChickenFilters />
        </aside>

        <div>
          <ChickenSearchResults searchParams={params} />
        </div>
      </div>

      <ComparisonDrawer compareIds={params.compare?.split(',') || []} />
    </div>
  )
}
```

### `/ga/[tagNumber]` — BIO QR (CỐT LÕI)

`src/app/(public)/ga/[tagNumber]/page.tsx`:

```typescript
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { TrustBadges } from '@/components/public/TrustBadges'
import { ShareButtons } from '@/components/public/ShareButtons'
import { StickyContactCTA } from '@/components/public/StickyContactCTA'
import { PedigreePublic } from '@/components/public/PedigreePublic'

export const revalidate = 3600  // cache 1h

export async function generateMetadata({
  params,
}: { params: Promise<{ tagNumber: string }> }): Promise<Metadata> {
  const { tagNumber } = await params
  const supabase = await createClient()

  const { data: chicken } = await supabase
    .from('public_chickens')
    .select('*')
    .eq('tag_number', tagNumber)
    .maybeSingle()

  if (!chicken) {
    return { title: 'Không tìm thấy | Gà Chọi Việt NB' }
  }

  const title = `${chicken.name || chicken.chicken_code} - ${chicken.breed_name} | Gà Chọi Việt NB`
  const description = chicken.description ||
    `Gà ${chicken.breed_name} ${chicken.age_months} tháng tuổi, gia phả minh bạch, tiêm phòng đầy đủ. Liên hệ Gà Chọi Việt Ninh Bình.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: chicken.main_photo_url ? [{ url: chicken.main_photo_url, width: 1200, height: 800 }] : [],
      type: 'website',
      url: `https://gachoivietnb.com/ga/${tagNumber}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: chicken.main_photo_url ? [chicken.main_photo_url] : [],
    },
  }
}

export default async function ChickenBioPage({
  params,
}: { params: Promise<{ tagNumber: string }> }) {
  const { tagNumber } = await params
  const supabase = await createClient()

  // Lấy QR tag
  const { data: tag } = await supabase
    .from('qr_tags')
    .select('*')
    .eq('tag_number', tagNumber)
    .maybeSingle()

  if (!tag) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <h1 className="text-xl font-medium">Thẻ không tồn tại</h1>
        <p className="text-gray-600 mt-2">Mã thẻ {tagNumber} không có trong hệ thống.</p>
      </div>
    )
  }

  // Thẻ chưa gán
  if (!tag.chicken_id) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <div className="text-6xl mb-4">🏷️</div>
        <h1 className="text-xl font-medium">Thẻ {tagNumber} chưa được kích hoạt</h1>
        <p className="text-gray-600 mt-2 mb-6">
          Thẻ này chưa gắn cho con gà nào. Liên hệ trang trại nếu bạn cần thông tin.
        </p>
        <a href="/lien-he" className="inline-block bg-blue-500 text-white px-6 py-2 rounded">
          Liên hệ Gà Chọi Việt NB
        </a>
      </div>
    )
  }

  // Lấy chicken full details
  const { data: chicken } = await supabase
    .from('public_chickens')
    .select('*')
    .eq('id', tag.chicken_id)
    .single()

  if (!chicken) notFound()

  // Lấy media
  const { data: media } = await supabase
    .from('chicken_media')
    .select('*')
    .eq('chicken_id', tag.chicken_id)
    .order('display_order')

  // Lấy vaccinations
  const { data: vaccinations } = await supabase
    .from('vaccinations')
    .select('*, vaccines(name_vi)')
    .eq('chicken_id', tag.chicken_id)
    .order('scheduled_date')

  // Lấy training sessions
  const { data: trainings } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('chicken_id', tag.chicken_id)
    .order('session_date', { ascending: false })

  const currentUrl = `https://gachoivietnb.com/ga/${tagNumber}`

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Hero ảnh */}
      <div className="relative aspect-square bg-gray-100">
        {chicken.main_photo_url ? (
          <Image
            src={chicken.main_photo_url}
            alt={chicken.name || chicken.chicken_code}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        ) : (
          <div className="flex items-center justify-center h-full text-9xl">🐓</div>
        )}

        {/* Badge trạng thái nếu đã bán */}
        {chicken.status === 'da_ban' && (
          <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            ĐÃ BÁN — {new Date(chicken.sale_date).toLocaleDateString('vi-VN')}
          </div>
        )}
      </div>

      {/* Header info */}
      <div className="p-4">
        <h1 className="text-2xl font-medium">{chicken.name || chicken.chicken_code}</h1>
        <p className="text-gray-600 text-sm">
          Mã: {chicken.chicken_code} · Thẻ: #{tagNumber}
        </p>

        <div className="mt-4">
          <TrustBadges
            vaccinationsDone={chicken.vaccinations_done}
            pedigreeDepth={chicken.pedigree_depth}
            trainingSessions={chicken.training_sessions_count}
          />
        </div>
      </div>

      {/* Quick info */}
      <section className="p-4 bg-gray-50 grid grid-cols-2 gap-3 text-sm">
        <Info label="Giống" value={chicken.breed_name} />
        <Info label="Tuổi" value={`${chicken.age_months} tháng`} />
        <Info label="Cân nặng" value={chicken.weight_kg ? `${chicken.weight_kg} kg` : '—'} />
        <Info label="Giới tính" value={chicken.gender === 'trong' ? 'Trống' : chicken.gender === 'mai' ? 'Mái' : 'Chưa xác định'} />
        {chicken.color && <Info label="Màu lông" value={chicken.color} />}
        {chicken.listed_price && (
          <Info label="Giá bán" value={new Intl.NumberFormat('vi-VN').format(chicken.listed_price) + ' đ'} />
        )}
      </section>

      {/* AI Description (sẽ có sau Phần 7, hiện tại là placeholder) */}
      {chicken.description && (
        <section className="p-4 border-t">
          <h2 className="text-lg font-medium mb-2">Mô tả</h2>
          <p className="text-gray-700 whitespace-pre-line">{chicken.description}</p>
        </section>
      )}

      {/* Pedigree */}
      <section className="p-4 border-t">
        <h2 className="text-lg font-medium mb-3">Gia phả</h2>
        <PedigreePublic chickenId={chicken.id} depth={3} />
      </section>

      {/* Vaccinations */}
      {vaccinations && vaccinations.length > 0 && (
        <section className="p-4 border-t">
          <h2 className="text-lg font-medium mb-3">💉 Tiêm phòng</h2>
          <div className="space-y-2">
            {vaccinations.map(v => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span>{v.vaccines?.name_vi}</span>
                {v.status === 'da_tiem' ? (
                  <span className="text-green-600">✓ Đã tiêm {new Date(v.actual_date).toLocaleDateString('vi-VN')}</span>
                ) : (
                  <span className="text-gray-500">Chưa tiêm</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Training */}
      {trainings && trainings.length > 0 && (
        <section className="p-4 border-t">
          <h2 className="text-lg font-medium mb-3">🥊 Thành tích vần</h2>
          <p className="text-sm text-gray-600 mb-3">
            Đã vần {trainings.length} buổi · Điểm TB: {chicken.avg_training_score || 0}/10
          </p>
          {/* Có thể thêm chart ở đây - dùng TrainingScoreChart từ Phần 4 */}
        </section>
      )}

      {/* Media gallery */}
      {media && media.length > 0 && (
        <section className="p-4 border-t">
          <h2 className="text-lg font-medium mb-3">📸 Hình ảnh & Video</h2>
          <div className="grid grid-cols-3 gap-2">
            {media.map(m => (
              <div key={m.id} className="aspect-square relative bg-gray-100 rounded overflow-hidden">
                {m.media_type === 'video' ? (
                  <video src={m.drive_url} controls className="w-full h-full object-cover" />
                ) : (
                  <Image
                    src={m.thumbnail_url || m.drive_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="33vw"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Share buttons */}
      <section className="p-4 border-t">
        <h2 className="text-lg font-medium mb-3">Chia sẻ</h2>
        <ShareButtons url={currentUrl} title={`${chicken.name || chicken.chicken_code} - ${chicken.breed_name}`} />
      </section>

      {/* Sticky CTA */}
      {chicken.is_for_sale && chicken.status === 'dang_nuoi' && (
        <StickyContactCTA
          chickenId={chicken.id}
          chickenName={chicken.name || chicken.chicken_code}
          price={chicken.listed_price}
        />
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
```

### `/giong` + `/giong/[breedCode]`

```typescript
// /giong/page.tsx
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Các giống gà chọi | Gà Chọi Việt NB',
  description: 'Tìm hiểu về các giống gà chọi: Asil, Mã Lai, Peru, Nòi, Tre, Tân Châu...',
}

export default async function GiongPage() {
  const supabase = await createClient()
  const { data: breeds } = await supabase.from('public_breed_stats').select('*').order('display_order')

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-medium mb-6">Các giống gà chọi</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {breeds?.map(breed => (
          <Link key={breed.id} href={`/giong/${breed.code.toLowerCase()}`} className="block bg-white border rounded-lg p-4 hover:shadow-md transition">
            <h2 className="text-lg font-medium">{breed.name_vi}</h2>
            <p className="text-sm text-gray-600 mt-1">{breed.origin}</p>
            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{breed.description}</p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-600">Tại trại: <strong>{breed.current_count}</strong></span>
              {breed.for_sale_count > 0 && (
                <span className="text-blue-600">{breed.for_sale_count} đang bán</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

### `/lien-he`

```typescript
import { ContactForm } from '@/components/public/ContactForm'

export const metadata = {
  title: 'Liên hệ | Gà Chọi Việt NB',
  description: 'Liên hệ trang trại Gà Chọi Việt Ninh Bình qua Zalo, hotline, hoặc form bên dưới.',
}

export default async function LienHePage() {
  // Lấy farm info từ system_settings
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('system_settings').select('value').eq('key', 'farm_info').single()
  const farm = settings?.value as any

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h1 className="text-2xl font-medium mb-6">Liên hệ Gà Chọi Việt NB</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-medium mb-4">Kênh liên hệ</h2>
          <div className="space-y-3">
            {farm?.zalo && (
              <a href={`https://zalo.me/${farm.zalo}`} className="block bg-blue-50 p-3 rounded">
                💬 Zalo: {farm.zalo}
              </a>
            )}
            {farm?.phone && (
              <a href={`tel:${farm.phone}`} className="block bg-green-50 p-3 rounded">
                📞 Hotline: {farm.phone}
              </a>
            )}
            {farm?.facebook && (
              <a href={farm.facebook} className="block bg-blue-50 p-3 rounded">
                📘 Facebook
              </a>
            )}
            {farm?.address && (
              <div className="block bg-gray-50 p-3 rounded">
                📍 {farm.address}
              </div>
            )}
          </div>

          {/* Google Maps embed */}
          {farm?.address && (
            <div className="mt-6">
              <iframe
                src={`https://www.google.com/maps?q=${encodeURIComponent(farm.address)}&output=embed`}
                width="100%" height="300" loading="lazy"
                className="rounded border"
              />
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-medium mb-4">Gửi yêu cầu</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  )
}
```

---

## 📄 BƯỚC 6: SITEMAP + ROBOTS

### `src/app/sitemap.ts`

```typescript
import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://gachoivietnb.com'
  const supabase = await createClient()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/ban`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/giong`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/lien-he`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  // Bio pages cho từng con gà đang bán
  const { data: chickens } = await supabase
    .from('public_chickens')
    .select('tag_number, created_at')
    .eq('is_for_sale', true)
    .eq('status', 'dang_nuoi')

  const chickenPages = chickens?.map(c => ({
    url: `${baseUrl}/ga/${c.tag_number}`,
    lastModified: new Date(c.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  })) || []

  // Breed pages
  const { data: breeds } = await supabase
    .from('breeds')
    .select('code')
    .eq('is_active', true)

  const breedPages = breeds?.map(b => ({
    url: `${baseUrl}/giong/${b.code.toLowerCase()}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  })) || []

  return [...staticPages, ...chickenPages, ...breedPages]
}
```

### `src/app/robots.ts`

```typescript
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] },
    ],
    sitemap: 'https://gachoivietnb.com/sitemap.xml',
  }
}
```

---

## 🔗 BƯỚC 7: PUBLIC LAYOUT & HEADER

### `src/components/layout/PublicHeader.tsx`

```typescript
'use client'
import Link from 'next/link'
import { useState } from 'react'

export function PublicHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="border-b bg-white sticky top-0 z-40">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="text-lg font-medium">
          🐓 Gà Chọi Việt NB
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-blue-600">Trang chủ</Link>
          <Link href="/ban" className="hover:text-blue-600">Gà bán</Link>
          <Link href="/giong" className="hover:text-blue-600">Giống</Link>
          <Link href="/lien-he" className="hover:text-blue-600">Liên hệ</Link>
        </nav>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          ☰
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t bg-white">
          {['Trang chủ', 'Gà bán', 'Giống', 'Liên hệ'].map((label, i) => (
            <Link
              key={i}
              href={['/', '/ban', '/giong', '/lien-he'][i]}
              className="block px-4 py-3 border-b text-sm"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
```

### `PublicFooter` — đơn giản với info trang trại + copyright

---

## ✅ CHECKLIST PHẦN 6

### Trang chủ
- [ ] Vào `/` → thấy hero + stats + 4 con gà nổi bật
- [ ] View source → có meta tags đầy đủ (title, description, OG)
- [ ] Mobile responsive

### Trang bán
- [ ] `/ban` hiển thị grid card gà
- [ ] Filter giống → URL params update, kết quả lọc đúng
- [ ] Search "Asil vần 5 buổi" → smart parse: breed=ASIL + min_sessions=5
- [ ] Search "gia phả 3 đời" → min_generations=3
- [ ] Click "+ So sánh" → URL params có ?compare=id1,id2
- [ ] Drawer comparison hiện 2 cột so sánh đúng

### Bio QR
- [ ] Quét QR thẻ chưa gán → trang "Thẻ chưa kích hoạt"
- [ ] Quét QR thẻ đã gán → bio đầy đủ
- [ ] Mobile: hero ảnh full width, sticky CTA bottom
- [ ] Click bố/mẹ trong gia phả → đến trang bio của tổ tiên đó
- [ ] Share button: trên mobile dùng Web Share API, trên desktop có Zalo/FB
- [ ] Trạng thái đã bán → hiển thị badge "ĐÃ BÁN" trên ảnh
- [ ] View source → og:image là main_photo_url
- [ ] Test share Zalo → preview hiện ảnh + tên gà

### Thư viện giống
- [ ] `/giong` hiển thị 7 giống với count realtime
- [ ] Click card → đến `/giong/[code]` chi tiết

### Liên hệ
- [ ] Form điền + submit → tạo record contact_inquiries
- [ ] Tạo customer mới (theo SĐT chưa có) hoặc link customer cũ
- [ ] Admin nhận email notification
- [ ] Submit lần thứ 6 trong 1h từ cùng IP → bị rate limit
- [ ] Honeypot: nếu fill field hidden → API trả success nhưng không insert

### SEO
- [ ] `/sitemap.xml` mở được, có URL của tất cả gà bán
- [ ] `/robots.txt` đúng format
- [ ] Google Rich Results Test trên trang bio: pass

### Performance
- [ ] Lighthouse trang chủ: SEO ≥ 95, Accessibility ≥ 90, Performance ≥ 80
- [ ] Bio QR load < 2s trên 3G

### Tích hợp với admin
- [ ] Trong admin, vào contact_inquiries thấy yêu cầu mới
- [ ] Customer mới tự xuất hiện trong CRM

---

## 🚨 LƯU Ý TRIỂN KHAI

1. **Google Drive ảnh** có thể bị limit hoặc CORS:
   - Đã config remotePatterns trong next.config.js
   - Nếu vẫn lỗi: dùng proxy route `/api/proxy-image?url=...` để fetch ảnh server-side

2. **OG image cho bio QR:**
   - Cần URL public, không cần auth
   - Drive folder phải set permission "Anyone with link"
   - Hoặc upload riêng OG image qua Supabase Storage

3. **ISR revalidate on-demand:**
   - Khi update gà trong admin → gọi `revalidatePath('/ga/${tag_number}')`
   - Thêm vào API PATCH chickens (Phần 2): sau khi update, revalidate path

4. **Mobile menu (hamburger):**
   - Component PublicHeader đã làm cơ bản
   - Có thể dùng shadcn Sheet cho UX tốt hơn

5. **Map iframe:**
   - Free, không cần API key
   - Nếu muốn map đẹp hơn: dùng Google Maps Embed API (vẫn free) hoặc Mapbox

6. **AI description placeholder:**
   - Phần 6 chỉ render `chicken.description` nếu có
   - Phần 7 sẽ implement Gemini auto-write
   - Hiện tại có thể nhập tay description trong admin

7. **Performance tối ưu:**
   - Public_chickens là VIEW phức tạp → có thể chậm với 5000 con
   - Nếu chậm: tạo materialized view, refresh mỗi 15 phút
   - Hoặc cache layer Redis (overkill cho quy mô này)

8. **Thẻ QR chưa gán hiển thị friendly:**
   - Trang phải đẹp, không trông như lỗi
   - Có CTA dẫn về trang chủ hoặc liên hệ

---

## 📦 OUTPUT MONG ĐỢI

Sau Phần 6:
- Website public hoàn chỉnh và chuyên nghiệp
- Bio QR động, đẹp, mobile-first
- SEO đầy đủ — Google index được, share Zalo/FB hiển thị đẹp
- Form liên hệ tự vào CRM
- So sánh gà
- Sitemap động + robots.txt

**Sau Phần 6, hệ thống đã có FULL FRONT-END.** Phần 7 thêm AI marketing và tự động hóa, Phần 8 hoàn thiện dashboard và báo cáo.

**Báo lại khi xong, tôi chuẩn bị Phần 7 (AI + Tự động hoá + CRM)!**
