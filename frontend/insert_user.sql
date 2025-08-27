INSERT INTO public.users (id, email, full_name, created_at)
SELECT au.id, au.email, au.raw_user_meta_data->>'full_name', au.created_at
FROM auth.users au
WHERE au.id = 'faeb66c5-f071-4f9b-abb2-dac8595f0c59'
ON CONFLICT (id) DO NOTHING;
