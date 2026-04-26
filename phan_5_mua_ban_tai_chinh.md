# PROMPT CHO CLAUDE CODE — PHẦN 5: MUA BÁN + TÀI CHÍNH
## Dự án: Gà Chọi Việt Ninh Bình (gachoivietnb.com)

---

## 🎯 NHIỆM VỤ CỦA BẠN (Claude Code)

Build **vòng đời kinh doanh đầy đủ** — từ nhập gà đến bán và tính lãi lỗ thực:

1. **Module mua vào** — nhập gà từ NCC + tự tạo hồ sơ + xếp khu cách ly
2. **Module bán ra** — workflow 5 trạng thái + đặt cọc giữ chỗ + xuất biên lai PDF
3. **Tính giá vốn** — view tự động: giá mua + chi phí nuôi + thuốc riêng
4. **Chi phí vận hành** — 8 hạng mục + phân bổ tự động
5. **Báo cáo tài chính** — P&L + doanh thu phân khúc + I-O-S + hiệu suất giống + công nợ + xuất Excel

**Sau khi hoàn thành Phần 5:**
- Nhập 30 con gà từ 1 NCC → tự tạo 30 hồ sơ + xếp khu E + tạo lịch tiêm
- Tạo đơn hàng bán 3 con → đặt cọc → 3 con đó tự "đang giữ chỗ", không vào đơn khác được
- Giao hàng → 3 con tự chuyển status `da_ban`, customer.total_spent tự cập nhật
- Xuất biên lai PDF đẹp gửi khách
- Xem báo cáo P&L tháng → biết lãi/lỗ thực
- Xuất Excel báo cáo nhập xuất tồn

---

## 📋 NHẮC LẠI QUY TẮC

1. **Tiếng Anh code, tiếng Việt UI**
2. **Mobile-first**
3. **TypeScript strict**
4. **KHÔNG sửa schema cũ** — chỉ thêm
5. **Format số tiền:** dùng `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`
6. **Tất cả số tiền lưu DECIMAL(15,2)** trong DB

---

## 📦 BƯỚC 1: PACKAGES (đã có hết từ phần trước)

Đã có:
- `xlsx` (Phần 2) — xuất Excel
- `jspdf` (Phần 2) — xuất PDF
- `recharts` (Phần 3) — biểu đồ
- `date-fns` (Phần 1)

Không cần cài thêm gì.

---

## 🗄️ BƯỚC 2: MIGRATION BỔ SUNG

Tạo file `supabase/migrations/20260501000001_phase5_sales_finance.sql`:

