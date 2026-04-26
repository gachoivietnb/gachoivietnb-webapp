-- =====================================================
-- PAYROLL: lương nhân viên + integrate vào expenses
-- =====================================================

-- 1. Thêm config lương vào profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_salary_monthly NUMERIC(15,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS standard_work_days INT DEFAULT 26;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_notes TEXT;

-- 2. Bảng payroll_payments: mỗi tháng 1 row/nhân viên
CREATE TABLE IF NOT EXISTS payroll_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  base_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
  standard_days INT NOT NULL DEFAULT 26,
  days_worked NUMERIC(5,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(15,2) NOT NULL DEFAULT 0,
  deduction NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_paid NUMERIC(15,2) NOT NULL,
  paid_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (staff_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_payments(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_staff ON payroll_payments(staff_id);

ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chu_trai_all_payroll" ON payroll_payments;
CREATE POLICY "chu_trai_all_payroll" ON payroll_payments FOR ALL USING (is_chu_trai());

DROP POLICY IF EXISTS "staff_view_own_payroll" ON payroll_payments;
CREATE POLICY "staff_view_own_payroll" ON payroll_payments FOR SELECT USING (staff_id = auth.uid());

-- 3. Function tính preview lương cho 1 tháng
CREATE OR REPLACE FUNCTION payroll_preview(p_year INT, p_month INT)
RETURNS TABLE (
  staff_id UUID,
  full_name TEXT,
  role user_role,
  base_salary NUMERIC,
  standard_days INT,
  days_worked NUMERIC,
  computed_base NUMERIC,
  already_paid BOOLEAN,
  existing_payment_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH att AS (
    SELECT
      sa.staff_id,
      COUNT(*) FILTER (WHERE sa.check_in_time IS NOT NULL)::NUMERIC AS d
    FROM staff_attendance sa
    WHERE EXTRACT(YEAR FROM sa.attendance_date) = p_year
      AND EXTRACT(MONTH FROM sa.attendance_date) = p_month
    GROUP BY sa.staff_id
  )
  SELECT
    p.id,
    p.full_name,
    p.role,
    COALESCE(p.base_salary_monthly, 0)::NUMERIC,
    COALESCE(p.standard_work_days, 26),
    COALESCE(att.d, 0)::NUMERIC,
    CASE
      WHEN COALESCE(p.standard_work_days, 26) > 0 THEN
        ROUND(COALESCE(p.base_salary_monthly, 0) * COALESCE(att.d, 0) / COALESCE(p.standard_work_days, 26), 0)
      ELSE 0
    END::NUMERIC AS computed_base,
    (pp.id IS NOT NULL) AS already_paid,
    pp.id AS existing_payment_id
  FROM profiles p
  LEFT JOIN att ON att.staff_id = p.id
  LEFT JOIN payroll_payments pp
    ON pp.staff_id = p.id AND pp.period_year = p_year AND pp.period_month = p_month
  WHERE p.is_active = true
  ORDER BY p.role DESC, p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
