-- ============================================================
-- MULTI-TENANCY: SCHEMA + BACKFILL
-- ============================================================
-- Goal: convert single-farm app → SaaS multi-tenant.
-- Strategy:
--   1) Create `farms` master table.
--   2) Backfill 1 default farm from existing data.
--   3) Add `farm_id UUID NOT NULL REFERENCES farms(id)` to every
--      per-tenant table.
--   4) Helper function `current_farm_id()` for RLS + triggers.
--
-- Per-tenant tables (39): areas, cage_rows, cages, breeds, qr_tags,
--   chickens, chicken_media, breeding_litters, chick_groups,
--   vaccines, vaccinations, medicines, medicine_transactions,
--   feeds, feed_transactions, training_sessions, suppliers,
--   purchases, purchase_items, customers, customer_alerts,
--   customer_reviews, sales_orders, sales_items, expense_categories,
--   expenses, staff_attendance, staff_assignments, payroll_payments,
--   activity_logs, alerts, system_settings, backup_logs,
--   news_articles, farm_media, ai_generations, push_subscriptions.
--
-- Global tables (no farm_id): diseases (universal medical catalog),
--   contact_inquiries (public form, goes to SaaS owner).
--
-- profiles: special — gets `farm_id` to link user→farm.
-- ============================================================

-- ---- 1. FARMS MASTER TABLE ---------------------------------
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  -- Subscription / commercialization fields
  tier TEXT NOT NULL DEFAULT 'trial'
    CHECK (tier IN ('trial', 'basic', 'pro', 'enterprise')),
  trial_ends_at TIMESTAMPTZ,
  subscription_active BOOLEAN NOT NULL DEFAULT true,
  subscription_expires_at TIMESTAMPTZ,
  max_chickens INTEGER NOT NULL DEFAULT 50,
  max_users INTEGER NOT NULL DEFAULT 1,
  -- Owner reference (the chu_trai who created the farm)
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Display info
  display_name TEXT,
  phone TEXT,
  address TEXT,
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farms_owner_id ON public.farms(owner_id);
CREATE INDEX IF NOT EXISTS idx_farms_slug ON public.farms(slug);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_farms_updated_at ON public.farms;
CREATE TRIGGER tr_farms_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---- 2. SEED DEFAULT FARM (for existing data) --------------
-- Use a fixed UUID so it's reproducible across environments.
INSERT INTO public.farms (id, slug, name, tier, max_chickens, max_users, display_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ga-choi-viet-ninh-binh',
  'Gà Chọi Việt Ninh Bình',
  'enterprise',
  100000,
  100,
  'Gà Chọi Việt Ninh Bình'
)
ON CONFLICT (id) DO NOTHING;

-- ---- 3. ADD farm_id TO profiles ----------------------------
-- profiles.farm_id links each user to their tenant.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='farm_id'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Backfill: every existing profile → default farm
UPDATE public.profiles
SET farm_id = '00000000-0000-0000-0000-000000000001'
WHERE farm_id IS NULL;

-- Make NOT NULL
ALTER TABLE public.profiles ALTER COLUMN farm_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_farm_id ON public.profiles(farm_id);

-- Set default farm owner to first chu_trai of the default farm
UPDATE public.farms f
SET owner_id = (
  SELECT id FROM public.profiles
  WHERE farm_id = f.id AND role = 'chu_trai'
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE f.id = '00000000-0000-0000-0000-000000000001'
  AND f.owner_id IS NULL;

-- ---- 4. HELPER FUNCTION: current_farm_id() -----------------
-- Returns the caller's farm_id, used in RLS + triggers.
-- SECURITY DEFINER so it bypasses RLS on profiles itself.
CREATE OR REPLACE FUNCTION public.current_farm_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT farm_id FROM public.profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.current_farm_id() TO authenticated, anon;

-- ---- 5. ADD farm_id TO ALL PER-TENANT TABLES ---------------
-- Done in a DO block so we can loop and stay idempotent.
DO $$
DECLARE
  tbl TEXT;
  per_tenant_tables TEXT[] := ARRAY[
    'areas', 'cage_rows', 'cages',
    'breeds', 'qr_tags',
    'chickens', 'chicken_media',
    'breeding_litters', 'chick_groups',
    'vaccines', 'vaccinations',
    'medicines', 'medicine_transactions',
    'feeds', 'feed_transactions',
    'training_sessions',
    'suppliers', 'purchases', 'purchase_items',
    'customers', 'customer_reviews',
    'sales_orders', 'sales_items',
    'expense_categories', 'expenses',
    'staff_attendance', 'staff_assignments', 'payroll_payments',
    'activity_logs', 'alerts',
    'system_settings', 'backup_logs',
    'news_articles', 'farm_media',
    'ai_generations', 'push_subscriptions'
  ];
BEGIN
  FOREACH tbl IN ARRAY per_tenant_tables LOOP
    -- Skip if table doesn't exist (defensive)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name=tbl
    ) THEN
      RAISE NOTICE 'Skip missing table: %', tbl;
      CONTINUE;
    END IF;

    -- Add farm_id column if not exists (NULL allowed at this stage)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='farm_id'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE',
        tbl
      );
      RAISE NOTICE 'Added farm_id to %', tbl;
    END IF;

    -- Backfill: rows missing farm_id → default farm
    EXECUTE format(
      'UPDATE public.%I SET farm_id = $1 WHERE farm_id IS NULL',
      tbl
    ) USING '00000000-0000-0000-0000-000000000001'::UUID;

    -- Make NOT NULL
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN farm_id SET NOT NULL', tbl);

    -- Index
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(farm_id)',
      'idx_' || tbl || '_farm_id', tbl
    );
  END LOOP;
