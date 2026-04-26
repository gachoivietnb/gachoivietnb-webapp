# Multi-tenancy migration — How to apply

## What was added

3 migration files (idempotent — re-runnable safely):

| File | Purpose |
|---|---|
| `20260901000012_multitenancy_schema.sql` | Create `farms` table, add `farm_id` column to ~37 tables, backfill default farm, helper function `current_farm_id()`, fix UNIQUE constraints to be per-farm |
| `20260901000013_multitenancy_rls.sql` | RLS policies isolating data by `farm_id`; preserves anon read for public pages |
| `20260901000014_multitenancy_triggers.sql` | `BEFORE INSERT` trigger auto-fills `farm_id` from caller's profile (so existing API code keeps working without modification) |

Plus app code:

| File | Purpose |
|---|---|
| `src/lib/multitenancy/farm-context.ts` | `getFarmContext()`, `requireFarmId()`, `hasFeature()`, tier feature matrix |
| `src/app/api/auth/farm-signup/route.ts` | Atomic farm + profile creation for new tenant signup |

## Tables classified

**Per-tenant (37 tables, get `farm_id`)**:
areas, cage_rows, cages, breeds, qr_tags, chickens, chicken_media,
breeding_litters, chick_groups, vaccines, vaccinations, medicines,
medicine_transactions, feeds, feed_transactions, training_sessions,
suppliers, purchases, purchase_items, customers, customer_alerts,
customer_reviews, sales_orders, sales_items, expense_categories,
expenses, staff_attendance, staff_assignments, payroll_payments,
activity_logs, alerts, system_settings, backup_logs, news_articles,
farm_media, ai_generations, push_subscriptions

**Global (no `farm_id`)**:
- `diseases` — universal medical catalog
- `contact_inquiries` — public landing form goes to SaaS owner

**Special**:
- `profiles` — `farm_id` links user to their farm
- `farms` — master tenant table (new)

## How to apply

### Option A — Local Supabase (Docker)

If you have Supabase CLI installed:

```bash
cd WebApp
npx supabase db push
```

Or apply manually via Studio:

1. Open Supabase Studio → SQL Editor
2. Run files in order:
   - `20260901000012_multitenancy_schema.sql`
   - `20260901000013_multitenancy_rls.sql`
   - `20260901000014_multitenancy_triggers.sql`

### Option B — Supabase Cloud (production)

Same as Option A — use Supabase Studio SQL Editor in the cloud project.

⚠️ **Backup before running on production**: Settings → Database → Backups → Trigger backup. Migration is idempotent but DDL on a live DB is risky.

### Option C — Direct psql

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260901000012_multitenancy_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/20260901000013_multitenancy_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/20260901000014_multitenancy_triggers.sql
```

## Verify migration

After running, check:

```sql
-- 1) farms table exists with default row
SELECT id, slug, name, tier FROM farms;
-- Expect: 1 row 'ga-choi-viet-ninh-binh', tier='enterprise'

-- 2) profiles all have farm_id
SELECT COUNT(*) AS missing FROM profiles WHERE farm_id IS NULL;
-- Expect: 0

-- 3) chickens have farm_id
SELECT COUNT(*) AS total, COUNT(farm_id) AS with_farm FROM chickens;
-- Expect: total = with_farm

-- 4) Helper function returns farm_id
SELECT current_farm_id();
-- (run as authenticated user)

-- 5) RLS active
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE '%tenant%' ORDER BY tablename;
-- Expect: ~37 rows (one tenant_isolation policy per per-tenant table)
```

## How existing app code keeps working

The `BEFORE INSERT` trigger auto-fills `farm_id` from the caller's profile. So this old code continues to work:

```typescript
// Before migration: works because there's only 1 farm
await supabase.from('chickens').insert({ chicken_code: '0001', ... })

// After migration: STILL works — trigger sets farm_id = current_farm_id()
await supabase.from('chickens').insert({ chicken_code: '0001', ... })
```

RLS now enforces tenant isolation. User of farm A cannot see/modify rows of farm B even with crafted queries.

## When you need to set farm_id explicitly

Only when using `service_role` key (which bypasses RLS + bypasses the trigger isn't aware of which farm). In those cases:

```typescript
// Bad: trigger has no auth.uid() to lookup → INSERT fails NOT NULL
await admin.from('chickens').insert({ chicken_code: '0001' })

// Good: explicit
await admin.from('chickens').insert({ chicken_code: '0001', farm_id: ctx.farm.id })
```

The signup API (`/api/auth/farm-signup`) is one such case.

## Public pages (anon callers)

The `chickens_anon_read` and similar policies allow anon to read for the customer-facing pages. Currently they don't filter by farm_id — meaning any anon visitor sees all chickens of all farms. **This is OK for now** because in Vercel the deployment serves ONE farm per domain.

When you go true multi-tenant on subdomains (e.g. `farma.gachoivietnb.com`, `farmb.gachoivietnb.com`), update these policies to read the farm's slug from the request and filter — best done via middleware setting a context, or filter in Next.js page code by `farm_id`.

## Rolling back

If you need to revert, run:

```sql
-- Drop policies
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
           WHERE schemaname='public' AND policyname LIKE '%tenant%'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Drop triggers
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT event_object_table AS tbl, trigger_name FROM information_schema.triggers
           WHERE trigger_name LIKE '%set_farm_id%'
  LOOP
    EXECUTE format('DROP TRIGGER %I ON public.%I', r.trigger_name, r.tbl);
  END LOOP;
END $$;

-- Drop farm_id columns
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT table_name FROM information_schema.columns
           WHERE table_schema='public' AND column_name='farm_id'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN farm_id CASCADE', r.table_name);
  END LOOP;
END $$;

-- Drop helpers
DROP FUNCTION IF EXISTS public.current_farm_id();
DROP FUNCTION IF EXISTS public.set_farm_id_default();
DROP TABLE IF EXISTS public.farms;
```

## Next steps after this migration

1. **Build signup page** — call `/api/auth/farm-signup` from a client form
2. **Build pricing/subscription page** — let user upgrade tier
3. **Integrate payment gateway** (MoMo / VNPay / Stripe) — webhook updates `farms.tier` + `subscription_expires_at`
4. **Update feature gates** — wrap AI Marketing, Bí Kíp admin, etc. with `hasFeature(farm, 'aiMarketing')` checks
5. **Public domain routing** — if multi-domain, add middleware that resolves `host` → `farm_id` and filters anon reads
