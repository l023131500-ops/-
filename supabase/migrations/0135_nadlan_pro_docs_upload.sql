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
