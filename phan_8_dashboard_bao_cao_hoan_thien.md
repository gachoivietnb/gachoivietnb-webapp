# PROMPT CHO CLAUDE CODE — PHẦN 8: DASHBOARD + BÁO CÁO + HOÀN THIỆN
## Dự án: Gà Chọi Việt Ninh Bình (gachoivietnb.com) — PHẦN CUỐI CÙNG

---

## 🎯 NHIỆM VỤ CỦA BẠN (Claude Code)

Build **phần hoàn thiện cuối cùng** — sau khi xong, hệ thống hoàn chỉnh 100%, sẵn sàng vận hành dài hạn:

1. **Dashboard tổng quan** — stats realtime, cảnh báo, biểu đồ
2. **8 báo cáo đầy đủ** — bổ sung báo cáo còn thiếu, tạo trang index
3. **Hướng dẫn sử dụng** — onboarding tour + docs + video
4. **Thư viện giống gà** — CRUD admin nâng cao
5. **Cài đặt hệ thống** — toàn bộ config + backup Excel
6. **Tối ưu & hoàn thiện** — dark mode + performance + bảo mật + responsive

**Sau khi hoàn thành Phần 8:**
- Vào `/admin` thấy dashboard đẹp với stats realtime
- Click "Backup toàn bộ" → file Excel multi-sheet chứa hết dữ liệu
- Bật dark mode → toàn bộ app chuyển dark
- User mới đăng nhập lần đầu → onboarding tour 5 bước hướng dẫn
- 8 báo cáo đầy đủ + xuất Excel
- Lighthouse score: SEO ≥95, Performance ≥85, Accessibility ≥90
- Mọi trang test responsive trên mobile/tablet/desktop

---

## 📋 NHẮC LẠI QUY TẮC

1. **Tiếng Anh code, tiếng Việt UI**
2. **Mobile-first**
3. **TypeScript strict**
4. **Dark mode mandatory** — mọi component phải work cả 2 mode
5. **Performance first** — lazy load, dynamic import, image optimization

---

## 📦 BƯỚC 1: CÀI THÊM PACKAGES

```bash
# Dark mode
npm install next-themes

# Reusable nếu cần
# (Recharts, jspdf, xlsx đã có)
```

---

## 🗄️ BƯỚC 2: MIGRATION CUỐI CÙNG

Tạo file `supabase/migrations/20260801000001_phase8_final.sql`:

