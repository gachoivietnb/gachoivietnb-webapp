-- ============================================================
-- Demo Master Farm + Access Grants
-- Super admin owns master demo farm; farms get cloned/seeded copies via grants.
-- Farms can wipe their own copy without affecting the master.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Ensure master farm exists (id = 00000000-0000-0000-0000-000000000001)
-- ------------------------------------------------------------
INSERT INTO farms (id, slug, name, display_name, tier, subscription_active, max_chickens, max_users, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'master-demo',
  'Trại mẫu (master demo)',
  'Trại mẫu hệ thống',
  'enterprise',
  TRUE,
  99999,
  99999,
  now()
)
ON CONFLICT (id) DO UPDATE
  SET slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      display_name = EXCLUDED.display_name,
      tier = EXCLUDED.tier,
      subscription_active = EXCLUDED.subscription_active,
      max_chickens = EXCLUDED.max_chickens,
      max_users = EXCLUDED.max_users;

-- ------------------------------------------------------------
-- 2. Trigger: block DELETE on master farm row
--    (wipe of child rows still allowed — only the farm row itself is protected)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_master_farm_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.id = '00000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'Không được xoá master demo farm — đây là kho dữ liệu demo gốc của hệ thống.'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_master_farm_delete ON farms;
CREATE TRIGGER trg_prevent_master_farm_delete
  BEFORE DELETE ON farms
  FOR EACH ROW EXECUTE FUNCTION prevent_master_farm_delete();

-- ------------------------------------------------------------
-- 3. demo_access_grants — track which farms have demo access
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demo_access_grants (
  farm_id UUID PRIMARY KEY REFERENCES farms(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reseeded_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_grants_active
  ON demo_access_grants(is_active) WHERE is_active = TRUE;

-- Block direct access from authenticated users — service role only
ALTER TABLE demo_access_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "demo_grants_no_auth" ON demo_access_grants;
CREATE POLICY "demo_grants_no_auth" ON demo_access_grants
  FOR ALL TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

-- ------------------------------------------------------------
-- 4. updated_at trigger for demo_access_grants
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION demo_grants_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_demo_grants_updated_at ON demo_access_grants;
CREATE TRIGGER trg_demo_grants_updated_at
  BEFORE UPDATE ON demo_access_grants
  FOR EACH ROW EXECUTE FUNCTION demo_grants_set_updated_at();

COMMIT;
