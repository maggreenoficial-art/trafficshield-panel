-- Hardening: impede que o usuário eleve o próprio role via PostgREST/RLS
-- Rode no SQL Editor do Supabase

-- Só permite update se o role permanecer igual ao valor atual
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- Impede INSERT direto de perfil pelo client (só o trigger handle_new_user / service role)
drop policy if exists "profiles_insert_own" on public.profiles;

comment on policy "profiles_update_own" on public.profiles is
  'Usuário pode atualizar o próprio perfil, mas não pode alterar role.';
