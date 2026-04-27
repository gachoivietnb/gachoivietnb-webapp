-- Fix farm_combat_kpis — wrap subquery để LIMIT trước jsonb_agg
CREATE OR REPLACE FUNCTION public.farm_combat_kpis()
RETURNS JSONB AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'matches_total',
      (SELECT COUNT(*) FROM public.matches WHERE farm_id = public.current_farm_id()),
    'wins',
      (SELECT COUNT(*) FROM public.matches WHERE farm_id = public.current_farm_id() AND result = 'thang'),
    'losses',
      (SELECT COUNT(*) FROM public.matches WHERE farm_id = public.current_farm_id() AND result = 'thua'),
    'draws',
      (SELECT COUNT(*) FROM public.matches WHERE farm_id = public.current_farm_id() AND result = 'hoa'),
    'prize_ytd',
      (SELECT COALESCE(SUM(prize_money), 0) FROM public.matches
        WHERE farm_id = public.current_farm_id()
          AND match_date >= date_trunc('year', CURRENT_DATE)),
    'on_fire_chickens',
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'chicken_id', sub.chicken_id,
          'name', sub.name,
          'chicken_code', sub.chicken_code,
          'streak', sub.current_win_streak,
          'stars', sub.stars
        ))
        FROM (
          SELECT chicken_id, name, chicken_code, current_win_streak, stars
          FROM public.chicken_combat_stats
          WHERE farm_id = public.current_farm_id()
            AND current_win_streak >= 3
          ORDER BY current_win_streak DESC, stars DESC
          LIMIT 5
        ) sub
      ), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.farm_combat_kpis() TO authenticated;
