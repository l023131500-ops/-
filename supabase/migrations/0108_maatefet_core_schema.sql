-- more30 · 39-maatefet — real stage-0 build: schema + invite-only core + RLS
-- ============================================================================
-- MAATEFET_BUILD.md stage 0: "תשתית + ליבה במגזר הכלות בלבד (CRM + ספריית
-- תוכן + פאנל סופר-אדמין + אבטחה)". This migration is that infrastructure.
-- No UI yet — /maatefet still renders "בקרוב" (0107 already registered the
-- system honestly as not-yet-built; this migration does not change that).
--
-- Foundational decisions from MAATEFET_BUILD.md, applied literally:
-- - one core, two faces: every row carries `segment` ('chatan'|'kallah'),
--   not two parallel schemas.
-- - invite-only at every layer: an instructor account starts 'pending' and
--   only a super-admin can move it to 'verified' (no self-service signup
--   grants access); a client/couple only gets a row via a real invite code
--   issued by a verified instructor.
-- - global super-admin gate: reuses public.more30_is_super_admin(), the
--   same function every other more30 admin surface already uses — no new
--   admin table.
-- - additive only: new schema `maatefet`, nothing touched in core/public/
--   nadlan/zr_*/any other app's schema.
--
-- Deliberately NOT built here (next rounds, tracked in MAATEFET_BUILD.md):
-- 2FA enforcement (Supabase Auth MFA is enrolled/checked at the app layer,
-- once there is an app) and field-level encryption for sensitive notes
-- (needs a key-management + encrypt/decrypt RPC, app-layer work, not a bare
-- column). Both are noted, not invented.

create schema if not exists maatefet;
grant usage on schema maatefet to authenticated, anon, service_role;

do $$ begin
  create type maatefet.segment as enum ('chatan', 'kallah');
exception when duplicate_object then null; end $$;

