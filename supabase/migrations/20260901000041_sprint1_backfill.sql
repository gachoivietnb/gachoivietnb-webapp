-- Backfill cash transactions cho data cũ (matches có prize, sales đã giao)

-- Mở rộng CHECK constraint để chấp nhận deposit / match_prize / match_betting + ref_type=match
ALTER TABLE public.cash_transactions DROP CONSTRAINT IF EXISTS cash_transactions_category_check;
ALTER TABLE public.cash_transactions ADD CONSTRAINT cash_transactions_category_check
  CHECK (category = ANY (ARRAY[
    'sale','deposit','purchase','expense','payroll',
    'transfer_in','transfer_out','transfer_fee',
    'opening','adjustment','capital_in','capital_out',
    'loan_in','loan_out',
    'match_prize','match_betting','invoice_settlement',
    'other'
  ]));

ALTER TABLE public.cash_transactions DROP CONSTRAINT IF EXISTS cash_transactions_ref_type_check;
ALTER TABLE public.cash_transactions ADD CONSTRAINT cash_transactions_ref_type_check
  CHECK (ref_type IS NULL OR ref_type = ANY (ARRAY[
    'sales_order','purchase','expense','payroll_payment','cash_transfer',
    'match','invoice','vaccination','manual'
  ]));

DO $$
DECLARE
  r RECORD;
  v_account UUID;
  v_chicken_code TEXT;
  v_customer_name TEXT;
BEGIN
  -- Backfill match prizes
  FOR r IN
    SELECT * FROM public.matches
     WHERE result IS NOT NULL
       AND prize_money > 0
  LOOP
    v_account := public.get_default_cash_account(r.farm_id, NULL);
    IF v_account IS NULL THEN CONTINUE; END IF;
    SELECT chicken_code INTO v_chicken_code FROM public.chickens WHERE id = r.chicken_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.cash_transactions
       WHERE ref_type = 'match' AND ref_id = r.id AND category = 'match_prize'
    ) THEN
      INSERT INTO public.cash_transactions (
        farm_id, account_id, direction, amount, transaction_date, category,
        ref_type, ref_id, description, created_by
      ) VALUES (
        r.farm_id, v_account, 'in', r.prize_money,
        COALESCE(r.match_date, CURRENT_DATE),
        'match_prize', 'match', r.id,
        'Tiền giải trận ' || COALESCE(r.match_code, r.id::text) ||
          COALESCE(' · gà ' || v_chicken_code, '') || ' vs ' || r.opponent_name,
        r.created_by
      );
    END IF;
  END LOOP;

  -- Backfill match betting
  FOR r IN
    SELECT * FROM public.matches
     WHERE result IS NOT NULL
       AND betting_won <> 0
  LOOP
    v_account := public.get_default_cash_account(r.farm_id, NULL);
    IF v_account IS NULL THEN CONTINUE; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.cash_transactions
       WHERE ref_type = 'match' AND ref_id = r.id AND category = 'match_betting'
    ) THEN
      INSERT INTO public.cash_transactions (
        farm_id, account_id, direction, amount, transaction_date, category,
        ref_type, ref_id, description, created_by
      ) VALUES (
        r.farm_id, v_account,
        CASE WHEN r.betting_won > 0 THEN 'in' ELSE 'out' END,
        ABS(r.betting_won),
        COALESCE(r.match_date, CURRENT_DATE),
        'match_betting', 'match', r.id,
        (CASE WHEN r.betting_won > 0 THEN 'Thắng cược trận ' ELSE 'Thua cược trận ' END) ||
          COALESCE(r.match_code, r.id::text),
        r.created_by
      );
    END IF;
  END LOOP;

  -- Backfill sales: deposits
  FOR r IN
    SELECT * FROM public.sales_orders
     WHERE status IN ('dat_coc','da_giao')
       AND COALESCE(deposit_amount, 0) > 0
  LOOP
    v_account := public.get_default_cash_account(r.farm_id, r.payment_method);
    IF v_account IS NULL THEN CONTINUE; END IF;
    SELECT name INTO v_customer_name FROM public.customers WHERE id = r.customer_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.cash_transactions
       WHERE ref_type = 'sales_order' AND ref_id = r.id AND category = 'deposit'
    ) THEN
      INSERT INTO public.cash_transactions (
        farm_id, account_id, direction, amount, transaction_date, category,
        ref_type, ref_id, description, created_by
      ) VALUES (
        r.farm_id, v_account, 'in', r.deposit_amount,
        COALESCE(r.deposit_date, r.order_date, CURRENT_DATE),
        'deposit', 'sales_order', r.id,
        'Đặt cọc đơn ' || COALESCE(r.order_code, r.id::text) || COALESCE(' · ' || v_customer_name, ''),
        r.performed_by
      );
    END IF;
  END LOOP;

  -- Backfill sales: paid amount (sale)
  FOR r IN
    SELECT * FROM public.sales_orders
     WHERE COALESCE(paid_amount, 0) > COALESCE(deposit_amount, 0)
  LOOP
    v_account := public.get_default_cash_account(r.farm_id, r.payment_method);
    IF v_account IS NULL THEN CONTINUE; END IF;
    SELECT name INTO v_customer_name FROM public.customers WHERE id = r.customer_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.cash_transactions
       WHERE ref_type = 'sales_order' AND ref_id = r.id AND category = 'sale'
    ) THEN
      INSERT INTO public.cash_transactions (
        farm_id, account_id, direction, amount, transaction_date, category,
        ref_type, ref_id, description, created_by
      ) VALUES (
        r.farm_id, v_account, 'in',
        r.paid_amount - COALESCE(r.deposit_amount, 0),
        COALESCE(r.delivered_date, r.order_date, CURRENT_DATE),
        'sale', 'sales_order', r.id,
        'Thu tiền đơn ' || COALESCE(r.order_code, r.id::text) || COALESCE(' · ' || v_customer_name, ''),
        r.performed_by
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill xong sales + matches → cash';
END $$;
