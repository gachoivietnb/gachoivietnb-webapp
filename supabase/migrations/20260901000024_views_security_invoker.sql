-- ============================================================
-- VIEWS — enable security_invoker so they respect RLS on underlying tables
-- ============================================================
-- Postgres views default to security_definer behavior — they run with the
-- VIEW OWNER's privileges, which means they bypass row-level security on
-- the underlying tables. This caused tenant data leaks between farms
-- (e.g. /admin/quy showed accounts from every farm to a super admin).
--
-- security_invoker (Postgres 15+) makes the view evaluate RLS using the
-- CALLING user instead — so a chu_trai sees only their own farm.
--
-- Public-facing views (public_chickens, public_farm_stats, etc.) are
-- intentionally NOT included — those are meant to be readable by anon
-- visitors and rely on the default security_definer behavior.
-- ============================================================

ALTER VIEW IF EXISTS public.cash_account_balances SET (security_invoker = true);
ALTER VIEW IF EXISTS public.activity_logs_detailed SET (security_invoker = true);
ALTER VIEW IF EXISTS public.area_survival_stats SET (security_invoker = true);
ALTER VIEW IF EXISTS public.assets_with_value SET (security_invoker = true);
ALTER VIEW IF EXISTS public.available_females SET (security_invoker = true);
ALTER VIEW IF EXISTS public.available_males SET (security_invoker = true);
ALTER VIEW IF EXISTS public.breed_performance SET (security_invoker = true);
ALTER VIEW IF EXISTS public.breeding_female_stats SET (security_invoker = true);
ALTER VIEW IF EXISTS public.breeding_male_stats SET (security_invoker = true);
ALTER VIEW IF EXISTS public.chicken_cost_basis SET (security_invoker = true);
ALTER VIEW IF EXISTS public.chicken_training_stats SET (security_invoker = true);
ALTER VIEW IF EXISTS public.chickens_media_summary SET (security_invoker = true);
ALTER VIEW IF EXISTS public.chickens_with_details SET (security_invoker = true);
ALTER VIEW IF EXISTS public.customer_receivables SET (security_invoker = true);
ALTER VIEW IF EXISTS public.diary_entries_with_counts SET (security_invoker = true);
ALTER VIEW IF EXISTS public.sales_performance SET (security_invoker = true);
ALTER VIEW IF EXISTS public.top_training_performers SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vaccinations_due SET (security_invoker = true);
