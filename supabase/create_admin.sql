INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@gachoivietnb.com',
  crypt('ChuTrai2026!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Chủ trại"}'::jsonb,
  NOW(), NOW(), '', '', '', ''
);

UPDATE profiles
SET role = 'chu_trai', full_name = 'Chủ trại', is_active = TRUE, onboarding_completed = FALSE
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@gachoivietnb.com');

SELECT u.email, p.full_name, p.role, p.is_active
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email = 'admin@gachoivietnb.com';
