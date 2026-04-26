# PROMPT CHO CLAUDE CODE — PHẦN 2: HỒ SƠ GÀ + QR + CHUỒNG TRẠI
## Dự án: Gà Chọi Việt Ninh Bình (gachoivietnb.com)

---

## 🎯 NHIỆM VỤ CỦA BẠN (Claude Code)

Bạn sẽ build **3 module CORE** của hệ thống — sau khi xong Phần 2, trang trại đã có thể bắt đầu sử dụng thực tế:

1. **Hồ sơ gà** — CRUD đầy đủ + nhập hàng loạt + import Excel + upload ảnh Google Drive
2. **Hệ thống QR** — quản lý 9999 thẻ + generate PDF in thẻ + scanner camera + xử lý quét QR chưa gán
3. **Chuồng trại** — sơ đồ trực quan + CRUD phân cấp 3 tầng + auto-assign chuồng

**Sau khi hoàn thành Phần 2:**
- Nhập được 1 con gà → tự động sinh mã `GA-ASIL-25-0001`
- Gán thẻ QR vào con gà đó
- In file PDF chứa 100 thẻ QR mẫu
- Upload ảnh con gà lên Google Drive
- Tạo cấu trúc chuồng trại đầy đủ
- Nhập hàng loạt 50 con gà cùng lúc
- Quét QR bằng camera → ra hồ sơ gà tương ứng

---

## 📋 NHẮC LẠI QUY TẮC (đọc lại trước khi code)

1. **Tiếng Anh cho code, tiếng Việt cho UI label**
2. **Mobile-first** — design cho điện thoại trước
3. **TypeScript strict** — không `any`
4. **Server Components mặc định** — `'use client'` chỉ khi cần state/event
5. **KHÔNG được sửa schema Phần 1** — nếu cần thêm cột, tạo migration mới (additive only)
6. **Tên domain:** `gachoivietnb.com`

---

## 📦 BƯỚC 1: CÀI THÊM PACKAGES

```bash
# QR generation
npm install qrcode
npm install --save-dev @types/qrcode

# QR scanner
npm install html5-qrcode

# PDF generation
npm install jspdf

# Excel parsing
npm install xlsx

# Form validation
npm install react-hook-form @hookform/resolvers

# Toast notifications
npx shadcn@latest add toast sonner

# Additional shadcn components
npx shadcn@latest add data-table command popover calendar \
  drawer textarea checkbox radio-group switch slider tooltip \
  alert-dialog avatar
```

---

## 🗄️ BƯỚC 2: MIGRATION BỔ SUNG (NẾU CẦN)

Tạo file `supabase/migrations/20260201000001_phase2_additions.sql`:

```sql
-- =====================================================
-- PHASE 2 ADDITIONS - chỉ thêm, không sửa cũ
-- =====================================================

-- View: chickens_with_details (join sẵn để query nhanh)
CREATE OR REPLACE VIEW chickens_with_details AS
SELECT
  c.*,
  b.code AS breed_code,
  b.name_vi AS breed_name,
  b.tier AS breed_tier,
  qt.tag_number,
  cg.full_code AS cage_full_code,
  cg.id AS cage_id_full,
  a.id AS area_id,
  a.code AS area_code,
  a.type AS area_type,
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.birth_date))::INT AS age_months,
  EXTRACT(DAY FROM AGE(CURRENT_DATE, c.birth_date))::INT AS age_days,
  pm.chicken_code AS parent_male_code,
  pm.name AS parent_male_name,
  pf.chicken_code AS parent_female_code,
  pf.name AS parent_female_name
FROM chickens c
LEFT JOIN breeds b ON b.id = c.breed_id
LEFT JOIN qr_tags qt ON qt.id = c.qr_tag_id
LEFT JOIN cages cg ON cg.id = c.cage_id
LEFT JOIN cage_rows cr ON cr.id = cg.row_id
LEFT JOIN areas a ON a.id = cr.area_id
LEFT JOIN chickens pm ON pm.id = c.parent_male_id
LEFT JOIN chickens pf ON pf.id = c.parent_female_id;

-- Function: auto-assign cage cho chicken mới
CREATE OR REPLACE FUNCTION find_available_cage(
  p_area_type area_type DEFAULT 'cach_ly'
) RETURNS UUID AS $$
DECLARE
  v_cage_id UUID;
BEGIN
  SELECT cg.id INTO v_cage_id
  FROM cages cg
  JOIN cage_rows cr ON cr.id = cg.row_id
  JOIN areas a ON a.id = cr.area_id
  WHERE a.type = p_area_type
    AND a.is_active = TRUE
    AND cr.is_active = TRUE
    AND cg.status = 'trong'
  ORDER BY cg.full_code
  LIMIT 1;

  RETURN v_cage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: bulk create cages
CREATE OR REPLACE FUNCTION bulk_create_cages(
  p_row_id UUID,
  p_start_num INT,
  p_count INT,
  p_capacity INT DEFAULT 1
) RETURNS INT AS $$
DECLARE
  v_inserted INT := 0;
  v_i INT;
  v_code TEXT;
BEGIN
  FOR v_i IN p_start_num..(p_start_num + p_count - 1) LOOP
    v_code := LPAD(v_i::TEXT, 3, '0');
    BEGIN
      INSERT INTO cages (row_id, code, capacity, qr_door_code)
      VALUES (p_row_id, v_code, p_capacity,
              'CHUONG-' || (SELECT a.code FROM areas a JOIN cage_rows cr ON cr.area_id = a.id WHERE cr.id = p_row_id)
              || '-' || (SELECT code FROM cage_rows WHERE id = p_row_id)
              || '-' || v_code);
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Skip nếu trùng
      NULL;
    END;
  END LOOP;
  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get available QR tag (số nhỏ nhất chưa dùng)
CREATE OR REPLACE FUNCTION get_next_available_qr_tag()
RETURNS qr_tags AS $$
DECLARE
  v_tag qr_tags;
BEGIN
  SELECT * INTO v_tag
  FROM qr_tags
  WHERE status = 'chua_su_dung'
  ORDER BY tag_number
  LIMIT 1;
  RETURN v_tag;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: lịch sử gà từng ở 1 chuồng
CREATE OR REPLACE FUNCTION get_cage_history(p_cage_id UUID)
RETURNS TABLE (
  chicken_id UUID,
  chicken_code TEXT,
  chicken_name TEXT,
  moved_in TIMESTAMPTZ,
  moved_out TIMESTAMPTZ,
  status chicken_status
) AS $$
BEGIN
  -- Đơn giản: lấy gà hiện tại + dùng activity_logs để tracking lịch sử thay đổi cage
  -- Sẽ enhance ở Phần 8
  RETURN QUERY
  SELECT
    c.id,
    c.chicken_code,
    c.name,
    c.created_at AS moved_in,
    NULL::TIMESTAMPTZ AS moved_out,
    c.status
  FROM chickens c
  WHERE c.cage_id = p_cage_id
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index hỗ trợ search nhanh
CREATE INDEX IF NOT EXISTS idx_chickens_search ON chickens
  USING GIN (to_tsvector('simple', COALESCE(chicken_code, '') || ' ' || COALESCE(name, '')));

-- Index cho qr_tags lookup
CREATE INDEX IF NOT EXISTS idx_qr_tags_number ON qr_tags(tag_number);
```

**Sau khi tạo, chạy file này trong Supabase SQL Editor.**

---

## 🔌 BƯỚC 3: API ROUTES

### File `src/app/api/chickens/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ChickenCreateSchema = z.object({
  name: z.string().optional(),
  breed_id: z.string().uuid(),
  qr_tag_id: z.string().uuid().optional(),
  cage_id: z.string().uuid().optional(),
  gender: z.enum(['trong', 'mai', 'chua_xac_dinh']).default('chua_xac_dinh'),
  birth_date: z.string().optional(),
  source: z.enum(['mua', 'no_tai_trai']),
  parent_male_id: z.string().uuid().optional(),
  parent_female_id: z.string().uuid().optional(),
  weight_kg: z.number().optional(),
  color: z.string().optional(),
  cost_purchase: z.number().optional(),
  notes: z.string().optional(),
  auto_assign_cage: z.boolean().default(true),
})