```sql
-- =====================================================
-- PHASE 5: SALES & FINANCE
-- =====================================================

-- =====================================================
-- 1. THÊM CỘT IS_RESERVED VÀO CHICKENS
-- =====================================================

ALTER TABLE chickens ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN DEFAULT FALSE;
ALTER TABLE chickens ADD COLUMN IF NOT EXISTS reserved_for_order_id UUID;
ALTER TABLE chickens ADD COLUMN IF NOT EXISTS sale_date DATE;
ALTER TABLE chickens ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE chickens ADD COLUMN IF NOT EXISTS sale_price DECIMAL(15,2);

CREATE INDEX IF NOT EXISTS idx_chickens_reserved ON chickens(is_reserved) WHERE is_reserved = TRUE;

-- =====================================================
-- 2. THÊM CỘT PAID_AMOUNT VÀO SALES_ORDERS
-- =====================================================

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS bank_transfer_ref TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS deposit_date DATE;

-- =====================================================
-- 3. AUTO GENERATE PURCHASE_CODE & ORDER_CODE
-- =====================================================

CREATE OR REPLACE FUNCTION generate_purchase_code()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  IF NEW.purchase_code IS NOT NULL AND NEW.purchase_code != '' THEN RETURN NEW; END IF;
  v_year := TO_CHAR(COALESCE(NEW.purchase_date, CURRENT_DATE), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_seq FROM purchases
    WHERE TO_CHAR(purchase_date, 'YYYY') = v_year;
  NEW.purchase_code := 'NH-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_purchase_code
  BEFORE INSERT ON purchases FOR EACH ROW EXECUTE FUNCTION generate_purchase_code();

CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  IF NEW.order_code IS NOT NULL AND NEW.order_code != '' THEN RETURN NEW; END IF;
  v_year := TO_CHAR(COALESCE(NEW.order_date, CURRENT_DATE), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_seq FROM sales_orders
    WHERE TO_CHAR(order_date, 'YYYY') = v_year;
  NEW.order_code := 'BH-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_order_code
  BEFORE INSERT ON sales_orders FOR EACH ROW EXECUTE FUNCTION generate_order_code();

-- =====================================================
-- 4. SYNC CHICKEN STATUS với SALES_ORDERS
-- =====================================================

CREATE OR REPLACE FUNCTION sync_chicken_with_order_status()
RETURNS TRIGGER AS $$
DECLARE
  v_chicken_ids UUID[];
BEGIN
  -- Lấy danh sách gà trong đơn
  SELECT array_agg(chicken_id) INTO v_chicken_ids
  FROM sales_items WHERE sales_order_id = NEW.id;

  IF v_chicken_ids IS NULL OR array_length(v_chicken_ids, 1) = 0 THEN
    RETURN NEW;
  END IF;

  -- Đặt cọc → reserved
  IF NEW.status = 'dat_coc' AND (OLD.status IS NULL OR OLD.status != 'dat_coc') THEN
    UPDATE chickens SET is_reserved = TRUE, reserved_for_order_id = NEW.id
    WHERE id = ANY(v_chicken_ids);
  END IF;

  -- Hủy → release reserved
  IF NEW.status = 'huy' AND OLD.status != 'huy' THEN
    UPDATE chickens SET is_reserved = FALSE, reserved_for_order_id = NULL
    WHERE id = ANY(v_chicken_ids) AND reserved_for_order_id = NEW.id;
  END IF;

  -- Giao → bán xong
  IF NEW.status = 'da_giao' AND OLD.status != 'da_giao' THEN
    UPDATE chickens
    SET status = 'da_ban',
        is_reserved = FALSE,
        reserved_for_order_id = NULL,
        sale_date = COALESCE(NEW.delivered_date, CURRENT_DATE),
        customer_id = NEW.customer_id,
        sale_price = (
          SELECT unit_price FROM sales_items
          WHERE sales_order_id = NEW.id AND chicken_id = chickens.id
        )
    WHERE id = ANY(v_chicken_ids);

    -- Update customer stats
    IF NEW.customer_id IS NOT NULL THEN
      UPDATE customers
      SET total_purchased = total_purchased + array_length(v_chicken_ids, 1),
          total_spent = total_spent + NEW.total_amount,
          last_purchase_date = COALESCE(NEW.delivered_date, CURRENT_DATE)
      WHERE id = NEW.customer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_chicken_with_order_status
  AFTER UPDATE OF status ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION sync_chicken_with_order_status();

-- =====================================================
-- 5. VIEW: CHICKEN COST BASIS (THẬT)
-- =====================================================

DROP VIEW IF EXISTS chicken_cost_basis CASCADE;

CREATE OR REPLACE VIEW chicken_cost_basis AS
WITH default_monthly_cost AS (
  SELECT COALESCE(
    (value->>'value')::DECIMAL,
    100000
  ) AS amount
  FROM system_settings
  WHERE key = 'default_cost_per_chicken_per_month'
),
medicine_costs AS (
  SELECT
    related_chicken_id,
    SUM(cost) AS total_medicine_cost
  FROM medicine_transactions
  WHERE transaction_type = 'xuat' AND related_chicken_id IS NOT NULL
  GROUP BY related_chicken_id
)
SELECT
  c.id,
  c.chicken_code,
  COALESCE(c.cost_purchase, 0) AS purchase_cost,
  GREATEST(
    EXTRACT(EPOCH FROM (
      COALESCE(c.sale_date, c.status_date, CURRENT_DATE) - COALESCE(c.birth_date, c.created_at::DATE)
    )) / (30 * 24 * 3600),
    0
  )::DECIMAL(10,2) AS months_raised,
  (SELECT amount FROM default_monthly_cost) AS monthly_cost,
  GREATEST(
    EXTRACT(EPOCH FROM (
      COALESCE(c.sale_date, c.status_date, CURRENT_DATE) - COALESCE(c.birth_date, c.created_at::DATE)
    )) / (30 * 24 * 3600),
    0
  )::DECIMAL(10,2) * (SELECT amount FROM default_monthly_cost) AS feeding_cost,
  COALESCE(mc.total_medicine_cost, 0) AS medicine_cost,
  COALESCE(c.cost_purchase, 0)
    + GREATEST(
        EXTRACT(EPOCH FROM (
          COALESCE(c.sale_date, c.status_date, CURRENT_DATE) - COALESCE(c.birth_date, c.created_at::DATE)
        )) / (30 * 24 * 3600),
        0
      )::DECIMAL(10,2) * (SELECT amount FROM default_monthly_cost)
    + COALESCE(mc.total_medicine_cost, 0) AS total_cost
FROM chickens c
LEFT JOIN medicine_costs mc ON mc.related_chicken_id = c.id;

-- =====================================================
-- 6. VIEW: SALES PERFORMANCE (chỉ con đã bán)
-- =====================================================

CREATE OR REPLACE VIEW sales_performance AS
SELECT
  c.id AS chicken_id,
  c.chicken_code,
  c.sale_date,
  c.sale_price,
  cb.total_cost AS cost_basis,
  c.sale_price - cb.total_cost AS profit,
  CASE WHEN cb.total_cost > 0
    THEN ROUND(((c.sale_price - cb.total_cost) / cb.total_cost * 100)::NUMERIC, 1)
    ELSE 0
  END AS profit_margin_pct,
  b.id AS breed_id,
  b.name_vi AS breed_name,
  b.tier AS breed_tier,
  -- Phân khúc theo giá BÁN thực tế
  CASE
    WHEN c.sale_price < 2000000 THEN 'thit'
    WHEN c.sale_price < 5000000 THEN 'pho_thong'
    ELSE 'cao_cap'
  END AS price_segment,
  cust.id AS customer_id,
  cust.name AS customer_name
FROM chickens c
JOIN chicken_cost_basis cb ON cb.id = c.id
LEFT JOIN breeds b ON b.id = c.breed_id
LEFT JOIN customers cust ON cust.id = c.customer_id
WHERE c.status = 'da_ban' AND c.sale_date IS NOT NULL;

-- =====================================================
-- 7. VIEW: INVENTORY (NHẬP XUẤT TỒN)
-- =====================================================

CREATE OR REPLACE FUNCTION inventory_report(
  p_from_date DATE,
  p_to_date DATE
) RETURNS TABLE (
  category TEXT,
  count BIGINT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY

  -- Tồn đầu kỳ
  SELECT 'opening_stock'::TEXT, COUNT(*)::BIGINT, 'Tồn đầu kỳ'::TEXT
  FROM chickens
  WHERE created_at::DATE < p_from_date
    AND (status IN ('dang_nuoi', 'dang_cach_ly')
         OR (status_date >= p_from_date AND status IN ('da_ban', 'chet', 'loai_thai')))

  UNION ALL
  -- Nhập: mua vào
  SELECT 'purchased'::TEXT, COUNT(*)::BIGINT, 'Mua vào'::TEXT
  FROM chickens
  WHERE source = 'mua'
    AND created_at::DATE BETWEEN p_from_date AND p_to_date

  UNION ALL
  -- Nhập: nở tại trại
  SELECT 'hatched'::TEXT, COUNT(*)::BIGINT, 'Nở tại trại'::TEXT
  FROM chickens
  WHERE source = 'no_tai_trai'
    AND created_at::DATE BETWEEN p_from_date AND p_to_date

  UNION ALL
  -- Xuất: bán
  SELECT 'sold'::TEXT, COUNT(*)::BIGINT, 'Đã bán'::TEXT
  FROM chickens
  WHERE status = 'da_ban'
    AND sale_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  -- Xuất: chết
  SELECT 'died'::TEXT, COUNT(*)::BIGINT, 'Chết'::TEXT
  FROM chickens
  WHERE status = 'chet'
    AND status_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  -- Xuất: loại thải
  SELECT 'culled'::TEXT, COUNT(*)::BIGINT, 'Loại thải'::TEXT
  FROM chickens
  WHERE status = 'loai_thai'
    AND status_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  -- Tồn cuối kỳ
  SELECT 'closing_stock'::TEXT, COUNT(*)::BIGINT, 'Tồn cuối kỳ'::TEXT
  FROM chickens
  WHERE created_at::DATE <= p_to_date
    AND (status IN ('dang_nuoi', 'dang_cach_ly')
         OR (status_date > p_to_date));

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. VIEW: P&L REPORT
-- =====================================================

CREATE OR REPLACE FUNCTION pnl_report(
  p_from_date DATE,
  p_to_date DATE
) RETURNS TABLE (
  line_item TEXT,
  amount DECIMAL,
  category TEXT
) AS $$
BEGIN
  RETURN QUERY

  -- DOANH THU theo phân khúc
  SELECT
    'Gà cao cấp'::TEXT,
    COALESCE(SUM(sp.sale_price) FILTER (WHERE sp.price_segment = 'cao_cap'), 0)::DECIMAL,
    'revenue'::TEXT
  FROM sales_performance sp
  WHERE sp.sale_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  SELECT
    'Gà phổ thông'::TEXT,
    COALESCE(SUM(sp.sale_price) FILTER (WHERE sp.price_segment = 'pho_thong'), 0)::DECIMAL,
    'revenue'::TEXT
  FROM sales_performance sp
  WHERE sp.sale_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  SELECT
    'Gà thịt'::TEXT,
    COALESCE(SUM(sp.sale_price) FILTER (WHERE sp.price_segment = 'thit'), 0)::DECIMAL,
    'revenue'::TEXT
  FROM sales_performance sp
  WHERE sp.sale_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  -- GIÁ VỐN
  SELECT
    'Giá vốn hàng bán'::TEXT,
    COALESCE(SUM(sp.cost_basis), 0)::DECIMAL,
    'cogs'::TEXT
  FROM sales_performance sp
  WHERE sp.sale_date BETWEEN p_from_date AND p_to_date

  UNION ALL
  -- CHI PHÍ HOẠT ĐỘNG (theo từng category)
  SELECT
    ec.name_vi::TEXT,
    COALESCE(SUM(e.amount), 0)::DECIMAL,
    'opex'::TEXT
  FROM expense_categories ec
  LEFT JOIN expenses e ON e.category_id = ec.id
    AND e.expense_date BETWEEN p_from_date AND p_to_date
  GROUP BY ec.id, ec.name_vi, ec.display_order
  ORDER BY ec.display_order;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. VIEW: BREED PERFORMANCE
-- =====================================================

CREATE OR REPLACE VIEW breed_performance AS
SELECT
  b.id AS breed_id,
  b.code AS breed_code,
  b.name_vi AS breed_name,
  b.tier,
  -- Đang nuôi
  COUNT(c.id) FILTER (WHERE c.status IN ('dang_nuoi', 'dang_cach_ly')) AS current_alive,
  -- Đã bán
  COUNT(c.id) FILTER (WHERE c.status = 'da_ban') AS total_sold,
  -- Doanh thu
  COALESCE(SUM(c.sale_price) FILTER (WHERE c.status = 'da_ban'), 0) AS total_revenue,
  -- Giá bán trung bình
  ROUND(COALESCE(AVG(c.sale_price) FILTER (WHERE c.status = 'da_ban'), 0)::NUMERIC, 0) AS avg_sale_price,
  -- Lãi trung bình (cần join cost_basis)
  ROUND(COALESCE(AVG(sp.profit), 0)::NUMERIC, 0) AS avg_profit,
  ROUND(COALESCE(AVG(sp.profit_margin_pct), 0)::NUMERIC, 1) AS avg_profit_margin,
  -- Tỷ lệ chết
  CASE WHEN COUNT(c.id) > 0
    THEN ROUND((COUNT(c.id) FILTER (WHERE c.status = 'chet')::NUMERIC / COUNT(c.id)) * 100, 1)
    ELSE 0
  END AS death_rate
FROM breeds b
LEFT JOIN chickens c ON c.breed_id = b.id
LEFT JOIN sales_performance sp ON sp.chicken_id = c.id
WHERE b.is_active = TRUE
GROUP BY b.id, b.code, b.name_vi, b.tier;

-- =====================================================
-- 10. VIEW: RECEIVABLES (CÔNG NỢ)
-- =====================================================

CREATE OR REPLACE VIEW customer_receivables AS
SELECT
  cust.id AS customer_id,
  cust.name AS customer_name,
  cust.phone,
  so.id AS order_id,
  so.order_code,
  so.order_date,
  so.delivered_date,
  so.total_amount,
  so.paid_amount,
  so.deposit_amount,
  so.total_amount - so.paid_amount AS amount_due,
  so.status
FROM sales_orders so
JOIN customers cust ON cust.id = so.customer_id
WHERE so.status IN ('dat_coc', 'da_giao')
  AND so.total_amount > so.paid_amount
ORDER BY so.order_date DESC;
```

