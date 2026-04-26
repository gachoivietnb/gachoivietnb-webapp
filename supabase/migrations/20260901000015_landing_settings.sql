-- ============================================================
-- LANDING SETTINGS — editable content for /phan-mem sales page
-- ============================================================
-- Stores 3 editable sections (pricing, testimonials, faqs) as
-- JSONB rows. Public page reads from this table + falls back to
-- hardcoded defaults if a row is missing. Only super-admin writes.
--
-- This is GLOBAL (no farm_id) — 1 landing page for the whole SaaS.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.landing_settings (
  key TEXT PRIMARY KEY
    CHECK (key IN ('pricing', 'testimonials', 'faqs', 'stats', 'hero')),
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS tr_landing_settings_updated_at ON public.landing_settings;
CREATE TRIGGER tr_landing_settings_updated_at
  BEFORE UPDATE ON public.landing_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.landing_settings ENABLE ROW LEVEL SECURITY;

-- Anon + authenticated can READ (used by /phan-mem public page)
DROP POLICY IF EXISTS landing_settings_public_read ON public.landing_settings;
CREATE POLICY landing_settings_public_read ON public.landing_settings
  FOR SELECT
  USING (true);

-- Only service_role writes (super-admin uses service_role via API).
-- We don't expose a tenant policy because this is GLOBAL content.

COMMENT ON TABLE public.landing_settings IS
  'Editable content blocks for /phan-mem landing page. Super-admin only writes.';
