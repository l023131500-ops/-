-- more30 · 36 nadlan-pro — per-property document repository
-- ============================================================================
-- Contracts (0012) and invoices hang off a *deal*. A property has documents
-- before any deal exists on it at all — the tabu extract, the building permit,
-- an appraisal — and those need somewhere to live that survives the property
-- having zero, one, or several deals over its lifetime. This is that table.
--
-- Same external-link pattern as `properties.images` (0009): the office pastes
-- a link, there is no storage bucket. A real upload (bucket + RLS policy +
-- drag-drop UI) is a separate, larger step — see NEEDS_USER.md, not invented
-- here.
-- ============================================================================

do $$ begin
  create type nadlan_pro.property_document_category as enum
    ('tabu', 'permit', 'plan', 'appraisal', 'poa', 'id_copy', 'contract_draft', 'other');
exception when duplicate_object then null; end $$;

create table if not exists nadlan_pro.property_documents (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references nadlan_pro.properties(id) on delete cascade,
  category     nadlan_pro.property_document_category not null default 'other',
  name         text not null,
  url          text not null,
  notes        text,
  uploaded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_np_prop_docs_property
  on nadlan_pro.property_documents(property_id, created_at desc);

alter table nadlan_pro.property_documents enable row level security;

-- Same inheritance shape as `deal_checklist`/`deal_stage_events` in 0009: a
-- document is reachable exactly when its parent property is, so an agent who
-- can open the property card can also see and manage its document shelf.
do $$ begin
  create policy np_prop_docs_all on nadlan_pro.property_documents for all
    using (exists (select 1 from nadlan_pro.properties p
                   where p.id = property_id and nadlan_pro.can_touch(p.office_id, p.owner_id)))
    with check (exists (select 1 from nadlan_pro.properties p
                        where p.id = property_id and nadlan_pro.can_touch(p.office_id, p.owner_id)));
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on nadlan_pro.property_documents to authenticated;
grant all on nadlan_pro.property_documents to service_role;

-- ── API ─────────────────────────────────────────────────────────────────────
create or replace function public.np_property_documents(p_property uuid)
returns table (
  id uuid, category text, name text, url text, notes text,
  uploaded_by uuid, created_at timestamptz
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select d.id, d.category::text, d.name, d.url, d.notes, d.uploaded_by, d.created_at
  from nadlan_pro.property_documents d
  where d.property_id = p_property
  order by d.created_at desc;
$$;

create or replace function public.np_property_document_add(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_id uuid;
begin
  if coalesce(trim(p->>'name'), '') = '' then
    raise exception 'שם המסמך חובה';
  end if;
  if coalesce(trim(p->>'url'), '') = '' then
    raise exception 'קישור המסמך חובה';
  end if;
  insert into nadlan_pro.property_documents (property_id, category, name, url, notes, uploaded_by)
  values (
    (p->>'property_id')::uuid,
    coalesce(nullif(p->>'category',''), 'other')::nadlan_pro.property_document_category,
    trim(p->>'name'), trim(p->>'url'), nullif(p->>'notes',''),
    auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.np_property_document_delete(p_id uuid)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  delete from nadlan_pro.property_documents where id = p_id;
  if not found then
    raise exception 'המסמך לא נמצא, או שאין לך הרשאה למחוק אותו';
  end if;
end $$;

-- `np_property_get` (0010) already round-trips deals and activities for the
-- drawer in one call; documents join the same response rather than becoming
-- a fourth network round trip every time a property card opens.
create or replace function public.np_property_get(p_id uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'property', to_jsonb(p),
    'seller', (select to_jsonb(c) from nadlan_pro.contacts c where c.id = p.seller_contact_id),
    'deals', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'title', d.title,
             'stage', d.stage::text, 'price', d.price) order by d.created_at desc)
      from nadlan_pro.deals d where d.property_id = p.id), '[]'::jsonb),
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind::text,
             'title', a.title, 'created_at', a.created_at) order by a.created_at desc)
      from nadlan_pro.activities a where a.property_id = p.id), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object('id', doc.id, 'category', doc.category::text,
             'name', doc.name, 'url', doc.url, 'notes', doc.notes, 'created_at', doc.created_at)
             order by doc.created_at desc)
      from nadlan_pro.property_documents doc where doc.property_id = p.id), '[]'::jsonb)
  )
  from nadlan_pro.properties p where p.id = p_id;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.np_property_documents(uuid)',
    'public.np_property_document_add(jsonb)',
    'public.np_property_document_delete(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