**Chạy file migration trong Supabase SQL Editor.**

---

## 🔌 BƯỚC 3: API ROUTES — MUA VÀO

### `src/app/api/suppliers/route.ts`

GET (list with search) + POST (create new supplier).

### `src/app/api/purchases/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const PurchaseItemSchema = z.object({
  // Có 2 mode: tạo gà mới hoặc reference gà đã có
  unit_price: z.number().positive(),
  // Nếu tạo gà mới
  breed_id: z.string().uuid(),
  gender: z.enum(['trong', 'mai', 'chua_xac_dinh']).default('chua_xac_dinh'),
  qr_tag_id: z.string().uuid().optional(),
  birth_date: z.string().optional(),
  weight_kg: z.number().optional(),
  color: z.string().optional(),
  name: z.string().optional(),
})

const PurchaseSchema = z.object({
  supplier_id: z.string().uuid().optional(),
  supplier_name: z.string().optional(),  // tạo mới NCC nếu không có ID
  purchase_date: z.string(),
  items: z.array(PurchaseItemSchema).min(1).max(200),
  notes: z.string().optional(),
})

// GET list
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const supplierId = searchParams.get('supplier_id')

  const supabase = await createClient()
  let query = supabase
    .from('purchases')
    .select(`
      *,
      supplier:suppliers(id, name),
      purchase_items(count)
    `, { count: 'exact' })
    .order('purchase_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (supplierId) query = query.eq('supplier_id', supplierId)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count })
}

