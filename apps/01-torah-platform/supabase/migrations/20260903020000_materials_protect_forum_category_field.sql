-- `materials.display_forum_category_id` (20260519000002) is the same class of
-- moderator-only decision as `display_in_public_profile`/`featured_on_homepage`
-- (protected by 20260831070000's `protect_materials_moderation_fields` trigger)
-- -- it decides whether an approved material is surfaced inside a public forum
-- category. It was left out of that trigger, so any tenant `member` (RLS grants
-- write on `materials` to admin/moderator/member alike, per that migration's own
-- comment) could set it directly via a raw client call, without ever touching
-- admin/Content.tsx's moderation screen. Widening the trigger, not narrowing RLS
-- (same reasoning as the original fix: RLS can't restrict individual columns).
create or replace function public.protect_materials_moderation_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not (
    public.has_tenant_role(auth.uid(), old.tenant_id, 'tenant_admin')
    or public.has_tenant_role(auth.uid(), old.tenant_id, 'moderator')
  ) then
    if new.status is distinct from old.status then
      new.status := old.status;
    end if;
    if new.rejection_reason is distinct from old.rejection_reason then
      new.rejection_reason := old.rejection_reason;
    end if;
    if new.display_in_public_profile is distinct from old.display_in_public_profile then
      new.display_in_public_profile := old.display_in_public_profile;
    end if;
    if new.featured_on_homepage is distinct from old.featured_on_homepage then
      new.featured_on_homepage := old.featured_on_homepage;
    end if;
    if new.display_forum_category_id is distinct from old.display_forum_category_id then
      new.display_forum_category_id := old.display_forum_category_id;
    end if;
  end if;
  return new;
end;
$$;
