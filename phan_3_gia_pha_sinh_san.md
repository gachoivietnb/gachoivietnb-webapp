# PROMPT CHO CLAUDE CODE — PHẦN 3: GIA PHẢ + SINH SẢN
## Dự án: Gà Chọi Việt Ninh Bình (gachoivietnb.com)

---

## 🎯 NHIỆM VỤ CỦA BẠN (Claude Code)

Build 2 module **bán hàng cốt lõi** — gia phả minh bạch là điểm khác biệt lớn nhất:

1. **Cây gia phả** — render đẹp, tương tác, đến 5 đời, dùng được ở admin lẫn public
2. **Module sinh sản** — workflow đầy đủ từ ghép đôi → trứng → nở → tốt nghiệp gà con
3. **Thống kê sinh sản** — bảng xếp hạng mái, performance đực, biểu đồ xu hướng

**Sau khi hoàn thành Phần 3:**
- Tạo lứa ghép đôi: 1 mái + 1-3 đực
- Track trứng: nhập số trứng → số có phôi → ngày nở
- Quản lý nhóm gà con 4 tuần đầu (sống/chết/ốm)
- "Tốt nghiệp": bulk tạo 30 con gà con với gia phả tự gán
- Xem cây gia phả 5 đời của 1 con gà
- Thống kê: ranking gà mái + performance đực + biểu đồ xu hướng

---

## 📋 NHẮC LẠI QUY TẮC

1. **Tiếng Anh code, tiếng Việt UI**
2. **Mobile-first**
3. **TypeScript strict**
4. **KHÔNG sửa schema cũ** — chỉ thêm
5. **Dùng API routes Phần 1+2 đã có** (chickens, breeds...)

---

## 📦 BƯỚC 1: CÀI THÊM PACKAGES

```bash
# Charts
npm install recharts

# Date utils (đã có ở Phần 1)
# date-fns - đã cài
```

---

## 🗄️ BƯỚC 2: MIGRATION BỔ SUNG

Tạo file `supabase/migrations/20260301000001_phase3_pedigree_breeding.sql`:

```sql
-- =====================================================
-- PHASE 3: PEDIGREE & BREEDING FUNCTIONS
-- =====================================================

-- =====================================================
-- 1. PEDIGREE: Recursive CTE để lấy cả cây gia phả
-- =====================================================

-- Function: get_pedigree(chicken_id, depth)
-- Trả về flat list các tổ tiên với generation level
CREATE OR REPLACE FUNCTION get_pedigree(
  p_chicken_id UUID,
  p_depth INT DEFAULT 3
)
RETURNS TABLE (
  generation INT,
  position TEXT,             -- 'self', 'father', 'mother', 'ff', 'fm', 'mf', 'mm', ...
  chicken_id UUID,
  chicken_code TEXT,
  name TEXT,
  breed_name TEXT,
  gender chicken_gender,
  birth_date DATE,
  main_photo_url TEXT,
  status chicken_status,
  qr_tag_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE pedigree_tree AS (
    -- Level 0: bản thân
    SELECT
      0 AS generation,
      'self'::TEXT AS position,
      c.id,
      c.parent_male_id,
      c.parent_female_id
    FROM chickens c
    WHERE c.id = p_chicken_id

    UNION ALL

    -- Recursive: bố và mẹ
    SELECT
      pt.generation + 1,
      CASE
        WHEN pt.position = 'self' THEN
          CASE WHEN c.id = pt.parent_male_id THEN 'father' ELSE 'mother' END
        ELSE
          pt.position || (CASE WHEN c.id = pt.parent_male_id THEN 'f' ELSE 'm' END)
      END,
      c.id,
      c.parent_male_id,
      c.parent_female_id
    FROM pedigree_tree pt
    JOIN chickens c ON c.id = pt.parent_male_id OR c.id = pt.parent_female_id
    WHERE pt.generation < p_depth
  )
  SELECT
    pt.generation,
    pt.position,
    c.id,
    c.chicken_code,
    c.name,
    b.name_vi,
    c.gender,
    c.birth_date,
    c.main_photo_url,
    c.status,
    qt.tag_number
  FROM pedigree_tree pt
  JOIN chickens c ON c.id = pt.id
  LEFT JOIN breeds b ON b.id = c.breed_id
  LEFT JOIN qr_tags qt ON qt.id = c.qr_tag_id
  ORDER BY pt.generation, pt.position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CHECK CIRCULAR PARENT (tránh loop)
-- =====================================================

-- Trả về TRUE nếu p_potential_ancestor là tổ tiên (hoặc chính) của p_chicken
CREATE OR REPLACE FUNCTION is_ancestor(
  p_chicken_id UUID,
  p_potential_ancestor UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_found BOOLEAN := FALSE;
BEGIN
  IF p_chicken_id = p_potential_ancestor THEN
    RETURN TRUE;
  END IF;

  WITH RECURSIVE ancestors AS (
    SELECT id, parent_male_id, parent_female_id
    FROM chickens WHERE id = p_chicken_id

    UNION ALL

    SELECT c.id, c.parent_male_id, c.parent_female_id
    FROM chickens c
    JOIN ancestors a ON c.id = a.parent_male_id OR c.id = a.parent_female_id
  )
  SELECT EXISTS (
    SELECT 1 FROM ancestors WHERE id = p_potential_ancestor
  ) INTO v_found;

  RETURN v_found;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger validate parents khi insert/update
CREATE OR REPLACE FUNCTION validate_chicken_parents()
RETURNS TRIGGER AS $$
BEGIN
  -- Bố/mẹ không được là chính nó
  IF NEW.parent_male_id = NEW.id OR NEW.parent_female_id = NEW.id THEN
    RAISE EXCEPTION 'Gà không thể tự làm bố/mẹ của chính mình';
  END IF;

  -- Check loop (chỉ khi UPDATE và đã có ID)
  IF TG_OP = 'UPDATE' AND NEW.parent_male_id IS NOT NULL THEN
    IF is_ancestor(NEW.parent_male_id, NEW.id) THEN
      RAISE EXCEPTION 'Bố không hợp lệ - tạo loop trong gia phả';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.parent_female_id IS NOT NULL THEN
    IF is_ancestor(NEW.parent_female_id, NEW.id) THEN
      RAISE EXCEPTION 'Mẹ không hợp lệ - tạo loop trong gia phả';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_chicken_parents
  BEFORE INSERT OR UPDATE OF parent_male_id, parent_female_id ON chickens
  FOR EACH ROW EXECUTE FUNCTION validate_chicken_parents();

-- =====================================================
-- 3. BREEDING STATS: View thống kê
-- =====================================================

-- View: thống kê theo gà mái
CREATE OR REPLACE VIEW breeding_female_stats AS
SELECT
  c.id AS female_id,
  c.chicken_code,
  c.name,
  b.name_vi AS breed_name,
  COUNT(bl.id) AS total_litters,
  COALESCE(SUM(bl.eggs_total), 0) AS total_eggs,
  COALESCE(SUM(bl.eggs_fertile), 0) AS total_fertile,
  COALESCE(SUM(bl.hatched_count), 0) AS total_hatched,
  CASE
    WHEN SUM(bl.eggs_total) > 0
    THEN ROUND((SUM(bl.eggs_fertile)::NUMERIC / SUM(bl.eggs_total)) * 100, 1)
    ELSE 0
  END AS fertile_rate,
  CASE
    WHEN SUM(bl.eggs_fertile) > 0
    THEN ROUND((SUM(bl.hatched_count)::NUMERIC / SUM(bl.eggs_fertile)) * 100, 1)
    ELSE 0
  END AS hatch_rate,
  -- Tỷ lệ sống sau 4 tuần (từ chick_groups)
  COALESCE((
    SELECT ROUND(
      (SUM(cg.alive_count)::NUMERIC / NULLIF(SUM(cg.hatched_count), 0)) * 100, 1
    )
    FROM chick_groups cg
    JOIN breeding_litters bl2 ON bl2.id = cg.litter_id
    WHERE bl2.female_id = c.id
  ), 0) AS survival_rate
FROM chickens c
LEFT JOIN breeds b ON b.id = c.breed_id
LEFT JOIN breeding_litters bl ON bl.female_id = c.id
WHERE c.gender = 'mai'
GROUP BY c.id, c.chicken_code, c.name, b.name_vi;

-- View: thống kê theo gà đực
-- Lưu ý: chỉ tính chính xác cho lứa có 1 đực
CREATE OR REPLACE VIEW breeding_male_stats AS
WITH litters_per_male AS (
  SELECT
    male_id::UUID,
    bl.id AS litter_id,
    bl.eggs_total,
    bl.eggs_fertile,
    bl.hatched_count,
    array_length(bl.male_ids, 1) AS male_count_in_litter
  FROM breeding_litters bl,
       LATERAL unnest(bl.male_ids) AS male_id
  WHERE bl.status IN ('da_no', 'that_bai')
)
SELECT
  c.id AS male_id,
  c.chicken_code,
  c.name,
  b.name_vi AS breed_name,
  COUNT(lpm.litter_id) AS total_litters,
  COUNT(*) FILTER (WHERE lpm.male_count_in_litter = 1) AS solo_litters,
  COALESCE(SUM(lpm.eggs_total) FILTER (WHERE lpm.male_count_in_litter = 1), 0) AS solo_eggs,
  COALESCE(SUM(lpm.eggs_fertile) FILTER (WHERE lpm.male_count_in_litter = 1), 0) AS solo_fertile,
  CASE
    WHEN SUM(lpm.eggs_total) FILTER (WHERE lpm.male_count_in_litter = 1) > 0
    THEN ROUND(
      (SUM(lpm.eggs_fertile) FILTER (WHERE lpm.male_count_in_litter = 1)::NUMERIC
       / SUM(lpm.eggs_total) FILTER (WHERE lpm.male_count_in_litter = 1)) * 100, 1
    )
    ELSE 0
  END AS fertile_rate_accurate,  -- chỉ tính lứa solo
  -- Ước tính khi tính cả lứa có nhiều đực (kém chính xác)
  CASE
    WHEN SUM(lpm.eggs_total) > 0
    THEN ROUND((SUM(lpm.eggs_fertile)::NUMERIC / SUM(lpm.eggs_total)) * 100, 1)
    ELSE 0
  END AS fertile_rate_estimated
FROM chickens c
LEFT JOIN breeds b ON b.id = c.breed_id
LEFT JOIN litters_per_male lpm ON lpm.male_id = c.id
WHERE c.gender = 'trong'
GROUP BY c.id, c.chicken_code, c.name, b.name_vi;

-- =====================================================
-- 4. BREEDING WORKFLOW FUNCTIONS
-- =====================================================

-- Auto-calculate expected hatch date (paired_date + 21 days)
CREATE OR REPLACE FUNCTION set_expected_hatch_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expected_hatch_date IS NULL AND NEW.paired_date IS NOT NULL THEN
    NEW.expected_hatch_date := NEW.paired_date + INTERVAL '21 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_expected_hatch_date
  BEFORE INSERT ON breeding_litters
  FOR EACH ROW EXECUTE FUNCTION set_expected_hatch_date();

-- Auto generate litter_code: L-YYYY-NNN
CREATE OR REPLACE FUNCTION generate_litter_code()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  IF NEW.litter_code IS NOT NULL AND NEW.litter_code != '' THEN
    RETURN NEW;
  END IF;

  v_year := TO_CHAR(COALESCE(NEW.paired_date, CURRENT_DATE), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_seq
  FROM breeding_litters
  WHERE TO_CHAR(paired_date, 'YYYY') = v_year;

  NEW.litter_code := 'L-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_litter_code
  BEFORE INSERT ON breeding_litters
  FOR EACH ROW EXECUTE FUNCTION generate_litter_code();

-- Auto-create chick_group khi đánh dấu lứa nở
CREATE OR REPLACE FUNCTION auto_create_chick_group()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'da_no' AND OLD.status != 'da_no' AND NEW.hatched_count > 0 THEN
    INSERT INTO chick_groups (litter_id, hatched_count, alive_count, cage_id)
    VALUES (NEW.id, NEW.hatched_count, NEW.hatched_count, NEW.cage_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_chick_group
  AFTER UPDATE OF status ON breeding_litters
  FOR EACH ROW EXECUTE FUNCTION auto_create_chick_group();

-- Function: bulk graduate chicks (tốt nghiệp gà con thành chickens riêng)
CREATE OR REPLACE FUNCTION graduate_chicks(
  p_litter_id UUID,
  p_chicks JSONB  -- mảng [{name, gender, breed_id, qr_tag_id, cage_id, parent_male_id}]
) RETURNS SETOF chickens AS $$
DECLARE
  v_litter breeding_litters%ROWTYPE;
  v_chick JSONB;
  v_new_chicken chickens%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_litter FROM breeding_litters WHERE id = p_litter_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lứa không tồn tại'; END IF;
  IF v_litter.status != 'da_no' THEN RAISE EXCEPTION 'Lứa chưa nở'; END IF;

  FOR v_chick IN SELECT * FROM jsonb_array_elements(p_chicks)
  LOOP
    INSERT INTO chickens (
      name,
      breed_id,
      qr_tag_id,
      cage_id,
      gender,
      birth_date,
      source,
      parent_male_id,
      parent_female_id,
      breeding_litter_id,
      created_by
    ) VALUES (
      NULLIF(v_chick->>'name', ''),
      (v_chick->>'breed_id')::UUID,
      NULLIF(v_chick->>'qr_tag_id', '')::UUID,
      COALESCE(NULLIF(v_chick->>'cage_id', '')::UUID, v_litter.cage_id),
      COALESCE(v_chick->>'gender', 'chua_xac_dinh')::chicken_gender,
      v_litter.hatched_date,
      'no_tai_trai'::chicken_source,
      NULLIF(v_chick->>'parent_male_id', '')::UUID,
      v_litter.female_id,
      p_litter_id,
      v_user_id
    ) RETURNING * INTO v_new_chicken;

    RETURN NEXT v_new_chicken;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. AVAILABLE BREEDERS
-- =====================================================

-- View: gà mái có thể chọn ghép đôi (đang nuôi, không đang ghép)
CREATE OR REPLACE VIEW available_females AS
SELECT
  c.id, c.chicken_code, c.name, c.birth_date,
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.birth_date))::INT AS age_months,
  b.name_vi AS breed_name
FROM chickens c
LEFT JOIN breeds b ON b.id = c.breed_id
WHERE c.gender = 'mai'
  AND c.status = 'dang_nuoi'
  AND NOT EXISTS (
    SELECT 1 FROM breeding_litters bl
    WHERE bl.female_id = c.id AND bl.status = 'dang_ap'
  );

-- View: gà đực có thể chọn ghép đôi
CREATE OR REPLACE VIEW available_males AS
SELECT
  c.id, c.chicken_code, c.name, c.birth_date,
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.birth_date))::INT AS age_months,
  b.name_vi AS breed_name
FROM chickens c
LEFT JOIN breeds b ON b.id = c.breed_id
WHERE c.gender = 'trong'
  AND c.status = 'dang_nuoi';
```

