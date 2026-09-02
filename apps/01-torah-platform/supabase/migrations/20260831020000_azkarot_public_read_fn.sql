-- public/Azkarot.tsx ("/azkarot", live public route) lists recent memorial
-- submissions, but azkarot_tenant_read RLS only grants SELECT to
-- user_in_tenant(tenant_id) (tenant members / super-admin) -- an anonymous
-- visitor to this public page gets 0 rows forever, same class as the INSERT
-- gap already fixed for this table (tenant_accepts_public_intake). Unlike a
-- plain "allow public SELECT" policy, azkarot also holds family_contact_name/
-- family_contact_phone (PII) that must NOT be exposed to anonymous readers,
-- so this adds a narrow SECURITY DEFINER function returning only the columns
-- the public list actually renders, instead of widening row-level SELECT on
-- the table itself (which stays exactly as-is).
create or replace function public.azkarot_upcoming(_tenant_id uuid)
returns table (
  id uuid,
  deceased_name text,
  date_of_death_hebrew text,
  notes text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select a.id, a.deceased_name, a.date_of_death_hebrew, a.notes, a.created_at
  from public.azkarot a
  where a.tenant_id = _tenant_id
    and (public.tenant_accepts_public_intake(_tenant_id) or public.user_in_tenant(_tenant_id))
  order by a.created_at desc
  limit 30;
$$;

grant execute on function public.azkarot_upcoming(uuid) to anon, authenticated;
