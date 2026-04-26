# PROMPT CHO CLAUDE CODE — PHẦN 7: AI + TỰ ĐỘNG HOÁ + CRM
## Dự án: Gà Chọi Việt Ninh Bình (gachoivietnb.com)

---

## 🎯 NHIỆM VỤ CỦA BẠN (Claude Code)

Build **6 sub-modules thông minh hoá** — sau khi xong, hệ thống tự làm phần lớn việc thủ công:

1. **AI Marketing** — Gemini tự viết bio gà, bài Zalo/FB, caption, PDF VIP
2. **Chatbot nội bộ** — Gemini trả lời hướng dẫn sử dụng cho nhân viên
3. **Push thông minh** — không chỉ tiêm phòng (Phần 4), thêm alerts kho/đơn hàng/dịch bệnh
4. **Offline Mode** — PWA với cache + queue sync khi có mạng
5. **CRM nâng cao** — VIP auto, alert matching, review system
6. **Nhân sự** — quản lý user, chấm công, phân ca, nhật ký hoạt động

**Sau khi hoàn thành Phần 7:**
- Click "Tạo bio AI" cho 1 con gà → 5 giây sau có mô tả 200-300 từ chuyên nghiệp
- Click "Tạo bài Zalo" → Gemini viết bài đăng theo template
- Tạo PDF VIP đẹp cho khách cấp cao
- Mở chatbot "Làm sao ghi vần?" → trả lời streaming với hướng dẫn
- Mất mạng → vẫn nhập gà chết được, online lại tự sync
- Đặt 50tr trong 1 đơn → khách tự upgrade tier=VIP
- Set 1 con gà mới `is_for_sale=true` → khách subscribe đúng tiêu chí nhận thông báo

---

## 📋 NHẮC LẠI QUY TẮC

1. **Tiếng Anh code, tiếng Việt UI**
2. **Mobile-first**
3. **TypeScript strict**
4. **KHÔNG sửa schema cũ — chỉ thêm**
5. **Streaming cho chatbot** — UX tốt hơn
6. **Cache aggressive cho AI** — Gemini không miễn phí, dùng tiết kiệm

---

## 📦 BƯỚC 1: CÀI THÊM PACKAGES

```bash
# IndexedDB wrapper cho offline
npm install idb

# Date utilities (đã có)

# Gemini SDK đã có từ Phần 1
```

---

## 🗄️ BƯỚC 2: MIGRATION BỔ SUNG

Tạo file `supabase/migrations/20260701000001_phase7_ai_crm_hr.sql`:

```sql
-- =====================================================
-- PHASE 7: AI + CRM + HR
-- =====================================================

-- =====================================================
-- 1. AI GENERATIONS LOG (track AI usage)
-- =====================================================

CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_type TEXT NOT NULL,  -- 'bio', 'zalo_post', 'fb_post', 'caption', 'vip_pdf'
  related_entity_type TEXT,        -- 'chickens', 'sales_orders'
  related_entity_id UUID,
  model_used TEXT,                 -- 'gemini-2.0-flash-exp', 'gemini-2.0-pro'
  input_tokens INT,
  output_tokens INT,
  prompt_summary TEXT,
  output_text TEXT,
  generated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_generations_entity ON ai_generations(related_entity_type, related_entity_id);
CREATE INDEX idx_ai_generations_date ON ai_generations(created_at DESC);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view ai logs" ON ai_generations FOR SELECT USING (is_authenticated_staff());
CREATE POLICY "Staff insert ai logs" ON ai_generations FOR INSERT WITH CHECK (is_authenticated_staff());

-- =====================================================
-- 2. CUSTOMER REVIEWS
-- =====================================================

CREATE TABLE customer_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  review_token TEXT UNIQUE,         -- token random gửi email
  token_expires_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_customer ON customer_reviews(customer_id);
CREATE INDEX idx_reviews_token ON customer_reviews(review_token);

ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
-- Public chỉ xem reviews đã public + submit qua token
CREATE POLICY "Public view public reviews" ON customer_reviews FOR SELECT
  USING (is_public = TRUE AND reviewed_at IS NOT NULL);
CREATE POLICY "Public submit review with token" ON customer_reviews FOR UPDATE
  USING (review_token IS NOT NULL AND token_expires_at > NOW());
CREATE POLICY "Staff manage reviews" ON customer_reviews FOR ALL USING (is_authenticated_staff());

-- =====================================================
-- 3. AUTO VIP CLASSIFICATION
-- =====================================================

CREATE OR REPLACE FUNCTION auto_classify_vip()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto upgrade tier nếu vượt ngưỡng
  IF NEW.total_spent >= 50000000 OR NEW.total_purchased >= 5 THEN
    IF NEW.tier = 'thuong' THEN
      NEW.tier := 'vip';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_classify_vip
  BEFORE UPDATE OF total_spent, total_purchased ON customers
  FOR EACH ROW EXECUTE FUNCTION auto_classify_vip();

-- =====================================================
-- 4. CUSTOMER ALERT MATCHING FUNCTION
-- =====================================================

-- Function tìm những customer subscribe phù hợp với 1 con gà
CREATE OR REPLACE FUNCTION find_matching_customers_for_chicken(p_chicken_id UUID)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  alert_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.phone,
    c.email,
    ca.id
  FROM customer_alerts ca
  JOIN customers c ON c.id = ca.customer_id
  JOIN chickens ch ON ch.id = p_chicken_id
  WHERE ca.is_active = TRUE
    AND ch.is_for_sale = TRUE
    AND ch.status = 'dang_nuoi'
    AND (ca.breed_filter IS NULL OR ca.breed_filter = ch.breed_id)
    AND (ca.age_min_months IS NULL OR
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, ch.birth_date)) >= ca.age_min_months)
    AND (ca.age_max_months IS NULL OR
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, ch.birth_date)) <= ca.age_max_months)
    AND (ca.price_max IS NULL OR ch.listed_price <= ca.price_max);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ALERTS NEEDING PUSH (chưa được push đi)
-- =====================================================

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_alerts_unpushed
  ON alerts(created_at) WHERE push_sent_at IS NULL;

-- =====================================================
-- 6. STAFF FUNCTIONS
-- =====================================================

-- Function: cấp lời mời nhân viên (admin only)
CREATE OR REPLACE FUNCTION invite_staff(
  p_email TEXT,
  p_full_name TEXT,
  p_role user_role DEFAULT 'nhan_vien',
  p_assigned_areas UUID[] DEFAULT '{}'
) RETURNS TEXT AS $$
DECLARE
  v_invitation_token TEXT;
BEGIN
  -- Chỉ chu_trai mới được invite
  IF auth_role() != 'chu_trai' THEN
    RAISE EXCEPTION 'Chỉ chủ trại mới được mời nhân viên';
  END IF;

  v_invitation_token := encode(gen_random_bytes(24), 'hex');

  -- Lưu thông tin lời mời (sẽ dùng cho activate sau)
  INSERT INTO system_settings (key, value)
  VALUES (
    'invite_' || v_invitation_token,
    jsonb_build_object(
      'email', p_email,
      'full_name', p_full_name,
      'role', p_role,
      'assigned_areas', p_assigned_areas,
      'created_at', NOW()
    )
  );

  RETURN v_invitation_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. ACTIVITY LOGS - VIEW VỚI THÔNG TIN ĐẦY ĐỦ
-- =====================================================

CREATE OR REPLACE VIEW activity_logs_detailed AS
SELECT
  al.id,
  al.action,
  al.entity_type,
  al.entity_id,
  al.before_data,
  al.after_data,
  al.ip_address,
  al.created_at,
  p.full_name AS user_name,
  p.role AS user_role
FROM activity_logs al
LEFT JOIN profiles p ON p.id = al.user_id
ORDER BY al.created_at DESC;
```

---

## 🤖 BƯỚC 3: AI MARKETING — GEMINI INTEGRATION

### `src/lib/gemini/prompts.ts`

```typescript
export const SYSTEM_PROMPT_BIO = `Bạn là copywriter chuyên về gà chọi Việt Nam, viết content cho trang trại Gà Chọi Việt Ninh Bình.

NGUYÊN TẮC:
- Viết 200-300 từ, đầy thuyết phục nhưng không cường điệu
- Tone: chuyên nghiệp, đáng tin cậy
- Highlight: gia phả, sức khỏe, thành tích vần (nếu có)
- Đề cập xuất xứ Ninh Bình - đất gà chọi truyền thống
- Kết thúc bằng CTA: "Liên hệ Gà Chọi Việt NB qua Zalo để xem trực tiếp"
- KHÔNG dùng emoji
- KHÔNG sai sự thật - chỉ dựa trên dữ liệu được cung cấp`

export const SYSTEM_PROMPT_ZALO = `Bạn viết bài đăng Zalo cho trang trại gà chọi.

NGUYÊN TẮC:
- Bài 100-150 từ, ngắn gọn dễ đọc
- Hook ở câu đầu để khách dừng lại
- Có 2-3 emoji chiến lược (🐓 🔥 ✅)
- Hashtag cuối: #gachoiviet #ninhbinh #[giống]
- CTA: comment hoặc inbox`

export const SYSTEM_PROMPT_FB = `Bạn viết caption Facebook cho trang trại gà chọi.

