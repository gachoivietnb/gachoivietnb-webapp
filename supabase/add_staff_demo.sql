-- Thêm 2 nhân viên demo + chấm công + lương
DO $$
DECLARE
  v_nv1 UUID := '11111111-1111-1111-1111-111111111111';
  v_nv2 UUID := '22222222-2222-2222-2222-222222222222';
  v_nv3 UUID := '33333333-3333-3333-3333-333333333333';
  v_chu UUID;
  d DATE;
BEGIN
  SELECT id INTO v_chu FROM profiles WHERE role = 'chu_trai' LIMIT 1;

  -- Tạo auth users cho nhân viên (để có FK hợp lệ vào profiles.id → auth.users.id)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', v_nv1, 'authenticated', 'authenticated',
     'nguyenvana@gachoivietnb.local', crypt('NhanVien2026!', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Nguyễn Văn A"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_nv2, 'authenticated', 'authenticated',
     'tranthib@gachoivietnb.local', crypt('NhanVien2026!', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Trần Thị B"}'::jsonb,
     NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_nv3, 'authenticated', 'authenticated',
     'levanc@gachoivietnb.local', crypt('NhanVien2026!', gen_salt('bf')), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Lê Văn C"}'::jsonb,
     NOW(), NOW(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- Profiles tự tạo qua trigger. Update để set role + salary.
  UPDATE profiles SET
    full_name = 'Nguyễn Văn A',
    role = 'nhan_vien',
    phone = '0921111111',
    is_active = true,
    base_salary_monthly = 7000000,
    standard_work_days = 26,
    salary_notes = 'Trưởng ca — chăm sóc khu A'
  WHERE id = v_nv1;

  UPDATE profiles SET
    full_name = 'Trần Thị B',
    role = 'nhan_vien',
    phone = '0922222222',
    is_active = true,
    base_salary_monthly = 6000000,
    standard_work_days = 26,
    salary_notes = 'Chăm sóc mái đẻ + sinh sản'
  WHERE id = v_nv2;

  UPDATE profiles SET
    full_name = 'Lê Văn C',
    role = 'nhan_vien',
    phone = '0923333333',
    is_active = true,
    base_salary_monthly = 5500000,
    standard_work_days = 26,
    salary_notes = 'Vệ sinh chuồng + vần gà'
  WHERE id = v_nv3;

  -- Chấm công: 28 ngày gần nhất, mỗi người nghỉ 1-2 ngày ngẫu nhiên
  FOR d IN SELECT generate_series(CURRENT_DATE - 30, CURRENT_DATE - 1, '1 day'::INTERVAL)::DATE LOOP
    -- Nguyễn Văn A: nghỉ CN
    IF EXTRACT(DOW FROM d) != 0 THEN
      INSERT INTO staff_attendance (staff_id, attendance_date, check_in_time, check_out_time, total_hours)
      VALUES (v_nv1, d, d + TIME '06:30', d + TIME '14:30', 8.0)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Trần Thị B: đi đủ 6 ngày/tuần, nghỉ T7 + CN
    IF EXTRACT(DOW FROM d) NOT IN (0, 6) THEN
      INSERT INTO staff_attendance (staff_id, attendance_date, check_in_time, check_out_time, total_hours)
      VALUES (v_nv2, d, d + TIME '07:00', d + TIME '15:00', 8.0)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Lê Văn C: nghỉ random (1 ngày cuối tháng)
    IF EXTRACT(DAY FROM d) NOT IN (10, 20) THEN
      INSERT INTO staff_attendance (staff_id, attendance_date, check_in_time, check_out_time, total_hours)
      VALUES (v_nv3, d, d + TIME '14:00', d + TIME '22:00', 8.0)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Chốt lương tháng trước để có chi phí nhân công chảy vào P&L
  -- (dùng function API là tốt nhất, nhưng đây chạy trực tiếp SQL — tạo expense + payroll)
END $$;

-- Verify
SELECT
  p.full_name, p.role, p.base_salary_monthly, p.standard_work_days,
  (SELECT COUNT(*) FROM staff_attendance sa WHERE sa.staff_id = p.id) AS total_days
FROM profiles p
WHERE p.is_active = true
ORDER BY p.role DESC, p.full_name;