**Chạy file này trong Supabase SQL Editor.**

---

## 🔌 BƯỚC 3: API ROUTES

### `src/app/api/chickens/[id]/pedigree/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const depth = parseInt(searchParams.get('depth') || '3')

  if (depth < 1 || depth > 5) {
    return NextResponse.json({ error: 'Depth must be 1-5' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_pedigree', {
    p_chicken_id: id,
    p_depth: depth,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Convert flat list → tree structure
  const tree = buildPedigreeTree(data, id)
  return NextResponse.json({ data: tree, flat: data })
}

function buildPedigreeTree(flat: any[], rootId: string) {
  const map = new Map(flat.map(n => [n.position, n]))

  function build(position: string): any {
    const node = map.get(position)
    if (!node) return null

    return {
      ...node,
      father: build(position === 'self' ? 'father' : position + 'f'),
      mother: build(position === 'self' ? 'mother' : position + 'm'),
    }
  }

  return build('self')
}
```

### `src/app/api/breeding/litters/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const LitterSchema = z.object({
  female_id: z.string().uuid(),
  male_ids: z.array(z.string().uuid()).min(1).max(5),
  paired_date: z.string(),
  cage_id: z.string().uuid().optional(),
  notes: z.string().optional(),
})

// GET - list litters
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const supabase = await createClient()
  let query = supabase
    .from('breeding_litters')
    .select(`
      *,
      female:chickens!female_id(id, chicken_code, name),
      cage:cages(id, full_code)
    `, { count: 'exact' })
    .order('paired_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count })
}

// POST - tạo lứa mới
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = LitterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  // Validate: mái chưa đang ghép
  const { data: existingLitter } = await supabase
    .from('breeding_litters')
    .select('id')
    .eq('female_id', parsed.data.female_id)
    .eq('status', 'dang_ap')
    .maybeSingle()

  if (existingLitter) {
    return NextResponse.json(
      { error: 'Gà mái này đang trong lứa ghép đôi khác' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('breeding_litters')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

### `src/app/api/breeding/litters/[id]/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: litter } = await supabase
    .from('breeding_litters')
    .select(`
      *,
      female:chickens!female_id(id, chicken_code, name, breed_id, breeds(name_vi)),
      cage:cages(id, full_code)
    `)
    .eq('id', id)
    .single()

  if (!litter) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Lấy thông tin các gà đực trong male_ids
  const { data: males } = await supabase
    .from('chickens')
    .select('id, chicken_code, name, breeds(name_vi)')
    .in('id', litter.male_ids)

  // Lấy chick groups
  const { data: chickGroups } = await supabase
    .from('chick_groups')
    .select('*')
    .eq('litter_id', id)
    .order('created_at', { ascending: false })

  // Lấy chickens đã graduate từ lứa này
  const { data: graduated } = await supabase
    .from('chickens')
    .select('id, chicken_code, name, gender, status')
    .eq('breeding_litter_id', id)

  return NextResponse.json({
    data: { ...litter, males, chick_groups: chickGroups, graduated_chickens: graduated },
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('breeding_litters')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

### `src/app/api/breeding/litters/[id]/hatch/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Đánh dấu lứa đã nở: chuyển status, set hatched_count + hatched_date
// Trigger DB sẽ tự tạo chick_group
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { hatched_count, hatched_date } = await request.json()

  if (!hatched_count || hatched_count < 0) {
    return NextResponse.json({ error: 'Invalid hatched_count' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('breeding_litters')
    .update({
      status: hatched_count > 0 ? 'da_no' : 'that_bai',
      hatched_count,
      hatched_date: hatched_date || new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

### `src/app/api/breeding/litters/[id]/graduate/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const GraduateSchema = z.object({
  chicks: z.array(z.object({
    name: z.string().optional(),
    breed_id: z.string().uuid(),
    qr_tag_id: z.string().uuid().optional(),
    cage_id: z.string().uuid().optional(),
    gender: z.enum(['trong', 'mai', 'chua_xac_dinh']).default('chua_xac_dinh'),
    parent_male_id: z.string().uuid().optional(),
  })).min(1).max(100),
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
  const parsed = GraduateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('graduate_chicks', {
    p_litter_id: id,
    p_chicks: parsed.data.chicks,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update chick_group: trừ alive_count đi số gà tốt nghiệp
  const graduatedCount = parsed.data.chicks.length
  await supabase.rpc('decrement_chick_group_after_graduate', {
    p_litter_id: id,
    p_count: graduatedCount,
  }).catch(() => {})  // optional - nếu chưa có function này thì bỏ qua

  return NextResponse.json({ data, count: data?.length || 0 })
}
```

### `src/app/api/breeding/chick-groups/[id]/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH - update alive/dead/sick count
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chick_groups')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

### `src/app/api/breeding/stats/females/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sortBy = searchParams.get('sortBy') || 'fertile_rate'
  const limit = parseInt(searchParams.get('limit') || '20')

  const supabase = await createClient()

  const validSorts = ['fertile_rate', 'hatch_rate', 'survival_rate', 'total_eggs', 'total_litters']
  const sort = validSorts.includes(sortBy) ? sortBy : 'fertile_rate'

  const { data, error } = await supabase
    .from('breeding_female_stats')
    .select('*')
    .gt('total_litters', 0)
    .order(sort, { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

### `src/app/api/breeding/stats/males/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('breeding_male_stats')
    .select('*')
    .gt('total_litters', 0)
    .order('fertile_rate_accurate', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

### `src/app/api/breeding/stats/trends/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Trả về data 12 tháng gần nhất: tỷ lệ nở + số gà con sinh ra
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('breeding_litters')
    .select('paired_date, hatched_date, eggs_total, eggs_fertile, hatched_count, status')
    .gte('paired_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by tháng
  const months: Record<string, any> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months[key] = {
      month: key,
      total_eggs: 0,
      total_fertile: 0,
      total_hatched: 0,
      litters: 0,
    }
  }

  data?.forEach(l => {
    if (!l.paired_date) return
    const d = new Date(l.paired_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (months[key]) {
      months[key].total_eggs += l.eggs_total || 0
      months[key].total_fertile += l.eggs_fertile || 0
      months[key].total_hatched += l.hatched_count || 0
      months[key].litters += 1
    }
  })

  const result = Object.values(months).map((m: any) => ({
    ...m,
    fertile_rate: m.total_eggs > 0 ? Math.round((m.total_fertile / m.total_eggs) * 100) : 0,
    hatch_rate: m.total_fertile > 0 ? Math.round((m.total_hatched / m.total_fertile) * 100) : 0,
  }))

  return NextResponse.json({ data: result })
}
```

---

## 🧩 BƯỚC 4: COMPONENT GIA PHẢ — CỐT LÕI

### `src/components/admin/pedigree/PedigreeTree.tsx`

Đây là component quan trọng nhất Phần 3. Render dạng cây với CSS Grid.

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PedigreeNode } from './PedigreeNode'

type PedigreeData = {
  generation: number
  position: string
  id: string
  chicken_code: string
  name: string | null
  breed_name: string | null
  gender: string
  birth_date: string | null
  main_photo_url: string | null
  status: string
  qr_tag_number: string | null
  father?: PedigreeData | null
  mother?: PedigreeData | null
}

interface Props {
  chickenId: string
  depth?: 2 | 3 | 4 | 5
}

export function PedigreeTree({ chickenId, depth = 3 }: Props) {
  const [tree, setTree] = useState<PedigreeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDepth, setCurrentDepth] = useState(depth)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/chickens/${chickenId}/pedigree?depth=${currentDepth}`)
      .then(r => r.json())
      .then(({ data }) => { setTree(data); setLoading(false) })
  }, [chickenId, currentDepth])

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải gia phả...</div>
  if (!tree) return <div className="p-8 text-center text-gray-500">Không tìm thấy</div>

  return (
    <div>
      {/* Depth selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">Số đời:</span>
        {[2, 3, 4, 5].map(d => (
          <button
            key={d}
            onClick={() => setCurrentDepth(d as any)}
            className={`px-3 py-1 text-sm rounded ${
              currentDepth === d
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {d} đời
          </button>
        ))}
      </div>

      {/* Tree */}
      <div className="overflow-x-auto pb-4">
        <PedigreeRenderer node={tree} depth={currentDepth} />
      </div>
    </div>
  )
}

// Renderer recursive
function PedigreeRenderer({ node, depth }: { node: PedigreeData; depth: number }) {
  // depth = số đời tổ tiên (không tính bản thân)
  // Layout: bản thân ở dưới cùng, tổ tiên ở trên/trái

  const totalLevels = depth + 1
  const widths = Array.from({ length: totalLevels }, (_, i) => Math.pow(2, i))
  const totalCols = widths[totalLevels - 1]

  return (
    <div
      className="grid gap-2 min-w-[600px]"
      style={{
        gridTemplateColumns: `repeat(${totalCols}, minmax(120px, 1fr))`,
        gridTemplateRows: `repeat(${totalLevels}, auto)`,
      }}
    >
      {renderRecursive(node, 0, totalLevels, 0, totalCols)}
    </div>
  )
}

// Helper: render node + children theo grid position
function renderRecursive(
  node: PedigreeData | null | undefined,
  level: number,
  totalLevels: number,
  startCol: number,
  spanCol: number
): React.ReactNode[] {
  if (!node || level >= totalLevels) return []

  const elements: React.ReactNode[] = []
  const gridRow = totalLevels - level

  elements.push(
    <div
      key={`${node.position}-${level}`}
      style={{
        gridRow,
        gridColumn: `${startCol + 1} / span ${spanCol}`,
      }}
    >
      <PedigreeNode node={node} />
    </div>
  )

  if (level + 1 < totalLevels) {
    const halfSpan = spanCol / 2
    // Father
    elements.push(...renderRecursive(node.father, level + 1, totalLevels, startCol, halfSpan))
    // Mother
    elements.push(...renderRecursive(node.mother, level + 1, totalLevels, startCol + halfSpan, halfSpan))
  }

  return elements
}
```

### `src/components/admin/pedigree/PedigreeNode.tsx`

```typescript
import Link from 'next/link'

type PedigreeNodeData = {
  id: string
  chicken_code: string
  name: string | null
  breed_name: string | null
  gender: string
  birth_date: string | null
  main_photo_url: string | null
  status: string
  qr_tag_number: string | null
  position: string
}

const POSITION_LABELS: Record<string, string> = {
  self: 'Bản thân',
  father: 'Bố',
  mother: 'Mẹ',
  ff: 'Ông nội',
  fm: 'Bà nội',
  mf: 'Ông ngoại',
  mm: 'Bà ngoại',
}

export function PedigreeNode({ node }: { node: PedigreeNodeData }) {
  const label = POSITION_LABELS[node.position] || ''
  const isMale = node.gender === 'trong'
  const bgColor = isMale ? 'bg-blue-50' : node.gender === 'mai' ? 'bg-pink-50' : 'bg-gray-50'
  const borderColor = isMale ? 'border-blue-200' : node.gender === 'mai' ? 'border-pink-200' : 'border-gray-200'

  return (
    <Link
      href={`/admin/gia-pha/${node.id}`}
      className={`block ${bgColor} border ${borderColor} rounded-lg p-2 hover:shadow-md transition`}
    >
      {label && (
        <div className="text-[10px] font-medium text-gray-500 uppercase mb-1">{label}</div>
      )}
      <div className="flex gap-2 items-start">
        {node.main_photo_url ? (
          <img
            src={node.main_photo_url}
            alt={node.chicken_code}
            className="w-10 h-10 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-lg">
            🐓
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-gray-900 truncate">
            {node.name || node.chicken_code}
          </div>
          <div className="text-[10px] text-gray-500 truncate">{node.breed_name}</div>
          {node.qr_tag_number && (
            <div className="text-[10px] text-blue-600">#{node.qr_tag_number}</div>
          )}
        </div>
      </div>
    </Link>
  )
}
```

### `src/components/admin/pedigree/EmptyParentSlot.tsx`

Hiển thị khi không có dữ liệu bố/mẹ:

```typescript
export function EmptyParentSlot({ position }: { position: string }) {
  return (
    <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center text-gray-400 text-xs">
      Không có dữ liệu
    </div>
  )
}
```

---

## 🧩 BƯỚC 5: COMPONENT SINH SẢN

### `src/components/admin/breeding/LitterCard.tsx`

Hiển thị 1 lứa dạng card với:
- Mã lứa
- Mái + đực (avatar nhỏ)
- Status badge
- Số ngày còn lại đến khi nở dự kiến (nếu đang ấp)
- Số trứng / phôi / nở
- Link đến chi tiết

### `src/components/admin/breeding/LitterTimeline.tsx`

Timeline trực quan:
- Ngày ghép → Ngày kiểm phôi (paired + 7-10) → Ngày nở dự kiến (paired + 21) → Ngày nở thực tế
- Highlight bước hiện tại

### `src/components/admin/breeding/ChickGroupTracker.tsx`

Form update nhanh:
- Số gà sống (alive_count)
- Số gà chết (dead_count)
- Số gà ốm (sick_count)
- Validation: alive + dead ≤ hatched_count

### `src/components/admin/breeding/GraduateForm.tsx`

Bulk form bulk tạo gà con:
- Top: chọn giống mặc định, gán cage mặc định
- Bảng các con gà con:
  - STT | Tên | Giới tính | Đực bố (chọn từ male_ids của lứa) | Mã QR
- Submit → POST /api/breeding/litters/[id]/graduate

### `src/components/admin/breeding/AvailableFemaleSelect.tsx`
### `src/components/admin/breeding/AvailableMaleSelect.tsx`

Search dropdown từ view `available_females` / `available_males`.
Multi-select cho male.

### `src/components/admin/breeding/BreedingTrendChart.tsx`

Recharts: bar (số gà nở) + line (tỷ lệ nở) trên cùng 1 chart.

```typescript
'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export function BreedingTrendChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="total_hatched" fill="#3b82f6" name="Gà nở" />
        <Line yAxisId="right" type="monotone" dataKey="hatch_rate" stroke="#10b981" name="Tỷ lệ nở (%)" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
```

---

## 📄 BƯỚC 6: PAGES — GIA PHẢ

### `/admin/gia-pha/page.tsx`

Trang giới thiệu module:
- Search box: tìm gà theo mã/tên → click ra `/admin/gia-pha/[id]`
- Stats: tổng số gà có gia phả 3 đời / 5 đời

### `/admin/gia-pha/[chickenId]/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { PedigreeTree } from '@/components/admin/pedigree/PedigreeTree'

export default async function PedigreePage({
  params,
}: { params: Promise<{ chickenId: string }> }) {
  const { chickenId } = await params
  const supabase = await createClient()

  const { data: chicken } = await supabase
    .from('chickens_with_details')
    .select('*')
    .eq('id', chickenId)
    .single()

  if (!chicken) return <div>Không tìm thấy</div>

  return (
    <div>
      <h1 className="text-2xl font-medium mb-2">Gia phả — {chicken.name || chicken.chicken_code}</h1>
      <p className="text-gray-600 mb-6">
        {chicken.breed_name} · {chicken.qr_tag_number ? `#${chicken.qr_tag_number}` : ''}
      </p>

      <PedigreeTree chickenId={chickenId} depth={3} />
    </div>
  )
}
```

---

## 📄 BƯỚC 7: PAGES — SINH SẢN

### `/admin/sinh-san/page.tsx` — DASHBOARD

Server component:
- Stats cards: lứa đang ấp, sắp nở (≤ 3 ngày), đã nở tháng này
- List 10 lứa gần nhất
- Cảnh báo: lứa quá 25 ngày chưa nở (có thể that_bai)

### `/admin/sinh-san/them-moi/page.tsx`

Form tạo lứa:
- AvailableFemaleSelect (single)
- AvailableMaleSelect (multi, max 5)
- Date picker paired_date (default hôm nay)
- CageSelect (filter type = ghep_doi nếu có, hoặc tất cả)
- Auto-display expected_hatch_date (paired_date + 21 days)
- Notes
- Submit

### `/admin/sinh-san/[litterId]/page.tsx`

Chi tiết lứa với:
- LitterTimeline ở trên
- Thông tin: female, males (clickable đến hồ sơ)
- Form update: eggs_total, eggs_fertile (nếu đang ấp)
- Nếu đến ngày nở: form "Đánh dấu nở" (hatched_count, hatched_date)
- Nếu đã nở: hiển thị ChickGroupTracker
- Nếu chick_group có alive_count > 0: nút "Tốt nghiệp gà con" → modal/sheet GraduateForm
- Bottom: list graduated chickens

### `/admin/sinh-san/thong-ke/page.tsx`

Server component fetch all 3 stats:

```typescript
import { BreedingTrendChart } from '@/components/admin/breeding/BreedingTrendChart'

export default async function StatsPage() {
  const [femaleRes, maleRes, trendRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/breeding/stats/females?limit=20`,
      { cache: 'no-store' }),
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/breeding/stats/males`,
      { cache: 'no-store' }),
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/breeding/stats/trends`,
      { cache: 'no-store' }),
  ])
  const females = (await femaleRes.json()).data
  const males = (await maleRes.json()).data
  const trends = (await trendRes.json()).data

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-medium mb-4">Xu hướng 12 tháng</h2>
        <BreedingTrendChart data={trends} />
      </section>

      <section>
        <h2 className="text-xl font-medium mb-4">Bảng xếp hạng gà mái</h2>
        {/* Table với cột: mã, tên, lứa, trứng, % phôi, % nở, % sống */}
        {/* Sort buttons cho từng cột */}
      </section>

      <section>
        <h2 className="text-xl font-medium mb-4">Performance theo gà đực</h2>
        {/* Table tương tự + warning về lứa nhiều đực */}
        <p className="text-xs text-gray-500 mb-2">
          Tỷ lệ chính xác chỉ tính trên lứa có 1 đực duy nhất (cột "solo_litters")
        </p>
      </section>
    </div>
  )
}
```

---

## 🔗 BƯỚC 8: TÍCH HỢP NHANH VÀO PHẦN 2

Cập nhật trang chi tiết gà `/admin/ho-so-ga/[id]`:

**Tab "Gia phả"** giờ render:
```tsx
<PedigreeTree chickenId={chicken.id} depth={3} />
```

**Tab "Sinh sản"** (nếu là mái) hiển thị:
- Danh sách lứa của con này
- Stats từ `breeding_female_stats`

(Nếu là đực) hiển thị:
- Performance từ `breeding_male_stats`
- Warning về độ chính xác

---

## ✅ CHECKLIST PHẦN 3

### Cây gia phả
- [ ] Tạo 4 con gà: Bố, Mẹ, Ông nội, Bà nội
- [ ] Gán: bố → có ông nội; mẹ → có bà nội (qua form sửa hồ sơ)
- [ ] Tạo "Bản thân" có bố/mẹ là Bố/Mẹ
- [ ] Vào `/admin/gia-pha/[id_bản_thân]` → thấy cây 3 đời đầy đủ
- [ ] Click vào "Bố" → đến trang gia phả của Bố
- [ ] Đổi depth thành 5 → query không lỗi
- [ ] Cố tạo loop (gán bố là chính nó) → DB throw error
- [ ] Gán bố là một con gà mà bản thân là tổ tiên → DB throw error (chỉ check khi UPDATE)

### Sinh sản
- [ ] Tạo lứa: chọn 1 mái + 2 đực + ngày ghép → expected_hatch_date tự = +21 ngày
- [ ] Litter_code tự sinh: L-2026-001
- [ ] Cố tạo lứa thứ 2 với cùng mái đó (đang dang_ap) → API throw error
- [ ] Update eggs_total = 15, eggs_fertile = 12 → fertile_rate hiển thị 80%
- [ ] Đánh dấu nở: hatched_count = 10 → status chuyển 'da_no', tự tạo chick_group
- [ ] Chick_group có alive_count = 10 (default = hatched)
- [ ] Update chick_group: alive=8, dead=2 → tỷ lệ sống 80%
- [ ] Tốt nghiệp 5 con: GraduateForm → tạo 5 chickens với:
  - parent_female_id = mái của lứa
  - parent_male_id = đực được chọn từng con
  - breeding_litter_id = id của lứa
  - birth_date = hatched_date
  - source = 'no_tai_trai'
- [ ] Mỗi chicken mới tự có 8 vaccinations (trigger Phần 1)

### Thống kê
- [ ] `/admin/sinh-san/thong-ke` hiển thị 3 phần
- [ ] Bảng mái: chỉ những con có total_litters > 0
- [ ] Bảng đực: cột solo_litters và fertile_rate_accurate hiển thị đúng
- [ ] Biểu đồ 12 tháng: hiển thị bar gà nở + line tỷ lệ nở
- [ ] Hover bar/line thấy tooltip

### Mobile
- [ ] Cây gia phả scroll horizontal được trên mobile, không bị vỡ layout
- [ ] Form tạo lứa dùng được trên màn hình 375px
- [ ] GraduateForm: bảng nhập có thể scroll ngang nếu nhiều cột

### Tích hợp Phần 2
- [ ] Trang chi tiết gà có tab "Gia phả" hiển thị PedigreeTree
- [ ] Tab "Sinh sản" hiển thị stats nếu là mái/đực có dữ liệu

---

## 🚨 LƯU Ý TRIỂN KHAI

1. **Recursive CTE có thể chậm với cây sâu (5 đời = 31 nodes):** đã thêm index trên `parent_male_id, parent_female_id` ở Phần 1. Nếu vẫn chậm với 5000 con gà → cân nhắc materialized view.

2. **Pedigree HTML/CSS Grid:** layout có thể "rộng" nếu nhiều đời. Mobile cần scroll ngang. Cân nhắc collapse một số nhánh nếu cần.

3. **Validation parent gender:** không hard-enforce trong DB (vì gà có thể `chua_xac_dinh` rồi mới biết). Nhưng UI nên warning nếu chọn bố là gà mái hoặc ngược lại.

4. **Performance mái/đực:** view dùng aggregate trên toàn bộ litters → chậm với hàng nghìn lứa. Hiện tại OK cho quy mô <500 lứa/năm. Nếu lớn hơn → tạo materialized view, refresh hàng đêm.

5. **Tốt nghiệp gà con:** nên làm theo lô vừa phải (10-30 con/lần). Nếu nở 100 con thì chia làm nhiều lần.

6. **Trang bio public:** Phần 6 sẽ sử dụng cùng `PedigreeTree` component này, nhưng wrap trong public layout với style khác (đẹp hơn, có ảnh to hơn).

7. **Khi gà bố/mẹ chết:** không xóa, chỉ status = 'chet'. Vẫn hiển thị trong gia phả nhưng có badge "đã chết".

---

## 📦 OUTPUT MONG ĐỢI

Khi xong Phần 3:
- Cây gia phả tương tác đầy đủ, click sâu được nhiều đời
- Workflow sinh sản hoàn chỉnh: ghép đôi → trứng → nở → tốt nghiệp gà con
- 3 báo cáo thống kê hoạt động đúng
- Tích hợp với Phần 2 (tab gia phả + tab sinh sản trong chi tiết gà)

**Báo lại khi xong, tôi chuẩn bị Phần 4 (Sức khỏe + Vần gà) hoặc Phần 5 (Mua bán + Tài chính) tùy bạn ưu tiên!**
