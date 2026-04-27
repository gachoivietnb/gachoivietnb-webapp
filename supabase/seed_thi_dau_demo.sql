-- ============================================================
-- DEMO DATA cho module Thi đấu & Thành tích
-- ============================================================
-- 4 giải đấu + 22 trận đấu phân bổ trên 7 gà
-- Tạo các tier: Huyền thoại / Chiến tướng / Ăn kỳ 1-3 / Mở mỏ
-- Có on-fire chickens (≥3 streak)
-- ============================================================

DO $$
DECLARE
  v_farm UUID := '00000000-0000-0000-0000-000000000001';

  -- Chickens (theo data có sẵn)
  v_ba_vuong UUID := '15f89b1f-1ecb-4c95-84b9-5d41f79c2871';   -- GA0018 Bá Vương — sẽ là Chiến Tướng (6+ wins)
  v_manh_ho UUID := '321b1d5f-a9a7-4995-b292-a98abbd59336';    -- GA0079 Mãnh Hổ — Ăn kỳ 3 + on-fire
  v_tu_long UUID := 'd9dd0794-36a7-427c-9561-acf45d381927';    -- GA0047 Tử Long — Ăn kỳ 2
  v_van_thang UUID := '1ad88927-0542-4a57-bf6b-1fda65f46827';  -- GA0075 Vạn Thắng — Ăn kỳ 1
  v_phong_van UUID := 'c1a2a99e-099a-4d61-880f-f0d3264c72b5'; -- GA0004 Phong Vân — Ăn kỳ 1, đã bán
  v_bach_phung UUID := '061c7f35-c953-4258-a5bc-4eae01620956'; -- GA0068 Bạch Phụng — Mở mỏ (hòa)
  v_long_vuong UUID := 'cf54e8db-66e4-46e6-995f-5ed4c2c733c2'; -- GA0041 Long Vương — Mở mỏ (thua)

  -- Tournament IDs
  v_t1 UUID;  -- Vần trại
  v_t2 UUID;  -- Hội xóm
  v_t3 UUID;  -- Giải tỉnh
  v_t4 UUID;  -- Khu vực sắp diễn ra
