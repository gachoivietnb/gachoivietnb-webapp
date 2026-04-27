-- Fix generate_stock_alerts: column 'entity_type' không tồn tại — actual là 'related_entity_type'

CREATE OR REPLACE FUNCTION public.generate_stock_alerts()
RETURNS TABLE (created_count INT) AS $$
DECLARE
  v_count INT := 0;
  v_med RECORD;
  v_feed RECORD;
BEGIN
  FOR v_med IN
    SELECT id, farm_id, name_vi, code, current_stock, min_stock_alert, unit
      FROM public.medicines
     WHERE is_active = TRUE
       AND current_stock <= min_stock_alert
       AND min_stock_alert > 0
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.alerts
       WHERE related_entity_type = 'medicine'
         AND related_entity_id = v_med.id
         AND status IN ('chua_doc','da_doc')
    ) THEN
      INSERT INTO public.alerts (
        farm_id, title, message, priority, alert_type,
        related_entity_type, related_entity_id, status
      ) VALUES (
        v_med.farm_id,
        '📦 Kho thuốc sắp hết: ' || v_med.name_vi,
        'Thuốc ' || v_med.name_vi || ' (' || v_med.code || ') chỉ còn ' ||
          v_med.current_stock || ' ' || v_med.unit || ' (≤ ngưỡng ' ||
          v_med.min_stock_alert || ')',
        CASE
          WHEN v_med.current_stock = 0 THEN 'khan_cap'::alert_priority
          WHEN v_med.current_stock <= v_med.min_stock_alert / 2 THEN 'cao'::alert_priority
          ELSE 'trung_binh'::alert_priority
        END,
        'low_stock_medicine',
        'medicine', v_med.id,
        'chua_doc'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  FOR v_feed IN
    SELECT id, farm_id, name_vi, code, current_stock, min_stock_alert, unit
      FROM public.feeds
     WHERE is_active = TRUE
       AND current_stock <= min_stock_alert
       AND min_stock_alert > 0
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.alerts
       WHERE related_entity_type = 'feed'
         AND related_entity_id = v_feed.id
         AND status IN ('chua_doc','da_doc')
    ) THEN
      INSERT INTO public.alerts (
        farm_id, title, message, priority, alert_type,
        related_entity_type, related_entity_id, status
      ) VALUES (
        v_feed.farm_id,
        '🌾 Kho cám sắp hết: ' || v_feed.name_vi,
        'Cám ' || v_feed.name_vi || ' (' || v_feed.code || ') chỉ còn ' ||
          v_feed.current_stock || ' ' || v_feed.unit || ' (≤ ngưỡng ' ||
          v_feed.min_stock_alert || ')',
        CASE
          WHEN v_feed.current_stock = 0 THEN 'khan_cap'::alert_priority
          WHEN v_feed.current_stock <= v_feed.min_stock_alert / 2 THEN 'cao'::alert_priority
          ELSE 'trung_binh'::alert_priority
        END,
        'low_stock_feed',
        'feed', v_feed.id,
        'chua_doc'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.resolve_stock_alerts()
RETURNS TABLE (resolved_count INT) AS $$
DECLARE v_count INT := 0;
BEGIN
  UPDATE public.alerts a
     SET status = 'da_xu_ly', resolved_at = NOW()
    FROM public.medicines m
   WHERE a.related_entity_type = 'medicine'
     AND a.related_entity_id = m.id
     AND a.status IN ('chua_doc','da_doc')
     AND m.current_stock > m.min_stock_alert;

  UPDATE public.alerts a
     SET status = 'da_xu_ly', resolved_at = NOW()
    FROM public.feeds f
   WHERE a.related_entity_type = 'feed'
     AND a.related_entity_id = f.id
     AND a.status IN ('chua_doc','da_doc')
     AND f.current_stock > f.min_stock_alert;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.generate_stock_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_stock_alerts() TO authenticated;
