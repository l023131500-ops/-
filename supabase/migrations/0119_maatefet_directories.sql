-- more30 · 39-maatefet — stage 3 continues: directories (poskim / mikvaot /
-- mesadrei kiddushin / bodkot tehara / marital counselors)
-- ============================================================================
-- MAATEFET_BUILD.md's binding foundational rules are explicit about this
-- module's shape: "דירקטוריז (פוסקים/מקוואות/מסדרי קידושין/בודקות/יועצים):
-- הזנה ידנית ע"י סופר-אדמין — לא שאיבה אוטומטית." (manual entry by the
-- super-admin only — never automated scraping). The 15-module list in the
-- same spec names these as five separate modules (8-12), but they share one
-- shape exactly: a name + contact details + a category, curated by one role.
-- Rather than five near-identical tables, this ships one table with a
-- controlled `category` vocabulary — the same "one core, many facets via a
-- category column" shape already used for content_type (0117).
--
-- Write access: super-admin only, enforced by RLS (directories_admin_all)
-- *and* an explicit check inside every mutating RPC — same defense-in-depth
-- pattern as maatefet.verify_instructor() (0109) and the forum pin guard
-- (0116).
--
-- Read access: any verified+2FA instructor or 2FA'd client (couple) may
-- browse *active* entries — but only ones relevant to their own segment.
-- Categories like a mesader kiddushin can differ by community/segment;
-- allowing a null segment (meaning "relevant to both") keeps one row from
-- having to be duplicated for a resource that genuinely serves everyone
-- (e.g. many mikvaot/yoatzim serve both segments). This is a new helper,
-- maatefet.my_effective_segment(), because the existing maatefet.my_segment()
-- (0117) is instructor-only — it reads the caller's own client row too,
-- reusing my_instructor_id()/my_client_id() (both already aal2-gated) rather
-- than re-implementing that gate a third time.

-- ---------- table ----------
create table maatefet.directory_entries (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('posek', 'mikveh', 'mesader_kiddushin', 'bodeket_tahara', 'yoetz_zugi')),
  segment maatefet.segment, -- null = relevant to both segments
  name text not null,
  phone text,
  email text,
  city text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_maatefet_directory_category on maatefet.directory_entries(category);
alter table maatefet.directory_entries enable row level security;
grant select, insert, update, delete on maatefet.directory_entries to authenticated;
grant all on maatefet.directory_entries to service_role;

create trigger trg_maatefet_directory_updated_at
  before update on maatefet.directory_entries
  for each row execute function maatefet.set_updated_at();

-- ---------- effective-segment helper (client OR instructor, mirrors my_segment() from 0117) ----------
create or replace function maatefet.my_effective_segment()
returns maatefet.segment
language sql
stable
security definer
set search_path = maatefet
as $$
  select coalesce(
    (select segment from maatefet.instructors where id = maatefet.my_instructor_id()),
    (select segment from maatefet.clients where id = maatefet.my_client_id())
  )
$$;
revoke execute on function maatefet.my_effective_segment() from anon;
grant execute on function maatefet.my_effective_segment() to authenticated;

-- ---------- RLS ----------
create policy directories_admin_all on maatefet.directory_entries
  for all to authenticated
  using (public.more30_is_super_admin())
  with check (public.more30_is_super_admin());

create policy directories_read on maatefet.directory_entries
  for select to authenticated
  using (
    is_active = true
    and (maatefet.is_verified_instructor() or maatefet.my_client_id() is not null)
    and (segment is null or segment = maatefet.my_effective_segment())
  );

-- ---------- public API ----------
-- browse: active entries only, segment-filtered by RLS above, optional
-- category filter. security invoker — no cross-table join needed, RLS on
-- the table alone is sufficient (same shape as maatefet_content_list, 0117).
create or replace function public.maatefet_directory_list(p_category text default null)
returns setof maatefet.directory_entries
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select * from maatefet.directory_entries
  where p_category is null or category = p_category
  order by category, name
$$;
revoke all on function public.maatefet_directory_list(text) from public;
grant execute on function public.maatefet_directory_list(text) to authenticated;
revoke execute on function public.maatefet_directory_list(text) from anon;

-- admin browse: every entry including inactive ones and every segment, for
-- the management screen. RLS already restricts this to super-admins (the
-- directories_read policy requires is_active=true, so a non-admin gets
-- nothing extra beyond what maatefet_directory_list already returns them);
-- the explicit check below turns that silent RLS filtering into a clear
-- error instead, same defense-in-depth as every other admin RPC in this
-- schema.
create or replace function public.maatefet_directory_admin_list()
returns setof maatefet.directory_entries
language plpgsql
stable
security invoker
set search_path = maatefet, public
as $$
begin
  if not public.more30_is_super_admin() then
    raise exception 'only a super-admin can list all directory entries';
  end if;
  return query select * from maatefet.directory_entries order by category, name;