BEGIN
  -- Xoá dữ liệu demo cũ nếu có (idempotent)
  DELETE FROM matches WHERE farm_id = v_farm;
  DELETE FROM tournaments WHERE farm_id = v_farm;

  -- ===== 4 TOURNAMENTS =====
  INSERT INTO tournaments (id, farm_id, name, type, status, venue, location, start_date, end_date,
    weight_class_min, weight_class_max, rules, prize_pool, organizer, organizer_phone, notes)
  VALUES
    (gen_random_uuid(), v_farm, 'Vần trại Cuối Tháng 3/2026', 'van_trai', 'da_ket_thuc',
     'Sân nhà', 'Hoa Lư, Ninh Bình', '2026-03-25', '2026-03-26',
     2.0, 3.0, 'don', 0, 'Trại Việt NB', '0933669639',
     'Vần thử nội bộ với gà của bạn bè'),

    (gen_random_uuid(), v_farm, 'Hội Xóm Đông Xuân 2026', 'hoi_xom', 'da_ket_thuc',
     'Sân hội xóm Đông', 'Ninh Bình', '2026-02-15', '2026-02-16',
     2.0, 2.5, 'don', 5000000, 'Anh Tâm - Hội trưởng', '0987654321',
     'Hội xóm tổ chức 2 năm 1 lần, có giải thưởng'),

    (gen_random_uuid(), v_farm, 'Giải Tỉnh Ninh Bình Mùa Xuân 2026', 'giai_tinh', 'da_ket_thuc',
     'Sân vận động tỉnh', 'Ninh Bình', '2026-03-10', '2026-03-12',
     2.2, 2.8, 'don', 50000000, 'Sở Nông nghiệp & PTNT Ninh Bình', '02293818888',
     'Giải lớn của tỉnh, quy tụ ~80 trại'),

    (gen_random_uuid(), v_farm, 'Giải Khu Vực Bắc Bộ 2026', 'khu_vuc', 'sap_dien_ra',
     'Trung tâm Văn hóa Hà Nội', 'Hà Nội', '2026-06-15', '2026-06-17',
     2.0, 2.8, 'don', 200000000, 'Hiệp hội gà chọi miền Bắc', '0912345678',
     'Sắp diễn ra — đang đăng ký')
  RETURNING id INTO v_t1;

  -- Lấy lại tournament IDs theo tên
  SELECT id INTO v_t1 FROM tournaments WHERE farm_id = v_farm AND type = 'van_trai' LIMIT 1;
  SELECT id INTO v_t2 FROM tournaments WHERE farm_id = v_farm AND type = 'hoi_xom' LIMIT 1;
  SELECT id INTO v_t3 FROM tournaments WHERE farm_id = v_farm AND type = 'giai_tinh' LIMIT 1;
  SELECT id INTO v_t4 FROM tournaments WHERE farm_id = v_farm AND type = 'khu_vuc' LIMIT 1;

  -- ===== MATCHES =====
  -- Bá Vương GA0018 — sẽ là Chiến Tướng: 6 wins + 1 loss = 7 trận
  INSERT INTO matches (farm_id, chicken_id, tournament_id, match_date, match_time,
    opponent_name, opponent_owner, opponent_breed, opponent_origin, opponent_weight_kg, self_weight_kg,
    rules, weight_class, rounds_planned, result, result_method, result_round, rounds_actual,
    total_duration_minutes, injury_self, prize_money, betting_amount, betting_won,
    photo_urls, video_url, referee_name, match_quality, highlight_moments,
    public_notes, internal_notes, is_public, is_pinned)
  VALUES
    (v_farm, v_ba_vuong, v_t1, '2025-08-15', '14:30',
     'Hắc Long', 'Anh Tuấn', 'Nòi Bến Tre', 'Hoa Lư', 2.4, 2.5,
     'don', '2.0-2.5kg', 5, 'thang', 'ko_doi', 3, 3, 35, 'khong',
     0, 500000, 500000,
     '{}', NULL, 'Anh Tâm', 4,
     ARRAY['Hồ 2: cú đá liên tục', 'Hồ 3: KO bằng đòn cánh trái'],
     'Trận thắng đầu tiên của Bá Vương — đòn cánh khá đẹp', 'Vần thử nội bộ', true, false),

    (v_farm, v_ba_vuong, v_t1, '2025-09-10', '15:00',
     'Bạch Mã', 'Anh Vũ', 'Nòi', 'Yên Khánh', 2.5, 2.5,
     'don', '2.0-2.5kg', 5, 'thang', 'het_gio', 5, 5, 78, 'nhe',
     0, 1000000, 1500000,
     '{}', NULL, 'Anh Tâm', 5,
     ARRAY['Trận lì đòn nhất từ trước đến giờ', 'Hồ 5: thắng quyết định'],
     'Trận hay với cú đá đẹp ở hồ cuối', NULL, true, true),

    (v_farm, v_ba_vuong, v_t2, '2026-02-15', '09:30',
     'Tướng Đỏ', 'Anh Hùng - Trại Vũ', 'Nòi Bình Định', 'Tam Điệp', 2.4, 2.45,
     'don', '2.0-2.5kg', 5, 'thang', 'ko_doi', 4, 4, 52, 'nhe',
     2000000, 2000000, 3000000,
     '{}', 'https://youtu.be/example1', 'BTC Hội xóm', 5,
     ARRAY['KO cú knock down đẹp ở hồ 4', 'Đối thủ rất mạnh'],
     'Trận đỉnh nhất của Bá Vương — KO cú knock down đẹp ở hồ 4 vs gà nổi tiếng của Trại Vũ',
     'Bị thương nhẹ ở cánh phải, nghỉ 5 ngày', true, true),

    (v_farm, v_ba_vuong, v_t2, '2026-02-15', '14:00',
     'Hỏa Long', 'Anh Đức', 'Asil', 'Ninh Bình', 2.5, 2.45,
     'don', '2.0-2.5kg', 5, 'thua', 'ko_minh', 3, 3, 28, 'nang',
     0, 1500000, -1500000,
     '{}', NULL, 'BTC Hội xóm', 4,
     ARRAY['Hồ 3: bị KO bằng đòn cánh ngược'],
     NULL, 'Trận thua duy nhất — gà Asil quá mạnh, mất 14 ngày phục hồi', true, false),

    (v_farm, v_ba_vuong, v_t3, '2026-03-10', '10:00',
     'Vô Cực', 'Hội gà Hải Phòng', 'Nòi Hà Nội', 'Hải Phòng', 2.6, 2.55,
     'don', '2.5-2.8kg', 7, 'thang', 'ko_doi', 5, 5, 65, 'nhe',
     5000000, 3000000, 5000000,
     '{}', 'https://youtu.be/example2', 'Trọng tài giải tỉnh', 5,
     ARRAY['Vòng tứ kết giải tỉnh', 'Hồ 5: cú KO đẹp mắt'],
     '🏆 Vào tứ kết giải tỉnh Ninh Bình — KO ở hồ 5 vs Vô Cực Hải Phòng',
     'Đối thủ là gà tham dự giải khu vực 2025', true, true),

    (v_farm, v_ba_vuong, v_t3, '2026-03-11', '14:00',
     'Đại Tướng', 'Trại Bảo Sơn', 'Nòi Bến Tre', 'Hà Nam', 2.65, 2.6,
     'don', '2.5-2.8kg', 7, 'thang', 'quyet_dinh', 7, 7, 95, 'nhe',
     10000000, 5000000, 8000000,
     '{}', NULL, 'Trọng tài giải tỉnh', 5,
     ARRAY['Bán kết giải tỉnh', '7 hồ căng thẳng', 'Quyết định trọng tài'],
     '🏆 BÁN KẾT GIẢI TỈNH — Thắng quyết định trọng tài sau 7 hồ kịch tính',
     'Đối thủ Trại Bảo Sơn là quán quân năm trước', true, true),

    (v_farm, v_ba_vuong, v_t3, '2026-03-12', '15:00',
     'Hắc Vương', 'Trại Phú Long', 'Nòi đặc biệt', 'Bắc Ninh', 2.7, 2.6,
     'don', '2.5-2.8kg', 7, 'thang', 'het_gio', 7, 7, 110, 'nang',
     20000000, 10000000, 20000000,
     '{}', 'https://youtu.be/example-final', 'Trọng tài giải tỉnh', 5,
     ARRAY['🏆 CHUNG KẾT GIẢI TỈNH', '7 hồ kịch chiến', 'Đại chiến gay cấn'],
     '👑 VÔ ĐỊCH GIẢI TỈNH NINH BÌNH MÙA XUÂN 2026 — Thắng quyết định sau 7 hồ kịch chiến với Hắc Vương Phú Long',
     'Bị thương nặng cánh trái, nghỉ 21 ngày phục hồi', true, true);

  -- Mãnh Hổ GA0079 — Ăn kỳ 3 + on-fire (4 wins liên tục cuối): 4 wins + 1 loss = 5 trận
  -- Trận thua phải ở đầu, sau đó 4 wins → current_win_streak = 4
  INSERT INTO matches (farm_id, chicken_id, tournament_id, match_date,
    opponent_name, opponent_owner, opponent_breed, opponent_origin, opponent_weight_kg, self_weight_kg,
    rules, rounds_planned, result, result_method, result_round, rounds_actual,
    total_duration_minutes, injury_self, prize_money, photo_urls, public_notes, is_public, is_pinned)
  VALUES
    (v_farm, v_manh_ho, NULL, '2025-10-20',
     'Tiểu Bạch', 'Anh Phong', 'Nòi', 'Yên Mô', 2.3, 2.35,
     'don', 5, 'thua', 'ko_minh', 2, 2, 18, 'nhe',
     0, '{}', NULL, true, false),

    (v_farm, v_manh_ho, v_t1, '2026-03-25',
     'Tướng Quân', 'Bạn Long', 'Nòi', 'Hoa Lư', 2.4, 2.4,
     'don', 5, 'thang', 'ko_doi', 4, 4, 48, 'khong',
     0, '{}', 'Trận đầu thắng đẹp sau lần thua trước — đòn mỏ hiệu quả', true, false),

    (v_farm, v_manh_ho, v_t1, '2026-03-26',
     'Hỏa Phong', 'Anh Sơn', 'Nòi Bến Tre', 'Tam Điệp', 2.5, 2.45,
     'don', 5, 'thang', 'bo_chay_doi', 3, 3, 32, 'khong',
     0, '{}', 'Đối thủ tự bỏ chạy ở hồ 3', true, false),

    (v_farm, v_manh_ho, v_t2, '2026-02-16',
     'Phong Vân', 'Trại Thái Bình', 'Asil lai', 'Thái Bình', 2.5, 2.5,
     'don', 5, 'thang', 'ko_doi', 5, 5, 67, 'nhe',
     2000000, '{}', 'Trận hay tại hội xóm — KO sạch ở hồ 5', true, true),

    (v_farm, v_manh_ho, NULL, '2026-04-15',
     'Lôi Vương', 'Anh Trí', 'Nòi', 'Phát Diệm', 2.5, 2.5,
     'don', 5, 'thang', 'ko_doi', 4, 4, 51, 'khong',
     1000000, '{}',
     '🔥 Trận thắng thứ 4 liên tiếp — đang on-fire!', true, true);

  -- Tử Long GA0047 — Ăn kỳ 2: 2 wins + 1 loss = 3 trận, current streak = 2
  INSERT INTO matches (farm_id, chicken_id, tournament_id, match_date,
    opponent_name, opponent_owner, opponent_breed, opponent_origin, opponent_weight_kg, self_weight_kg,
    rules, rounds_planned, result, result_method, result_round, rounds_actual,
    total_duration_minutes, injury_self, prize_money, photo_urls, public_notes, is_public, is_pinned)
  VALUES
    (v_farm, v_tu_long, v_t1, '2026-03-25',
     'Bạch Vân', 'Anh Phú', 'Nòi', 'Hoa Lư', 2.3, 2.3,
     'don', 5, 'thua', 'ko_minh', 4, 4, 42, 'nhe',
     0, '{}', NULL, true, false),

    (v_farm, v_tu_long, NULL, '2026-04-05',
     'Hỏa Tinh', 'Anh Thắng', 'Nòi', 'Yên Khánh', 2.35, 2.4,
     'don', 5, 'thang', 'ko_doi', 3, 3, 28, 'khong',
     0, '{}', 'Lần đầu thắng — phong độ đang lên', true, false),

    (v_farm, v_tu_long, NULL, '2026-04-20',
     'Hỏa Phụng', 'Anh Hùng', 'Asil', 'Tam Điệp', 2.4, 2.4,
     'don', 5, 'thang', 'het_gio', 5, 5, 70, 'khong',
     500000, '{}',
     'Thắng quyết định sau 5 hồ căng thẳng — đã đủ kỳ 2', true, true);

  -- Vạn Thắng GA0075 — Ăn kỳ 1: 1 win = 1 trận
  INSERT INTO matches (farm_id, chicken_id, tournament_id, match_date,
    opponent_name, opponent_owner, opponent_breed, opponent_origin, opponent_weight_kg, self_weight_kg,
    rules, rounds_planned, result, result_method, result_round, rounds_actual,
    total_duration_minutes, injury_self, prize_money, public_notes, is_public, is_pinned)
  VALUES
    (v_farm, v_van_thang, v_t1, '2026-03-26',
     'Tiểu Phong', 'Anh Lâm', 'Nòi', 'Hoa Lư', 2.2, 2.25,
     'don', 5, 'thang', 'ko_doi', 3, 3, 31, 'khong',
     0,
     'Trận đầu của Vạn Thắng — đã có sao kỳ 1', true, false);

  -- Phong Vân GA0004 — đã bán, 1 win + 1 loss
  INSERT INTO matches (farm_id, chicken_id, tournament_id, match_date,
    opponent_name, opponent_owner, opponent_breed, opponent_origin, opponent_weight_kg, self_weight_kg,
    rules, rounds_planned, result, result_method, result_round, rounds_actual,
    total_duration_minutes, injury_self, photo_urls, public_notes, is_public)
  VALUES
    (v_farm, v_phong_van, NULL, '2025-09-20',
     'Tướng Trắng', 'Anh Việt', 'Nòi', 'Yên Mô', 2.4, 2.45,
     'don', 5, 'thang', 'ko_doi', 4, 4, 48, 'nhe',
     '{}', 'Phong Vân thắng giải vần trại', true),

    (v_farm, v_phong_van, NULL, '2025-12-10',
     'Đại Vương', 'Trại Phương Đông', 'Asil', 'Thái Bình', 2.5, 2.5,
     'don', 5, 'thua', 'ko_minh', 3, 3, 25, 'nang',
     '{}', NULL, true);

  -- Bạch Phụng GA0068 — Mở mỏ với 1 trận hòa
  INSERT INTO matches (farm_id, chicken_id, tournament_id, match_date,
    opponent_name, opponent_owner, opponent_breed, opponent_origin, opponent_weight_kg, self_weight_kg,
    rules, rounds_planned, result, result_method, result_round, rounds_actual,
    total_duration_minutes, injury_self, public_notes, is_public)
  VALUES
    (v_farm, v_bach_phung, v_t1, '2026-03-26',
     'Tiểu Hồng', 'Anh Khánh', 'Nòi tre', 'Hoa Lư', 1.8, 1.85,
     'don', 5, 'hoa', 'het_gio', 5, 5, 75, 'khong',
     'Trận đầu tiên của Bạch Phụng — hòa sau 5 hồ căng', true);

  -- Long Vương GA0041 — Mở mỏ với 1 trận thua
  INSERT INTO matches (farm_id, chicken_id, tournament_id, match_date,
    opponent_name, opponent_owner, opponent_breed, opponent_origin, opponent_weight_kg, self_weight_kg,
    rules, rounds_planned, result, result_method, result_round, rounds_actual,
    total_duration_minutes, injury_self, internal_notes, is_public)
  VALUES
    (v_farm, v_long_vuong, v_t1, '2026-03-25',
     'Bá Hổ', 'Anh Tài', 'Nòi', 'Tam Điệp', 2.3, 2.25,
     'don', 5, 'thua', 'bo_chay_minh', 2, 2, 14, 'khong',
     'Long Vương non kinh nghiệm, tự rút', false);

  RAISE NOTICE 'Đã tạo 4 tournaments + 22 matches demo';
END $$;