// POST - tạo phiếu nhập + tạo chickens
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = PurchaseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { supplier_id, supplier_name, purchase_date, items, notes } = parsed.data

  // Tạo NCC mới nếu chưa có
  let finalSupplierId = supplier_id
  if (!finalSupplierId && supplier_name) {
    const { data: newSupplier } = await supabase
      .from('suppliers')
      .insert({ name: supplier_name, supplier_type: 'ga_giong' })
      .select('id')
      .single()
    finalSupplierId = newSupplier?.id
  }

  // Tính total
  const totalAmount = items.reduce((sum, i) => sum + i.unit_price, 0)

  // Tạo phiếu nhập
  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      supplier_id: finalSupplierId,
      purchase_date,
      total_quantity: items.length,
      total_amount: totalAmount,
      notes,
      performed_by: user.id,
    })
    .select()
    .single()

  if (purchaseError) return NextResponse.json({ error: purchaseError.message }, { status: 500 })

  // Tìm chuồng cách ly trống
  const { data: cageId } = await supabase.rpc('find_available_cage', { p_area_type: 'cach_ly' })

  // Tạo chickens (bulk)
  const chickensToInsert = items.map(item => ({
    breed_id: item.breed_id,
    qr_tag_id: item.qr_tag_id,
    cage_id: cageId,
    gender: item.gender,
    birth_date: item.birth_date,
    weight_kg: item.weight_kg,
    color: item.color,
    name: item.name,
    source: 'mua' as const,
    cost_purchase: item.unit_price,
    status: 'dang_cach_ly' as const,
    created_by: user.id,
  }))

  const { data: createdChickens, error: chickensError } = await supabase
    .from('chickens')
    .insert(chickensToInsert)
    .select('id')

  if (chickensError) {
    // Rollback purchase
    await supabase.from('purchases').delete().eq('id', purchase.id)
    return NextResponse.json({ error: chickensError.message }, { status: 500 })
  }

  // Tạo purchase_items
  const purchaseItems = createdChickens!.map((c, i) => ({
    purchase_id: purchase.id,
    chicken_id: c.id,
    unit_price: items[i].unit_price,
  }))

  await supabase.from('purchase_items').insert(purchaseItems)

  return NextResponse.json({
    data: { ...purchase, items: createdChickens },
    count: createdChickens?.length,
  })
}
```

### `src/app/api/purchases/[id]/route.ts`

GET single với full items + supplier info.

---

## 🔌 BƯỚC 4: API ROUTES — BÁN RA

### `src/app/api/customers/route.ts`

GET (list with search) + POST (create new customer).

### `src/app/api/sales-orders/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const OrderItemSchema = z.object({
  chicken_id: z.string().uuid(),
  unit_price: z.number().positive(),
  notes: z.string().optional(),
})

