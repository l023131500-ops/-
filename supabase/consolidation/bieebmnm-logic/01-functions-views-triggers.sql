CREATE OR REPLACE FUNCTION igud_otvedaf.touch_updated_at() RETURNS trigger LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new;
end $function$;
CREATE OR REPLACE FUNCTION igud.check_super_admin_session(p_token text) RETURNS TABLE(identity text, role text, valid boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'igud'
AS $function$
BEGIN RETURN QUERY SELECT s.identity, s.role, (s.expires_at::timestamptz > now()) AS valid FROM admin_sessions s WHERE s.token = p_token AND s.role = 'super_admin' LIMIT 1;
END;
$function$;
CREATE OR REPLACE FUNCTION igud.get_admin_tenant(p_admin_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'igud'
AS $function$
DECLARE v_tenant jsonb; v_lessons jsonb; v_messages jsonb; v_ads jsonb;
BEGIN SELECT to_jsonb(t.*) INTO v_tenant FROM igud.tenants t WHERE t.admin_token = p_admin_token LIMIT 1; IF v_tenant IS NULL THEN RETURN NULL; END IF; SELECT coalesce(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb) INTO v_lessons FROM igud.lessons l WHERE l.tenant_id = (v_tenant->>'id')::uuid; SELECT coalesce(jsonb_agg(to_jsonb(m.*)), '[]'::jsonb) INTO v_messages FROM igud.portal_messages m WHERE m.tenant_id = (v_tenant->>'id')::uuid ORDER BY m.created_at DESC LIMIT 100; SELECT coalesce(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb) INTO v_ads FROM igud.tenant_ads a WHERE a.tenant_id = (v_tenant->>'id')::uuid; RETURN jsonb_build_object('tenant', v_tenant, 'lessons', v_lessons, 'messages', v_messages, 'ads', v_ads);
END $function$;
CREATE OR REPLACE FUNCTION igud.get_public_teacher(p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'igud'
AS $function$
DECLARE v_teacher jsonb; v_lessons jsonb;
BEGIN SELECT to_jsonb(t.*) INTO v_teacher FROM igud.teachers t WHERE t.public_token = p_token AND t.is_active AND t.is_approved LIMIT 1; IF v_teacher IS NULL THEN RETURN NULL; END IF; SELECT coalesce(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb) INTO v_lessons FROM igud.lessons l WHERE l.rabbi_name = (v_teacher->>'full_name') AND l.is_approved AND l.is_active; RETURN jsonb_build_object('teacher', v_teacher, 'lessons', v_lessons);
END $function$;
CREATE OR REPLACE FUNCTION igud.get_public_tenant(p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'igud'
AS $function$
DECLARE v_tenant jsonb; v_branding jsonb; v_features jsonb; v_lessons jsonb; v_ads jsonb;
BEGIN SELECT to_jsonb(t.*) INTO v_tenant FROM igud.tenants t WHERE t.public_token = p_token AND t.is_public = true LIMIT 1; IF v_tenant IS NULL THEN RETURN NULL; END IF; SELECT to_jsonb(b.*) INTO v_branding FROM igud.tenant_branding b WHERE b.tenant_id = (v_tenant->>'id')::uuid; SELECT to_jsonb(f.*) INTO v_features FROM igud.tenant_features f WHERE f.tenant_id = (v_tenant->>'id')::uuid; SELECT coalesce(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb) INTO v_lessons FROM igud.lessons l WHERE l.tenant_id = (v_tenant->>'id')::uuid AND l.is_approved = true AND l.is_active = true; SELECT coalesce(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb) INTO v_ads FROM igud.tenant_ads a WHERE a.tenant_id = (v_tenant->>'id')::uuid AND a.is_active AND a.is_approved AND (a.ends_at IS NULL OR a.ends_at > now()); RETURN jsonb_build_object('tenant', v_tenant, 'branding', v_branding, 'features', v_features, 'lessons', v_lessons, 'ads', v_ads);
END $function$;
CREATE OR REPLACE FUNCTION igud.get_super_admin_dashboard(p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'igud'
AS $function$
DECLARE v_valid boolean; v_tenants jsonb; v_stats jsonb;
BEGIN SELECT (expires_at::timestamptz > now()) INTO v_valid FROM admin_sessions WHERE token = p_token AND role = 'super_admin' LIMIT 1; IF NOT COALESCE(v_valid, false) THEN RETURN jsonb_build_object('ok', false, 'error', 'אין הרשאה'); END IF; SELECT jsonb_agg(row_to_json(t)) INTO v_tenants FROM ( SELECT t.id, t.slug, t.name, t.display_name, t.type, t.status, t.city, t.region, t.logo_url, t.about_text, t.public_token, t.admin_token, t.contact_email, t.contact_phone, (SELECT count(*) FROM synagogues s WHERE s.tenant_id = t.id) AS synagogues_count, (SELECT count(*) FROM lessons l WHERE l.tenant_id = t.id) AS lessons_count, (SELECT count(*) FROM tenant_ads a WHERE a.tenant_id = t.id) AS ads_count, (SELECT count(*) FROM portal_messages m WHERE m.tenant_id = t.id) AS messages_count FROM tenants t ORDER BY t.created_at DESC ) t; SELECT jsonb_build_object( 'tenants_total', (SELECT count(*) FROM tenants), 'synagogues_total', (SELECT count(*) FROM synagogues), 'teachers_total', (SELECT count(*) FROM teachers), 'lessons_total', (SELECT count(*) FROM lessons), 'ads_total', (SELECT count(*) FROM tenant_ads), 'messages_total', (SELECT count(*) FROM portal_messages), 'messages_unread', (SELECT count(*) FROM portal_messages WHERE status IN ('new','unread')) ) INTO v_stats; RETURN jsonb_build_object('ok', true, 'stats', v_stats, 'tenants', COALESCE(v_tenants, '[]'::jsonb));
END;
$function$;
CREATE OR REPLACE FUNCTION igud.handle_new_tenant() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'igud', 'pg_temp'
AS $function$
begin insert into igud.tenant_branding (tenant_id, site_name) values (new.id, new.name) on conflict (tenant_id) do nothing; insert into igud.tenant_features (tenant_id) values (new.id) on conflict (tenant_id) do nothing; return new;
end $function$;
CREATE OR REPLACE FUNCTION igud.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'igud', 'pg_temp'
AS $function$
begin insert into igud.profiles (id, full_name, phone) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'phone','')) on conflict (id) do nothing; return new;
end $function$;
CREATE OR REPLACE FUNCTION igud.has_tenant_role(_uid uuid, _tenant_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'igud', 'pg_temp'
AS $function$ select exists (select 1 from igud.user_roles where user_id = _uid and tenant_id = _tenant_id and role = _role) or igud.is_super_admin(_uid);
$function$;
CREATE OR REPLACE FUNCTION igud.is_super_admin(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'igud', 'pg_temp'
AS $function$ select exists (select 1 from igud.user_roles where user_id = _uid and role = 'super_admin' and tenant_id is null);
$function$;
CREATE OR REPLACE FUNCTION igud.match_knowledge_chunks(query_embedding vector, p_knowledge_base_id text, match_count integer DEFAULT 4) RETURNS TABLE(id text, content text, category text, metadata jsonb, similarity double precision) LANGUAGE sql STABLE
AS $function$ select id, content, category, metadata, 1 - (embedding <=> query_embedding) as similarity from knowledge_chunks where knowledge_base_id = p_knowledge_base_id and embedding is not null order by embedding <=> query_embedding limit match_count;
$function$;
CREATE OR REPLACE FUNCTION igud.public_directory(p_type text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_search text DEFAULT NULL::text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'igud'
AS $function$
DECLARE v_orgs jsonb; v_teachers jsonb;
BEGIN SELECT coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'display_name', t.display_name, 'type', t.type, 'city', t.city, 'region', t.region, 'logo_url', t.logo_url, 'about_text', t.about_text, 'contact_phone', t.contact_phone, 'contact_email', t.contact_email, 'public_token', t.public_token)), '[]'::jsonb) INTO v_orgs FROM igud.tenants t WHERE t.is_public = true AND t.status = 'active' AND (p_type IS NULL OR t.type::text = p_type) AND (p_city IS NULL OR t.city ILIKE '%'||p_city||'%') AND (p_search IS NULL OR t.name ILIKE '%'||p_search||'%' OR coalesce(t.display_name,'') ILIKE '%'||p_search||'%'); SELECT coalesce(jsonb_agg(jsonb_build_object('id', te.id, 'full_name', te.full_name, 'display_name', te.display_name, 'city', te.city, 'photo_url', te.photo_url, 'subjects', te.subjects, 'audiences', te.audiences, 'public_token', te.public_token)), '[]'::jsonb) INTO v_teachers FROM igud.teachers te WHERE te.is_active AND te.is_approved AND (p_city IS NULL OR te.city ILIKE '%'||p_city||'%') AND (p_search IS NULL OR te.full_name ILIKE '%'||p_search||'%'); RETURN jsonb_build_object('organizations', v_orgs, 'teachers', v_teachers);
END $function$;
CREATE OR REPLACE FUNCTION igud.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'igud', 'pg_temp'
AS $function$
begin new.updated_at = now(); return new; end $function$;
CREATE OR REPLACE FUNCTION igud.submit_public_lead(p_token text, p_name text, p_phone text, p_email text, p_subject text, p_body text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'igud'
AS $function$
DECLARE v_tenant_id uuid; v_msg_id uuid;
BEGIN SELECT id INTO v_tenant_id FROM igud.tenants WHERE public_token = p_token AND is_public LIMIT 1; IF v_tenant_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_token'); END IF; INSERT INTO igud.portal_messages (tenant_id, from_name, from_phone, from_email, subject, body, status) VALUES (v_tenant_id, p_name, p_phone, p_email, p_subject, p_body, 'new') RETURNING id INTO v_msg_id; RETURN jsonb_build_object('success', true, 'id', v_msg_id);
END $function$;
CREATE OR REPLACE FUNCTION igud.tenant_accepts_public_intake(_tenant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'igud', 'pg_temp'
AS $function$ select exists ( select 1 from igud.tenants t where t.id = _tenant_id and t.status = 'active' and t.is_public = true );
$function$;
CREATE OR REPLACE FUNCTION igud.user_in_tenant(_tenant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'igud', 'pg_temp'
AS $function$ select igud.is_super_admin(auth.uid()) or _tenant_id in (select igud.user_tenants(auth.uid()));
$function$;
CREATE OR REPLACE FUNCTION igud.user_tenants(_uid uuid) RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'igud', 'pg_temp'
AS $function$ select tenant_id from igud.memberships where user_id = _uid and status = 'active' union select tenant_id from igud.user_roles where user_id = _uid and tenant_id is not null;
$function$;
CREATE OR REPLACE FUNCTION igud.verify_super_admin(p_username text, p_password text) RETURNS TABLE(user_id bigint, full_name text, role text, session_token text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'igud', 'extensions'
AS $function$
DECLARE v_user record; v_token text;
BEGIN SELECT id, app_users.full_name, app_users.role, app_users.password_hash, app_users.status INTO v_user FROM app_users WHERE username = p_username AND app_users.status = 'active' AND app_users.role = 'super_admin' LIMIT 1; IF v_user.id IS NULL THEN RETURN; END IF; IF v_user.password_hash IS NULL OR v_user.password_hash <> extensions.crypt(p_password, v_user.password_hash) THEN RETURN; END IF; v_token := encode(extensions.gen_random_bytes(32), 'hex'); INSERT INTO admin_sessions (token, identity, role, created_at, expires_at) VALUES (v_token, p_username, 'super_admin', now()::text, (now() + interval '30 days')::text); UPDATE app_users SET last_login_at = now()::text WHERE id = v_user.id; RETURN QUERY SELECT v_user.id, v_user.full_name, v_user.role, v_token;
END;
$function$;
create or replace view igud."ad_app_settings" as SELECT key, value, label, updated_by, updated_at FROM igud_ads.ad_app_settings;
create or replace view igud."ad_audit_log" as SELECT id, actor_email, action, entity_type, entity_id, details, created_at FROM igud_ads.ad_audit_log;
create or replace view igud."ad_coupons" as SELECT id, code, max_designs, used_designs, expires_at, is_active, note, created_at, owner_email FROM igud_ads.ad_coupons;
create or replace view igud."ad_generations" as SELECT id, project_id, variation_num, image_url, storage_path, prompt_used, composited, whatsapp_url, pdf_url, selected, model_used, cost_estimate, created_at FROM igud_ads.ad_generations;
create or replace view igud."ad_jobs" as SELECT id, project_id, type, status, payload, result, error_message, attempts, started_at, finished_at, created_at FROM igud_ads.ad_jobs;
create or replace view igud."ad_notifications" as SELECT id, user_email, user_id, type, title, body, link_url, is_read, metadata, created_at FROM igud_ads.ad_notifications;
create or replace view igud."ad_payments" as SELECT id, project_id, user_email, user_id, amount, currency, status, provider, provider_transaction_id, description, payer_name, payer_phone, raw_webhook, coupon_granted_id, created_at, updated_at FROM igud_ads.ad_payments;
create or replace view igud."ad_projects" as SELECT id, coupon_id, uploader_email, mode, status, parameters, source_image_path, selected_generation_id, category, title, error_message, created_at, updated_at, template_id, logo_path, customer_data FROM igud_ads.ad_projects;
create or replace view igud."ad_settings" as SELECT key, value, updated_at FROM igud_ads.ad_settings;
create or replace view igud."ad_templates" as SELECT id, name, description, thumbnail_url, category, layout_json, is_active, sort_order, created_at, prompt_template, required_fields, optional_fields, style_rules, price_nis, allows_logo, allows_custom_colors, aspect_ratio, dalle_size FROM igud_ads.ad_templates;
create or replace view igud."ad_users" as SELECT id, user_id, email, display_name, role, permissions, is_active, coupon_id, notes, created_by, created_at, updated_at FROM igud_ads.ad_users;
create or replace view igud."coupon_codes" as SELECT id, code, max_uploads, used_uploads, expires_at, is_active, created_at FROM igud_transcribe.coupon_codes;
create or replace view igud."footnotes" as SELECT id, transcript_id, number, "position", note_text, source_ref, created_at FROM igud_transcribe.footnotes;
create or replace view igud."jobs" as SELECT id, upload_id, type, status, error_message, started_at, finished_at, created_at FROM igud_transcribe.jobs;
create or replace view igud."service_submission_rows" as SELECT s.id, s.created_at AS "createdAt", s.client_id AS "clientId", c.full_name AS "fullName", c.phone, COALESCE(c.email, ''::text) AS email, COALESCE(c.id_number, ''::text) AS "idNumber", COALESCE(c.birth_date, ''::text) AS "birthDate", COALESCE(c.family_status, ''::text) AS "familyStatus", COALESCE(c.city, ''::text) AS city, s.right_id AS "rightId", s.topic, s.category, s.request_type AS "requestType", s.potential_percent AS "potentialPercent", s.potential_level AS "potentialLevel", s.answers_json AS "answersJson", s.details_json AS "detailsJson", s.documents_json AS "documentsJson", s.additional_topics_json AS "additionalTopicsJson", s.webhook_status AS "webhookStatus", COALESCE(s.webhook_response, ''::text) AS "webhookResponse", COALESCE(s.webhook_sent_at, ''::text) AS "webhookSentAt" FROM service_submissions s JOIN clients c ON c.id = s.client_id ORDER BY s.id DESC;
create or replace view igud."style_glossary" as SELECT id, style, term, replacement, notes, created_at FROM igud_transcribe.style_glossary;
create or replace view igud."transcripts" as SELECT id, upload_id, raw_text, edited_text, processing_notes, docx_original_url, docx_edited_url, docx_sources_url, created_at FROM igud_transcribe.transcripts;
create or replace view igud."uploads" as SELECT id, coupon_id, uploader_email, style, status, storage_path, duration_sec, size_bytes, original_filename, created_at FROM igud_transcribe.uploads;
drop trigger if exists "htr_jobs_touch" on igud_otvedaf."htr_jobs";
CREATE TRIGGER htr_jobs_touch BEFORE UPDATE ON igud_otvedaf.htr_jobs FOR EACH ROW EXECUTE FUNCTION igud_otvedaf.touch_updated_at();
drop trigger if exists "trg_neda_cfg_upd" on igud."nedarim_configs";
CREATE TRIGGER trg_neda_cfg_upd BEFORE UPDATE ON igud.nedarim_configs FOR EACH ROW EXECUTE FUNCTION igud.set_updated_at();
drop trigger if exists "trg_orders_upd" on igud."orders";
CREATE TRIGGER trg_orders_upd BEFORE UPDATE ON igud.orders FOR EACH ROW EXECUTE FUNCTION igud.set_updated_at();
drop trigger if exists "trg_products_upd" on igud."products";
CREATE TRIGGER trg_products_upd BEFORE UPDATE ON igud.products FOR EACH ROW EXECUTE FUNCTION igud.set_updated_at();
drop trigger if exists "trg_profiles_upd" on igud."profiles";
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON igud.profiles FOR EACH ROW EXECUTE FUNCTION igud.set_updated_at();
drop trigger if exists "trg_branding_upd" on igud."tenant_branding";
CREATE TRIGGER trg_branding_upd BEFORE UPDATE ON igud.tenant_branding FOR EACH ROW EXECUTE FUNCTION igud.set_updated_at();
drop trigger if exists "on_tenant_created" on igud."tenants";
CREATE TRIGGER on_tenant_created AFTER INSERT ON igud.tenants FOR EACH ROW EXECUTE FUNCTION igud.handle_new_tenant();
drop trigger if exists "trg_tenants_upd" on igud."tenants";
CREATE TRIGGER trg_tenants_upd BEFORE UPDATE ON igud.tenants FOR EACH ROW EXECUTE FUNCTION igud.set_updated_at();