NGUYÊN TẮC:
- 80-120 từ, thân thiện
- Có emoji
- Có line break để dễ đọc
- CTA inbox`

export const SYSTEM_PROMPT_CHATBOT = `Bạn là trợ lý AI nội bộ của hệ thống quản lý trang trại Gà Chọi Việt NB.
Trả lời câu hỏi của nhân viên về cách sử dụng hệ thống.

KIẾN THỨC HỆ THỐNG:

## Quản lý hồ sơ gà
- Trang: /admin/ho-so-ga
- Thêm gà mới: nút "Thêm gà mới" → form đầy đủ
- Nhập hàng loạt: /admin/ho-so-ga/nhap-hang-loat (nhập nhiều con cùng lúc)
- Import Excel: /admin/ho-so-ga/import-excel
- Mỗi con tự động sinh mã GA-[GIỐNG]-[NĂM]-[SỐ]

## Thẻ QR
- 9999 thẻ QR đã in sẵn (số 0001-9999)
- Khi tạo gà mới: chọn thẻ QR chưa dùng (hệ thống gợi ý số nhỏ nhất)
- In PDF thẻ: /admin/generate-qr
- Quét QR: /admin/quet-qr (camera trên điện thoại)

## Tiêm phòng
- Trang: /admin/tiem-phong
- 8 mũi vaccine tự động lên lịch theo ngày sinh
- Tab "Hôm nay" → tick chọn nhiều con → nút "Xác nhận tiêm tất cả"
- Cron tự gửi nhắc 7h sáng qua push + email

## Vần gà
- Trang: /admin/van-ga
- Ghi buổi vần: chấm 3 điểm (thể lực, vóc dáng, tính hung hãn) thang 0-10
- Điểm tổng tự tính = trung bình 3 điểm
- Top performers: gà đã vần ≥3 buổi

## Sinh sản
- Trang: /admin/sinh-san
- Tạo lứa: chọn 1 mái + 1-3 đực + ngày ghép
- Update trứng → đánh dấu nở → theo dõi gà con → tốt nghiệp

## Mua bán
- Mua: /admin/mua-vao - tạo phiếu nhập từ NCC, tự tạo hồ sơ gà + xếp khu cách ly
- Bán: /admin/ban-ra - tạo đơn hàng → đặt cọc → giao
- Workflow đơn: hoi_mua → dat_coc → da_giao (hoặc huy)

## Tài chính
- /admin/tai-chinh - dashboard tổng quan
- /admin/tai-chinh/chi-phi - nhập chi phí 8 hạng mục
- Báo cáo: P&L, nhập xuất tồn, hiệu suất giống, công nợ
- Xuất Excel được

NGUYÊN TẮC TRẢ LỜI:
- Ngắn gọn, đi thẳng vào vấn đề
- Đưa link trang cụ thể nếu có
- Chỉ trả lời về hệ thống Gà Chọi Việt NB, không trả lời câu hỏi không liên quan
- Trả lời bằng tiếng Việt`
```

### `src/lib/gemini/generate-bio.ts`

```typescript
import { getGeminiModel } from './client'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT_BIO } from './prompts'

export async function generateChickenBio(chickenId: string): Promise<string> {
  const supabase = await createClient()

  // Lấy data đầy đủ về con gà
  const { data: chicken } = await supabase
    .from('chickens_with_details')
    .select('*')
    .eq('id', chickenId)
    .single()

  if (!chicken) throw new Error('Chicken not found')

  // Lấy training stats
  const { data: training } = await supabase
    .from('chicken_training_stats')
    .select('*')
    .eq('chicken_id', chickenId)
    .single()

  // Lấy vaccinations done
  const { count: vaccinationsDone } = await supabase
    .from('vaccinations')
    .select('*', { count: 'exact', head: true })
    .eq('chicken_id', chickenId)
    .eq('status', 'da_tiem')

  // Build context
  const context = `
THÔNG TIN GÀ:
- Tên: ${chicken.name || chicken.chicken_code}
- Mã: ${chicken.chicken_code}
- Giống: ${chicken.breed_name}
- Tuổi: ${chicken.age_months} tháng
- Cân nặng: ${chicken.weight_kg || 'chưa cân'} kg
- Màu lông: ${chicken.color || 'chưa ghi'}
- Giới tính: ${chicken.gender === 'trong' ? 'Trống' : chicken.gender === 'mai' ? 'Mái' : 'Chưa xác định'}