// POST /api/chickens - tạo 1 con
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = ChickenCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const data = parsed.data

  // Auto-assign cage nếu chưa chọn
  if (!data.cage_id && data.auto_assign_cage) {
    const targetAreaType = data.source === 'mua' ? 'cach_ly' : 'trong'
    const { data: cageId } = await supabase.rpc('find_available_cage', {
      p_area_type: targetAreaType,
    })
    if (cageId) data.cage_id = cageId
  }

  const { auto_assign_cage, ...insertData } = data
  const { data: chicken, error } = await supabase
    .from('chickens')
    .insert({ ...insertData, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Activity log
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'create',
    entity_type: 'chickens',
    entity_id: chicken.id,
    after_data: chicken,
  })

  return NextResponse.json({ data: chicken })
}
```

### File `src/app/api/chickens/bulk/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const BulkChickenSchema = z.object({
  chickens: z.array(z.object({
    name: z.string().optional(),
    breed_id: z.string().uuid(),
    qr_tag_id: z.string().uuid().optional(),
    cage_id: z.string().uuid().optional(),
    gender: z.enum(['trong', 'mai', 'chua_xac_dinh']).default('chua_xac_dinh'),
    birth_date: z.string().optional(),
    source: z.enum(['mua', 'no_tai_trai']),
    weight_kg: z.number().optional(),
    color: z.string().optional(),
    cost_purchase: z.number().optional(),
    notes: z.string().optional(),
  })).min(1).max(200),
  auto_assign_cage: z.boolean().default(true),
  default_source: z.enum(['mua', 'no_tai_trai']).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = BulkChickenSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { chickens, auto_assign_cage } = parsed.data

  // Process từng con: auto-assign cage nếu cần
  const processedChickens = []
  for (const c of chickens) {
    let cageId = c.cage_id
    if (!cageId && auto_assign_cage) {
      const targetAreaType = c.source === 'mua' ? 'cach_ly' : 'trong'
      const { data } = await supabase.rpc('find_available_cage', {
        p_area_type: targetAreaType,
      })
      cageId = data || undefined
    }
    processedChickens.push({ ...c, cage_id: cageId, created_by: user.id })
  }

  // Batch insert
  const { data, error } = await supabase
    .from('chickens')
    .insert(processedChickens)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Activity log batch
  await supabase.from('activity_logs').insert(
    data!.map(c => ({
      user_id: user.id,
      action: 'create',
      entity_type: 'chickens',
      entity_id: c.id,
      after_data: c,
    }))
  )

  return NextResponse.json({ data, count: data!.length })
}
```

### File `src/app/api/chickens/[id]/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET single chicken with full details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chickens_with_details')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  // Lấy thêm media
  const { data: media } = await supabase
    .from('chicken_media')
    .select('*')
    .eq('chicken_id', id)
    .order('display_order')

  return NextResponse.json({ data: { ...data, media: media || [] } })
}

// PATCH - update
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Lấy data cũ cho activity log
  const { data: oldData } = await supabase
    .from('chickens')
    .select('*')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('chickens')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'update',
    entity_type: 'chickens',
    entity_id: id,
    before_data: oldData,
    after_data: data,
  })

  return NextResponse.json({ data })
}

