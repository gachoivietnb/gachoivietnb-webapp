-- =====================================================
-- AUDIT ROUND 2 FIXES — phần 1: enum extension
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'huy_bo' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'vaccination_status')
  ) THEN
    ALTER TYPE vaccination_status ADD VALUE 'huy_bo';
  END IF;
END $$;
