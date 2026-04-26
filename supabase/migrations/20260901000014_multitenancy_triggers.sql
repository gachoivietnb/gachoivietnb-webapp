-- ============================================================
-- MULTI-TENANCY: AUTO-FILL farm_id ON INSERT
-- ============================================================
-- Existing API code does `supabase.from('chickens').insert({...})`
-- without farm_id. Without this trigger, all those calls fail RLS
-- WITH CHECK clause. The trigger auto-populates farm_id from the
-- caller's profile, so no application-code change is needed for
-- basic CRUD. Service-role inserts (admin tasks) can specify
-- farm_id explicitly, and the trigger leaves it alone.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_farm_id_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_farm UUID;
BEGIN
  IF NEW.farm_id IS NULL THEN
    -- For authenticated calls, fetch caller's farm_id
    caller_farm := public.current_farm_id();
    IF caller_farm IS NOT NULL THEN
      NEW.farm_id := caller_farm;
    END IF;
    -- If still NULL (service-role insert without explicit farm_id):
    -- the row will fail NOT NULL — the caller must set it.
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_farm_id_default() TO authenticated, anon, service_role;

-- Apply trigger to all per-tenant tables
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
  trig_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY per_tenant_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name=tbl
    ) THEN
      CONTINUE;
    END IF;

    trig_name := 'tr_' || tbl || '_set_farm_id';
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trig_name, tbl);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_farm_id_default()',
      trig_name, tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- SIGNUP HOOK: when a new user is created in auth.users, create
-- their profile record. Farm + farm_id assignment happens via
-- application code (signup flow), not here, because the user
-- needs to provide farm name etc.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert if there's no profile yet (idempotent)
  INSERT INTO public.profiles (id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'nhan_vien', -- default role; signup flow upgrades to chu_trai when creating own farm
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Note: we don't auto-create a profile here because farm_id is NOT NULL.
-- The signup API endpoint (/api/auth/signup) handles atomic farm + profile creation.
-- This function is left as a reference but NOT auto-attached as trigger.

COMMENT ON FUNCTION public.set_farm_id_default() IS
  'BEFORE INSERT trigger: auto-fill farm_id from caller profile if not provided';
