-- more30 · 36 nadlan-pro — surface who requested/sent a tabu / tik-meida request
-- ============================================================================
-- nadlan_pro.tabu_requests and nadlan_pro.tik_meida_requests (0153/0155) both
-- store requested_by and sent_by (auth.users FKs, set by np_tabu_request_create
-- / np_tikmeida_request_create on insert and by the two *_mark_sent functions)
-- but np_property_get never selected either column into the jsonb it returns,
-- so tivuch/app.html's tabuHtml()/tikMeidaHtml() had nothing to render even if
-- they wanted to. In a multi-agent office (the whole point of
-- nadlan_pro.office_members — this is a team tool, not a solo one) a request
-- card showing only a status pill and a timestamp answers "what happened" but
-- not "who ordered this" or "who followed up" — the same accountability gap
-- the deal drawer's commission section already solved by resolving agent uuids
-- against np_office_members.
--
-- Purely additive: two more keys per request row, no new column, no RLS
-- change (SELECT already exposes the whole row per-policy; only the API
-- projection was incomplete).
-- ============================================================================

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
               'requested_by', r.requested_by, 'sent_by', r.sent_by,
               'sent_at', r.sent_at, 'fulfilled_at', r.fulfilled_at, 'created_at', r.created_at)
             order by r.created_at desc)
      from nadlan_pro.tabu_requests r where r.property_id = p.id), '[]'::jsonb),
    'tik_meida_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'deal_id', r.deal_id, 'grade', r.grade, 'status', r.status,
               'notes', r.notes, 'document_id', r.document_id,
               'requested_by', r.requested_by, 'sent_by', r.sent_by,
               'sent_at', r.sent_at, 'fulfilled_at', r.fulfilled_at, 'created_at', r.created_at)
             order by r.created_at desc)
      from nadlan_pro.tik_meida_requests r where r.property_id = p.id), '[]'::jsonb)
  )
  from nadlan_pro.properties p where p.id = p_id;
$$;
