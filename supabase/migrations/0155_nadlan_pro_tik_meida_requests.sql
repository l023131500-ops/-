-- more30 · 36 nadlan-pro — tik-meida-le-heter workflow (core.build_tasks id=12, part 2)
-- ============================================================================
-- core.build_tasks id=12 (system 36, priority 50): "Planning info auto-pull
-- shown immediately; tik-meida-le-heter as official request workflow
-- (request->mgmt->issue->attach)". Part 1 (planning info shown immediately,
-- no request needed) was already built and verified — see potentialHtml()
-- in tivuch/app.html, which renders system 32's free XPLAN/urban-renewal
-- facts unconditionally on every truth-report pull. This migration is part 2
-- only: a tik-meida-le-heter (מידע להיתר בנייה, the official planning-info
-- file issued by the local committee) has no tracked request/issue path at
-- all in this schema yet.
--
-- Mirrors 0153's TABU workflow re-scoping exactly (office owner/manager is
-- "mgmt", not a central platform team — this schema has no /admin surface),
-- with one deliberate simplification: system 32's own tik-meida workflow
-- (0152, apps/32-nadlan-berega) has no AI-analysis step because "a tik meida
-- is an official committee document, not a raw extract needing parsing" —
-- the same reasoning applies here, so this workflow stops at upload+share,
-- it does not add an Edge Function or analysis columns.
--
-- Storage is not duplicated into a parallel table either: the issued file IS
-- a property document, using the existing category='permit' (0105 already
-- reserves this exact category — "מידע להיתר" is literally planning info for
-- a permit) and the existing 'nadlan-pro-docs' private bucket (0135).
-- ============================================================================

create table if not exists nadlan_pro.tik_meida_requests (
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

create index if not exists idx_np_tikmeida_req_property on nadlan_pro.tik_meida_requests(property_id, created_at desc);
create index if not exists idx_np_tikmeida_req_document on nadlan_pro.tik_meida_requests(document_id);
create index if not exists idx_np_tikmeida_req_deal on nadlan_pro.tik_meida_requests(deal_id);
create index if not exists idx_np_tikmeida_req_requested_by on nadlan_pro.tik_meida_requests(requested_by);
create index if not exists idx_np_tikmeida_req_sent_by on nadlan_pro.tik_meida_requests(sent_by);

alter table nadlan_pro.tik_meida_requests enable row level security;

do $$ begin
  create policy np_tikmeida_req_select on nadlan_pro.tik_meida_requests for select
    using (exists (select 1 from nadlan_pro.properties p
                   where p.id = property_id and nadlan_pro.can_touch(p.office_id, p.owner_id)));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_tikmeida_req_insert on nadlan_pro.tik_meida_requests for insert
    with check (exists (select 1 from nadlan_pro.properties p
                        where p.id = property_id and nadlan_pro.can_touch(p.office_id, p.owner_id)));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_tikmeida_req_manage on nadlan_pro.tik_meida_requests for update
    using (exists (select 1 from nadlan_pro.properties p
                   where p.id = property_id and nadlan_pro.manages_office(p.office_id)))
    with check (exists (select 1 from nadlan_pro.properties p
                        where p.id = property_id and nadlan_pro.manages_office(p.office_id)));
exception when duplicate_object then null; end $$;

grant select, insert, update on nadlan_pro.tik_meida_requests to authenticated;
grant all on nadlan_pro.tik_meida_requests to service_role;

-- ── API ─────────────────────────────────────────────────────────────────────

create or replace function public.np_tikmeida_request_create(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_id uuid;
  v_gush text; v_helka text;
begin
  select gush, helka into v_gush, v_helka
  from nadlan_pro.properties where id = (p->>'property_id')::uuid;
  if v_gush is null or v_helka is null or trim(v_gush) = '' or trim(v_helka) = '' then
    raise exception 'לנכס הזה אין גוש/חלקה רשומים -- אי אפשר להגיש בקשת מידע להיתר בלעדיהם';
  end if;
  insert into nadlan_pro.tik_meida_requests (property_id, deal_id, grade, notes, requested_by)
  values (
    (p->>'property_id')::uuid,
    nullif(p->>'deal_id', '')::uuid,
    case when p->>'grade' = 'urgent' then 'urgent' else 'normal' end,
    nullif(trim(coalesce(p->>'notes', '')), ''),
    auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.np_tikmeida_request_mark_sent(p_id uuid)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  update nadlan_pro.tik_meida_requests
    set status = 'sent', sent_at = now(), sent_by = auth.uid()
    where id = p_id and status = 'pending';
  if not found then
    raise exception 'הבקשה לא נמצאה, כבר סומנה כהוגשה, או שאין לך הרשאת ניהול במשרד';
  end if;
end $$;

-- No AI-analysis step (unlike TABU): the issued file is an official
-- committee document, so upload IS the "issue" step and immediately
-- fulfils the request -- there is nothing further to wait on.
create or replace function public.np_tikmeida_document_upload(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_req record;
  v_path text := nullif(trim(coalesce(p->>'storage_path', '')), '');
  v_doc_id uuid;
begin
  if v_path is null then
    raise exception 'צריך קובץ תיק מידע מועלה';
  end if;
  select r.id, r.property_id, r.status, pr.office_id into v_req
  from nadlan_pro.tik_meida_requests r
  join nadlan_pro.properties pr on pr.id = r.property_id
  where r.id = (p->>'request_id')::uuid;
  if v_req.id is null then
    raise exception 'הבקשה לא נמצאה';
  end if;
  if v_req.status <> 'sent' then
    raise exception 'יש לסמן את הבקשה כ"הוגשה לוועדה" לפני העלאת תיק המידע';
  end if;
  if not nadlan_pro.manages_office(v_req.office_id) then
    raise exception 'רק בעלים/מנהל משרד יכולים להעלות תיק מידע';
  end if;
  if split_part(v_path, '/', 1) <> v_req.office_id::text then
    raise exception 'הקובץ לא שייך למשרד של הנכס הזה';
  end if;
  insert into nadlan_pro.property_documents
    (property_id, category, name, storage_path, mime_type, notes, uploaded_by)
  values (
    v_req.property_id, 'permit',
    coalesce(nullif(trim(p->>'name'), ''), 'תיק מידע להיתר'),
    v_path, nullif(p->>'mime_type', ''), nullif(trim(coalesce(p->>'notes', '')), ''),
    auth.uid())
  returning id into v_doc_id;
  update nadlan_pro.tik_meida_requests
    set document_id = v_doc_id, status = 'fulfilled', fulfilled_at = now()
    where id = v_req.id;
  return v_doc_id;
end $$;

-- `np_property_get` (0010/0135/0153) already round-trips documents and TABU
-- requests in the drawer's single call; tik_meida_requests joins the same
-- response for the same reason.
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
      from nadlan_pro.tabu_requests r where r.property_id = p.id), '[]'::jsonb),
    'tik_meida_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'deal_id', r.deal_id, 'grade', r.grade, 'status', r.status,
               'notes', r.notes, 'document_id', r.document_id,
               'sent_at', r.sent_at, 'fulfilled_at', r.fulfilled_at, 'created_at', r.created_at)
             order by r.created_at desc)
      from nadlan_pro.tik_meida_requests r where r.property_id = p.id), '[]'::jsonb)
  )
  from nadlan_pro.properties p where p.id = p_id;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.np_tikmeida_request_create(jsonb)',
    'public.np_tikmeida_request_mark_sent(uuid)',
    'public.np_tikmeida_document_upload(jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
