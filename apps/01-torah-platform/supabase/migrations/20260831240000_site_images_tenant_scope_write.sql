-- ============================================================================
-- Torah Platform · storage.objects — tenant-scope the site-images bucket path
-- ============================================================================
-- New portal "Ads.tsx" screen (build_tasks #27, generic per-tenant ad banners
-- for the previously-unused `ads` table) uploads banner images to the
-- `site-images` bucket under a "<tenant_id>/..." path — the same convention
-- already scoped for materials-media/newsletters by
-- torah_bucket_write_allowed() (20260831180000/190000/230000). That function
-- still falls through to unrestricted `true` for site-images (it's on the
-- allowed-bucket allowlist but not in the tenant-scoped branch), so without
-- this change the brand-new tenant-prefixed path would reopen the exact
-- cross-tenant write/rename hole those migrations already closed for the
-- other two buckets. Both the INSERT and UPDATE storage policies already call
-- this one function, so extending it here covers both verbs with no further
-- policy changes.
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

  -- materials-media / newsletters / site-images: "<tenant_id>/..."
  if _bucket in ('materials-media', 'newsletters', 'site-images') then
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
  -- the new Ads.tsx screen is tenant_admin/moderator-only client-side, but
  -- this is the actual server-side backstop.
  return public.user_in_tenant(_tenant_id);
end;
$$;

grant execute on function public.torah_bucket_write_allowed(text, text) to anon, authenticated;
