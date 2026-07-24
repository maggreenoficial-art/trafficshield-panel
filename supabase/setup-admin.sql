-- Diagnóstico e correção do usuário admin
-- Rode no SQL Editor do Supabase (projeto ligado à Vercel)

-- 1) Ver se o perfil está ligado a um usuário de autenticação
select
  p.id as profile_id,
  p.email as profile_email,
  p.role,
  u.id as auth_user_id,
  u.email as auth_email,
  u.email_confirmed_at,
  u.last_sign_in_at
from public.profiles p
left join auth.users u on u.id = p.id
where p.email = 'maggreenoficial@gmail.com';

-- Se auth_user_id vier NULL: o admin existe só em profiles.
-- Crie o usuário em Authentication → Users → Add user
-- (marque "Auto Confirm User") e depois rode o UPDATE abaixo.

-- 2) Promover para admin (depois que o usuário existir em Authentication)
update public.profiles
set role = 'admin'
where email = 'maggreenoficial@gmail.com';