GIA PHẢ:
- Bố: ${chicken.parent_male_code ? `${chicken.parent_male_code} (${chicken.parent_male_name || '-'})` : 'chưa rõ'}
- Mẹ: ${chicken.parent_female_code ? `${chicken.parent_female_code} (${chicken.parent_female_name || '-'})` : 'chưa rõ'}

SỨC KHOẺ:
- Đã tiêm ${vaccinationsDone || 0}/8 mũi vaccine

THÀNH TÍCH VẦN:
${training && training.total_sessions > 0 ? `
- Đã vần ${training.total_sessions} buổi
- Thắng ${training.wins} / Thua ${training.losses} / Hoà ${training.draws}
- Điểm trung bình: thể lực ${training.avg_strength}/10, vóc dáng ${training.avg_appearance}/10, hung hãn ${training.avg_aggression}/10
- Điểm tổng TB: ${training.avg_total}/10
` : '- Chưa vần buổi nào'}

GIÁ:
${chicken.listed_price ? `- Giá bán: ${new Intl.NumberFormat('vi-VN').format(chicken.listed_price)} đ` : '- Chưa định giá'}
`

  const model = getGeminiModel('gemini-2.0-flash-exp')
  const result = await model.generateContent([
    { text: SYSTEM_PROMPT_BIO },
    { text: 'Hãy viết mô tả marketing cho con gà này:\n\n' + context },
  ])

  const text = result.response.text()

  // Lưu vào DB
  await supabase.from('chickens').update({
    description: text,
    ai_description_updated_at: new Date().toISOString(),
  }).eq('id', chickenId)

  // Log generation
  await supabase.from('ai_generations').insert({
    generation_type: 'bio',
    related_entity_type: 'chickens',
    related_entity_id: chickenId,
    model_used: 'gemini-2.0-flash-exp',
    output_text: text,
    prompt_summary: `Bio cho ${chicken.chicken_code}`,
  })

  // Trigger revalidate trang bio public
  // (revalidatePath imports server action — may need adjustment)
  // import { revalidatePath } from 'next/cache'
  // revalidatePath(`/ga/${chicken.tag_number}`)

  return text
}
```

### `src/lib/gemini/generate-zalo-post.ts`

Tương tự generate-bio nhưng dùng SYSTEM_PROMPT_ZALO, không lưu vào chickens.description.

### `src/app/api/ai/generate-bio/route.ts`

```typescript
import { generateChickenBio } from '@/lib/gemini/generate-bio'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chicken_id } = await request.json()
  if (!chicken_id) return NextResponse.json({ error: 'Missing chicken_id' }, { status: 400 })

  try {
    const bio = await generateChickenBio(chicken_id)
    return NextResponse.json({ data: { bio } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
```

### `src/app/api/ai/generate-zalo-post/route.ts`

```typescript
import { getGeminiModel } from '@/lib/gemini/client'
import { SYSTEM_PROMPT_ZALO } from '@/lib/gemini/prompts'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chicken_id, custom_context } = await request.json()

  // Lấy thông tin gà
  const { data: chicken } = await supabase
    .from('public_chickens')
    .select('*')
    .eq('id', chicken_id)
    .single()

  if (!chicken) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const context = `
Gà: ${chicken.name || chicken.chicken_code}
Giống: ${chicken.breed_name}
Tuổi: ${chicken.age_months} tháng
${chicken.listed_price ? `Giá: ${new Intl.NumberFormat('vi-VN').format(chicken.listed_price)} đ` : ''}
Đã tiêm: ${chicken.vaccinations_done}/8 mũi
${chicken.training_sessions_count > 0 ? `Đã vần: ${chicken.training_sessions_count} buổi, điểm TB ${chicken.avg_training_score}/10` : ''}

${custom_context ? `Gợi ý thêm: ${custom_context}` : ''}

Link: https://gachoivietnb.com/ga/${chicken.tag_number}
`

  const model = getGeminiModel('gemini-2.0-flash-exp')
  const result = await model.generateContent([
    { text: SYSTEM_PROMPT_ZALO },
    { text: context },
  ])

  const text = result.response.text()

  await supabase.from('ai_generations').insert({
    generation_type: 'zalo_post',
    related_entity_type: 'chickens',
    related_entity_id: chicken_id,
    model_used: 'gemini-2.0-flash-exp',
    output_text: text,
  })

  return NextResponse.json({ data: { text } })
}
```

### `src/app/api/ai/generate-vip-pdf/route.ts`

Sử dụng Gemini Pro để viết content chi tiết hơn, sau đó render thành PDF đẹp với jsPDF.