do $$ begin
  create type maatefet.instructor_status as enum ('pending', 'verified', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type maatefet.invite_status as enum ('pending', 'used', 'revoked', 'expired');
exception when duplicate_object then null; end $$;

-- this hub project has no public.set_updated_at() (that helper only exists
-- on 30-zchuyotpro-crm's own separate Supabase project) — define our own,
-- scoped to this schema.
create or replace function maatefet.set_updated_at()
returns trigger
language plpgsql
set search_path = maatefet
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- instructors ----------
-- Signing in creates a 'pending' row via instructors_self_insert below; the
-- account has no real access to client/content tables until a super-admin
-- sets status='verified' (enforced by the guard trigger, not just UI).
create table maatefet.instructors (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  segment maatefet.segment not null,
  phone text,
  email text,
  status maatefet.instructor_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_maatefet_instructors_auth_user on maatefet.instructors(auth_user_id);
create index idx_maatefet_instructors_status on maatefet.instructors(status);
alter table maatefet.instructors enable row level security;
grant select, insert, update on maatefet.instructors to authenticated;
grant all on maatefet.instructors to service_role;

create trigger trg_maatefet_instructors_updated_at
  before update on maatefet.instructors
  for each row execute function maatefet.set_updated_at();

-- guard: only a super-admin can change status/verified_at/verified_by —
-- closes the same self-escalation shape found and fixed in 30-zchuyotpro-crm
-- (#248/#249) before it could ever exist here.
create or replace function maatefet.guard_instructor_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, maatefet
as $$
begin
  if (new.status is distinct from old.status
      or new.verified_at is distinct from old.verified_at
      or new.verified_by is distinct from old.verified_by)
     and not public.more30_is_super_admin() then
    raise exception 'only a super-admin can change instructor verification status';
  end if;
  return new;
end;
$$;

create trigger trg_maatefet_guard_instructor_status
  before update on maatefet.instructors
  for each row execute function maatefet.guard_instructor_status_change();

-- ---------- helpers ----------
create or replace function maatefet.my_instructor_id()
returns uuid
language sql
stable
security definer
set search_path = maatefet
as $$
  select id from maatefet.instructors
  where auth_user_id = auth.uid() and status = 'verified'
  limit 1
$$;

create or replace function maatefet.is_verified_instructor()
returns boolean
language sql
stable
security definer
set search_path = maatefet
as $$
  select maatefet.my_instructor_id() is not null
$$;

-- ---------- instructors policies ----------
create policy instructors_self_read on maatefet.instructors
  for select to authenticated
  using (auth_user_id = auth.uid() or public.more30_is_super_admin());

create policy instructors_self_insert on maatefet.instructors
  for insert to authenticated
  with check (auth_user_id = auth.uid() and status = 'pending');

create policy instructors_self_update on maatefet.instructors
  for update to authenticated
  using (auth_user_id = auth.uid() or public.more30_is_super_admin())
  with check (auth_user_id = auth.uid() or public.more30_is_super_admin());

-- ---------- invites ----------
-- an invite is how a client/couple gets into the system at all — created by
-- a verified instructor, redeemed once by exact code. No public directory,
-- no open signup for clients.
create table maatefet.invites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default encode(gen_random_bytes(16), 'hex'),
  instructor_id uuid not null references maatefet.instructors(id) on delete cascade,
  segment maatefet.segment not null,
  couple_name text,
  phone text,
  email text,
  status maatefet.invite_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '30 days'),
  used_by uuid references auth.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_maatefet_invites_instructor on maatefet.invites(instructor_id);
create index idx_maatefet_invites_code on maatefet.invites(code);
alter table maatefet.invites enable row level security;
grant select, insert, update on maatefet.invites to authenticated;
grant select on maatefet.invites to anon;
grant all on maatefet.invites to service_role;

create policy invites_instructor_all on maatefet.invites
  for all to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin())
  with check (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());

-- anon lookup by exact code only, and only while still redeemable — same
-- shape as the public share-link policies already live on 30/31/36 (no
-- listing, no browsing, one exact token required).
create policy invites_anon_lookup_by_code on maatefet.invites
  for select to anon
  using (status = 'pending' and expires_at > now());

-- ---------- clients (the chatan/kallah being guided) ----------
create table maatefet.clients (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references maatefet.instructors(id) on delete cascade,
  invite_id uuid references maatefet.invites(id) on delete set null,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  segment maatefet.segment not null,
  full_name text not null,
  partner_name text,
  phone text,
  email text,
  wedding_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_maatefet_clients_instructor on maatefet.clients(instructor_id);
create index idx_maatefet_clients_auth_user on maatefet.clients(auth_user_id);
alter table maatefet.clients enable row level security;
grant select, insert, update, delete on maatefet.clients to authenticated;
grant all on maatefet.clients to service_role;

create trigger trg_maatefet_clients_updated_at
  before update on maatefet.clients
  for each row execute function maatefet.set_updated_at();

create policy clients_instructor_all on maatefet.clients
  for all to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin())
  with check (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());

-- a client's own personal-area login (stage 1, built later) will read only
-- their own row — harmless to allow now, unused until that portal exists.
create policy clients_self_read on maatefet.clients
  for select to authenticated
  using (auth_user_id = auth.uid());

-- ---------- content library (סטודיו תוכן ומיתוג אישי) ----------
create table maatefet.content_items (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references maatefet.instructors(id) on delete cascade,
  segment maatefet.segment not null,
  title text not null,
  body text,
  content_type text not null default 'note',
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_maatefet_content_instructor on maatefet.content_items(instructor_id);
alter table maatefet.content_items enable row level security;
grant select, insert, update, delete on maatefet.content_items to authenticated;
grant all on maatefet.content_items to service_role;

create trigger trg_maatefet_content_updated_at
  before update on maatefet.content_items
  for each row execute function maatefet.set_updated_at();

create policy content_instructor_all on maatefet.content_items
  for all to authenticated
  using (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin())
  with check (instructor_id = maatefet.my_instructor_id() or public.more30_is_super_admin());

-- module 15 (marketplace) reads other instructors' shared items only —
-- scaffolding for later, harmless while no UI calls it.
create policy content_shared_read on maatefet.content_items
  for select to authenticated
  using (is_shared = true and maatefet.is_verified_instructor());

-- ---------- point the registry row at the real schema ----------
update core.projects
set supabase_project = 'uhnrgujbdxhhmoxcjria',
    supabase_schema = 'maatefet',
    stage = 'wip',
    note = 'שלב 0 בבנייה: סכימת maatefet חיה (instructors/invites/clients/content_items), invite-only + RLS מדורג + מנעול הרשאות-על נגד עלייה-בהרשאות עצמית (guard_instructor_status_change), חיבור לסופר-אדמין הגלובלי (more30_is_super_admin). קוד אפליקציה/UI טרם נבנה — ‏/maatefet עדיין "בקרוב". נותר לשלב 0: פאנל סופר-אדמין לאימות מדריכים + מסך CRM ראשון למגזר הכלות. 2FA והצפנת-שדה לתוכן רגיש הן עבודת שכבת-אפליקציה, מתועדות ב-MAATEFET_BUILD.md, לא הומצאו כאן. מפרט מלא: MAATEFET_BUILD.md.'
where number = '39';