```sql
-- =====================================================
-- PHASE 8: DASHBOARD + REPORTS + FINISHING
-- =====================================================

-- =====================================================
-- 1. USER PREFERENCES
-- =====================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- =====================================================
-- 2. BACKUP LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_type TEXT NOT NULL,  -- 'manual_excel', 'partial'
  exported_by UUID REFERENCES profiles(id),
  rows_exported JSONB,         -- { chickens: 1500, customers: 200, ... }
  file_size_bytes BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chu trai view backup logs" ON backup_logs FOR SELECT USING (is_chu_trai());
CREATE POLICY "Chu trai insert backup logs" ON backup_logs FOR INSERT WITH CHECK (is_chu_trai());

-- =====================================================
-- 3. DASHBOARD STATS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION dashboard_stats()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_chickens', (SELECT COUNT(*) FROM chickens WHERE status IN ('dang_nuoi', 'dang_cach_ly')),
    'total_chickens_growth_week',
      (SELECT COUNT(*) FROM chickens
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND status IN ('dang_nuoi', 'dang_cach_ly')),
    'vaccinations_today',
      (SELECT COUNT(*) FROM vaccinations
        WHERE scheduled_date = CURRENT_DATE AND status = 'cho_tiem'),
    'vaccinations_overdue',
      (SELECT COUNT(*) FROM vaccinations
        WHERE scheduled_date < CURRENT_DATE AND status = 'cho_tiem'),
    'ready_to_sell',
      (SELECT COUNT(*) FROM chickens
        WHERE status = 'dang_nuoi'
          AND birth_date <= CURRENT_DATE - INTERVAL '12 months'),
    'revenue_this_month',
      COALESCE((SELECT SUM(sale_price) FROM chickens
        WHERE status = 'da_ban'
          AND sale_date >= date_trunc('month', CURRENT_DATE)), 0),
    'revenue_last_month',
      COALESCE((SELECT SUM(sale_price) FROM chickens
        WHERE status = 'da_ban'
          AND sale_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
          AND sale_date < date_trunc('month', CURRENT_DATE)), 0),
    'orders_pending',
      (SELECT COUNT(*) FROM sales_orders WHERE status = 'hoi_mua'),
    'orders_deposit',
      (SELECT COUNT(*) FROM sales_orders WHERE status = 'dat_coc'),
    'unread_alerts',
      (SELECT COUNT(*) FROM alerts WHERE status = 'chua_doc'),
    'critical_alerts',
      (SELECT COUNT(*) FROM alerts
        WHERE status = 'chua_doc' AND priority IN ('cao', 'khan_cap')),
    'medicines_low_stock',
      (SELECT COUNT(*) FROM medicines
        WHERE current_stock <= min_stock_alert AND is_active = TRUE),
    'feeds_low_stock',
      (SELECT COUNT(*) FROM feeds
        WHERE current_stock <= min_stock_alert AND is_active = TRUE)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. REVENUE & EXPENSES TREND (6 tháng)
-- =====================================================

CREATE OR REPLACE FUNCTION trends_6_months()
RETURNS TABLE (
  month TEXT,
  revenue DECIMAL,
  expenses DECIMAL,
  cogs DECIMAL,
  net_profit DECIMAL,
  chickens_sold BIGINT,
  chickens_died BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE - INTERVAL '5 months'),
      date_trunc('month', CURRENT_DATE),
      '1 month'::INTERVAL
    )::DATE AS month_start
  )
  SELECT
    TO_CHAR(m.month_start, 'YYYY-MM') AS month,
    COALESCE((SELECT SUM(sale_price) FROM chickens
      WHERE status = 'da_ban'
        AND sale_date >= m.month_start
        AND sale_date < m.month_start + INTERVAL '1 month'), 0)::DECIMAL AS revenue,
    COALESCE((SELECT SUM(amount) FROM expenses
      WHERE expense_date >= m.month_start
        AND expense_date < m.month_start + INTERVAL '1 month'), 0)::DECIMAL AS expenses,
    COALESCE((SELECT SUM(cb.total_cost) FROM chicken_cost_basis cb
      JOIN chickens c ON c.id = cb.id
      WHERE c.status = 'da_ban'
        AND c.sale_date >= m.month_start
        AND c.sale_date < m.month_start + INTERVAL '1 month'), 0)::DECIMAL AS cogs,
    -- Net profit = revenue - cogs - expenses
    (COALESCE((SELECT SUM(sale_price) FROM chickens
      WHERE status = 'da_ban'
        AND sale_date >= m.month_start
        AND sale_date < m.month_start + INTERVAL '1 month'), 0)
     - COALESCE((SELECT SUM(cb.total_cost) FROM chicken_cost_basis cb
        JOIN chickens c ON c.id = cb.id
        WHERE c.status = 'da_ban'
          AND c.sale_date >= m.month_start
          AND c.sale_date < m.month_start + INTERVAL '1 month'), 0)
     - COALESCE((SELECT SUM(amount) FROM expenses
        WHERE expense_date >= m.month_start
          AND expense_date < m.month_start + INTERVAL '1 month'), 0))::DECIMAL AS net_profit,
    (SELECT COUNT(*) FROM chickens
      WHERE status = 'da_ban'
        AND sale_date >= m.month_start
        AND sale_date < m.month_start + INTERVAL '1 month')::BIGINT AS chickens_sold,
    (SELECT COUNT(*) FROM chickens
      WHERE status = 'chet'
        AND status_date >= m.month_start
        AND status_date < m.month_start + INTERVAL '1 month')::BIGINT AS chickens_died
  FROM months m
  ORDER BY m.month_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. SURVIVAL RATE BY AREA
-- =====================================================

CREATE OR REPLACE VIEW area_survival_stats AS
SELECT
  a.id AS area_id,
  a.code AS area_code,
  a.name_vi AS area_name,
  a.type AS area_type,
  COUNT(c.id) AS total_assigned,
  COUNT(c.id) FILTER (WHERE c.status IN ('dang_nuoi', 'dang_cach_ly', 'da_ban', 'loai_thai')) AS alive,
  COUNT(c.id) FILTER (WHERE c.status = 'chet') AS dead,
  CASE WHEN COUNT(c.id) > 0
    THEN ROUND((COUNT(c.id) FILTER (WHERE c.status != 'chet')::NUMERIC / COUNT(c.id)) * 100, 1)
    ELSE 100
  END AS survival_rate_pct
FROM areas a
LEFT JOIN cage_rows cr ON cr.area_id = a.id
LEFT JOIN cages cg ON cg.row_id = cr.id
LEFT JOIN chickens c ON c.cage_id = cg.id
WHERE a.is_active = TRUE
GROUP BY a.id, a.code, a.name_vi, a.type;

-- =====================================================
-- 6. EXPENSES SUMMARY BY CATEGORY
-- =====================================================

CREATE OR REPLACE FUNCTION expenses_summary(
  p_from_date DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  p_to_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  category_code TEXT,
  category_name TEXT,
  total_amount DECIMAL,
  transaction_count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM expenses
  WHERE expense_date BETWEEN p_from_date AND p_to_date;

  RETURN QUERY
  SELECT
    ec.code,
    ec.name_vi,
    COALESCE(SUM(e.amount), 0)::DECIMAL,
    COUNT(e.id)::BIGINT,
    CASE WHEN v_total > 0
      THEN ROUND((COALESCE(SUM(e.amount), 0) / v_total * 100)::NUMERIC, 1)
      ELSE 0
    END
  FROM expense_categories ec
  LEFT JOIN expenses e ON e.category_id = ec.id
    AND e.expense_date BETWEEN p_from_date AND p_to_date
  GROUP BY ec.id, ec.code, ec.name_vi, ec.display_order
  ORDER BY ec.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📊 BƯỚC 3: DASHBOARD

### `src/app/(admin)/admin/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { DashboardStatsGrid } from '@/components/admin/dashboard/DashboardStatsGrid'
import { TopAlertsList } from '@/components/admin/dashboard/TopAlertsList'
import { ChickenFlowDiagram } from '@/components/admin/dashboard/ChickenFlowDiagram'
import dynamic from 'next/dynamic'