// DELETE - soft delete (set status = chet hoặc loai_thai)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Soft delete: chỉ có chu_trai mới hard delete
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'chu_trai') {
    const { error } = await supabase.from('chickens').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('chickens')
      .update({ status: 'loai_thai', status_date: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

### File `src/app/api/chickens/upload-photo/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { getDriveClient } from '@/lib/google-drive/client'
import { NextResponse } from 'next/server'
import { Readable } from 'stream'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  const chickenId = formData.get('chicken_id') as string
  const isMain = formData.get('is_main') === 'true'

  if (!file || !chickenId) {
    return NextResponse.json({ error: 'Missing file or chicken_id' }, { status: 400 })
  }

  // Lấy chicken để biết folder Drive
  const { data: chicken } = await supabase
    .from('chickens')
    .select('chicken_code, drive_folder_id, main_photo_url')
    .eq('id', chickenId)
    .single()

  if (!chicken) {
    return NextResponse.json({ error: 'Chicken not found' }, { status: 404 })
  }

  const drive = getDriveClient()

  // Tạo folder nếu chưa có
  let folderId = chicken.drive_folder_id
  if (!folderId) {
    const folderRes = await drive.files.create({
      requestBody: {
        name: chicken.chicken_code,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!],
      },
      fields: 'id',
    })
    folderId = folderRes.data.id!

    // Set permission public-read
    await drive.permissions.create({
      fileId: folderId,
      requestBody: { role: 'reader', type: 'anyone' },
    })

    await supabase
      .from('chickens')
      .update({ drive_folder_id: folderId })
      .eq('id', chickenId)
  }

  // Upload file
  const buffer = Buffer.from(await file.arrayBuffer())
  const stream = Readable.from(buffer)

  const fileRes = await drive.files.create({
    requestBody: {
      name: `${Date.now()}_${file.name}`,
      parents: [folderId],
      mimeType: file.type,
    },
    media: {
      mimeType: file.type,
      body: stream,
    },
    fields: 'id, webViewLink, webContentLink, thumbnailLink',
  })

  await drive.permissions.create({
    fileId: fileRes.data.id!,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  // Tạo URL trực tiếp xem ảnh
  const directUrl = `https://drive.google.com/uc?export=view&id=${fileRes.data.id}`
  const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileRes.data.id}&sz=w400`

  // Lưu vào chicken_media
  await supabase.from('chicken_media').insert({
    chicken_id: chickenId,
    media_type: file.type.startsWith('video') ? 'video' : 'anh',
    drive_file_id: fileRes.data.id!,
    drive_url: directUrl,
    thumbnail_url: thumbnailUrl,
    is_main: isMain,
    uploaded_by: user.id,
  })

  // Nếu là main photo, update chickens.main_photo_url
  if (isMain) {
    await supabase
      .from('chickens')
      .update({ main_photo_url: directUrl })
      .eq('id', chickenId)
  }

  return NextResponse.json({
    data: {
      drive_file_id: fileRes.data.id,
      drive_url: directUrl,
      thumbnail_url: thumbnailUrl,
    },
  })
}
```

**LƯU Ý:** Thêm vào `.env.local`:
```bash
GOOGLE_DRIVE_PARENT_FOLDER_ID=  # tạo folder "Gà Chọi Việt NB" trên Drive, lấy ID từ URL
```

### File `src/app/api/qr-tags/available/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET ?count=10 → 10 thẻ chưa dùng đầu tiên
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const count = parseInt(searchParams.get('count') || '1')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qr_tags')
    .select('id, tag_number')
    .eq('status', 'chua_su_dung')
    .order('tag_number')
    .limit(count)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

### File `src/app/api/qr-tags/generate-pdf/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { from, to, baseUrl } = await request.json()

  if (!from || !to || from > to || (to - from) > 2000) {
    return NextResponse.json({ error: 'Invalid range (max 2000 thẻ)' }, { status: 400 })
  }

  const siteUrl = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://gachoivietnb.com'

  // Tạo PDF A4 portrait
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Layout: 4 cột × 9 hàng = 36 thẻ/trang
  // Mỗi thẻ: 45mm × 28mm, gap 3mm, margin 10mm
  const cardW = 45
  const cardH = 28
  const cols = 4
  const rows = 9
  const marginX = 10
  const marginY = 10
  const gapX = 3
  const gapY = 3

  for (let num = from; num <= to; num++) {
    const idxOnPage = (num - from) % (cols * rows)
    if (idxOnPage === 0 && num !== from) doc.addPage()

    const col = idxOnPage % cols
    const row = Math.floor(idxOnPage / cols)
    const x = marginX + col * (cardW + gapX)
    const y = marginY + row * (cardH + gapY)

    const tagNumber = String(num).padStart(4, '0')
    const url = `${siteUrl}/ga/${tagNumber}`

    // Generate QR
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 200,
      margin: 0,
      errorCorrectionLevel: 'M',
    })

    // Draw card border
    doc.setDrawColor(180)
    doc.setLineWidth(0.2)
    doc.roundedRect(x, y, cardW, cardH, 1.5, 1.5, 'S')

    // Header text "GÀ CHỌI VIỆT NB"
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(60)
    doc.text('GÀ CHỌI VIỆT NB', x + cardW / 2, y + 4, { align: 'center' })

    // QR code (left side)
    doc.addImage(qrDataUrl, 'PNG', x + 2, y + 6, 20, 20)

    // Number (right side - large)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(20)
    doc.text(tagNumber, x + 24, y + 18)

    // Tagline tiny
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5)
    doc.setTextColor(140)
    doc.text('gachoivietnb.com', x + cardW / 2, y + cardH - 1.5, { align: 'center' })
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="qr-tags-${from}-${to}.pdf"`,
    },
  })
}
```

### File `src/app/api/cages/bulk-create/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  row_id: z.string().uuid(),
  start_num: z.number().int().min(1).max(999),
  count: z.number().int().min(1).max(100),
  capacity: z.number().int().min(1).default(1),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { row_id, start_num, count, capacity } = parsed.data

  const { data, error } = await supabase.rpc('bulk_create_cages', {
    p_row_id: row_id,
    p_start_num: start_num,
    p_count: count,
    p_capacity: capacity,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: data })
}
```

### File `src/app/api/chickens/import-excel/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<any>(sheet)

  // Lấy breeds map (code → id)
  const { data: breeds } = await supabase.from('breeds').select('id, code')
  const breedMap = new Map(breeds!.map(b => [b.code, b.id]))

  const errors: any[] = []
  const valid: any[] = []

  rows.forEach((row, idx) => {
    const breedCode = String(row['Giống'] || row['breed'] || '').toUpperCase()
    const breedId = breedMap.get(breedCode)
    if (!breedId) {
      errors.push({ row: idx + 2, error: `Không tìm thấy giống "${breedCode}"` })
      return
    }

    valid.push({
      breed_id: breedId,
      name: row['Tên'] || row['name'] || null,
      gender: row['Giới tính'] || row['gender'] || 'chua_xac_dinh',
      birth_date: row['Ngày sinh'] || row['birth_date'] || null,
      source: row['Nguồn'] === 'Mua' ? 'mua' : 'no_tai_trai',
      weight_kg: parseFloat(row['Cân nặng'] || row['weight_kg']) || null,
      color: row['Màu'] || row['color'] || null,
      cost_purchase: parseFloat(row['Giá mua'] || row['cost_purchase']) || null,
      notes: row['Ghi chú'] || row['notes'] || null,
      created_by: user.id,
    })
  })

  if (errors.length > 0) {
    return NextResponse.json({ errors, validCount: valid.length }, { status: 400 })
  }

  const { data, error } = await supabase.from('chickens').insert(valid).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ inserted: data!.length, data })
}
```

---

## 🧩 BƯỚC 4: COMPONENTS DÙNG CHUNG

### `src/components/admin/chickens/ChickenStatusBadge.tsx`

```typescript
import { Badge } from '@/components/ui/badge'