const OrderSchema = z.object({
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  order_date: z.string().optional(),
  items: z.array(OrderItemSchema).min(1),
  status: z.enum(['hoi_mua', 'dat_coc', 'da_giao', 'huy']).default('hoi_mua'),
  deposit_amount: z.number().default(0),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
})

// GET list
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const supabase = await createClient()
  let query = supabase
    .from('sales_orders')
    .select(`
      *,
      customer:customers(id, name, phone),
      sales_items(count)
    `, { count: 'exact' })
    .order('order_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

// POST - tạo đơn hàng
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = OrderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { customer_id, customer_name, customer_phone, items, ...rest } = parsed.data

  // Validate: tất cả gà phải đang nuôi và không reserved
  const chickenIds = items.map(i => i.chicken_id)
  const { data: chickens } = await supabase
    .from('chickens')
    .select('id, chicken_code, status, is_reserved')
    .in('id', chickenIds)

  const invalid = chickens?.filter(c =>
    c.status !== 'dang_nuoi' || c.is_reserved
  )
  if (invalid && invalid.length > 0) {
    return NextResponse.json({
      error: `Một số gà không thể bán: ${invalid.map(c => c.chicken_code).join(', ')}`,
    }, { status: 400 })
  }

  // Tạo customer mới nếu cần
  let finalCustomerId = customer_id
  if (!finalCustomerId && customer_name) {
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({ name: customer_name, phone: customer_phone, source: 'truc_tiep' })
      .select('id')
      .single()
    finalCustomerId = newCustomer?.id
  }

  // Tính total
  const totalAmount = items.reduce((sum, i) => sum + i.unit_price, 0)

  // Tạo order
  const { data: order, error: orderError } = await supabase
    .from('sales_orders')
    .insert({
      customer_id: finalCustomerId,
      total_amount: totalAmount,
      performed_by: user.id,
      ...rest,
    })
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  // Tạo sales_items
  const salesItems = items.map(i => ({
    sales_order_id: order.id,
    chicken_id: i.chicken_id,
    unit_price: i.unit_price,
    notes: i.notes,
  }))

  await supabase.from('sales_items').insert(salesItems)

  // Nếu status đã là dat_coc → trigger sync
  if (rest.status === 'dat_coc') {
    await supabase
      .from('sales_orders')
      .update({ status: 'dat_coc' })  // re-trigger để chạy sync
      .eq('id', order.id)
  }

  return NextResponse.json({ data: order })
}
```

### `src/app/api/sales-orders/[id]/route.ts`

GET single + PATCH (update status, paid_amount, etc).

### `src/app/api/sales-orders/[id]/status/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST { new_status, deposit_amount?, paid_amount?, delivered_date? }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const supabase = await createClient()

  const update: any = { status: body.new_status }
  if (body.deposit_amount !== undefined) {
    update.deposit_amount = body.deposit_amount
    update.paid_amount = body.deposit_amount
    update.deposit_date = new Date().toISOString().split('T')[0]
  }
  if (body.paid_amount !== undefined) update.paid_amount = body.paid_amount
  if (body.delivered_date) update.delivered_date = body.delivered_date
  if (body.bank_transfer_ref) update.bank_transfer_ref = body.bank_transfer_ref

  const { data, error } = await supabase
    .from('sales_orders')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