// Lazy load charts (heavy)
const SurvivalChart = dynamic(() => import('@/components/admin/dashboard/SurvivalChart'), { ssr: false })
const RevenueChart = dynamic(() => import('@/components/admin/dashboard/RevenueChart'), { ssr: false })

export const dynamic_setting = 'force-dynamic'  // luôn render mới

export default async function DashboardPage() {
  const supabase = await createClient()

  const [stats, alerts, areaStats, trends] = await Promise.all([
    supabase.rpc('dashboard_stats'),
    supabase.from('alerts')
      .select('*')
      .eq('status', 'chua_doc')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('area_survival_stats').select('*'),
    supabase.rpc('trends_6_months'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Dashboard tổng quan</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Cập nhật lần cuối: {new Date().toLocaleString('vi-VN')}
        </p>
      </div>

      <DashboardStatsGrid stats={stats.data || {}} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopAlertsList alerts={alerts.data || []} />
        <ChickenFlowDiagram />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h2 className="font-medium mb-4">Tỷ lệ sống theo khu</h2>
          <SurvivalChart data={areaStats.data || []} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h2 className="font-medium mb-4">Doanh thu vs Chi phí (6 tháng)</h2>
          <RevenueChart data={trends.data || []} />
        </div>
      </div>
    </div>
  )
}
```

### `src/components/admin/dashboard/DashboardStatsGrid.tsx`

```typescript
import Link from 'next/link'

interface Props {
  stats: {
    total_chickens?: number
    total_chickens_growth_week?: number
    vaccinations_today?: number
    vaccinations_overdue?: number
    ready_to_sell?: number
    revenue_this_month?: number
    revenue_last_month?: number
    orders_pending?: number
    critical_alerts?: number
  }
}

export function DashboardStatsGrid({ stats }: Props) {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n)
  const fmtMoney = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    return fmt(n)
  }

  const revenueChange = stats.revenue_last_month
    ? Math.round(((stats.revenue_this_month! - stats.revenue_last_month) / stats.revenue_last_month) * 100)
    : 0

  const cards = [
    {
      label: 'Tổng đàn',
      value: fmt(stats.total_chickens || 0),
      sub: `+${stats.total_chickens_growth_week || 0} tuần này`,
      subColor: 'text-green-600',
      href: '/admin/ho-so-ga',
    },
    {
      label: 'Cần tiêm hôm nay',
      value: fmt(stats.vaccinations_today || 0),
      sub: stats.vaccinations_overdue ? `+${stats.vaccinations_overdue} quá hạn` : 'Không có quá hạn',
      subColor: stats.vaccinations_overdue ? 'text-red-600' : 'text-gray-500',
      href: '/admin/tiem-phong',
    },
    {
      label: 'Đến tuổi bán',
      value: fmt(stats.ready_to_sell || 0),
      sub: 'từ 12 tháng tuổi',
      subColor: 'text-gray-500',
      href: '/admin/ho-so-ga?ready_to_sell=true',
    },
    {
      label: 'Doanh thu tháng',
      value: fmtMoney(stats.revenue_this_month || 0),
      sub: revenueChange !== 0 ? `${revenueChange > 0 ? '+' : ''}${revenueChange}% vs tháng trước` : '—',
      subColor: revenueChange > 0 ? 'text-green-600' : revenueChange < 0 ? 'text-red-600' : 'text-gray-500',
      href: '/admin/tai-chinh',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(c => (
        <Link
          key={c.label}
          href={c.href}
          className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400">{c.label}</div>
          <div className="text-2xl font-medium mt-1">{c.value}</div>
          <div className={`text-xs mt-1 ${c.subColor}`}>{c.sub}</div>
        </Link>
      ))}
    </div>
  )
}
```

### `src/components/admin/dashboard/SurvivalChart.tsx`

```typescript
'use client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function SurvivalChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="area_code" />
        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
        <Tooltip formatter={(v: any) => `${v}%`} />
        <Bar dataKey="survival_rate_pct" fill="#10b981" name="Tỷ lệ sống" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### `src/components/admin/dashboard/RevenueChart.tsx`

