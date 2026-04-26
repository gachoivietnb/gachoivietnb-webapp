-- Demo data cho activity_logs để user hiểu tính năng
DELETE FROM activity_logs;

DO $$
DECLARE
  v_chu UUID;
  v_nv1 UUID;
  v_nv2 UUID;
  r RECORD;
BEGIN
  SELECT id INTO v_chu FROM profiles WHERE role = 'chu_trai' LIMIT 1;
  SELECT id INTO v_nv1 FROM profiles WHERE full_name = 'Nguyễn Văn A';
  SELECT id INTO v_nv2 FROM profiles WHERE full_name = 'Trần Thị B';

  -- Gà được tạo gần đây
  FOR r IN SELECT id, chicken_code, name, breed_id, created_at FROM chickens ORDER BY created_at DESC LIMIT 15 LOOP
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, after_data, ip_address, created_at)
    VALUES (
      CASE WHEN random() > 0.5 THEN v_chu ELSE v_nv1 END,
      'create', 'chickens', r.id,
      jsonb_build_object('chicken_code', r.chicken_code, 'name', r.name),
      '192.168.1.' || floor(random() * 100 + 1)::INT,
      r.created_at
    );
  END LOOP;

  -- Cập nhật giá gà (5 sự kiện)
  FOR r IN SELECT id, chicken_code, listed_price FROM chickens WHERE listed_price IS NOT NULL ORDER BY random() LIMIT 5 LOOP
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, before_data, after_data, ip_address, created_at)
    VALUES (
      v_chu, 'update', 'chickens', r.id,
      jsonb_build_object('listed_price', r.listed_price + 500000),
      jsonb_build_object('listed_price', r.listed_price),
      '192.168.1.10',
      NOW() - (random() * INTERVAL '10 days')
    );
  END LOOP;

  -- Đổi trạng thái sales_orders (đặt cọc → đã giao)
  FOR r IN SELECT id, order_code, status FROM sales_orders ORDER BY created_at DESC LIMIT 5 LOOP
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, before_data, after_data, ip_address, created_at)
    VALUES (
      v_chu, 'update', 'sales_orders', r.id,
      jsonb_build_object('status', 'dat_coc'),
      jsonb_build_object('status', r.status, 'order_code', r.order_code),
      '192.168.1.10',
      NOW() - (random() * INTERVAL '5 days')
    );
  END LOOP;

  -- Đơn hàng mới (3 cái)
  FOR r IN SELECT id, order_code, total_amount, created_at FROM sales_orders ORDER BY created_at DESC LIMIT 3 LOOP
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, after_data, ip_address, created_at)
    VALUES (
      v_chu, 'create', 'sales_orders', r.id,
      jsonb_build_object('order_code', r.order_code, 'total_amount', r.total_amount),
      '192.168.1.10',
      r.created_at
    );
  END LOOP;

  -- Xóa 2 gà (demo hành động xóa)
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, before_data, ip_address, created_at)
  VALUES
    (v_chu, 'delete', 'chickens', uuid_generate_v4(),
     jsonb_build_object('chicken_code', 'GA-TEST-001', 'name', 'Test Gà', 'status', 'loai_thai'),
     '192.168.1.10', NOW() - INTERVAL '2 days'),
    (v_chu, 'delete', 'customers', uuid_generate_v4(),
     jsonb_build_object('name', 'Khách test ảo', 'phone', '0900000000'),
     '192.168.1.10', NOW() - INTERVAL '5 days');

  -- Nhân viên check-in/check-out (nếu seed demo)
  FOR r IN SELECT id, attendance_date, staff_id FROM staff_attendance ORDER BY attendance_date DESC LIMIT 8 LOOP
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, after_data, ip_address, created_at)
    VALUES (
      r.staff_id, 'create', 'staff_attendance', r.id,
      jsonb_build_object('date', r.attendance_date::TEXT, 'type', 'check_in'),
      '192.168.1.' || (50 + floor(random() * 20)::INT),
      (r.attendance_date::TIMESTAMP + INTERVAL '6 hours 30 minutes')::TIMESTAMPTZ
    );
  END LOOP;

  -- Cập nhật tiêm phòng (3 lần)
  FOR r IN SELECT id FROM vaccinations WHERE status = 'da_tiem' ORDER BY random() LIMIT 3 LOOP
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, before_data, after_data, ip_address, created_at)
    VALUES (
      CASE WHEN random() > 0.5 THEN v_nv1 ELSE v_nv2 END,
      'update', 'vaccinations', r.id,
      jsonb_build_object('status', 'cho_tiem'),
      jsonb_build_object('status', 'da_tiem'),
      '192.168.1.55',
      NOW() - (random() * INTERVAL '15 days')
    );
  END LOOP;

  -- Chốt lương
  FOR r IN SELECT id, period_year, period_month, net_paid FROM payroll_payments ORDER BY created_at DESC LIMIT 2 LOOP
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, after_data, ip_address, created_at)
    VALUES (
      v_chu, 'create', 'payroll_payments', r.id,
      jsonb_build_object('period', r.period_year || '/' || r.period_month, 'net_paid', r.net_paid),
      '192.168.1.10',
      NOW() - INTERVAL '3 days'
    );
  END LOOP;

  -- Upload media
  FOR r IN SELECT id, chicken_id, media_type, caption FROM chicken_media ORDER BY created_at DESC LIMIT 3 LOOP
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, after_data, ip_address, created_at)
    VALUES (
      v_nv1, 'create', 'chicken_media', r.id,
      jsonb_build_object('chicken_id', r.chicken_id, 'media_type', r.media_type, 'caption', r.caption),
      '192.168.1.55',
      NOW() - (random() * INTERVAL '7 days')
    );
  END LOOP;

END $$;

SELECT action, COUNT(*) FROM activity_logs GROUP BY action ORDER BY action;
