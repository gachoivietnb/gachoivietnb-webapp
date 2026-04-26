DO $$
DECLARE
  r RECORD;
  existing INT;
  add_count INT;
  wk INT;
BEGIN
  FOR r IN
    SELECT c.id, c.name FROM chickens c
    WHERE c.status = 'dang_nuoi' AND c.gender = 'trong'
    ORDER BY c.created_at
    LIMIT 20
  LOOP
    SELECT COUNT(*) INTO existing FROM training_sessions WHERE chicken_id = r.id;
    add_count := GREATEST(0, 5 - existing);
    FOR wk IN 1..add_count LOOP
      INSERT INTO training_sessions (
        chicken_id, session_number, session_date, opponent_name, result,
        score_strength, score_appearance, score_aggression, duration_minutes, notes
      ) VALUES (
        r.id,
        existing + wk,
        (CURRENT_DATE - ((wk * 7 + existing * 7) || ' days')::INTERVAL)::DATE,
        (ARRAY['Gà cùng khu','Gà bạn trại','Đối thủ khách','Gà tơ cùng lứa','Gà tuyển'])[1 + (wk % 5)],
        CASE WHEN wk % 4 = 0 THEN 'thua' ELSE 'thang' END,
        7.5 + (wk % 3) * 0.5,
        8.0 + (wk % 3) * 0.4,
        7.0 + (wk % 4) * 0.6,
        20 + (wk % 3) * 10,
        (ARRAY[
          'Phong độ tốt, đòn dứt khoát',
          'Chân chắc, đá đối thủ lui',
          'Thể lực còn yếu, cần dưỡng thêm 2 tuần',
          'Bộ đòn đa dạng, lỳ đòn',
          'Thắng TKO, áp đảo toàn trận'
        ])[1 + (wk % 5)]
      );
    END LOOP;
  END LOOP;
END $$;

SELECT
  (SELECT COUNT(*) FROM training_sessions) AS total_sessions,
  (SELECT COUNT(DISTINCT chicken_id) FROM training_sessions) AS chickens_with_training,
  (SELECT COUNT(*) FROM (SELECT chicken_id FROM training_sessions GROUP BY chicken_id HAVING COUNT(*) >= 3) x) AS chickens_ge_3_sessions;