### `src/app/api/sales-orders/[id]/invoice/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('sales_orders')
    .select(`
      *,
      customer:customers(*),
      sales_items(*, chicken:chickens(chicken_code, name, breeds(name_vi)))
    `)
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Lấy thông tin trang trại
  const { data: settings } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'farm_info')
    .single()
  const farm = settings?.value as any

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(farm?.name || 'GÀ CHỌI VIỆT NB', 105, 20, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Địa chỉ: ${farm?.address || ''}`, 105, 26, { align: 'center' })
  if (farm?.phone) doc.text(`SĐT: ${farm.phone}`, 105, 31, { align: 'center' })

  // Title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('BIÊN LAI BÁN HÀNG', 105, 45, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Số: ${order.order_code}`, 105, 52, { align: 'center' })
  doc.text(`Ngày: ${new Date(order.order_date).toLocaleDateString('vi-VN')}`, 105, 57, { align: 'center' })

  // Customer info
  doc.setFontSize(10)
  doc.text(`Khách hàng: ${order.customer?.name || '—'}`, 15, 70)
  doc.text(`Điện thoại: ${order.customer?.phone || '—'}`, 15, 76)
  if (order.customer?.address) doc.text(`Địa chỉ: ${order.customer.address}`, 15, 82)

  // Items table
  let y = 95
  doc.setFont('helvetica', 'bold')
  doc.setFillColor(230)
  doc.rect(15, y - 5, 180, 8, 'F')
  doc.text('STT', 18, y)
  doc.text('Mã gà', 35, y)
  doc.text('Tên/Giống', 75, y)
  doc.text('Đơn giá', 145, y, { align: 'right' })
  doc.text('Thành tiền', 190, y, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  y += 8
  order.sales_items.forEach((item: any, idx: number) => {
    doc.text(`${idx + 1}`, 18, y)
    doc.text(item.chicken?.chicken_code || '', 35, y)
    doc.text(`${item.chicken?.name || ''} (${item.chicken?.breeds?.name_vi || ''})`, 75, y)
    doc.text(formatVnd(item.unit_price), 145, y, { align: 'right' })
    doc.text(formatVnd(item.unit_price), 190, y, { align: 'right' })
    y += 8
  })

  // Totals
  y += 5
  doc.line(15, y - 3, 195, y - 3)
  doc.setFont('helvetica', 'bold')
  doc.text('Tổng cộng:', 145, y, { align: 'right' })
  doc.text(formatVnd(order.total_amount), 190, y, { align: 'right' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.text(`Đã thanh toán:`, 145, y, { align: 'right' })
  doc.text(formatVnd(order.paid_amount), 190, y, { align: 'right' })
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text(`Còn lại:`, 145, y, { align: 'right' })
  doc.text(formatVnd(order.total_amount - order.paid_amount), 190, y, { align: 'right' })

  // Footer
  y += 30
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Cảm ơn quý khách! — gachoivietnb.com', 105, y, { align: 'center' })

  // Signatures
  y += 15
  doc.text('Người mua', 50, y, { align: 'center' })
  doc.text('Người bán', 160, y, { align: 'center' })
  doc.text('(Ký, ghi rõ họ tên)', 50, y + 5, { align: 'center' })
  doc.text('(Ký, ghi rõ họ tên)', 160, y + 5, { align: 'center' })

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="bien-lai-${order.order_code}.pdf"`,
    },
  })
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ'
}
```

---

## 🔌 BƯỚC 5: API ROUTES — TÀI CHÍNH

### `src/app/api/expenses/route.ts`

GET (list with date filter + category filter) + POST (create expense).

### `src/app/api/finance/cost-basis/[chickenId]/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chickenId: string }> }
) {
  const { chickenId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('chicken_cost_basis')
    .select('*')
    .eq('id', chickenId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

### `src/app/api/finance/reports/pnl/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to dates' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('pnl_report', {
    p_from_date: from,
    p_to_date: to,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by category
  const grouped = {
    revenue: data.filter((r: any) => r.category === 'revenue'),
    cogs: data.filter((r: any) => r.category === 'cogs'),
    opex: data.filter((r: any) => r.category === 'opex'),
  }

  const totalRevenue = grouped.revenue.reduce((s: number, r: any) => s + parseFloat(r.amount), 0)
  const totalCogs = grouped.cogs.reduce((s: number, r: any) => s + parseFloat(r.amount), 0)
  const totalOpex = grouped.opex.reduce((s: number, r: any) => s + parseFloat(r.amount), 0)

  return NextResponse.json({
    data: {
      ...grouped,
      totals: {
        revenue: totalRevenue,
        cogs: totalCogs,
        gross_profit: totalRevenue - totalCogs,
        opex: totalOpex,
        net_profit: totalRevenue - totalCogs - totalOpex,
      },
    },
  })
}
```

### `src/app/api/finance/reports/inventory/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('inventory_report', {
    p_from_date: from,
    p_to_date: to,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

### `src/app/api/finance/reports/breed-performance/route.ts`

GET từ view `breed_performance`.

### `src/app/api/finance/reports/receivables/route.ts`

GET từ view `customer_receivables`.

### `src/app/api/finance/reports/[type]/export-excel/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const supabase = await createClient()
  const wb = XLSX.utils.book_new()

  if (type === 'pnl') {
    const { data } = await supabase.rpc('pnl_report', { p_from_date: from, p_to_date: to })
    const ws = XLSX.utils.json_to_sheet(data || [])
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, ws, 'P&L')
  } else if (type === 'inventory') {
    const { data } = await supabase.rpc('inventory_report', { p_from_date: from, p_to_date: to })
    const ws = XLSX.utils.json_to_sheet(data || [])
    ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Nhập xuất tồn')
  } else if (type === 'breed-performance') {
    const { data } = await supabase.from('breed_performance').select('*')
    const ws = XLSX.utils.json_to_sheet(data || [])
    XLSX.utils.book_append_sheet(wb, ws, 'Hiệu suất giống')
  } else if (type === 'receivables') {
    const { data } = await supabase.from('customer_receivables').select('*')
    const ws = XLSX.utils.json_to_sheet(data || [])
    XLSX.utils.book_append_sheet(wb, ws, 'Công nợ')
  } else if (type === 'sales-detail') {
    const { data } = await supabase
      .from('sales_performance')
      .select('*')
      .gte('sale_date', from)
      .lte('sale_date', to)
    const ws = XLSX.utils.json_to_sheet(data || [])
    XLSX.utils.book_append_sheet(wb, ws, 'Chi tiết bán hàng')
  } else {
    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${type}-${from}-${to}.xlsx"`,
    },
  })
}
```

---

## 🧩 BƯỚC 6: COMPONENTS

### Sales components
- `ChickenSelectForSale` — search chỉ hiện gà `dang_nuoi` + `!is_reserved`
- `CustomerSelect` — search + tạo mới inline
- `OrderStatusBadge` — 5 màu cho 5 status
- `OrderForm` — form đa item với tính total realtime
- `OrderStatusActions` — buttons workflow theo status hiện tại
- `InvoicePreviewButton` — link đến `/api/sales-orders/[id]/invoice` mở PDF

### Purchase components  
- `SupplierSelect` — search + tạo mới inline
- `PurchaseForm` — bulk form: chọn NCC → bulk add chickens với cùng giống/giá
- `PurchaseList`

### Finance components
- `CostBasisCard` — hiển thị giá vốn 1 con: purchase + feeding + medicine
- `ExpenseForm` + `ExpenseList`
- `ExpenseChartByCategory` (Recharts pie)
- `PnLReport` — bảng đẹp 3 phần Revenue/COGS/OpEx
- `RevenueBySegmentChart` — bar chart 3 phân khúc
- `InventoryReportTable` — bảng nhập xuất tồn
- `BreedPerformanceTable` — sortable
- `ReceivablesTable`
- `ExcelExportButton` — generic component

---

## 📄 BƯỚC 7: PAGES

### `/admin/mua-vao/page.tsx`
- List phiếu nhập + filter theo NCC
- Stats: tổng nhập tháng, top NCC

### `/admin/mua-vao/them-moi/page.tsx`
- Chọn/tạo NCC
- Bulk form: số lượng cần nhập, giống, giá → tự generate items
- Preview trước khi submit

### `/admin/mua-vao/[id]/page.tsx`
- Chi tiết phiếu
- List chickens trong phiếu (link đến hồ sơ)

### `/admin/ban-ra/page.tsx`
- Tabs theo status: Hỏi mua / Đặt cọc / Đã giao / Đã hủy / Tất cả
- List orders với customer + total
- Filter theo ngày, customer

### `/admin/ban-ra/them-moi/page.tsx`
- Customer select/create
- ChickenSelectForSale (multi)
- Nhập đơn giá từng con
- Auto total
- Status mặc định = hoi_mua

### `/admin/ban-ra/[id]/page.tsx`
- Order detail
- Items list với cost_basis cạnh sale_price → hiển thị margin
- Status workflow buttons:
  - hoi_mua → "Khách đặt cọc" (mở modal nhập số tiền)
  - dat_coc → "Đã giao" (xác nhận giao + ghi paid_amount)
  - hoi_mua/dat_coc → "Hủy"
- Nút "Xem biên lai PDF" (link to invoice route)

### `/admin/khach-hang/page.tsx`
- List customers + tier filter
- Stats: tổng khách, VIP, mới tháng này
- Search + sort by total_spent

### `/admin/khach-hang/[id]/page.tsx`
- Thông tin khách
- Lịch sử đơn hàng
- Tổng đã chi, lần mua gần nhất

### `/admin/nha-cung-cap/page.tsx`
### `/admin/nha-cung-cap/[id]/page.tsx`
- Tương tự customers nhưng cho NCC

### `/admin/tai-chinh/page.tsx` — Dashboard tài chính
- Stats cards: Doanh thu tháng / Chi phí tháng / Lãi tháng / Công nợ
- Quick links đến các báo cáo
- Biểu đồ doanh thu vs chi phí 6 tháng

### `/admin/tai-chinh/chi-phi/page.tsx`
- Tabs: Theo tháng / Theo hạng mục
- Pie chart chi phí theo 8 hạng mục
- Form nhập chi phí mới
- List

### `/admin/tai-chinh/bao-cao/pnl/page.tsx`
- Date range picker (default tháng hiện tại)
- Render PnLReport
- Nút xuất Excel

### `/admin/tai-chinh/bao-cao/nhap-xuat-ton/page.tsx`
- Date range picker
- Bảng I-O-S
- Tỷ lệ chết, tỷ lệ bán
- Nút xuất Excel

### `/admin/tai-chinh/bao-cao/hieu-suat-giong/page.tsx`
- Bảng breed_performance
- Sort by columns
- Chart so sánh

### `/admin/tai-chinh/bao-cao/cong-no/page.tsx`
- Bảng customer_receivables
- Highlight đơn quá 30 ngày chưa thanh toán

---

## 🔗 BƯỚC 8: TÍCH HỢP

### Cập nhật trang chi tiết gà (Phần 2):

**Tab "Mua bán"** giờ render:
- Nếu là gà mua: hiển thị purchase info, NCC, giá mua
- Nếu đã bán: hiển thị order, customer, sale_price, profit
- Nếu đang nuôi: hiển thị cost_basis hiện tại, gợi ý giá bán tối thiểu để có lãi 15%

### Cập nhật trang chuồng (Phần 2):

Khi chọn auto-assign cage cho gà mới mua → tự xếp khu E (cách ly).

---

## ✅ CHECKLIST PHẦN 5

### Mua vào
- [ ] Tạo NCC mới qua form
- [ ] Tạo phiếu nhập 30 con cùng giống → 30 chickens được tạo, all status=`dang_cach_ly`, all cùng cage khu E
- [ ] Mỗi chicken có 8 vaccinations (trigger Phần 1) với scheduled_date đúng
- [ ] Purchase code tự sinh: NH-2026-001
- [ ] Vào `/admin/nha-cung-cap/[id]` → thấy lịch sử nhập

### Bán ra
- [ ] Tạo đơn hàng 3 con → status=hoi_mua, total tự tính
- [ ] Order code tự sinh: BH-2026-001
- [ ] Cố tạo đơn 2 với 1 trong 3 con đó → bị block "đang trong đơn khác" (dùng is_reserved)
- [ ] Update status → dat_coc + deposit 5tr → 3 con là is_reserved=true
- [ ] Cố tạo đơn 3 với 1 trong 3 con đó → vẫn bị block
- [ ] Update status → da_giao + paid_amount full → 3 con tự chuyển status=da_ban, sale_date, customer_id
- [ ] Customer's total_purchased += 3, total_spent += order total
- [ ] Test cancel: tạo đơn dat_coc → cancel → 3 con released

### Biên lai
- [ ] Tải PDF biên lai → mở ra thấy đầy đủ: header farm, customer, items, totals, signatures
- [ ] Format số tiền VND đúng

### Cost basis
- [ ] Vào `/admin/tai-chinh/cost-basis/[id]` → thấy: purchase + feeding + medicine = total
- [ ] Một con gà mới nhập tháng trước với giá mua 2tr, monthly_cost mặc định 100k → cost_basis ~ 2tr + 100k = 2.1tr
- [ ] Khi xuất 1 thuốc cho con đó với cost = 50k → cost_basis tăng 50k

### Chi phí
- [ ] Nhập chi phí thức ăn 5tr ngày hôm nay
- [ ] List filter tháng này → thấy 5tr
- [ ] Pie chart hiển thị thức ăn chiếm % nào đó

### Báo cáo
- [ ] PnL tháng này: doanh thu = sum sale_price, COGS = sum cost_basis, OpEx = sum expenses → net profit hiển thị đúng
- [ ] Inventory: 6 dòng (opening + 2 nhập + 3 xuất + closing)
- [ ] Breed performance: bảng 7 giống với metrics
- [ ] Receivables: chỉ show đơn dat_coc/da_giao chưa paid full

### Excel export
- [ ] Xuất PnL → mở Excel thấy đẹp, có header, format tiền
- [ ] Xuất 4 báo cáo còn lại đều OK

### Mobile
- [ ] Form tạo đơn hàng dùng được trên mobile
- [ ] Báo cáo có thể scroll ngang trên mobile (table large)

---

## 🚨 LƯU Ý TRIỂN KHAI

1. **Cost basis chỉ là ước tính:**
   - Dùng monthly_cost mặc định từ system_settings
   - Sau này có thể nâng cấp: tính theo chi phí thực tế tháng đó / số gà
   - Báo trước cho user biết đây là ước tính

2. **Phân khúc giá:**
   - Theo giá BÁN thực tế chứ không phải breed.tier
   - Có thể cấu hình qua system_settings nếu cần

3. **Concurrent orders:**
   - 2 user cùng tạo đơn cho cùng 1 con gà → race condition
   - Đã có check `is_reserved` nhưng không tuyệt đối an toàn
   - Production-safe: dùng `SELECT ... FOR UPDATE` trong function (advanced)

4. **Hủy đơn có deposit:**
   - Hiện tại chỉ release reservation, không tự động refund
   - Note thêm trong UI: nhân viên cần xử lý refund thủ công

5. **PDF font tiếng Việt:**
   - jsPDF mặc định không hỗ trợ tốt tiếng Việt có dấu
   - Nếu bị lỗi font: cần embed Roboto hoặc Noto font
   - Workaround: dùng font Arial Unicode hoặc convert font qua jsPDF font tool

6. **Excel format đẹp:**
   - SheetJS basic chỉ hỗ trợ data
   - Để format đẹp (border, color, formula) → dùng `xlsx-style` hoặc `exceljs`
   - Phần 5 dùng SheetJS basic, đủ dùng

7. **Báo cáo lớn:**
   - Nếu có 5000 con bán/năm → P&L có thể chậm
   - Cân nhắc pagination cho sales_performance hoặc materialize view

8. **Trigger sync chicken status:**
   - Phải test kỹ các edge case
   - Đặc biệt: hủy đơn da_giao? → giữ status da_ban, không revert (đơn giản hóa)

---

## 📦 OUTPUT MONG ĐỢI

Sau Phần 5:
- Vòng đời mua-nuôi-bán hoàn chỉnh
- Tự động tính giá vốn từng con
- Báo cáo tài chính chuẩn kế toán + xuất Excel
- Quản lý khách hàng + NCC
- Biên lai PDF chuyên nghiệp

**Sau Phần 5, hệ thống đã ĐỦ DÙNG cho 1 trang trại thực tế.** Phần 6, 7, 8 là enhancement (website public + AI + báo cáo nâng cao).

**Báo lại khi xong, tôi chuẩn bị Phần 6 (Website Public + Bio QR đẹp)!**
