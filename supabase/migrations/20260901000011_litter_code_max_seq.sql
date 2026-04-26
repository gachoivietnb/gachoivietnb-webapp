-- Fix: generate_litter_code used COUNT(*)+1, which collides after a litter is deleted
-- (count drops below max existing seq → next insert reuses an existing code).
-- Switch to MAX(seq)+1 by parsing the trailing digits out of litter_code.

CREATE OR REPLACE FUNCTION generate_litter_code()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  IF NEW.litter_code IS NOT NULL AND NEW.litter_code != '' THEN
    RETURN NEW;
  END IF;

  v_year := TO_CHAR(COALESCE(NEW.paired_date, CURRENT_DATE), 'YYYY');

  SELECT COALESCE(
    MAX(NULLIF(REGEXP_REPLACE(litter_code, '^L-' || v_year || '-', ''), '')::INT),
    0
  ) + 1
  INTO v_seq
  FROM breeding_litters
  WHERE litter_code LIKE 'L-' || v_year || '-%';

  NEW.litter_code := 'L-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists from phase3 migration, just refresh definition
DROP TRIGGER IF EXISTS trigger_generate_litter_code ON breeding_litters;
CREATE TRIGGER trigger_generate_litter_code
  BEFORE INSERT ON breeding_litters
  FOR EACH ROW EXECUTE FUNCTION generate_litter_code();
