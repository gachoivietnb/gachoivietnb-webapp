-- ============================================================
-- Update handle_new_user() trigger to set farm_id default
-- ============================================================
-- After multi-tenancy migration, profiles.farm_id is NOT NULL.
-- The legacy trigger `handle_new_user` (created in
-- 20260101000002_functions_triggers.sql) inserts profile WITHOUT
-- farm_id → fails after multi-tenancy is applied.
--
-- Fix: default farm_id to the default farm when farm_id metadata
-- is not provided. SaaS signup API can override afterwards.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_farm_id UUID;
BEGIN
  -- Allow caller to set farm_id via raw_user_meta_data (used by SaaS signup)
  v_farm_id := COALESCE(
    (NEW.raw_user_meta_data->>'farm_id')::UUID,
    '00000000-0000-0000-0000-000000000001'::UUID
  );

  INSERT INTO public.profiles (id, full_name, role, farm_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'nhan_vien',
    v_farm_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
