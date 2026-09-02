-- more30 · 36 nadlan-pro — real document upload (property_documents)
-- ============================================================================
-- BACKFILL NOTICE: see 0126's header — applied live 2026-08-24 without a
-- matching repo file until now (live migration 0144_nadlan_pro_docs_upload).
-- ============================================================================
--
-- 0105 (property_documents, already in this repo) was paste-a-link only —
-- no actual upload, no storage bucket. Adds `storage_path` plus a PRIVATE
-- bucket (unlike nadlan-pro-media, these are tabu/permits/appraisals — not
-- meant for public listing pages): RLS scoped to {office_id}/... exactly
-- like nadlan-pro-media's policies (0106), so only members of the office the
-- file is filed under can read/write it — retrieval goes through a short-
-- lived signed URL minted for them, never a public bucket URL.

alter table nadlan_pro.property_documents
  add column if not exists storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nadlan-pro-docs', 'nadlan-pro-docs', false, 26214400,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Objects are written under `{office_id}/{property_id}/{filename}`, same
-- shape and same my_office_ids() gate as nadlan-pro-media (0106) — but SELECT
-- is also office-scoped here (no public=true bucket flag), since these are
-- private documents, not listing photos.
do $$ begin
  create policy np_docs_insert on storage.objects for insert to authenticated
    with check (
      bucket_id = 'nadlan-pro-docs'
      and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and ((storage.foldername(name))[1])::uuid in (select nadlan_pro.my_office_ids())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_docs_select on storage.objects for select to authenticated
    using (
      bucket_id = 'nadlan-pro-docs'
      and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and ((storage.foldername(name))[1])::uuid in (select nadlan_pro.my_office_ids())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_docs_delete on storage.objects for delete to authenticated
    using (
      bucket_id = 'nadlan-pro-docs'
      and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and ((storage.foldername(name))[1])::uuid in (select nadlan_pro.my_office_ids())
    );
exception when duplicate_object then null; end $$;

-- BACKFILL GAP CLOSED (25/08/2026): the three RPCs below shipped live in the
-- same original migration as everything above, but the first backfill pass
-- only captured the column/bucket/policy DDL and missed the function bodies
-- -- verified against pg_get_functiondef on the live database, which already
-- carries this exact code. Without this, a fresh environment built from this
-- repo would have the bucket but no way to write/read `storage_path` through
-- the RPC layer, and `url` would still be NOT NULL (rejecting every upload
-- that has no pasted link).

alter table nadlan_pro.property_documents
  alter column url drop not null;

create or replace function public.np_property_document_add(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_id uuid;
  v_url text := nullif(trim(coalesce(p->>'url', '')), '');
  v_path text := nullif(trim(coalesce(p->>'storage_path', '')), '');
  v_office uuid;
begin
  if coalesce(trim(p->>'name'), '') = '' then
    raise exception 'שם המסמך חובה';
  end if;
  if v_url is null and v_path is null then
    raise exception 'צריך קישור למסמך או קובץ שהועלה';
  end if;
  if v_path is not null then
    -- The uploaded object must sit in the folder of the office this property
    -- belongs to — the storage RLS above already stops cross-office reads,
    -- but a row pointing outside its own office's folder would be a lie the
    -- UI repeats forever, so it is refused at the door.
    select pr.office_id into v_office
    from nadlan_pro.properties pr where pr.id = (p->>'property_id')::uuid;
    if v_office is null or split_part(v_path, '/', 1) <> v_office::text then
      raise exception 'הקובץ לא שייך למשרד של הנכס הזה';
    end if;
  end if;
  insert into nadlan_pro.property_documents
    (property_id, category, name, url, storage_path, notes, uploaded_by)
  values (
    (p->>'property_id')::uuid,
    coalesce(nullif(p->>'category',''), 'other')::nadlan_pro.property_document_category,
    trim(p->>'name'), v_url, v_path, nullif(p->>'notes',''),
    auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Both readers return storage_path so the drawer can tell "open the link"
-- from "mint a signed URL". Shapes otherwise unchanged.
drop function if exists public.np_property_documents(uuid);
create function public.np_property_documents(p_property uuid)
returns table (
  id uuid, category text, name text, url text, storage_path text, notes text,
  uploaded_by uuid, created_at timestamptz
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select d.id, d.category::text, d.name, d.url, d.storage_path, d.notes, d.uploaded_by, d.created_at
  from nadlan_pro.property_documents d
  where d.property_id = p_property
  order by d.created_at desc;
$$;

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
             'name', doc.name, 'url', doc.url, 'storage_path', doc.storage_path,
             'notes', doc.notes, 'created_at', doc.created_at)
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
    'public.np_property_document_add(jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