```typescript
import { getGeminiModel } from '@/lib/gemini/client'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chicken_id } = await request.json()

  // Lấy data full + pedigree
  const { data: chicken } = await supabase
    .from('chickens_with_details')
    .select('*')
    .eq('id', chicken_id)
    .single()

  // Generate text với Gemini Pro (chất lượng cao hơn)
  const model = getGeminiModel('gemini-2.0-pro')
  const prompt = `Viết 1 hồ sơ bán hàng VIP cho gà chọi này. Format có 3 phần:
  1. GIỚI THIỆU (100 từ)
  2. ĐẶC ĐIỂM NỔI BẬT (4-5 điểm bullet)
  3. CAM KẾT TỪ TRANG TRẠI (50 từ)

  Thông tin: ${JSON.stringify(chicken, null, 2)}`

  const result = await model.generateContent(prompt)
  const aiContent = result.response.text()

  // Build PDF
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('GÀ CHỌI VIỆT NB', 105, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Hồ sơ gà chọi cao cấp', 105, 28, { align: 'center' })

  // Chicken info box
  doc.setDrawColor(200)
  doc.roundedRect(15, 40, 180, 30, 3, 3)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(chicken.name || chicken.chicken_code, 20, 50)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Giống: ${chicken.breed_name} · Tuổi: ${chicken.age_months} tháng`, 20, 57)
  doc.text(`Mã: ${chicken.chicken_code}`, 20, 63)

  // AI content
  let y = 80
  doc.setFontSize(10)
  const lines = doc.splitTextToSize(aiContent, 180)
  lines.forEach((line: string) => {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
    doc.text(line, 15, y)
    y += 5
  })

  // Footer
  y += 10
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('Liên hệ: gachoivietnb.com — Zalo OA: Gà Chọi Việt NB', 105, y, { align: 'center' })

  await supabase.from('ai_generations').insert({
    generation_type: 'vip_pdf',
    related_entity_type: 'chickens',
    related_entity_id: chicken_id,
    model_used: 'gemini-2.0-pro',
    output_text: aiContent,
  })

  const buffer = Buffer.from(doc.output('arraybuffer'))
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="vip-${chicken.chicken_code}.pdf"`,
    },
  })
}
```

---

## 💬 BƯỚC 4: CHATBOT NỘI BỘ (STREAMING)

### `src/app/api/ai/chatbot/route.ts`

```typescript
import { getGeminiModel } from '@/lib/gemini/client'
import { SYSTEM_PROMPT_CHATBOT } from '@/lib/gemini/prompts'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'edge'  // streaming dùng edge runtime

export async function POST(request: Request) {
  const { messages } = await request.json()
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
  }

  const model = getGeminiModel('gemini-2.0-flash-exp')

  // Build conversation
  const lastMessage = messages[messages.length - 1]
  const history = messages.slice(0, -1).map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT_CHATBOT }] },
      { role: 'model', parts: [{ text: 'Tôi đã sẵn sàng hỗ trợ bạn về hệ thống.' }] },
      ...history,
    ],
  })

  const stream = await chat.sendMessageStream(lastMessage.content)

  // Convert to ReadableStream
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream.stream) {
        const text = chunk.text()
        controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
```

### `src/components/admin/chatbot/ChatbotFloatingButton.tsx`