const STATUS_MAP = {
  dang_nuoi: { label: 'Đang nuôi', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
  dang_cach_ly: { label: 'Cách ly', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' },
  da_ban: { label: 'Đã bán', variant: 'outline' as const, color: 'bg-blue-100 text-blue-800' },
  chet: { label: 'Đã chết', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
  loai_thai: { label: 'Loại thải', variant: 'outline' as const, color: 'bg-gray-100 text-gray-700' },
}

export function ChickenStatusBadge({ status }: { status: keyof typeof STATUS_MAP }) {
  const config = STATUS_MAP[status]
  return <span className={`text-xs px-2 py-1 rounded ${config.color}`}>{config.label}</span>
}
```

### `src/components/admin/chickens/BreedSelect.tsx`

Server-side fetch breeds, client-side select dropdown với search.

### `src/components/admin/chickens/CageSelect.tsx`

Search dropdown, hiển thị `full_code` + tên khu, lọc theo type nếu cần.

### `src/components/admin/chickens/QRTagSelect.tsx`

Component đặc biệt:
- Mặc định gợi ý số nhỏ nhất chưa dùng
- Có thể nhập tay nếu muốn chọn số khác
- Validate: phải là thẻ chưa dùng

```typescript
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function QRTagSelect({ value, onChange }: {
  value?: string
  onChange: (tagId: string | undefined, tagNumber?: string) => void
}) {
  const [suggested, setSuggested] = useState<{ id: string; tag_number: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/qr-tags/available?count=20')
      .then(r => r.json())
      .then(({ data }) => { setSuggested(data || []); setLoading(false) })
  }, [])

  if (loading) return <div className="text-sm text-gray-500">Đang tải...</div>
  if (suggested.length === 0) return <div className="text-sm text-red-500">Không còn thẻ QR trống</div>

  return (
    <select
      value={value || ''}
      onChange={e => {
        const tag = suggested.find(t => t.id === e.target.value)
        onChange(e.target.value || undefined, tag?.tag_number)
      }}
      className="w-full border rounded px-3 py-2"
    >
      <option value="">— Không gắn thẻ QR —</option>
      {suggested.map(t => (
        <option key={t.id} value={t.id}>Thẻ {t.tag_number}</option>
      ))}
    </select>
  )
}
```

### `src/components/admin/chickens/PhotoUpload.tsx`

Client component upload + resize ảnh trước khi upload:

```typescript
'use client'
import { useState } from 'react'

export function PhotoUpload({ chickenId, onUploaded }: {
  chickenId: string
  onUploaded?: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    // Resize ảnh trước khi upload (max 1200px width)
    const resized = await resizeImage(file, 1200)

    const formData = new FormData()
    formData.append('file', resized, file.name)
    formData.append('chicken_id', chickenId)
    formData.append('is_main', 'true')

    const res = await fetch('/api/chickens/upload-photo', { method: 'POST', body: formData })
    const json = await res.json()
    if (json.data?.drive_url) onUploaded?.(json.data.drive_url)
    setUploading(false)
  }

  return (
    <input type="file" accept="image/*,video/*" onChange={handleFile} disabled={uploading} />
  )
}

async function resizeImage(file: File, maxWidth: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('video')) {
      resolve(file)  // không resize video
      return
    }
    const img = new Image()
    img.onload = () => {
      const ratio = img.width / img.height
      const w = Math.min(img.width, maxWidth)
      const h = w / ratio
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Resize failed')), 'image/webp', 0.85)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
```

---

## 📄 BƯỚC 5: PAGES — HỒ SƠ GÀ

### `/admin/ho-so-ga` — DANH SÁCH

**File `src/app/(admin)/admin/ho-so-ga/page.tsx`**

Server component:
- Fetch danh sách từ view `chickens_with_details` với pagination
- Pass data + filters từ searchParams xuống client component

Sử dụng searchParams:
- `?page=1&pageSize=20`
- `?breed=ASIL&status=dang_nuoi&q=0347`
- `?sort=created_at&order=desc`

UI:
- Header: tiêu đề + nút "Thêm gà mới" (link `/admin/ho-so-ga/them-moi`) + nút "Nhập hàng loạt" + nút "Import Excel"
- Filter bar: Search box, dropdown giống, dropdown trạng thái, dropdown khu vực
- Toggle view: Table / Card grid
- Mobile: chỉ hiện Card view, filter trong drawer
- Pagination dưới cùng

**Quan trọng:**
- Mobile-first: Card view default trên mobile, mỗi card có ảnh, mã, giống, tuổi, trạng thái, nút "Xem"
- Desktop: Table với cột: Ảnh, Mã, Giống, Chuồng, Tuổi, Trạng thái, Hành động

### `/admin/ho-so-ga/[id]` — CHI TIẾT

Tabs:
- **Tổng quan:** Ảnh chính + thông tin cơ bản + QR code + nút Sửa/In QR/Bán
- **Gia phả:** Placeholder "Sẽ build ở Phần 3"
- **Sức khỏe:** Placeholder "Sẽ build ở Phần 4"
- **Vần gà:** Placeholder "Sẽ build ở Phần 4"
- **Mua bán:** Hiển thị giá mua, giá bán nếu có (full ở Phần 5)
- **Media:** Grid ảnh/video từ Drive + nút upload thêm
- **Lịch sử:** Activity log của con gà này

### `/admin/ho-so-ga/them-moi` — TẠO MỚI ĐƠN LẺ

Form đầy đủ với:
- BreedSelect
- QRTagSelect
- CageSelect (auto-suggest hoặc chọn)
- DatePicker ngày sinh
- Radio source (mua / no_tai_trai)
- Số tiền giá mua (nếu source = mua)
- Cân nặng, màu lông
- ChickenSelect cho bố/mẹ (tùy chọn)
- Textarea ghi chú
- PhotoUpload (sau khi tạo xong mới upload — vì cần chicken_id)

Sau khi tạo: redirect `/admin/ho-so-ga/[id]` để upload ảnh.

### `/admin/ho-so-ga/nhap-hang-loat` — NHẬP HÀNG LOẠT

Bulk form data grid:
- Header: chọn giống mặc định, chọn nguồn mặc định, ngày sinh mặc định (apply cho tất cả)
- Bảng nhập:
  - STT | Tên (optional) | Giống | Giới tính | Cân nặng | Giá mua | Mã QR | Chuồng | Ghi chú
- Nút "Thêm 10 dòng" / "Xóa dòng"
- Submit: gọi `/api/chickens/bulk`
- Thông báo kết quả: thành công X con, lỗi Y con

### `/admin/ho-so-ga/import-excel` — IMPORT EXCEL

- Nút download template Excel mẫu (tạo file mẫu sẵn trong `/public/templates/chicken-import-template.xlsx`)
- Upload file
- Preview dữ liệu (10 dòng đầu)
- Validate
- Confirm → submit

Template Excel có cột:
| Tên | Giống | Giới tính | Ngày sinh | Nguồn | Cân nặng | Giá mua | Màu | Ghi chú |

---

## 📄 BƯỚC 6: PAGES — QR

### `/admin/qr-tags` — DANH SÁCH THẺ

- Stats trên cùng: Tổng thẻ / Đã dùng / Trống / Hỏng-mất
- Filter: trạng thái + search số
- Table: Số thẻ | Trạng thái | Gà gắn (link) | Ngày gắn | Ghi chú | Hành động
- Bulk action: đánh dấu hỏng/mất

### `/admin/generate-qr` — IN PDF

Form đơn giản:
- Số bắt đầu (default = số nhỏ nhất chưa in)
- Số kết thúc
- Nút "Generate PDF" → POST /api/qr-tags/generate-pdf → download
- Preview: hiển thị 1 thẻ mẫu để xem trước

### `/admin/quet-qr` — SCANNER

Client component dùng `html5-qrcode`:

```typescript
'use client'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ScanPage() {
  const router = useRouter()
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: 250 },
      false
    )
    scanner.render(
      decodedText => {
        // decodedText sẽ là URL: https://gachoivietnb.com/ga/0347
        const match = decodedText.match(/\/ga\/(\d{4})/)
        if (match) {
          scanner.clear()
          router.push(`/ga/${match[1]}`)
        }
      },
      err => {/* ignore continuous errors */}
    )
    scannerRef.current = scanner
    return () => { scanner.clear().catch(() => {}) }
  }, [router])

  return (
    <div>
      <h1 className="text-xl font-medium mb-4">Quét mã QR</h1>
      <div id="qr-reader" className="max-w-md mx-auto" />
    </div>
  )
}
```

### `/ga/[tagNumber]` — TRANG BIO (PUBLIC)

**Phần 2 chỉ làm logic xử lý cơ bản. Trang bio đẹp full sẽ làm Phần 6.**

```typescript
// src/app/(public)/ga/[tagNumber]/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function GaBioPage({
  params,
}: { params: Promise<{ tagNumber: string }> }) {
  const { tagNumber } = await params
  const supabase = await createClient()

  // 1. Tìm thẻ QR
  const { data: tag } = await supabase
    .from('qr_tags')
    .select('*, chickens(*, breeds(name_vi))')
    .eq('tag_number', tagNumber)
    .single()

  if (!tag) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <h1 className="text-xl font-medium">Thẻ QR không tồn tại</h1>
        <p className="text-gray-600 mt-2">Mã thẻ {tagNumber} không hợp lệ.</p>
      </div>
    )
  }

  // 2. Thẻ chưa gán
  if (!tag.chicken_id) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <h1 className="text-xl font-medium">Thẻ {tagNumber} chưa được kích hoạt</h1>
        <p className="text-gray-600 mt-2">
          Thẻ này chưa gắn cho con gà nào. Liên hệ chủ trang trại nếu bạn cần thông tin.
        </p>
        <ChickenAssignButton tagId={tag.id} tagNumber={tagNumber} />
      </div>
    )
  }

  // 3. Thẻ đã gán → render bio cơ bản
  const chicken = tag.chickens
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-medium">{chicken.name || chicken.chicken_code}</h1>
      <p className="text-gray-600">Mã: {chicken.chicken_code}</p>
      <p className="text-gray-600">Giống: {chicken.breeds?.name_vi}</p>
      <p className="text-sm text-gray-500 mt-4">
        🚧 Trang bio đầy đủ đang được hoàn thiện ở Phần 6
      </p>
    </div>
  )
}
```

`ChickenAssignButton` — client component, chỉ hiển thị nếu user đã đăng nhập là staff. Click sẽ chuyển sang form tạo gà mới với `qr_tag_id` pre-selected.

---

## 📄 BƯỚC 7: PAGES — CHUỒNG TRẠI

### `/admin/chuong-trai` — SƠ ĐỒ TRỰC QUAN

Layout dạng tree:
- Mỗi area là 1 box lớn có background nhạt theo type
- Bên trong: các rows xếp dọc, mỗi row gồm các cages xếp ngang
- Mỗi cage là ô vuông nhỏ:
  - Trống: gray-200
  - Đang có gà: green-200
  - Cách ly: yellow-200
  - Bảo trì: red-200
- Click cage → mở Drawer chi tiết bên phải

Mobile: hiển thị accordion theo area, click expand để thấy rows + cages.

### `/admin/chuong-trai/quan-ly` — CRUD

Tabs: Khu vực / Dãy / Chuồng

Mỗi tab:
- Bảng list + nút thêm/sửa/xóa
- Cage tab có thêm nút "Tạo nhiều chuồng cùng lúc":
  - Chọn dãy
  - Số bắt đầu (e.g. 1)
  - Số lượng (e.g. 20)
  - Sức chứa mỗi chuồng (default 1)
  - Submit → call `/api/cages/bulk-create`

### `/admin/chuong-trai/[id]` — CHI TIẾT CHUỒNG

- Mã chuồng + QR code cửa chuồng
- Stats: sức chứa / số gà hiện tại
- Danh sách gà đang ở
- Lịch sử (call function `get_cage_history`)

---

## ✅ CHECKLIST PHẦN 2

Sau khi xong:

### Hồ sơ gà
- [ ] Tạo 1 con gà đơn lẻ → có mã `GA-ASIL-25-0001`
- [ ] Tạo gà với QR tag → tag chuyển sang `dang_su_dung`
- [ ] Tạo gà không chọn cage + auto_assign → tự xếp vào khu E (cách ly) nếu source = mua
- [ ] Update con gà đã tạo → activity_log có record
- [ ] Upload ảnh con gà → thấy ảnh trên Google Drive trong folder con gà đó
- [ ] Ảnh được resize xuống ~1200px width (kiểm tra dung lượng)
- [ ] Bulk insert 20 con gà cùng lúc → tất cả có mã đúng format
- [ ] Import Excel mẫu 10 dòng → insert thành công

### QR
- [ ] Trang `/admin/qr-tags` hiển thị 9999 thẻ với pagination
- [ ] Generate PDF 100 thẻ → file download được, mở ra thấy 36 thẻ/trang, mỗi thẻ có QR + số to + logo
- [ ] Quét QR bằng điện thoại → mở `gachoivietnb.com/ga/0001`
- [ ] Trang `/ga/0001` (chưa gán) → hiển thị "Thẻ chưa được kích hoạt"
- [ ] Trang `/ga/0001` (đã gán) → hiển thị thông tin gà
- [ ] Trang `/admin/quet-qr` mở camera được trên mobile (HTTPS hoặc localhost)

### Chuồng trại
- [ ] Tạo 5 khu mặc định đã có sẵn (từ seed Phần 1)
- [ ] Tạo dãy 01 trong khu A
- [ ] Bulk create 20 chuồng vào dãy 01 → có codes A-01-001 đến A-01-020
- [ ] Sơ đồ chuồng trại hiển thị đúng cấu trúc + màu theo status
- [ ] Click chuồng → mở drawer chi tiết
- [ ] Auto-assign chuồng khi tạo gà → đúng khu cách ly cho source = mua

### Mobile
- [ ] Tất cả pages dùng được ngon lành trên màn hình 375px
- [ ] Bottom nav 5 tab hoạt động: Home / Gà / Quét QR / Bán / Thêm
- [ ] Form nhập liệu touch-friendly (button >= 44px)

---

## 🚨 LƯU Ý TRIỂN KHAI

1. **Google Drive setup ban đầu** (làm trước khi test upload):
   - Tạo OAuth 2.0 credentials trong Google Cloud Console
   - Enable Google Drive API
   - Tạo folder "Gà Chọi Việt NB" trên Drive cá nhân
   - Lấy folder ID, set vào `GOOGLE_DRIVE_PARENT_FOLDER_ID`
   - Lấy refresh token (dùng OAuth playground hoặc script riêng)

2. **QR scanner cần HTTPS** trên production hoặc localhost. Vercel auto-HTTPS nên OK.

3. **Performance:**
   - Trang danh sách gà có thể chậm với 5000 con → đảm bảo pagination + indexes hoạt động
   - View `chickens_with_details` đã tối ưu join, không cần thêm gì

4. **Bulk insert giới hạn 200 con/lần** — tránh timeout. Nếu cần nhiều hơn, chia batch.

5. **Drive folder permissions:** mọi folder + file upload đều set public-read để khách quét QR xem ảnh được. Nếu muốn ảnh private → chỉ hiển thị trong admin, sửa logic permission.

6. **Excel template** lưu sẵn tại `/public/templates/chicken-import-template.xlsx` — Claude Code tạo file này với 1 sheet, header tiếng Việt + 1 dòng ví dụ.

7. **Test thực tế:** in thử 4 thẻ QR ra giấy thường → kẹp vào con gà thật → quét bằng điện thoại → phải ra trang bio. Bước này test luôn cả flow real-world.

---

## 📦 OUTPUT MONG ĐỢI

Khi xong Phần 2, hệ thống đã hoàn toàn dùng được cho việc cơ bản:
- Quản lý đàn gà thực tế
- In thẻ QR và gắn vào gà
- Quản lý cấu trúc chuồng trại
- Upload ảnh gà lên Drive
- Khách quét QR ra được hồ sơ cơ bản

**Phần 3 (Gia phả + Sinh sản)** và **Phần 4 (Sức khỏe + Vần gà)** có thể làm song song sau khi Phần 2 hoàn thành — vì cả hai chỉ phụ thuộc vào nền + hồ sơ gà.

**Báo lại khi xong, tôi chuẩn bị Phần 3 hoặc Phần 4 tùy bạn ưu tiên!**
