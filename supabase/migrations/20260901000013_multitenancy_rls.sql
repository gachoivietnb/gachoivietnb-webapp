-- ============================================================
-- MULTI-TENANCY: ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Strategy: every per-tenant table gets a single permissive policy
-- using current_farm_id() helper. service_role always bypasses RLS.
--
-- Existing role-based policies (e.g. chu_trai-only) are PRESERVED
-- where they make sense. We just LAYER farm_id filtering on top
-- by creating a tenant-isolation policy applied to ALL.
--
-- profiles: special — user can read profiles in own farm; only
-- chu_trai of own farm can update.
-- ============================================================

-- ---- 1. PROFILES -------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_tenant_select ON public.profiles;
CREATE POLICY profiles_tenant_select ON public.profiles
  FOR SELECT
  USING (
    -- Allow user to see own profile (bootstrap before farm_id is loaded)
    id = auth.uid()
    OR farm_id = public.current_farm_id()
  );

DROP POLICY IF EXISTS profiles_tenant_update ON public.profiles;
CREATE POLICY profiles_tenant_update ON public.profiles
  FOR UPDATE
  USING (
    id = auth.uid()
    OR (
      farm_id = public.current_farm_id()
      AND EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid() AND me.role = 'chu_trai'
      )
    )
  )
  WITH CHECK (farm_id = public.current_farm_id());

DROP POLICY IF EXISTS profiles_tenant_insert ON public.profiles;
CREATE POLICY profiles_tenant_insert ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- Allow self-insert during signup; farm_id may be set after farm creation
    id = auth.uid()
  );

-- ---- 2. FARMS ----------------------------------------------
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS farms_tenant_select ON public.farms;
CREATE POLICY farms_tenant_select ON public.farms
  FOR SELECT
  USING (id = public.current_farm_id());

DROP POLICY IF EXISTS farms_owner_update ON public.farms;
CREATE POLICY farms_owner_update ON public.farms
  FOR UPDATE
  USING (
    id = public.current_farm_id()
    AND owner_id = auth.uid()
  )
  WITH CHECK (id = public.current_farm_id());

-- INSERT to farms is admin-only via service_role (signup flow uses
-- service_role to create farm + link profile atomically).

-- ---- 3. PER-TENANT TABLES (loop) ---------------------------
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
    'ai_generations', 'push_subscriptions',
    'customer_alerts'
  ];
  policy_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY per_tenant_tables LOOP
    -- Skip if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name=tbl
    ) THEN
      RAISE NOTICE 'Skip missing table for RLS: %', tbl;
      CONTINUE;
    END IF;

    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- Drop our policy if exists, recreate
    policy_name := tbl || '_tenant_isolation';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (farm_id = public.current_farm_id()) WITH CHECK (farm_id = public.current_farm_id())',
      policy_name, tbl
    );
  END LOOP;
END $$;

-- ---- 4. PUBLIC READ EXCEPTIONS ----------------------------
-- Some tables need PUBLIC (anon) read for the customer-facing pages
-- (e.g. /ban listing, /giong listing, /thu-vien gallery, /tin-tuc).
-- We add SELECT-for-anon policies in addition to tenant isolation.
-- For these, the public read shows ONE specific farm's data — the
-- farm whose Vercel deployment this is. Tenant isolation still
-- applies on writes.

-- chickens publicly visible if status='dang_nuoi' AND for_sale=true
-- (Behavior preserved; data filtered by farm_id implicitly via the
-- single-domain → single-farm mapping that anon callers see.)
-- Policies for anon defined in original phase6_public; they need
-- to be updated to include the farm_id of the public-facing farm.
-- This is left for future when multi-farm public is needed.

-- For now, anon reads chickens regardless of farm_id (current behavior),
-- but we add a permissive policy + caller (server) is expected to filter
-- by farm_id of the current farm domain.
DROP POLICY IF EXISTS chickens_anon_read ON public.chickens;
CREATE POLICY chickens_anon_read ON public.chickens
  FOR SELECT
  TO anon
  USING (status IN ('dang_nuoi', 'da_ban'));

DROP POLICY IF EXISTS breeds_anon_read ON public.breeds;
CREATE POLICY breeds_anon_read ON public.breeds
  FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS news_articles_anon_read ON public.news_articles;
CREATE POLICY news_articles_anon_read ON public.news_articles
  FOR SELECT
  TO anon
  USING (status = 'published');

-- farm_media table không có cột is_visible — cho phép anon đọc tất cả
-- (bảng phục vụ trang public, server-side đã filter theo farm_id khi cần)
DROP POLICY IF EXISTS farm_media_anon_read ON public.farm_media;
CREATE POLICY farm_media_anon_read ON public.farm_media
  FOR SELECT
  TO anon
  USING (true);

-- chicken_media dùng cột render_status (từ migration 5_media_approval), không phải status
DROP POLICY IF EXISTS chicken_media_anon_read ON public.chicken_media;
CREATE POLICY chicken_media_anon_read ON public.chicken_media
  FOR SELECT
  TO anon
  USING (render_status = 'published');

DROP POLICY IF EXISTS qr_tags_anon_read ON public.qr_tags;
CREATE POLICY qr_tags_anon_read ON public.qr_tags
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS customer_reviews_anon_read ON public.customer_reviews;
CREATE POLICY customer_reviews_anon_read ON public.customer_reviews
  FOR SELECT
  TO anon
  USING (true);

-- contact_inquiries: anon can INSERT (public form), no SELECT
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contact_inquiries_anon_insert ON public.contact_inquiries;
CREATE POLICY contact_inquiries_anon_insert ON public.contact_inquiries
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ---- 5. GLOBAL TABLES (no farm_id) -------------------------
-- diseases: read-only catalog visible to all authenticated users
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS diseases_authenticated_read ON public.diseases;
CREATE POLICY diseases_authenticated_read ON public.diseases
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY profiles_tenant_select ON public.profiles IS
  'User sees own row + everyone in same farm';
