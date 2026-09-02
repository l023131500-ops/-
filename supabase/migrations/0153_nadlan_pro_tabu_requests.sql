-- more30 · 36 nadlan-pro — TABU workflow (core.build_tasks id=11)
-- ============================================================================
-- core.build_tasks id=11 (system 36, priority 40): "TABU workflow: checkbox+
-- grade in VIP report -> mgmt task+email(gush/helka) -> upload nesach +
-- Research button -> disabled btn until sent -> active view/download + AI
-- plain-language rights-per-floor explanation -> attach to client".
--
-- System 32 (nadlan-berega) already built this exact pipeline (0150/0152,
-- lib/tabudoc.ts) for its PUBLIC consumer report -- but 36 is a private B2B
-- broker CRM with no public report page and no shared platform-admin surface
-- (no /admin here at all, unlike 32 -- every write in this schema is gated
-- by office membership: nadlan_pro.can_touch()/manages_office()). Copying
-- 32's shape verbatim ("checkbox on a public VIP report", central ops team
-- as "management") does not fit here, and this exact re-scoping question was
-- left open on purpose in apps/32-nadlan-berega/CLAUDE.md ("36 is an
-- internal broker tool... needs a scope check before implementation, not
-- just copying").
--
-- Re-scoped to the architecture that already exists here (0009's own header:
-- "office is the tenant boundary"): "mgmt task" = the OFFICE'S OWN
-- owner/manager (the same role that already gates rent-payment waivers,
-- office templates, and office deletion in this schema), not a shared
-- platform team -- real-estate agents routinely order TABU extracts from
-- gov.il under their own login, so the office's own staff genuinely is the
-- correct actor for "order it, upload it" here, not a central admin nobody
-- has ever built for system 36. "Attach to client" has no email pipeline to
-- reuse (grep confirms 0126 team-invites is copy-a-link only, no send
-- mechanism anywhere in nadlan_pro) -- the UI reuses the exact copy-a-link
-- pattern already used for team-invite join links and for opening a private
-- document (propDocsHtml's signed URL), not a new channel invented here.
--
-- Storage/documents are NOT duplicated into a parallel table: a TABU extract
-- IS a property document (0105/0135 already reserve category='tabu' and a
-- private per-office bucket for exactly this) -- this migration only adds
-- the layer that was actually missing: a tracked request/grade/status, and
-- AI-analysis columns on the existing document row.
-- ============================================================================

alter table nadlan_pro.property_documents
  add column if not exists mime_type text,
  add column if not exists analysis jsonb,
  add column if not exists analysis_error text,
  add column if not exists analyzed_at timestamptz;

create table if not exists nadlan_pro.tabu_requests (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references nadlan_pro.properties(id) on delete cascade,
  deal_id       uuid references nadlan_pro.deals(id) on delete set null,
  grade         text not null default 'normal' check (grade in ('normal', 'urgent')),
  status        text not null default 'pending' check (status in ('pending', 'sent', 'fulfilled')),
  notes         text,
  requested_by  uuid references auth.users(id) on delete set null,
  sent_by       uuid references auth.users(id) on delete set null,
  sent_at       timestamptz,
  document_id   uuid references nadlan_pro.property_documents(id) on delete set null,
  fulfilled_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_np_tabu_req_property on nadlan_pro.tabu_requests(property_id, created_at desc);
create index if not exists idx_np_tabu_req_document on nadlan_pro.tabu_requests(document_id);
create index if not exists idx_np_tabu_req_deal on nadlan_pro.tabu_requests(deal_id);
create index if not exists idx_np_tabu_req_requested_by on nadlan_pro.tabu_requests(requested_by);
create index if not exists idx_np_tabu_req_sent_by on nadlan_pro.tabu_requests(sent_by);

alter table nadlan_pro.tabu_requests enable row level security;

-- Any office member who can open the property can see/file a request for it
-- (same inheritance shape as property_documents) -- but only the office's
-- owner/manager may transition its status, mirroring every other privileged
-- action in this schema (np_rent_payment_waive, np_template_save,
-- np_office_delete).
do $$ begin
  create policy np_tabu_req_select on nadlan_pro.tabu_requests for select
    using (exists (select 1 from nadlan_pro.properties p
                   where p.id = property_id and nadlan_pro.can_touch(p.office_id, p.owner_id)));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_tabu_req_insert on nadlan_pro.tabu_requests for insert
    with check (exists (select 1 from nadlan_pro.properties p
                        where p.id = property_id and nadlan_pro.can_touch(p.office_id, p.owner_id)));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_tabu_req_manage on nadlan_pro.tabu_requests for update
    using (exists (select 1 from nadlan_pro.properties p
                   where p.id = property_id and nadlan_pro.manages_office(p.office_id)))
    with check (exists (select 1 from nadlan_pro.properties p
                        where p.id = property_id and nadlan_pro.manages_office(p.office_id)));
exception when duplicate_object then null; end $$;

grant select, insert, update on nadlan_pro.tabu_requests to authenticated;
grant all on nadlan_pro.tabu_requests to service_role;

-- ── API ─────────────────────────────────────────────────────────────────────

create or replace function public.np_tabu_request_create(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_id uuid;
  v_gush text; v_helka text;
begin
  select gush, helka into v_gush, v_helka
  from nadlan_pro.properties where id = (p->>'property_id')::uuid;
  if v_gush is null or v_helka is null or trim(v_gush) = '' or trim(v_helka) = '' then
    raise exception 'לנכס הזה אין גוש/חלקה רשומים -- אי אפשר להזמין נסח בלעדיהם';
  end if;
  insert into nadlan_pro.tabu_requests (property_id, deal_id, grade, notes, requested_by)
  values (
    (p->>'property_id')::uuid,
    nullif(p->>'deal_id', '')::uuid,
    case when p->>'grade' = 'urgent' then 'urgent' else 'normal' end,
    nullif(trim(coalesce(p->>'notes', '')), ''),
    auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.np_tabu_request_mark_sent(p_id uuid)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  update nadlan_pro.tabu_requests
    set status = 'sent', sent_at = now(), sent_by = auth.uid()
    where id = p_id and status = 'pending';
  if not found then
    raise exception 'הבקשה לא נמצאה, כבר סומנה כנשלחה, או שאין לך הרשאת ניהול במשרד';
  end if;
end $$;

create or replace function public.np_tabu_document_upload(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_req record;
  v_path text := nullif(trim(coalesce(p->>'storage_path', '')), '');
  v_doc_id uuid;
begin
  if v_path is null then
    raise exception 'צריך קובץ נסח מועלה';
  end if;
  select r.id, r.property_id, r.status, pr.office_id into v_req
  from nadlan_pro.tabu_requests r
  join nadlan_pro.properties pr on pr.id = r.property_id
  where r.id = (p->>'request_id')::uuid;
  if v_req.id is null then
    raise exception 'הבקשה לא נמצאה';
  end if;
  if v_req.status <> 'sent' then
    raise exception 'יש לסמן את הבקשה כ"נשלחה לרשם" לפני העלאת הנסח';
  end if;
  if not nadlan_pro.manages_office(v_req.office_id) then
    raise exception 'רק בעלים/מנהל משרד יכולים להעלות נסח';
  end if;
  if split_part(v_path, '/', 1) <> v_req.office_id::text then
    raise exception 'הקובץ לא שייך למשרד של הנכס הזה';
  end if;
  insert into nadlan_pro.property_documents
    (property_id, category, name, storage_path, mime_type, notes, uploaded_by)
  values (
    v_req.property_id, 'tabu',
    coalesce(nullif(trim(p->>'name'), ''), 'נסח טאבו'),
    v_path, nullif(p->>'mime_type', ''), nullif(trim(coalesce(p->>'notes', '')), ''),
    auth.uid())
  returning id into v_doc_id;
  update nadlan_pro.tabu_requests set document_id = v_doc_id where id = v_req.id;
  return v_doc_id;
end $$;

-- Authorises the AI-analysis Edge Function call using the CALLER'S OWN
-- bearer token (delegated, not reimplemented -- same shape as
-- np-send-signature calling np_contract_get with the caller's own auth):
-- only an office owner/manager who can already reach this document may
-- trigger analysis on it.
create or replace function public.np_tabu_document_for_analysis(p_document_id uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'document_id', d.id,
    'storage_path', d.storage_path,
    'mime_type', d.mime_type,
    'gush', pr.gush, 'helka', pr.helka, 'tat_helka', pr.tat_helka
  )
  from nadlan_pro.property_documents d
  join nadlan_pro.properties pr on pr.id = d.property_id
  where d.id = p_document_id
    and d.category = 'tabu'
    and d.storage_path is not null
    and nadlan_pro.manages_office(pr.office_id);
$$;

-- Called ONLY by the np-tabu-document-analyze Edge Function with the
-- service-role key -- RLS does not apply to service_role, and this function
-- is deliberately NOT granted to authenticated/anon (below), so no client
-- can forge an analysis result for a document it does not own.
create or replace function public.np_tabu_document_analysis_save(p jsonb)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_doc_id uuid := (p->>'document_id')::uuid;
  v_ok boolean := coalesce((p->>'ok')::boolean, false);
begin
  update nadlan_pro.property_documents
    set analysis = case when v_ok then p->'analysis' else analysis end,
        analysis_error = case when v_ok then null else nullif(p->>'error', '') end,
        analyzed_at = now()
    where id = v_doc_id;
  if not found then
    raise exception 'המסמך לא נמצא';
  end if;
  if v_ok then
    update nadlan_pro.tabu_requests
      set status = 'fulfilled', fulfilled_at = now()
      where document_id = v_doc_id and status <> 'fulfilled';
  end if;
end $$;

-- `np_property_get` (0010/0135) already round-trips documents in the
-- drawer's single call; tabu_requests joins the same response for the same
-- reason 0135 already gives for documents: not "a fourth network round trip
-- every time a property card opens".
drop function if exists public.np_property_documents(uuid);
create function public.np_property_documents(p_property uuid)
returns table (
  id uuid, category text, name text, url text, storage_path text, mime_type text,
  notes text, analysis jsonb, analysis_error text, analyzed_at timestamptz,
  uploaded_by uuid, created_at timestamptz
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select d.id, d.category::text, d.name, d.url, d.storage_path, d.mime_type,
         d.notes, d.analysis, d.analysis_error, d.analyzed_at, d.uploaded_by, d.created_at
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
             'mime_type', doc.mime_type, 'notes', doc.notes,
             'analysis', doc.analysis, 'analysis_error', doc.analysis_error,
             'analyzed_at', doc.analyzed_at,
             'created_at', doc.created_at)
             order by doc.created_at desc)
      from nadlan_pro.property_documents doc where doc.property_id = p.id), '[]'::jsonb),
    'tabu_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'deal_id', r.deal_id, 'grade', r.grade, 'status', r.status,
               'notes', r.notes, 'document_id', r.document_id,
               'sent_at', r.sent_at, 'fulfilled_at', r.fulfilled_at, 'created_at', r.created_at)
             order by r.created_at desc)
      from nadlan_pro.tabu_requests r where r.property_id = p.id), '[]'::jsonb)
  )
  from nadlan_pro.properties p where p.id = p_id;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.np_tabu_request_create(jsonb)',
    'public.np_tabu_request_mark_sent(uuid)',
    'public.np_tabu_document_upload(jsonb)',
    'public.np_tabu_document_for_analysis(uuid)',
    'public.np_property_documents(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

revoke all on function public.np_tabu_document_analysis_save(jsonb) from public;
grant execute on function public.np_tabu_document_analysis_save(jsonb) to service_role;