ComposedChart bar (chickens_sold) + 2 lines (revenue, expenses).

### `src/components/admin/dashboard/ChickenFlowDiagram.tsx`

Đơn giản hoá thay vì sankey: 4 boxes nối nhau hiển thị số con ở mỗi giai đoạn:
```
[Cách ly: 12] → [Đang nuôi: 800] → [Đến tuổi bán: 34] → [Đã bán tháng: 28]
```

### `src/components/admin/dashboard/TopAlertsList.tsx`

List 5 alerts ưu tiên cao nhất với:
- Icon theo type
- Color theo priority
- Click → đi đến entity tương ứng
- Nút "Đánh dấu đã đọc"

---

## 📑 BƯỚC 4: BÁO CÁO TỔNG HỢP

### `/admin/tai-chinh/bao-cao/page.tsx` — INDEX

```typescript
import Link from 'next/link'

const REPORTS = [
  {
    id: 'pnl',
    title: 'Báo cáo lãi lỗ (P&L)',
    description: 'Doanh thu, giá vốn, chi phí, lợi nhuận theo chuẩn kế toán',
    href: '/admin/tai-chinh/bao-cao/pnl',
    icon: '💰',
  },
  {
    id: 'doanh-thu',
    title: 'Doanh thu theo phân khúc',
    description: 'Cao cấp / Phổ thông / Gà thịt — biểu đồ + chi tiết',
    href: '/admin/tai-chinh/bao-cao/doanh-thu',
    icon: '📊',
  },
  {
    id: 'chi-phi',
    title: 'Chi phí 8 hạng mục',
    description: 'Pie chart + drill-down từng hạng mục theo tháng',
    href: '/admin/tai-chinh/bao-cao/chi-phi',
    icon: '💸',
  },
  {
    id: 'nhap-xuat-ton',
    title: 'Nhập xuất tồn gà',
    description: 'Đầu kỳ + nhập + xuất + cuối kỳ + tỷ lệ chết/bán',
    href: '/admin/tai-chinh/bao-cao/nhap-xuat-ton',
    icon: '📋',
  },
  {
    id: 'xu-huong',
    title: 'Xu hướng 6 tháng',
    description: 'Doanh thu, chi phí, lãi gộp biến động theo thời gian',
    href: '/admin/tai-chinh/bao-cao/xu-huong',
    icon: '📈',
  },
  {
    id: 'gia-von',
    title: 'Giá vốn từng con',
    description: 'List chi tiết giá vốn từng con + biên lợi nhuận',
    href: '/admin/tai-chinh/bao-cao/gia-von',
    icon: '🐓',
  },
  {
    id: 'hieu-suat',
    title: 'Hiệu suất theo giống',
    description: 'So sánh Asil/Mã Lai/Peru/Nòi... — radar chart',
    href: '/admin/tai-chinh/bao-cao/hieu-suat',
    icon: '🏆',
  },
  {
    id: 'cong-no',
    title: 'Công nợ',
    description: 'Khách còn nợ + cảnh báo quá hạn 30 ngày',
    href: '/admin/tai-chinh/bao-cao/cong-no',
    icon: '⚠️',
  },
]

export default function ReportsIndexPage() {
  return (
    <div>
      <h1 className="text-2xl font-medium mb-6">Báo cáo tài chính</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map(r => (
          <Link
            key={r.id}
            href={r.href}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition"
          >
            <div className="flex items-start gap-3">
              <div className="text-3xl">{r.icon}</div>
              <div>
                <h2 className="font-medium">{r.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

### Báo cáo còn thiếu cần làm:

**`/admin/tai-chinh/bao-cao/chi-phi/page.tsx`** — Pie chart 8 hạng mục + bảng drill-down. Dùng API `/api/finance/reports/expenses-summary`.

**`/admin/tai-chinh/bao-cao/xu-huong/page.tsx`** — ComposedChart 6 tháng từ function `trends_6_months`.

**`/admin/tai-chinh/bao-cao/gia-von/page.tsx`** — DataTable list `chicken_cost_basis` với pagination + sort by total_cost. Filter theo breed/status.

**`/admin/tai-chinh/bao-cao/doanh-thu/page.tsx`** — Bar chart 3 phân khúc + bảng chi tiết.

Các báo cáo khác đã làm Phần 5: pnl, nhap-xuat-ton, hieu-suat, cong-no.

### API mới: `src/app/api/finance/reports/expenses-summary/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('expenses_summary', {
    p_from_date: from,
    p_to_date: to,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
```

---

## 📚 BƯỚC 5: HƯỚNG DẪN SỬ DỤNG

### Onboarding tour

`src/components/admin/OnboardingTour.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  {
    title: 'Chào mừng đến Gà Chọi Việt NB!',
    content: 'Hệ thống quản lý trang trại gà chọi đầy đủ. Tour này sẽ giới thiệu các chức năng chính trong 2 phút.',
    cta: 'Bắt đầu',
  },
  {
    title: 'Bước 1: Cấu hình thông tin trang trại',
    content: 'Vào Cài đặt → Trang trại để nhập tên, địa chỉ, Zalo, hotline. Thông tin này hiển thị trên website công khai.',
    cta: 'Tiếp theo',
  },
  {
    title: 'Bước 2: Quản lý đàn gà',
    content: 'Trang "Hồ sơ gà" để thêm, sửa, xem từng con. Có thể nhập hàng loạt hoặc import Excel.',
    cta: 'Tiếp theo',
  },
  {
    title: 'Bước 3: Quét QR thẻ chân gà',
    content: 'Trang "Quét QR" mở camera điện thoại. Quét thẻ → đến hồ sơ con đó. In thẻ tại "Generate QR".',
    cta: 'Tiếp theo',
  },
  {
    title: 'Bước 4: Báo cáo tài chính',
    content: 'Vào "Tài chính → Báo cáo" để xem 8 báo cáo. Tất cả xuất Excel được. Cần trợ giúp? Click chatbot góc dưới phải.',
    cta: 'Hoàn thành',
  },
]

export function OnboardingTour({ profile }: { profile: { id: string; onboarding_completed: boolean } }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!profile.onboarding_completed) setOpen(true)
  }, [profile])

  async function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      // Complete
      const supabase = createClient()
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', profile.id)
      setOpen(false)
    }
  }

  function skip() {
    setOpen(false)
  }

  if (!open) return null

  const current = STEPS[step]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-6 h-1 rounded ${i <= step ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'}`}
              />
            ))}
          </div>
          <button onClick={skip} className="text-sm text-gray-500 hover:underline">
            Bỏ qua
          </button>
        </div>

        <h2 className="text-lg font-medium mb-3">{current.title}</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{current.content}</p>

        <button
          onClick={next}
          className="w-full bg-blue-500 text-white py-2 rounded font-medium hover:bg-blue-600"
        >
          {current.cta}
        </button>
      </div>
    </div>
  )
}
```

Thêm vào AdminLayout:
```typescript
{!profile.onboarding_completed && <OnboardingTour profile={profile} />}
```

### `/admin/huong-dan/page.tsx`

```typescript
import { TabsRoot } from '@/components/ui/tabs'

