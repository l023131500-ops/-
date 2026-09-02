-- more30 · 36 nadlan-pro — office delete (QA cleanup path)
-- ============================================================================
-- BACKFILL NOTICE: see 0126's header — applied live 2026-08-25 without a
-- matching repo file until now.
-- ============================================================================
--
-- Fixes a QA smoke-test office leak: test offices created during automated
-- checks had no way to be torn down again. Owner-only, cascades through the
-- FK graph (members/properties/deals/... all reference offices.id on delete
-- cascade already, per 0009).

create or replace function public.np_office_delete(p_office uuid)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  if not exists (
    select 1 from nadlan_pro.office_members m
    where m.office_id = p_office and m.user_id = auth.uid()
      and m.is_active and m.role = 'owner'
  ) then
    raise exception 'רק בעלים יכול למחוק את המשרד' using errcode = '42501';
  end if;

  delete from nadlan_pro.offices where id = p_office;
  if not found then
    raise exception 'המשרד לא נמצא';
  end if;
end
$$;
