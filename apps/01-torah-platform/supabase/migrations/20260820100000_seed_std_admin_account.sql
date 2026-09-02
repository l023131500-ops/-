-- LOGINS.md §1ב documents a fixed admin/STD_ADMIN_PASSWORD login for every panel
-- with its own username/password ("own" in core.projects.admin_auth — true here,
-- see apps/01-torah-platform/src/pages/legacy/AdminLogin.tsx +
-- src/pages/auth/SignIn.tsx). Checked before writing this: the only account
-- holding super_admin on this project (bieebmnmkffwbqlsfozh) was the Google
-- account l023131500@gmail.com — no admin/STD_ADMIN_PASSWORD account existed at
-- all (verified: `select * from auth.users where email ilike '%admin%'` returned
-- zero rows). The documented fixed credentials could not actually be used to
-- sign in to this app, only Google could.
--
-- Fix: provision the standard admin account the same way Supabase Auth itself
-- would (auth.users + auth.identities, mirroring the shape of the existing
-- test@more30.com row created via the real signup API — same columns, same
-- provider='email' identity), then grant it super_admin via the existing
-- is_super_admin()/user_roles mechanism (public/0001_...security_hardening.sql).
-- Additive only: one new row in auth.users, one in auth.identities, one in
-- public.user_roles. Nothing existing is altered. Password hash uses the same
-- pgcrypto bf scheme GoTrue itself uses (extensions.crypt/gen_salt, already
-- installed on this project).

do $$
declare
  v_id uuid;
  v_email text := 'admin@admin.local';
  v_password text := 'More30Admin2026'; -- core.secrets.STD_ADMIN_PASSWORD, not secret in this repo's own convention (documented in LOGINS.md)
begin
  select id into v_id from auth.users where email = v_email;

  if v_id is null then
    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change, email_change_token_new,
      raw_app_meta_data, raw_user_meta_data,
      is_sso_user, is_anonymous, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(), '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'full_name', 'מנהל-על', 'email_verified', true),
      false, false, now(), now()
    );

    -- auth.identities.email is a generated column (derived from identity_data) — do not insert it.
    insert into auth.identities (
      id, provider_id, user_id, provider, identity_data, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id::text, v_id, 'email',
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      now(), now()
    );
  end if;

  if not exists (
    select 1 from public.user_roles where user_id = v_id and role = 'super_admin' and tenant_id is null
  ) then
    insert into public.user_roles (user_id, role, tenant_id) values (v_id, 'super_admin', null);
  end if;
end $$;
