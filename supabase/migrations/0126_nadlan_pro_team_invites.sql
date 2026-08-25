-- more30 · 36 nadlan-pro — team invites ("צוות" tab)
-- ============================================================================
-- BACKFILL NOTICE: this file, and the ones that follow it in the 012x/013x
-- range, were applied live via the Supabase MCP on 2026-08-20..25 without a
-- matching file ever being committed here — the repo's migration history had
-- drifted from the live database. Backfilled from the live schema so a fresh
-- environment built from this repo (or `supabase db reset`) reproduces what
-- is actually running. See CLAUDE.md's dated entries for the original
-- narrative/verification notes; this file captures the FINAL state only.
-- ============================================================================
--
-- office_members.user_id is a real FK to auth.users, so a manager could not
-- add a second agent who had never signed in yet — there was no way to grow
-- a one-person office into a team. Adds an invite-code flow: an owner/manager
-- creates a 14-day code (np_member_invite_create), a new agent redeems it
-- with ?join=CODE (np_member_invite_redeem, SECURITY DEFINER — the redeeming
-- user by definition has no office membership yet, so no RLS-visible row can
-- authorize the insert any other way), and np_member_role_set/np_member_remove
-- manage existing members. Both role-changing RPCs guard against stranding an
-- office without an active owner (nadlan_pro.would_strand_office, defined in
-- 0009) and against a non-owner minting a new owner.

create table if not exists nadlan_pro.office_invites (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid not null references nadlan_pro.offices(id) on delete cascade,
  code            text not null unique,
  role            nadlan_pro.member_role not null default 'agent',
  full_name       text,
  license_number  text,
  phone           text,
  email           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '14 days'),
  used_at         timestamptz,
  used_by         uuid references auth.users(id),
  revoked_at      timestamptz
);

create index if not exists idx_np_office_invites_office on nadlan_pro.office_invites(office_id);

alter table nadlan_pro.office_invites enable row level security;

do $$ begin
  create policy np_office_invites_manage on nadlan_pro.office_invites for all
    using (nadlan_pro.manages_office(office_id))
    with check (nadlan_pro.manages_office(office_id));
exception when duplicate_object then null; end $$;

revoke all on nadlan_pro.office_invites from anon;

create or replace function public.np_member_invite_create(
  p_office uuid, p_role text default 'agent', p_full_name text default null,
  p_license text default null, p_phone text default null, p_email text default null
) returns text language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_role nadlan_pro.member_role := coalesce(nullif(p_role,''),'agent')::nadlan_pro.member_role;
  v_code text;
  v_tries int := 0;
begin
  if not nadlan_pro.manages_office(p_office) then
    raise exception 'רק בעלים/מנהל יכולים להזמין חברי צוות';
  end if;

  if v_role = 'owner' and not (
    nadlan_pro.is_super_admin() or exists (
      select 1 from nadlan_pro.office_members m
      where m.office_id = p_office and m.user_id = auth.uid()
        and m.is_active and m.role = 'owner')
  ) then
    raise exception 'רק בעלים יכול להזמין בעלים נוסף';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into nadlan_pro.office_invites
        (office_id, code, role, full_name, license_number, phone, email, created_by)
      values
        (p_office, v_code, v_role, nullif(trim(coalesce(p_full_name,'')),''),
         nullif(trim(coalesce(p_license,'')),''), nullif(trim(coalesce(p_phone,'')),''),
         nullif(trim(coalesce(p_email,'')),''), auth.uid());
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries > 5 then raise; end if;
    end;
  end loop;

  return v_code;
end $$;

-- SECURITY DEFINER: the redeeming user has no office membership row yet by
-- definition, so no ordinary RLS-visible path can let them insert one — the
-- invite code itself (unused, unrevoked, unexpired) is the authorization.
create or replace function public.np_member_invite_redeem(p_code text)
returns jsonb language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_invite nadlan_pro.office_invites;
  v_office nadlan_pro.offices;
