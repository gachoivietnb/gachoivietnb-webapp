CREATE OR REPLACE FUNCTION public.warn_cage_overflow()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_capacity INT; v_current INT; v_cage_code TEXT;
BEGIN
  IF NEW.cage_id IS NULL OR NEW.status NOT IN ('dang_nuoi', 'dang_cach_ly') THEN RETURN NEW; END IF;
  SELECT capacity, full_code INTO v_capacity, v_cage_code FROM cages WHERE id = NEW.cage_id;
  SELECT COUNT(*) INTO v_current FROM chickens WHERE cage_id = NEW.cage_id AND status IN ('dang_nuoi', 'dang_cach_ly');
  IF v_current > v_capacity THEN
    INSERT INTO alerts (farm_id, alert_type, priority, title, message, related_entity_type, related_entity_id)
    VALUES (NEW.farm_id, 'cage_overflow', 'trung_binh',
      'Lồng ' || COALESCE(v_cage_code, 'unknown') || ' quá tải',
      'Lồng có ' || v_current || ' con (sức chứa ' || v_capacity || ').',
      'cage', NEW.cage_id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.check_medicine_stock_alert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_stock <= NEW.min_stock_alert AND NEW.current_stock > 0
     AND (OLD.current_stock IS NULL OR OLD.current_stock > NEW.min_stock_alert) THEN
    INSERT INTO alerts (farm_id, alert_type, priority, title, message, related_entity_type, related_entity_id)
    VALUES (NEW.farm_id, 'kho_thuoc_thap', 'cao',
      'Tồn kho thuốc thấp: ' || NEW.name_vi,
      'Còn ' || NEW.current_stock || ' ' || NEW.unit || ' (tối thiểu ' || NEW.min_stock_alert || ').',
      'medicine', NEW.id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.check_feed_stock_alert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_stock <= NEW.min_stock_alert AND NEW.current_stock > 0
     AND (OLD.current_stock IS NULL OR OLD.current_stock > NEW.min_stock_alert) THEN
    INSERT INTO alerts (farm_id, alert_type, priority, title, message, related_entity_type, related_entity_id)
    VALUES (NEW.farm_id, 'kho_thuc_an_thap', 'cao',
      'Tồn kho thức ăn thấp: ' || NEW.name_vi,
      'Còn ' || NEW.current_stock || ' ' || NEW.unit || ' (tối thiểu ' || NEW.min_stock_alert || ').',
      'feed', NEW.id);
  END IF;
  RETURN NEW;
END $$;