const SECTIONS = [
  {
    role: 'all',
    title: 'Hướng dẫn chung',
    items: [
      {
        title: 'Bắt đầu',
        content: `
1. Đăng nhập với tài khoản được cấp
2. Bật notification trong "Tiêm phòng → Cài đặt"
3. Cài "Add to Home Screen" trên điện thoại để dùng như app
        `,
      },
      // ... more
    ],
  },
  {
    role: 'chu_trai',
    title: 'Dành cho chủ trại',
    items: [
      {
        title: 'Báo cáo tài chính',
        content: `
- Vào "Tài chính → Báo cáo"
- 8 báo cáo: P&L, doanh thu, chi phí, nhập xuất tồn, xu hướng, giá vốn, hiệu suất, công nợ
- Mỗi báo cáo có nút "Xuất Excel"
        `,
        video_url: 'https://drive.google.com/...',  // optional embed
      },
      {
        title: 'Cài đặt + Backup',
        content: `...`,
      },
    ],
  },
  {
    role: 'nhan_vien',
    title: 'Dành cho nhân viên',
    items: [
      {
        title: 'Quét QR ngoài chuồng',
        content: `
- Mở app, vào "Quét QR" (icon camera)
- Camera mở → quét thẻ chân gà
- App tự mở hồ sơ con đó
- Thao tác: ghi tiêm, ghi vần, báo chết
        `,
      },
      // ... more
    ],
  },
  {
    role: 'technical',
    title: 'Kỹ thuật',
    items: [
      {
        title: 'Service Worker & Offline',
        content: 'App tự cache dữ liệu. Mất mạng vẫn nhập được, sync khi có mạng lại.',
      },
      {
        title: 'Backup & Recovery',
        content: 'Cài đặt → Backup → Tải Excel toàn bộ DB.',
      },
    ],
  },
]

