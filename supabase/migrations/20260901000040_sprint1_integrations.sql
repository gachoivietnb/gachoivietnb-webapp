-- ============================================================
-- SPRINT 1: TÍCH HỢP TỰ ĐỘNG CROSS-MODULE
-- ============================================================
-- #1+#2: Sales → Cash transactions auto sync
-- #6: Vaccination → Medicine transaction trừ tồn
-- #7: Match prize/betting → Cash transactions
-- ============================================================

-- ============ Helper: Lấy default cash account ============

CREATE OR REPLACE FUNCTION public.get_default_cash_account(p_farm_id UUID, p_payment_method TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  -- Ưu tiên theo payment_method (TM=cash, CK=bank)
  IF p_payment_method IN ('CK','bank','chuyen_khoan') THEN
    SELECT id INTO v_id FROM public.cash_accounts
     WHERE farm_id = p_farm_id AND is_active = TRUE AND account_type = 'bank'
     ORDER BY is_default DESC, display_order LIMIT 1;
  ELSIF p_payment_method IN ('TM','cash','tien_mat') THEN
    SELECT id INTO v_id FROM public.cash_accounts
     WHERE farm_id = p_farm_id AND is_active = TRUE AND account_type = 'cash'
     ORDER BY is_default DESC, display_order LIMIT 1;
  END IF;
  -- Fallback: default account
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.cash_accounts
     WHERE farm_id = p_farm_id AND is_active = TRUE
     ORDER BY is_default DESC, display_order LIMIT 1;
  END IF;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- #1+#2: SALES → CASH SYNC
-- ============================================================
-- Khi sales_orders.status = 'dat_coc' AND deposit_amount > 0 → cash income (deposit)
-- Khi sales_orders.status = 'da_giao' AND paid_amount > 0 → cash income (sale)
-- Khi sales_orders.paid_amount tăng → tạo cash_transaction cho delta
-- Tránh tạo duplicate bằng cách check ref_type+ref_id+category

CREATE OR REPLACE FUNCTION public.sync_sales_to_cash()
RETURNS TRIGGER AS $$
DECLARE
  v_account UUID;
  v_existing_deposit NUMERIC;
  v_existing_sale NUMERIC;
  v_delta NUMERIC;
  v_customer_name TEXT;
BEGIN
  -- Skip nếu cancelled
  IF NEW.status = 'huy' THEN RETURN NEW; END IF;

  v_account := public.get_default_cash_account(NEW.farm_id, NEW.payment_method);
  IF v_account IS NULL THEN RETURN NEW; END IF;  -- Chưa có tài khoản nào

  -- Lookup customer name for description
  SELECT name INTO v_customer_name FROM public.customers WHERE id = NEW.customer_id;

  -- Tổng tiền deposit/sale đã ghi vào quỹ cho order này
  SELECT COALESCE(SUM(amount), 0) INTO v_existing_deposit
    FROM public.cash_transactions
   WHERE ref_type = 'sales_order' AND ref_id = NEW.id AND category = 'deposit';

  SELECT COALESCE(SUM(amount), 0) INTO v_existing_sale
    FROM public.cash_transactions
   WHERE ref_type = 'sales_order' AND ref_id = NEW.id AND category = 'sale';

  -- DEPOSIT: nếu status='dat_coc' và deposit_amount > đã ghi → tạo delta
  IF NEW.status IN ('dat_coc','da_giao') AND COALESCE(NEW.deposit_amount, 0) > v_existing_deposit THEN
    v_delta := NEW.deposit_amount - v_existing_deposit;
    INSERT INTO public.cash_transactions (
      farm_id, account_id, direction, amount, transaction_date, category,
      ref_type, ref_id, description, created_by
    ) VALUES (
      NEW.farm_id, v_account, 'in', v_delta, COALESCE(NEW.deposit_date, CURRENT_DATE),
      'deposit', 'sales_order', NEW.id,
      'Đặt cọc đơn ' || COALESCE(NEW.order_code, NEW.id::text) || COALESCE(' · ' || v_customer_name, ''),
      NEW.performed_by
    );
  END IF;

  -- SALE: nếu paid_amount > đã ghi (deposit + sale) → tạo delta
  IF COALESCE(NEW.paid_amount, 0) > (v_existing_deposit + v_existing_sale) THEN
    v_delta := NEW.paid_amount - v_existing_deposit - v_existing_sale;
    IF v_delta > 0 THEN
      INSERT INTO public.cash_transactions (
        farm_id, account_id, direction, amount, transaction_date, category,
        ref_type, ref_id, description, created_by
      ) VALUES (
        NEW.farm_id, v_account, 'in', v_delta,
        COALESCE(NEW.delivered_date, CURRENT_DATE),
        'sale', 'sales_order', NEW.id,
        'Thu tiền đơn ' || COALESCE(NEW.order_code, NEW.id::text) || COALESCE(' · ' || v_customer_name, ''),
        NEW.performed_by
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_sales_to_cash ON public.sales_orders;
CREATE TRIGGER tr_sync_sales_to_cash
  AFTER INSERT OR UPDATE OF status, paid_amount, deposit_amount, payment_method ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_sales_to_cash();

-- ============================================================
-- #6: VACCINATION → MEDICINE TRỪ TỒN
-- ============================================================
-- Khi vaccinations.status='da_tiem' AND linked_medicine_id IS NOT NULL → tạo
-- medicine_transactions xuất 1 đơn vị (hoặc dose theo cấu hình)
-- Tránh duplicate: check existing transaction có notes='vaccine_<id>'

CREATE OR REPLACE FUNCTION public.sync_vaccination_to_medicine()
RETURNS TRIGGER AS $$
DECLARE
  v_qty NUMERIC := 1;
  v_cost NUMERIC := 0;
  v_existing_count INT;
BEGIN
  IF NEW.linked_medicine_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('da_tiem', 'bi_phan_ung') THEN RETURN NEW; END IF;

  -- Đã từng trừ rồi?
  SELECT COUNT(*) INTO v_existing_count
    FROM public.medicine_transactions
   WHERE medicine_id = NEW.linked_medicine_id
     AND notes = 'vaccine:' || NEW.id::text;

  IF v_existing_count > 0 THEN RETURN NEW; END IF;

  -- Lấy cost_per_unit
  SELECT cost_per_unit INTO v_cost FROM public.medicines WHERE id = NEW.linked_medicine_id;
  v_cost := COALESCE(v_cost, 0);

  -- Insert xuất kho
  INSERT INTO public.medicine_transactions (
    medicine_id, transaction_type, quantity, transaction_date,
    related_chicken_id, cost, notes, performed_by, farm_id
  ) VALUES (
    NEW.linked_medicine_id, 'xuat', v_qty,
    COALESCE(NEW.actual_date, CURRENT_DATE),
    NEW.chicken_id, v_cost * v_qty,
    'vaccine:' || NEW.id::text,
    NEW.performed_by, NEW.farm_id
  );

  -- Trừ tồn
  UPDATE public.medicines
     SET current_stock = GREATEST(0, current_stock - v_qty)
   WHERE id = NEW.linked_medicine_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_vaccination_to_medicine ON public.vaccinations;
CREATE TRIGGER tr_sync_vaccination_to_medicine
  AFTER UPDATE OF status, linked_medicine_id ON public.vaccinations
  FOR EACH ROW EXECUTE FUNCTION public.sync_vaccination_to_medicine();

-- ============================================================
-- #7: MATCH PRIZE/BETTING → CASH
-- ============================================================
-- Khi matches có result + prize_money > 0 → cash income
-- Khi betting_won != 0 → cash income (nếu >0) hoặc expense (nếu <0)
-- ref_type='match', category='match_prize' / 'match_betting'

CREATE OR REPLACE FUNCTION public.sync_match_to_cash()
RETURNS TRIGGER AS $$
DECLARE
  v_account UUID;
  v_existing_prize NUMERIC;
  v_existing_betting NUMERIC;
  v_delta NUMERIC;
  v_chicken_code TEXT;
BEGIN
  IF NEW.result IS NULL THEN RETURN NEW; END IF;

  v_account := public.get_default_cash_account(NEW.farm_id, NULL);
  IF v_account IS NULL THEN RETURN NEW; END IF;

  SELECT chicken_code INTO v_chicken_code FROM public.chickens WHERE id = NEW.chicken_id;

  -- PRIZE: nếu prize_money > đã ghi
  SELECT COALESCE(SUM(amount), 0) INTO v_existing_prize
    FROM public.cash_transactions
   WHERE ref_type = 'match' AND ref_id = NEW.id AND category = 'match_prize';

  IF COALESCE(NEW.prize_money, 0) > v_existing_prize THEN
    v_delta := NEW.prize_money - v_existing_prize;
    INSERT INTO public.cash_transactions (
      farm_id, account_id, direction, amount, transaction_date, category,
      ref_type, ref_id, description, created_by
    ) VALUES (
      NEW.farm_id, v_account, 'in', v_delta,
      COALESCE(NEW.match_date, CURRENT_DATE),
      'match_prize', 'match', NEW.id,
      'Tiền giải trận ' || COALESCE(NEW.match_code, NEW.id::text) ||
        COALESCE(' · gà ' || v_chicken_code, '') ||
        ' vs ' || NEW.opponent_name,
      NEW.created_by
    );
  END IF;

  -- BETTING: nếu betting_won != 0 và chưa ghi
  SELECT COALESCE(SUM(CASE direction WHEN 'in' THEN amount ELSE -amount END), 0)
    INTO v_existing_betting
    FROM public.cash_transactions
   WHERE ref_type = 'match' AND ref_id = NEW.id AND category = 'match_betting';

  IF COALESCE(NEW.betting_won, 0) <> v_existing_betting THEN
    v_delta := NEW.betting_won - v_existing_betting;
    IF v_delta <> 0 THEN
      INSERT INTO public.cash_transactions (
        farm_id, account_id, direction, amount, transaction_date, category,
        ref_type, ref_id, description, created_by
      ) VALUES (
        NEW.farm_id, v_account,
        CASE WHEN v_delta > 0 THEN 'in' ELSE 'out' END,
        ABS(v_delta),
        COALESCE(NEW.match_date, CURRENT_DATE),
        'match_betting', 'match', NEW.id,
        (CASE WHEN v_delta > 0 THEN 'Thắng cược trận ' ELSE 'Thua cược trận ' END) ||
          COALESCE(NEW.match_code, NEW.id::text),
        NEW.created_by
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_match_to_cash ON public.matches;
CREATE TRIGGER tr_sync_match_to_cash
  AFTER INSERT OR UPDATE OF result, prize_money, betting_won ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.sync_match_to_cash();

-- ============================================================
-- #4: STOCK ALERT GENERATOR (RPC để cron call)
-- ============================================================
-- Tạo alert khi medicine/feed dưới min_stock_alert
-- Idempotent: nếu đã có alert chưa xử lý cho item này → skip

CREATE OR REPLACE FUNCTION public.generate_stock_alerts()
RETURNS TABLE (created_count INT) AS $$
DECLARE
  v_count INT := 0;
  v_med RECORD;
  v_feed RECORD;
BEGIN
  -- Medicines dưới ngưỡng
  FOR v_med IN
    SELECT id, farm_id, name_vi, code, current_stock, min_stock_alert, unit
      FROM public.medicines
     WHERE is_active = TRUE
       AND current_stock <= min_stock_alert
       AND min_stock_alert > 0
  LOOP
    -- Đã có alert chưa xử lý cho medicine này?
    IF NOT EXISTS (
      SELECT 1 FROM public.alerts
       WHERE entity_type = 'medicine'
         AND entity_id = v_med.id
         AND status IN ('chua_doc','da_doc')
    ) THEN
      INSERT INTO public.alerts (
        farm_id, title, message, priority, alert_type,
        entity_type, entity_id, status
      ) VALUES (
        v_med.farm_id,
        '📦 Kho thuốc sắp hết: ' || v_med.name_vi,
        'Thuốc ' || v_med.name_vi || ' (' || v_med.code || ') chỉ còn ' ||
          v_med.current_stock || ' ' || v_med.unit || ' (≤ ngưỡng ' ||
          v_med.min_stock_alert || ')',
        CASE
          WHEN v_med.current_stock = 0 THEN 'khan_cap'::alert_priority
          WHEN v_med.current_stock <= v_med.min_stock_alert / 2 THEN 'cao'::alert_priority
          ELSE 'trung_binh'::alert_priority
        END,
        'low_stock_medicine',
        'medicine', v_med.id,
        'chua_doc'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Feeds dưới ngưỡng
  FOR v_feed IN
    SELECT id, farm_id, name_vi, code, current_stock, min_stock_alert, unit
      FROM public.feeds
     WHERE is_active = TRUE
       AND current_stock <= min_stock_alert
       AND min_stock_alert > 0
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.alerts
       WHERE entity_type = 'feed'
         AND entity_id = v_feed.id
         AND status IN ('chua_doc','da_doc')
    ) THEN
      INSERT INTO public.alerts (
        farm_id, title, message, priority, alert_type,
        entity_type, entity_id, status
      ) VALUES (
        v_feed.farm_id,
        '🌾 Kho cám sắp hết: ' || v_feed.name_vi,
        'Cám ' || v_feed.name_vi || ' (' || v_feed.code || ') chỉ còn ' ||
          v_feed.current_stock || ' ' || v_feed.unit || ' (≤ ngưỡng ' ||
          v_feed.min_stock_alert || ')',
        CASE
          WHEN v_feed.current_stock = 0 THEN 'khan_cap'::alert_priority
          WHEN v_feed.current_stock <= v_feed.min_stock_alert / 2 THEN 'cao'::alert_priority
          ELSE 'trung_binh'::alert_priority
        END,
        'low_stock_feed',
        'feed', v_feed.id,
        'chua_doc'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.generate_stock_alerts() TO authenticated;

-- ============================================================
-- BACKFILL: Resolve các alert cũ nếu kho đã được nhập đủ
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_stock_alerts()
RETURNS TABLE (resolved_count INT) AS $$
DECLARE v_count INT := 0;
BEGIN
  -- Resolve alerts cho medicines đã đủ tồn
  UPDATE public.alerts a
     SET status = 'da_xu_ly', resolved_at = NOW()
    FROM public.medicines m
   WHERE a.entity_type = 'medicine'
     AND a.entity_id = m.id
     AND a.status IN ('chua_doc','da_doc')
     AND m.current_stock > m.min_stock_alert;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.alerts a
     SET status = 'da_xu_ly', resolved_at = NOW()
    FROM public.feeds f
   WHERE a.entity_type = 'feed'
     AND a.entity_id = f.id
     AND a.status IN ('chua_doc','da_doc')
     AND f.current_stock > f.min_stock_alert;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.resolve_stock_alerts() TO authenticated;

-- ============================================================
-- BACKFILL existing data: chạy generate ngay
-- ============================================================

DO $$
BEGIN
  PERFORM public.generate_stock_alerts();
END $$;

COMMENT ON FUNCTION public.sync_sales_to_cash() IS
  'Trigger: tự tạo cash_transaction khi đặt cọc/giao hàng/cập nhật paid_amount';
COMMENT ON FUNCTION public.sync_vaccination_to_medicine() IS
  'Trigger: tự xuất kho thuốc khi tiêm phòng có linked_medicine_id';
COMMENT ON FUNCTION public.sync_match_to_cash() IS
  'Trigger: tự ghi quỹ khi trận đấu có tiền giải / cược';
COMMENT ON FUNCTION public.generate_stock_alerts() IS
  'Quét kho dưới ngưỡng → tạo alerts (idempotent)';