```typescript
'use client'
import { useState, useRef, useEffect } from 'react'

export function ChatbotFloatingButton() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage = { role: 'user' as const, content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Add empty assistant message for streaming
    setMessages(m => [...m, { role: 'assistant', content: '' }])

    const res = await fetch('/api/ai/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages }),
    })

    if (!res.body) {
      setLoading(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let acc = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      acc += chunk
      setMessages(m => {
        const arr = [...m]
        arr[arr.length - 1] = { role: 'assistant', content: acc }
        return arr
      })
    }

    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-40 hover:bg-blue-600"
      >
        💬
      </button>

      {open && (
        <div className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 md:w-96 md:h-[500px] bg-white md:rounded-lg shadow-xl flex flex-col z-50 border">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-medium">🤖 Trợ lý AI</div>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-900">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-8">
                Hỏi tôi về cách sử dụng hệ thống.<br/>
                Ví dụ: "Làm sao ghi kết quả vần?"
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}>
                  {m.content || (loading && i === messages.length - 1 ? '...' : '')}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Hỏi tôi..."
              className="flex-1 border rounded px-3 py-2 text-sm"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              Gửi
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

Thêm vào `AdminLayout` (Phần 1):
```typescript
<ChatbotFloatingButton />
```

---

## 🔔 BƯỚC 5: PUSH THÔNG MINH

### `src/app/api/cron/hourly/route.ts`

Endpoint chạy mỗi giờ (cron-job.org gọi):

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToAllAdmins } from '@/lib/push/sender'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const hour = now.getHours()
  const tasks: string[] = []

  // 7 AM: vaccination reminder + AI updates + review requests
  if (hour === 7) {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/cron/daily-vaccination-reminder`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    tasks.push('vaccination_reminder')

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/cron/daily-ai-update`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    tasks.push('ai_update')

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/cron/send-review-requests`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    tasks.push('review_requests')
  }

  // Mỗi 4h: match customer alerts với gà mới
  if (hour % 4 === 0) {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/cron/match-customer-alerts`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    tasks.push('alert_matching')
  }

  // Mỗi giờ: push các alerts chưa được push
  await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/cron/push-pending-alerts`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
  tasks.push('push_alerts')

  return NextResponse.json({ tasks_run: tasks })
}
```

### `src/app/api/cron/push-pending-alerts/route.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushToAllAdmins } from '@/lib/push/sender'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Lấy alerts chưa push, ưu tiên cao nhất
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .is('push_sent_at', null)
    .in('priority', ['cao', 'khan_cap'])
    .order('priority', { ascending: false })
    .order('created_at')
    .limit(20)

  if (!alerts?.length) return NextResponse.json({ pushed: 0 })

  for (const alert of alerts) {
    await sendPushToAllAdmins({
      title: alert.title,
      body: alert.message,
      url: getUrlForAlertType(alert.alert_type, alert.related_entity_id),
      tag: alert.id,
    })

    await supabase
      .from('alerts')
      .update({ push_sent_at: new Date().toISOString() })
      .eq('id', alert.id)
  }

  return NextResponse.json({ pushed: alerts.length })
}

function getUrlForAlertType(type: string, entityId: string | null): string {
  switch (type) {
    case 'kho_thuoc_thap':
    case 'kho_thuoc_het':
      return `/admin/kho-thuoc/${entityId}`
    case 'kho_thuc_an_thap':
      return `/admin/kho-thuc-an/${entityId}`
    case 'dich_benh':
      return `/admin/benh`
    default:
      return '/admin'
  }
}
```

### Setup cron-job.org

1. Đăng ký tài khoản tại https://cron-job.org (free)
2. Tạo cron job: URL = `https://gachoivietnb.com/api/cron/hourly`
3. Schedule: every hour
4. Header: `Authorization: Bearer <CRON_SECRET>`

---

## 📡 BƯỚC 6: OFFLINE MODE

### `public/sw.js` (mở rộng)

```javascript
// Phần 4 đã có push handlers, giờ thêm caching và offline

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`

const PRECACHE_URLS = [
  '/admin',
  '/admin/ho-so-ga',
  '/admin/quet-qr',
  '/offline',
  '/manifest.json',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !k.includes(CACHE_VERSION))
          .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // API routes: network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone()
          caches.open(RUNTIME_CACHE).then(c => c.put(request, clone))
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Pages: stale-while-revalidate
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request)
          .then(res => {
            caches.open(RUNTIME_CACHE).then(c => c.put(request, res.clone()))
            return res
          })
          .catch(() => caches.match('/offline'))
        return cached || fetchPromise
      })
    )
    return
  }

  // Static: cache first
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  )
})

// Push handlers (đã có Phần 4)
self.addEventListener('push', function(event) {
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: { url: data.url || '/admin' },
      tag: data.tag,
      requireInteraction: data.priority === 'khan_cap',
    })
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

### `src/lib/offline/queue.ts`

```typescript
import { openDB } from 'idb'

const DB_NAME = 'gachoivietnb-offline'
const DB_VERSION = 1

export async function getOfflineDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('queue')) {
        const store = db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
        store.createIndex('created_at', 'created_at')
      }
    },
  })
}

export async function queueRequest(req: {
  url: string
  method: string
  body: any
  description: string
}) {
  const db = await getOfflineDB()
  await db.add('queue', { ...req, created_at: Date.now() })
}

export async function processQueue(): Promise<{ success: number; failed: number }> {
  const db = await getOfflineDB()
  const items = await db.getAll('queue')

  let success = 0
  let failed = 0

  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      })
      if (res.ok) {
        await db.delete('queue', item.id)
        success++
      } else failed++
    } catch (e) {
      failed++
    }
  }

  return { success, failed }
}

export async function getQueueCount(): Promise<number> {
  const db = await getOfflineDB()
  return db.count('queue')
}
```

### `src/components/admin/OnlineStatusBar.tsx`