end;
$$;
revoke all on function public.maatefet_directory_admin_list() from public;
grant execute on function public.maatefet_directory_admin_list() to authenticated;
revoke execute on function public.maatefet_directory_admin_list() from anon;

-- create or update one entry (super-admin only, manual entry per the spec)
create or replace function public.maatefet_directory_upsert(
  p_id uuid default null,
  p_category text default null,
  p_segment text default null,
  p_name text default null,
  p_phone text default null,
  p_email text default null,
  p_city text default null,
  p_address text default null,
  p_notes text default null,
  p_is_active boolean default true
)
returns maatefet.directory_entries
language plpgsql
security invoker
set search_path = maatefet, public
as $$
declare
  v_row maatefet.directory_entries;
begin
  if not public.more30_is_super_admin() then
    raise exception 'only a super-admin can manage directory entries';
  end if;
  if p_category is null or p_category not in ('posek', 'mikveh', 'mesader_kiddushin', 'bodeket_tahara', 'yoetz_zugi') then
    raise exception 'invalid category';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'name is required';
  end if;
  if p_segment is not null and p_segment not in ('chatan', 'kallah') then
    raise exception 'segment must be chatan, kallah, or null (both)';
  end if;

  if p_id is null then
    insert into maatefet.directory_entries
      (category, segment, name, phone, email, city, address, notes, is_active, created_by)
    values
      (p_category, p_segment::maatefet.segment, btrim(p_name), p_phone, p_email, p_city, p_address, p_notes,
       coalesce(p_is_active, true), auth.uid())
    returning * into v_row;
  else
    update maatefet.directory_entries
    set category = p_category, segment = p_segment::maatefet.segment, name = btrim(p_name),
        phone = p_phone, email = p_email, city = p_city, address = p_address, notes = p_notes,
        is_active = coalesce(p_is_active, is_active)
    where id = p_id
    returning * into v_row;
  end if;

  if v_row.id is null then
    raise exception 'directory entry not found';
  end if;

  return v_row;
end;
$$;
revoke all on function public.maatefet_directory_upsert(uuid, text, text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.maatefet_directory_upsert(uuid, text, text, text, text, text, text, text, text, boolean) to authenticated;
revoke execute on function public.maatefet_directory_upsert(uuid, text, text, text, text, text, text, text, text, boolean) from anon;

create or replace function public.maatefet_directory_delete(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = maatefet, public
as $$
begin
  if not public.more30_is_super_admin() then
    raise exception 'only a super-admin can delete directory entries';
  end if;
  delete from maatefet.directory_entries where id = p_id;
end;
$$;
revoke all on function public.maatefet_directory_delete(uuid) from public;
grant execute on function public.maatefet_directory_delete(uuid) to authenticated;
revoke execute on function public.maatefet_directory_delete(uuid) from anon;

-- ---------- registry note ----------
update core.projects
set note = note || E'\n\n[20/08/2026 Loop C סבב 13] שלב 3 ממשיך — דירקטוריז (פוסקים/מקוואות/מסדרי קידושין/בודקות/יועצים). '
  || 'maatefet.directory_entries: טבלה אחת מאוחדת עם category מבוקר (5 ערכים) במקום 5 טבלאות כמעט-זהות — אותה '
  || 'צורה כמו content_type (0117). הזנה ידנית בלבד ע"י סופר-אדמין (RLS directories_admin_all + בדיקה מפורשת '
  || 'בכל RPC כותב), לפי הדרישה המפורשת באפיון: "לא שאיבה אוטומטית". קריאה: מדריך/ה מאומת/ת+2FA או זוג עם 2FA '
  || 'רואים רק רשומות פעילות (is_active) ורלוונטיות למגזר שלהם/ן (segment null = שני המגזרים) — נוסף עוזר חדש '
  || 'maatefet.my_effective_segment() (מקביל ל-my_segment() מ-0117, אך גם ללקוח לא רק למדריך/ה) שמשתמש מחדש '
  || 'ב-my_instructor_id()/my_client_id() הקיימים (שניהם כבר דורשים aal2) במקום לשכתב את שער ה-2FA בפעם השלישית. '
  || 'UI: instructor.html/portal.html קיבלו טאב/כרטיס "דירקטוריז" (קריאה-בלבד, סינון לפי קטגוריה), admin.html קיבל '
  || 'כרטיס ניהול (הוספה/עריכה/הפעלה-כיבוי/מחיקה, רואה גם רשומות לא-פעילות ושני המגזרים). אפס רגרסיה: אף טאב/RPC '
  || 'קיים לא נגע. עדיין לא נבנה בשלב 3: ארגון החתונה.'
where number = '39';