export default function HuongDanPage() {
  return (
    <div>
      <h1 className="text-2xl font-medium mb-6">Hướng dẫn sử dụng</h1>

      {/* Render sections by role */}
      {SECTIONS.map(section => (
        <section key={section.role} className="mb-8">
          <h2 className="text-lg font-medium mb-4">{section.title}</h2>
          <div className="space-y-3">
            {section.items.map((item, i) => (
              <details key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <summary className="font-medium cursor-pointer">{item.title}</summary>
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {item.content}
                </div>
                {(item as any).video_url && (
                  <div className="mt-3 aspect-video">
                    <iframe src={(item as any).video_url} className="w-full h-full rounded" />
                  </div>
                )}
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

---

## 🧬 BƯỚC 6: THƯ VIỆN GIỐNG GÀ (ADMIN)

### `/admin/giong/page.tsx`

CRUD breeds với:
- List grid card từng giống (ảnh, tên, tier, count)
- Nút "Thêm giống mới" → modal form
- Click card → modal edit
- Form: code, name_vi, origin, description, characteristics (JSON), tier, default_avatar_url, display_order

Dùng API hiện có (Supabase client direct hoặc tạo /api/breeds endpoints).

---

## ⚙️ BƯỚC 7: CÀI ĐẶT HỆ THỐNG

### `/admin/cai-dat/page.tsx`

Tabs:

```typescript
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function CaiDatPage() {
  return (
    <div>
      <h1 className="text-2xl font-medium mb-6">Cài đặt hệ thống</h1>

      <TabsRoot defaultValue="farm">
        <TabsList>
          <TabsTrigger value="farm">Trang trại</TabsTrigger>
          <TabsTrigger value="alerts">Cảnh báo</TabsTrigger>
          <TabsTrigger value="costs">Chi phí mặc định</TabsTrigger>
          <TabsTrigger value="integrations">Tích hợp</TabsTrigger>
          <TabsTrigger value="appearance">Giao diện</TabsTrigger>
          <TabsTrigger value="backup">Sao lưu</TabsTrigger>
        </TabsList>

        <TabsContent value="farm"><FarmInfoForm /></TabsContent>
        <TabsContent value="alerts"><AlertThresholdsForm /></TabsContent>
        <TabsContent value="costs"><DefaultCostsForm /></TabsContent>
        <TabsContent value="integrations"><IntegrationsForm /></TabsContent>
        <TabsContent value="appearance"><AppearanceForm /></TabsContent>
        <TabsContent value="backup"><BackupSection /></TabsContent>
      </TabsRoot>
    </div>
  )
}
```

### `FarmInfoForm` — đọc/ghi system_settings.farm_info

```typescript
- name (Gà Chọi Việt NB)
- short_name
- address
- phone
- zalo (số điện thoại Zalo OA)
- facebook (URL)
- email_business
```

### `AlertThresholdsForm`

```typescript
- death_rate_daily_pct (default 2)
- death_rate_baseline_multiplier (default 3)
- low_stock_days_warning (default 7)
- vaccination_overdue_alert_days (default 1)
```

### `DefaultCostsForm`

```typescript
- default_cost_per_chicken_per_month (default 100000)
- profit_margin_target_pct (default 15)
```

### `IntegrationsForm`

Hiển thị status của integrations:
- Google Drive: connected/not (link đến OAuth setup)
- Gemini API: configured/not (input field cập nhật key)
- Resend Email: configured (status only)
- Push Notification: VAPID configured

### `AppearanceForm`

- Theme: light / dark / system
- Persist vào profiles.dark_mode

### `BackupSection`

```typescript
import { BackupButton } from '@/components/admin/settings/BackupButton'

export function BackupSection() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded text-sm">
        <p>📦 Tải toàn bộ dữ liệu hệ thống ra file Excel multi-sheet.</p>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          File backup chứa: hồ sơ gà, gia phả, mua bán, chi phí, khách hàng, tiêm phòng,
          vần gà, sinh sản, nhân sự, nhật ký...
        </p>
      </div>

      <BackupButton />

      <BackupHistory />
    </div>
  )
}
```

### `src/app/api/admin/backup-all/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'chu_trai') {
    return NextResponse.json({ error: 'Only chu_trai' }, { status: 403 })
  }

  const wb = XLSX.utils.book_new()
  const counts: Record<string, number> = {}

  // Bảng cần backup
  const tables = [
    'chickens', 'breeds', 'qr_tags', 'cages', 'cage_rows', 'areas',
    'breeding_litters', 'chick_groups',
    'vaccinations', 'vaccines',
    'medicines', 'medicine_transactions',
    'feeds', 'feed_transactions',
    'diseases', 'training_sessions',
    'suppliers', 'purchases', 'purchase_items',
    'customers', 'customer_alerts', 'sales_orders', 'sales_items',
    'expenses', 'expense_categories',
    'staff_attendance', 'staff_assignments',
    'activity_logs', 'alerts',
    'profiles',
  ]

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      console.error(`Error fetching ${table}:`, error)
      continue
    }
    if (data && data.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, table.substring(0, 31))  // Excel limit 31 chars
      counts[table] = data.length
    }
  }

  // Metadata sheet
  const meta = [
    ['Backup ngày', new Date().toLocaleString('vi-VN')],
    ['Người tạo', user.email],
    ['Tổng số bảng', Object.keys(counts).length],
    [],
    ['Bảng', 'Số dòng'],
    ...Object.entries(counts).map(([t, c]) => [t, c]),
  ]
  const metaWs = XLSX.utils.aoa_to_sheet(meta)
  XLSX.utils.book_append_sheet(wb, metaWs, '_metadata')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  // Log backup
  await supabase.from('backup_logs').insert({
    backup_type: 'manual_excel',
    exported_by: user.id,
    rows_exported: counts,
    file_size_bytes: buffer.length,
  })

  const filename = `gachoivietnb-backup-${new Date().toISOString().split('T')[0]}.xlsx`
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

---

## 🌙 BƯỚC 8: DARK MODE

### Setup `next-themes`

`src/app/layout.tsx`:

```typescript
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### `tailwind.config.ts` đã có darkMode: 'class' (Tailwind 3 default)

### `src/components/ui/ThemeToggle.tsx`

```typescript
'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
      title="Đổi theme"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
```

Thêm vào AdminHeader.

### Update toàn bộ components sử dụng dark mode classes:

```typescript
// Bad
<div className="bg-white text-gray-900">

// Good
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
```

**Claude Code: review tất cả components đã làm ở các phần trước, thêm `dark:` variants.**

---

## ⚡ BƯỚC 9: TỐI ƯU PERFORMANCE

### Code splitting

```typescript
// Lazy load heavy components
const PedigreeTree = dynamic(() => import('@/components/admin/pedigree/PedigreeTree'), {
  loading: () => <p>Đang tải gia phả...</p>,
  ssr: false,
})

const RevenueChart = dynamic(() => import('@/components/admin/dashboard/RevenueChart'), {
  ssr: false,
})
```

### Image optimization

```typescript
import Image from 'next/image'

// Always use Next.js Image
<Image
  src={chicken.main_photo_url}
  alt={chicken.name}
  width={400}
  height={400}
  loading="lazy"  // implicit nhưng explicit cho rõ
  placeholder="blur"  // optional
  blurDataURL="..."
/>
```

### Route segment caching

```typescript
// Pages public ít thay đổi
export const revalidate = 3600

// Pages admin always fresh
export const dynamic = 'force-dynamic'
```

### Database query optimization

- Đảm bảo indexes (đã có từ Phần 1)
- Use views thay vì raw queries
- Pagination cho list lớn

---

## 🔒 BƯỚC 10: BẢO MẬT

### Rate limiting cho public APIs

`src/lib/rate-limit.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const limits = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = limits.get(key)

  if (!entry || entry.resetAt < now) {
    limits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}
```

Apply vào `/api/public/contact` (đã có), `/api/public/chickens/search`, `/api/ai/chatbot`.

### CSP headers

`next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=()' },
      ],
    },
  ]
}
```

### Audit Supabase RLS

Đảm bảo mọi bảng có RLS enabled (check Supabase Dashboard → Database → Tables).

---

## 📱 BƯỚC 11: RESPONSIVE FINAL CHECK

Test mọi page trên 3 viewport:
- Mobile: 375px (iPhone SE)
- Tablet: 768px (iPad)
- Desktop: 1280px

Đặc biệt check:
- Tables: scroll ngang trên mobile
- Modals: full-screen trên mobile
- Forms: input touch-friendly (min 44px height)
- Bottom nav: visible trên mobile, hidden trên desktop
- Sidebar: hidden trên mobile, visible trên desktop

---

## ✅ CHECKLIST PHẦN 8

### Dashboard
- [ ] Mở `/admin` → 4 stat cards với số liệu đúng
- [ ] Top alerts hiển thị 5 alerts cao nhất
- [ ] 2 charts render được (lazy load OK)
- [ ] Click stat card → đi đến trang tương ứng
- [ ] Mobile responsive

### Báo cáo
- [ ] `/admin/tai-chinh/bao-cao` index có 8 cards
- [ ] Mỗi báo cáo có data + xuất Excel
- [ ] Báo cáo chi phí: pie chart 8 hạng mục
- [ ] Báo cáo xu hướng: composed chart 6 tháng
- [ ] Báo cáo giá vốn: list pagination

### Hướng dẫn
- [ ] User mới đăng nhập → onboarding tour 5 bước
- [ ] Skip → tour không hiện lại
- [ ] Complete → onboarding_completed = true
- [ ] `/admin/huong-dan` có 4 sections phân vai trò

### Thư viện giống
- [ ] CRUD breeds đầy đủ
- [ ] Update breed → public site cập nhật

### Cài đặt
- [ ] 6 tabs render đúng
- [ ] Cập nhật farm_info → reflect trên public site (footer, contact)
- [ ] Thay đổi alert thresholds → next outbreak detection dùng giá trị mới
- [ ] BackupButton: download Excel có 30+ sheets
- [ ] Backup log lưu vào DB

### Dark mode
- [ ] Toggle hoạt động trên header
- [ ] Persist sau reload (localStorage)
- [ ] System preference auto-detect
- [ ] Tất cả pages render đúng cả 2 mode
- [ ] Charts cũng adapt theme

### Performance
- [ ] Lighthouse trang chủ public: Perf ≥ 85
- [ ] Lighthouse admin dashboard: Perf ≥ 80
- [ ] Heavy components (charts, pedigree) lazy load
- [ ] Images dùng Next.js Image

### Bảo mật
- [ ] Rate limit cho public APIs hoạt động
- [ ] Headers security đúng (check Network tab)
- [ ] RLS enabled trên mọi bảng

### Responsive
- [ ] Test mọi page trên 375px / 768px / 1280px
- [ ] Mobile: bottom nav hiện, sidebar ẩn
- [ ] Mobile: tables scroll ngang
- [ ] Mobile: forms touch-friendly

---

## 🚨 LƯU Ý TRIỂN KHAI

1. **Dashboard polling vs Realtime:**
   - Default polling 30s đủ
   - Nếu muốn realtime: dùng Supabase Realtime subscribe alerts table
   - Trade-off: realtime tốn connection slot

2. **Backup file lớn:**
   - Với 5000 con + lịch sử → file Excel có thể 50-100MB
   - Browser download OK
   - Cảnh báo trước khi tải nếu DB > 10000 chickens

3. **Dark mode review tất cả components:**
   - Tốn thời gian: review từng component đã làm
   - Hoặc: dùng global CSS reset + chỉ override khi cần
   - Test kỹ charts (Recharts không auto theme)

4. **Onboarding chỉ chạy 1 lần:**
   - Lưu state vào DB không phải localStorage
   - Tránh hiện lại khi đổi browser

5. **Performance Lighthouse:**
   - Public pages dễ đạt ≥ 90
   - Admin pages khó hơn vì nhiều JS
   - Mục tiêu thực tế: ≥ 80

6. **Backup tự động:**
   - Phần 8 chỉ làm manual
   - Có thể nâng cấp: cron daily backup + upload Drive

7. **Gemini API key trong cài đặt:**
   - Hiện key được hard-code trong env
   - Nếu cho phép change qua UI: cần encrypt và lưu vào DB
   - Phần 8 chỉ display status, không cho edit

8. **Final test:**
   - Test toàn bộ flow: nhập gà → tiêm → vần → bán → báo cáo
   - Test với 100 con để đảm bảo performance

---

## 🎉 OUTPUT MONG ĐỢI - HỆ THỐNG HOÀN CHỈNH

Sau Phần 8, bạn có:

✅ **Quản lý đàn gà** đầy đủ với QR + chuồng trại
✅ **Gia phả + sinh sản** chuyên sâu
✅ **Sức khỏe + vần gà** tự động
✅ **Mua bán + tài chính** chuẩn kế toán
✅ **Website public** SEO chuẩn + bio QR đẹp
✅ **AI marketing** + chatbot + push notification + offline
✅ **Dashboard** + 8 báo cáo + dark mode + hướng dẫn

**Hệ thống Gà Chọi Việt Ninh Bình HOÀN CHỈNH 100% — sẵn sàng vận hành!**

---

## 🎁 BONUS: SAU KHI HOÀN THÀNH

Những việc nên làm sau Phần 8:

1. **Test với data thực tế** — nhập 100 con gà thật, chạy 1 tuần
2. **Đào tạo nhân viên** — dùng /admin/huong-dan + chatbot
3. **In thẻ QR đầu tiên** — 200 thẻ thử
4. **Marketing website** — chia sẻ gachoivietnb.com lên Zalo nhóm
5. **Backup định kỳ** — cuối tuần tải Excel 1 lần
6. **Theo dõi metrics** — dashboard hàng tuần

Khi hệ thống chạy ổn (sau 1-2 tháng), có thể nâng cấp:
- Tích hợp Zalo OA chính thức (cần verify business)
- Tích hợp cổng thanh toán (VNPay, Momo)
- Mobile app native (React Native) - nếu PWA chưa đủ
- Báo cáo nâng cao với BI tool (Metabase, Grafana)
- AI nâng cấp: nhận diện ảnh gà, predict giá bán

---

**🐓 Chúc bạn thành công với Gà Chọi Việt Ninh Bình!**

Báo lại nếu cần hỗ trợ thêm bất kỳ phần nào trong quá trình triển khai!
