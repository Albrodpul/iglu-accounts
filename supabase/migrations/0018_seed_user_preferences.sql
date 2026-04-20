INSERT INTO user_preferences (user_id, discrete_mode)
SELECT id, true
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