```typescript
'use client'
import { useEffect, useState } from 'react'
import { processQueue, getQueueCount } from '@/lib/offline/queue'

export function OnlineStatusBar() {
  const [online, setOnline] = useState(true)
  const [queueCount, setQueueCount] = useState(0)

  useEffect(() => {
    setOnline(navigator.onLine)

    const handleOnline = async () => {
      setOnline(true)
      const result = await processQueue()
      setQueueCount(await getQueueCount())
      if (result.success > 0) {
        alert(`Đã đồng bộ ${result.success} thao tác offline`)
      }
    }

    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    getQueueCount().then(setQueueCount)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online && queueCount === 0) return null

  return (
    <div className={`fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-24 md:w-72 px-3 py-2 rounded shadow-lg text-sm z-30 ${
      online ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900'
    }`}>
      {online
        ? `🔄 Đang đồng bộ ${queueCount} thao tác...`
        : `📵 Mất mạng. Đã lưu ${queueCount} thao tác chờ sync.`
      }
    </div>
  )
}
```

---

## 👥 BƯỚC 7: CRM NÂNG CAO

### `src/app/api/cron/match-customer-alerts/route.ts`

Khi gà mới được set is_for_sale = true → gửi email cho customer subscribe matching:

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Lấy gà mới được listed trong 4h qua
  const { data: newChickens } = await supabase
    .from('chickens')
    .select('id, chicken_code, name')
    .eq('is_for_sale', true)
    .eq('status', 'dang_nuoi')
    .gte('listed_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())

  if (!newChickens?.length) return NextResponse.json({ matched: 0 })

  const resend = new Resend(process.env.RESEND_API_KEY!)
  let totalSent = 0

  for (const chicken of newChickens) {
    const { data: matches } = await supabase.rpc('find_matching_customers_for_chicken', {
      p_chicken_id: chicken.id,
    })

    for (const match of matches || []) {
      if (!match.customer_email) continue

      await resend.emails.send({
        from: process.env.RESEND_FROM!,
        to: match.customer_email,
        subject: `🐓 Gà mới phù hợp với bạn: ${chicken.name || chicken.chicken_code}`,
        html: `
          <p>Xin chào ${match.customer_name},</p>
          <p>Trang trại Gà Chọi Việt NB vừa có 1 con gà mới phù hợp với tiêu chí bạn đăng ký.</p>
          <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/ga/${chicken.id}">Xem chi tiết</a></p>
        `,
      }).catch(() => {})

      totalSent++
    }
  }

  return NextResponse.json({ matched: totalSent })
}
```

### `src/app/api/cron/send-review-requests/route.ts`

Gửi email request review cho khách 7 ngày sau giao hàng:

```typescript
// Tạo review token + gửi email với link gachoivietnb.com/danh-gia/[token]
```

### `src/app/danh-gia/[token]/page.tsx`

Public page cho khách review:
- Lấy review by token (chưa expire, chưa submit)
- Form: rating 1-5 sao + comment
- Submit → update reviewed_at, comment, rating

---

## 👤 BƯỚC 8: NHÂN SỰ

### `/admin/nhan-su/page.tsx`

List nhân viên + nút "Mời nhân viên mới" → form nhập email + role + areas → tạo invitation.

### `/admin/nhan-su/cham-cong/page.tsx`

- Calendar view tháng hiện tại
- Mỗi ngày có check-in/out của từng nhân viên
- Mobile: nút "Check-in / Check-out" lớn cho nhân viên

### `/admin/nhan-su/phan-ca/page.tsx`

Kanban-style board:
- Cột: Chờ làm / Đang làm / Hoàn thành
- Card task: tên task + nhân viên + khu
- Drag drop để chuyển status

### `/admin/nhat-ky/page.tsx`

Activity logs với:
- Filter: user, entity_type, action, date range
- Diff view: hiển thị before vs after data
- Pagination

---

## 📄 BƯỚC 9: PAGES TRUNG TÂM

### `/admin/ai-marketing/page.tsx`

Dashboard AI:
- Stats: số bio đã tạo tháng, số bài Zalo, chi phí ước tính
- Bulk action: "Tạo bio cho tất cả gà chưa có mô tả AI"
- Form: tạo Zalo post từ chicken
- Form: tạo VIP PDF

### Tích hợp với Phần 2 (chi tiết gà):

**Tab "Tổng quan"** thêm:
- Nút "Tạo lại mô tả AI" — nếu `ai_description_updated_at` cũ hơn 7 ngày, hiển thị badge "cần cập nhật"
- Hiển thị description hiện có

---

## ✅ CHECKLIST PHẦN 7

### AI Marketing
- [ ] Click "Tạo bio AI" cho 1 con → 5-10s sau có description trong DB
- [ ] Bio mới được lưu vào ai_generations log
- [ ] Tạo bài Zalo → text 100-150 từ với hashtag
- [ ] Tạo VIP PDF → download PDF có format đẹp

### Chatbot
- [ ] Click bubble chat → mở panel
- [ ] Hỏi "Làm sao ghi vần?" → trả lời streaming với link `/admin/van-ga`
- [ ] Hỏi câu không liên quan → AI từ chối lịch sự
- [ ] Mobile: chat panel full screen

### Push thông minh
- [ ] Setup cron-job.org → ping `/api/cron/hourly` mỗi giờ
- [ ] Tạo alert thủ công với priority `khan_cap` → 1h sau nhận push notification
- [ ] Alert có push_sent_at = timestamp sau khi push
- [ ] Alert priority `thap` không bị push (chỉ cao+khẩn cấp)

### Offline
- [ ] Mở app online → service worker đăng ký thành công
- [ ] Devtools → tab Network → "Offline" → vẫn vào được trang đã visit
- [ ] Trang chưa visit → fallback `/offline`
- [ ] (Manual queue test) gọi `queueRequest` → online lại tự sync

### CRM
- [ ] Customer mua đơn 60tr → tier auto upgrade `vip`
- [ ] Customer mua 5 đơn → tier auto upgrade `vip`
- [ ] Set 1 con gà is_for_sale = true matching tiêu chí 1 customer alert → 4h sau email gửi
- [ ] Click link review trong email → public form nhập rating + comment
- [ ] Submit review → reviewed_at được set

### Nhân sự
- [ ] Chu trai mời 1 nhân viên qua email → tạo invitation token
- [ ] Trang chấm công: check-in được trên mobile
- [ ] Tạo assignment "Cho ăn khu A" cho 1 nhân viên → nhân viên thấy ở /admin/nhan-su/phan-ca
- [ ] Nhật ký hoạt động: mọi update gà có log với before/after data

---

## 🚨 LƯU Ý TRIỂN KHAI

1. **Gemini API rate limit:**
   - Free tier: 15 RPM, 1500/ngày
   - Đủ cho 1 trang trại bình thường
   - Nếu vượt: nâng pay-as-you-go ~$0.075/1M tokens (rất rẻ)

2. **AI generation cache:**
   - Bio chỉ regenerate khi có data mới (training/vaccination)
   - Daily cron check `ai_description_updated_at` cũ hơn 7 ngày + có training mới
   - Tránh gọi AI không cần thiết

3. **Cron-job.org:**
   - Free tier: 1 job với schedule mỗi 1 phút
   - Đủ cho `/api/cron/hourly` chạy mỗi giờ
   - Backup: GitHub Actions cron nếu cần

4. **Streaming chatbot:**
   - Edge runtime hỗ trợ tốt nhất
   - Cần `runtime = 'edge'` trong route handler
   - Mobile UX: vibration khi nhận message (optional)

5. **Service Worker:**
   - Test kỹ trên Chrome desktop trước khi push lên prod
   - Lighthouse PWA score ≥ 90
   - Versioning: tăng `CACHE_VERSION` mỗi lần deploy lớn

6. **IndexedDB queue:**
   - Có thể bị clear nếu user clear cookies
   - Cảnh báo user trước khi clear
   - Backup quan trọng: snapshot ra file JSON

7. **Zalo integration:**
   - Phần 7 chỉ dùng email + manual Zalo link
   - Phase 2 (sau khi có user thật): đăng ký Zalo OA, tích hợp API gửi tin chính thức
   - Cần verified business account cho Zalo OA

8. **Review tokens:**
   - Token expires sau 30 ngày
   - Mỗi token chỉ submit 1 lần
   - Lưu IP để chống spam

9. **PDF VIP tiếng Việt:**
   - jsPDF không có font tiếng Việt mặc định
   - Cần embed Roboto hoặc Noto Sans (đã warning ở Phần 5)
   - Workaround: hoặc generate PDF từ HTML qua Puppeteer (server-side, phức tạp hơn)

---

## 📦 OUTPUT MONG ĐỢI

Sau Phần 7:
- AI tự viết content marketing → giảm 90% việc viết tay
- Chatbot trả lời nhân viên 24/7
- Push notification cho mọi alert quan trọng
- Offline mode hoạt động
- CRM tự động: VIP, alert matching, review
- Quản lý nhân sự + nhật ký hoạt động đầy đủ

**Sau Phần 7, hệ thống đã thông minh và tự động hoá tối đa.** Phần 8 là hoàn thiện: dashboard tổng quan đẹp + báo cáo nâng cao + dark mode + hướng dẫn.

**Báo lại khi xong, tôi chuẩn bị Phần 8 — phần cuối cùng!**
