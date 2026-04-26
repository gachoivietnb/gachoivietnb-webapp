-- =====================================================
-- GÀ CHỌI VIỆT NB - SEED DATA
-- Part 4/4: 7 giống + 8 vaccine + 8 hạng mục chi phí + 5 khu + 9999 QR tags + settings
-- =====================================================

-- 1. BREEDS — 7 giống phổ biến
INSERT INTO breeds (code, name_vi, origin, tier, description, display_order) VALUES
('ASIL', 'Asil', 'Ấn Độ', 'cao_cap', 'Đòn cước chắc, gan lì, được ưa chuộng nhất', 1),
('MLAI', 'Mã Lai', 'Malaysia', 'cao_cap', 'Đòn cao, thể hình to, sức bền tốt', 2),
('PERU', 'Peru', 'Peru', 'trung_cap', 'Thể hình lớn, đòn mạnh', 3),
('NOI', 'Nòi', 'Việt Nam', 'pho_thong', 'Giống gà chọi truyền thống Việt Nam, dai sức', 4),
('TRE', 'Tre', 'Việt Nam', 'pho_thong', 'Nhỏ gọn, nhanh nhẹn', 5),
('TANC', 'Tân Châu', 'Việt Nam', 'cao_cap', 'Giống đẹp, lông mượt, nguồn gốc An Giang', 6),
('LAIF1', 'Lai F1', 'Lai tạo', 'dac_biet', 'Lai giữa các giống thuần để tận dụng ưu điểm', 7);

-- 2. VACCINES — 8 mũi cơ bản
INSERT INTO vaccines (code, name_vi, default_age_days, is_required, display_order, description) VALUES
('MAREK', 'Marek', 1, TRUE, 1, 'Tiêm ngày đầu - phòng ung thư'),
('NEW1', 'Newcastle (Lasota) lần 1', 7, TRUE, 2, 'Phòng bệnh Newcastle - ngày 7'),
('GUM1', 'Gumboro lần 1', 14, TRUE, 3, 'Phòng bệnh Gumboro - ngày 14'),
('NEW2', 'Newcastle lần 2', 21, TRUE, 4, 'Tăng cường Newcastle - ngày 21'),
('GUM2', 'Gumboro lần 2', 28, TRUE, 5, 'Tăng cường Gumboro - ngày 28'),
('H5N1', 'Cúm gia cầm H5N1', 42, TRUE, 6, 'Bắt buộc theo luật - 6 tuần'),
('DAU', 'Đậu gà', 56, FALSE, 7, '8 tuần tuổi'),
('NDIB', 'ND-IB tăng cường', 84, FALSE, 8, '12 tuần - tăng cường miễn dịch');

-- 3. EXPENSE CATEGORIES — 8 hạng mục
INSERT INTO expense_categories (code, name_vi, description, display_order) VALUES
('thuc_an', 'Thức ăn', 'Cám, ngô, lúa, rau xanh', 1),
('nhan_cong', 'Nhân công', 'Lương nhân viên', 2),
('thuoc_thu_y', 'Thuốc thú y', 'Thuốc chữa bệnh, vaccine', 3),
('dien_nuoc', 'Điện nước', 'Tiền điện, nước, vật tư chuồng', 4),
('khau_hao', 'Khấu hao', 'Khấu hao chuồng trại, thiết bị', 5),
('van_chuyen', 'Vận chuyển', 'Giao gà, mua nguyên liệu', 6),
('marketing', 'Marketing', 'Quảng cáo, content, in ấn', 7),
('du_phong', 'Dự phòng', 'Sự cố bất ngờ, sửa chữa', 8);

-- 4. AREAS — 5 khu mẫu
INSERT INTO areas (code, name_vi, type, description, display_order) VALUES
('A', 'Khu A - Trống chiến', 'duc', 'Khu nuôi gà trống chiến', 1),
('B', 'Khu B - Mái đẻ', 'mai', 'Khu nuôi gà mái sinh sản', 2),
('C', 'Khu C - Ghép đôi', 'ghep_doi', 'Khu cho lứa ghép đôi', 3),
('D', 'Khu D - Gà tơ', 'trong', 'Khu nuôi gà tơ chưa phân giới tính', 4),
('E', 'Khu E - Cách ly', 'cach_ly', 'Khu cách ly gà mới + bệnh', 5);

-- 5. QR TAGS — 9999 thẻ (0001 → 9999)
INSERT INTO qr_tags (tag_number)
SELECT LPAD(generate_series(1, 9999)::TEXT, 4, '0');

-- 6. SYSTEM SETTINGS — defaults
INSERT INTO system_settings (key, value, description) VALUES
('farm_info', '{"name": "Gà Chọi Việt Ninh Bình", "short_name": "Gà Chọi Việt NB", "address": "Ninh Bình", "phone": "", "zalo": "", "facebook": ""}', 'Thông tin trang trại'),
('alert_thresholds', '{"death_rate_daily_pct": 2, "death_rate_baseline_multiplier": 3, "low_stock_days_warning": 7}', 'Ngưỡng cảnh báo'),
('default_cost_per_chicken_per_month', '{"value": 100000}', 'Chi phí nuôi mặc định/con/tháng (VNĐ)'),
('vaccine_reminder_time', '{"hour": 7, "minute": 0}', 'Giờ gửi nhắc tiêm phòng hàng ngày');