begin
  if auth.uid() is null then
    raise exception 'יש להתחבר כדי להצטרף למשרד' using errcode = '42501';
  end if;

  update nadlan_pro.office_invites
     set used_at = now(), used_by = auth.uid()
   where code = upper(trim(coalesce(p_code,'')))
     and used_at is null
     and revoked_at is null
     and expires_at > now()
  returning * into v_invite;

  if v_invite.id is null then
    raise exception 'קוד ההזמנה לא תקין, כבר נוצל, בוטל או פג תוקפו';
  end if;

  begin
    insert into nadlan_pro.office_members
      (office_id, user_id, role, full_name, license_number, phone, email)
    values
      (v_invite.office_id, auth.uid(), v_invite.role,
       coalesce(v_invite.full_name, auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email'),
       v_invite.license_number, v_invite.phone,
       coalesce(v_invite.email, auth.jwt() ->> 'email'));
  exception when unique_violation then
    raise exception 'כבר יש לך גישה למשרד הזה';
  end;

  select * into v_office from nadlan_pro.offices where id = v_invite.office_id;
  return jsonb_build_object('office_id', v_office.id, 'office_name', v_office.name, 'role', v_invite.role::text);
end $$;

revoke all on function public.np_member_invite_redeem(text) from anon;

create or replace function public.np_member_invite_revoke(p_id uuid)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  update nadlan_pro.office_invites set revoked_at = now()
   where id = p_id and used_at is null and revoked_at is null;
  if not found then
    raise exception 'ההזמנה לא נמצאה, כבר נוצלה, כבר בוטלה, או שאין לך הרשאה';
  end if;
end $$;

create or replace function public.np_member_invites_list(p_office uuid)
returns table(
  id uuid, code text, role text, full_name text, phone text, email text,
  created_at timestamptz, expires_at timestamptz, used_at timestamptz, revoked_at timestamptz
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select i.id, i.code, i.role::text, i.full_name, i.phone, i.email,
         i.created_at, i.expires_at, i.used_at, i.revoked_at
  from nadlan_pro.office_invites i
  where i.office_id = p_office
  order by i.created_at desc
  limit 100;
$$;

create or replace function public.np_office_members(p_office uuid)
returns table(
  user_id uuid, role text, full_name text, license_number text, phone text,
  email text, is_active boolean, created_at timestamptz
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select m.user_id, m.role::text, m.full_name, m.license_number,
         m.phone, m.email, m.is_active, m.created_at
  from nadlan_pro.office_members m
  where m.office_id = p_office
  order by (m.role = 'owner') desc, m.role, m.full_name;
$$;

-- Includes the "only an owner may grant owner" guard from day one (a same-day
-- live fix, nadlan_pro_role_set_owner_guard, closed a real privilege-
-- escalation gap where a manager could self-promote — see CLAUDE.md).
create or replace function public.np_member_role_set(p_office uuid, p_user_id uuid, p_role text)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_new nadlan_pro.member_role := p_role::nadlan_pro.member_role;
begin
  if not nadlan_pro.manages_office(p_office) then
    raise exception 'רק בעלים/מנהל יכולים לשנות תפקידים';
  end if;

  if v_new = 'owner' and not (
    nadlan_pro.is_super_admin() or exists (
      select 1 from nadlan_pro.office_members m
      where m.office_id = p_office and m.user_id = auth.uid()
        and m.is_active and m.role = 'owner')
  ) then
    raise exception 'רק בעלים יכול למנות בעלים נוסף';
  end if;

  if v_new <> 'owner' and nadlan_pro.would_strand_office(p_office, p_user_id) then
    raise exception 'לא ניתן להשאיר משרד בלי בעלים — מנה בעלים נוסף לפני שינוי תפקיד זה';
  end if;

  update nadlan_pro.office_members set role = v_new
   where office_id = p_office and user_id = p_user_id;
  if not found then
    raise exception 'חבר הצוות לא נמצא';
  end if;
end $$;

create or replace function public.np_member_remove(p_office uuid, p_user_id uuid)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  if not nadlan_pro.manages_office(p_office) then
    raise exception 'רק בעלים/מנהל יכולים להסיר חברי צוות';
  end if;
  if nadlan_pro.would_strand_office(p_office, p_user_id) then
    raise exception 'לא ניתן להסיר את הבעלים היחיד של המשרד';
  end if;

  update nadlan_pro.office_members set is_active = false
   where office_id = p_office and user_id = p_user_id;
  if not found then
    raise exception 'חבר הצוות לא נמצא';
  end if;
end $$;
