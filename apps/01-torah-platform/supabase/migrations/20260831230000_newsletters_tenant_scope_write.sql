-- ============================================================================
-- Torah Platform · storage.objects — tenant-scope the newsletters bucket path
-- ============================================================================
-- The new religious_council "Newsletters" portal screen (build_tasks #24)
-- uploads PDFs/cover images to the `newsletters` bucket under a
-- "<tenant_id>/..." path, the same convention already scoped for
-- materials-media by torah_bucket_write_allowed() (20260831180000/190000).
-- That function currently falls through to `return true` (unrestricted) for
-- any bucket/path shape it doesn't recognize, including newsletters — so
-- without this change, the brand-new tenant-prefixed newsletters path would
-- reopen the exact cross-tenant write/rename hole those two migrations just
-- closed for materials-media/portal-assets (any authenticated user, zero
-- role in the target tenant, could write or rename a file under another
-- council's newsletters prefix). Since both the INSERT and UPDATE storage
-- policies already call this single function, extending it here covers both
-- verbs with no further policy changes.
create or replace function public.torah_bucket_write_allowed(_bucket text, _name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage, pg_temp
as $$
declare
  _first_segment text;
  _tenant_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  if _bucket not in ('portal-assets','materials-media','newsletters','site-images','shop-images') then
    return false;
  end if;

  -- materials-media / newsletters: "<tenant_id>/..."
  if _bucket in ('materials-media', 'newsletters') then
    _first_segment := split_part(_name, '/', 1);
  -- portal-assets: only the "gallery/<tenant_id>/..." shape is tenant-scoped
  elsif _bucket = 'portal-assets' and split_part(_name, '/', 1) = 'gallery' then
    _first_segment := split_part(_name, '/', 2);
  else
    -- no tenant-id convention on this bucket/path shape — unchanged behavior
    return true;
  end if;

  begin
    _tenant_id := _first_segment::uuid;
  exception when invalid_text_representation then
    -- not a uuid-shaped prefix — not one of the tenant-scoped conventions,
    -- fall back to prior unrestricted behavior rather than guessing
    return true;
  end;

  if not exists (select 1 from public.tenants t where t.id = _tenant_id) then
    -- prefix isn't a real tenant id — nothing to protect against, allow
    return true;
  end if;

  -- any role in the tenant (member/moderator/tenant_admin) or super admin —
  -- matches how Materials.tsx lets plain members upload pending moderator
  -- approval; the new Newsletters.tsx screen is tenant_admin/moderator-only
  -- client-side, but this is the actual server-side backstop.
  return public.user_in_tenant(_tenant_id);
end;
$$;

grant execute on function public.torah_bucket_write_allowed(text, text) to anon, authenticated;