END $$;

-- ---- 6. customer_alerts (special) --------------------------
-- This table sometimes uses different name. Try both.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='customer_alerts'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='customer_alerts' AND column_name='farm_id'
  ) THEN
    ALTER TABLE public.customer_alerts
      ADD COLUMN farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE;
    UPDATE public.customer_alerts SET farm_id = '00000000-0000-0000-0000-000000000001' WHERE farm_id IS NULL;
    ALTER TABLE public.customer_alerts ALTER COLUMN farm_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_customer_alerts_farm_id ON public.customer_alerts(farm_id);
  END IF;
END $$;

-- ---- 7. UNIQUE CONSTRAINT FIXES ----------------------------
-- system_settings.key was UNIQUE globally; now must be UNIQUE per farm.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'system_settings_key_key' AND conrelid = 'public.system_settings'::regclass
  ) THEN
    ALTER TABLE public.system_settings DROP CONSTRAINT system_settings_key_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'system_settings_farm_key_uniq' AND conrelid = 'public.system_settings'::regclass
  ) THEN
    ALTER TABLE public.system_settings
      ADD CONSTRAINT system_settings_farm_key_uniq UNIQUE (farm_id, key);
  END IF;
END $$;

-- breeds.code was UNIQUE; now per-farm
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'breeds_code_key' AND conrelid = 'public.breeds'::regclass
  ) THEN
    ALTER TABLE public.breeds DROP CONSTRAINT breeds_code_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'breeds_farm_code_uniq' AND conrelid = 'public.breeds'::regclass
  ) THEN
    ALTER TABLE public.breeds
      ADD CONSTRAINT breeds_farm_code_uniq UNIQUE (farm_id, code);
  END IF;
END $$;

-- areas.code per farm
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'areas_code_key' AND conrelid = 'public.areas'::regclass
  ) THEN
    ALTER TABLE public.areas DROP CONSTRAINT areas_code_key;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'areas_farm_code_uniq' AND conrelid = 'public.areas'::regclass
  ) THEN
    ALTER TABLE public.areas ADD CONSTRAINT areas_farm_code_uniq UNIQUE (farm_id, code);
  END IF;
END $$;

-- chickens.chicken_code per farm
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chickens_chicken_code_key' AND conrelid = 'public.chickens'::regclass
  ) THEN
    ALTER TABLE public.chickens DROP CONSTRAINT chickens_chicken_code_key;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chickens_farm_code_uniq' AND conrelid = 'public.chickens'::regclass
  ) THEN
    ALTER TABLE public.chickens ADD CONSTRAINT chickens_farm_code_uniq UNIQUE (farm_id, chicken_code);
  END IF;
END $$;

-- qr_tags.tag_number per farm
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'qr_tags_tag_number_key' AND conrelid = 'public.qr_tags'::regclass
  ) THEN
    ALTER TABLE public.qr_tags DROP CONSTRAINT qr_tags_tag_number_key;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'qr_tags_farm_tag_uniq' AND conrelid = 'public.qr_tags'::regclass
  ) THEN
    ALTER TABLE public.qr_tags ADD CONSTRAINT qr_tags_farm_tag_uniq UNIQUE (farm_id, tag_number);
  END IF;
END $$;

-- breeding_litters.litter_code per farm
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'breeding_litters_litter_code_key' AND conrelid = 'public.breeding_litters'::regclass
  ) THEN
    ALTER TABLE public.breeding_litters DROP CONSTRAINT breeding_litters_litter_code_key;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'breeding_litters_farm_code_uniq' AND conrelid = 'public.breeding_litters'::regclass
  ) THEN
    ALTER TABLE public.breeding_litters ADD CONSTRAINT breeding_litters_farm_code_uniq UNIQUE (farm_id, litter_code);
  END IF;
END $$;

-- sales_orders.order_code per farm
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_orders_order_code_key' AND conrelid = 'public.sales_orders'::regclass
  ) THEN
    ALTER TABLE public.sales_orders DROP CONSTRAINT sales_orders_order_code_key;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_orders_farm_code_uniq' AND conrelid = 'public.sales_orders'::regclass
  ) THEN
    ALTER TABLE public.sales_orders ADD CONSTRAINT sales_orders_farm_code_uniq UNIQUE (farm_id, order_code);
  END IF;
END $$;

-- news_articles.slug per farm
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'news_articles_slug_key' AND conrelid = 'public.news_articles'::regclass
  ) THEN
    ALTER TABLE public.news_articles DROP CONSTRAINT news_articles_slug_key;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'news_articles_farm_slug_uniq' AND conrelid = 'public.news_articles'::regclass
  ) THEN
    ALTER TABLE public.news_articles ADD CONSTRAINT news_articles_farm_slug_uniq UNIQUE (farm_id, slug);
  END IF;
END $$;

COMMENT ON TABLE public.farms IS 'Multi-tenancy master: each farm = 1 SaaS tenant';
COMMENT ON FUNCTION public.current_farm_id() IS 'Returns farm_id of authenticated caller; used in RLS policies';
