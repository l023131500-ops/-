-- more30 · 36 nadlan-pro — contracts and electronic signature (stage 4)
-- ============================================================================
-- Legal position (Electronic Signature Law 5761-2001): three levels — basic,
-- secure (מאובטחת), and certified (מאושרת, requiring a certificate from an
-- accredited authority). What is built here is a SECURE signature with an
-- evidence log. It is not a certified signature, and the system says so in
-- those words on the signing page and in the record.
--
-- The red line: never present a basic or secure signature as certified. `level`
-- defaults to 'secure', and a table constraint refuses 'certified' without a
-- provider reference — so it cannot be claimed by mistake or by a bug.
-- ============================================================================

do $$ begin
  create type nadlan_pro.signature_level as enum ('basic','secure','certified');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nadlan_pro.contract_status as enum
    ('draft','sent','partially_signed','signed','cancelled','expired');
exception when duplicate_object then null; end $$;

-- body_md carries {{placeholders}} filled from the deal at render time; `fields`
-- documents which ones a template expects, so the UI can warn about a missing
-- one instead of shipping "{{buyer_name}}" to a client.
create table if not exists nadlan_pro.contract_templates (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid references nadlan_pro.offices(id) on delete cascade,
  key        text not null,
  name       text not null,
  body_md    text not null,
  fields     jsonb not null default '[]'::jsonb,
  -- A system template (office_id null) is the shared starting point; an office
  -- copies and edits it without affecting anyone else.
  is_system  boolean not null default false,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_np_tpl_office_key
  on nadlan_pro.contract_templates(coalesce(office_id, '00000000-0000-0000-0000-000000000000'::uuid), key);

create table if not exists nadlan_pro.contracts (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references nadlan_pro.offices(id) on delete cascade,
  deal_id     uuid references nadlan_pro.deals(id) on delete set null,
  template_id uuid references nadlan_pro.contract_templates(id) on delete set null,
  title       text not null,
  -- Frozen at creation. A contract that re-rendered from its template would
  -- change under a signature that was given to the old wording.
  body_html   text not null,
  status      nadlan_pro.contract_status not null default 'draft',
  -- The 2024 ethics disclosures, copied in at render time so the document stays
  -- true even if the office record later changes.
  broker_name    text,
  broker_license text,
  sent_at      timestamptz,
  completed_at timestamptz,
  expires_at   timestamptz,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_np_contracts_office on nadlan_pro.contracts(office_id, created_at desc);
create index if not exists idx_np_contracts_deal   on nadlan_pro.contracts(deal_id);

create table if not exists nadlan_pro.signatures (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references nadlan_pro.contracts(id) on delete cascade,
  contact_id  uuid references nadlan_pro.contacts(id) on delete set null,
  signer_name  text not null,
  signer_email text,
  signer_phone text,
  signer_role  text,
  -- Random, not derived from the contract id, so knowing one signer's link
  -- tells you nothing about another's.
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  level       nadlan_pro.signature_level not null default 'secure',
  provider     text,
  provider_ref text,
  signed_at    timestamptz,
  signature_data text,          -- the drawn mark, as a data URI
  signed_ip    text,            -- evidence captured at the moment of signing
  signed_ua    text,
  document_hash text,           -- sha256 of body_html as signed: a later edit is detectable
  declined_at    timestamptz,
  decline_reason text,
  created_at   timestamptz not null default now(),

  constraint certified_needs_provider check (
    level <> 'certified' or nullif(trim(coalesce(provider_ref, '')), '') is not null
  )
);
create index if not exists idx_np_sig_contract on nadlan_pro.signatures(contract_id);

-- Append-only. Every touch of the link is recorded, not only the signature:
-- "was it opened, when, from where" is exactly what a dispute turns on.
create table if not exists nadlan_pro.signature_events (
  id           uuid primary key default gen_random_uuid(),
  signature_id uuid not null references nadlan_pro.signatures(id) on delete cascade,
  event        text not null,          -- sent | opened | signed | declined | reminded
  ip           text,
  user_agent   text,
  detail       jsonb,
  at           timestamptz not null default now()
);
create index if not exists idx_np_sigev on nadlan_pro.signature_events(signature_id, at);

alter table nadlan_pro.contract_templates enable row level security;
alter table nadlan_pro.contracts          enable row level security;
alter table nadlan_pro.signatures         enable row level security;
alter table nadlan_pro.signature_events   enable row level security;

do $$ begin
  create policy np_tpl_read on nadlan_pro.contract_templates for select
    using (is_system or office_id in (select nadlan_pro.my_office_ids()) or nadlan_pro.is_super_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy np_tpl_write on nadlan_pro.contract_templates for all
    using (office_id is not null and nadlan_pro.manages_office(office_id))
    with check (office_id is not null and nadlan_pro.manages_office(office_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_contracts_all on nadlan_pro.contracts for all
    using (nadlan_pro.can_touch(office_id, created_by))
    with check (nadlan_pro.can_touch(office_id, created_by));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_sig_all on nadlan_pro.signatures for all
    using (exists (select 1 from nadlan_pro.contracts c
                   where c.id = contract_id and nadlan_pro.can_touch(c.office_id, c.created_by)))
    with check (exists (select 1 from nadlan_pro.contracts c
                        where c.id = contract_id and nadlan_pro.can_touch(c.office_id, c.created_by)));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_sigev_all on nadlan_pro.signature_events for select
    using (exists (select 1 from nadlan_pro.signatures s
                   join nadlan_pro.contracts c on c.id = s.contract_id
                   where s.id = signature_id and nadlan_pro.can_touch(c.office_id, c.created_by)));
exception when duplicate_object then null; end $$;

-- The log is append-only by design: a party must be able to add to the evidence
-- but never rewrite or erase it, or the trail is worth nothing in the dispute
-- it exists for. INSERT is granted; UPDATE and DELETE deliberately are not.
do $$ begin
  create policy np_sigev_append on nadlan_pro.signature_events for insert
    with check (exists (select 1 from nadlan_pro.signatures s
                        join nadlan_pro.contracts c on c.id = s.contract_id
                        where s.id = signature_id and nadlan_pro.can_touch(c.office_id, c.created_by)));
exception when duplicate_object then null; end $$;

grant select, insert, update, delete
  on nadlan_pro.contract_templates, nadlan_pro.contracts, nadlan_pro.signatures to authenticated;
grant select, insert on nadlan_pro.signature_events to authenticated;
grant all on nadlan_pro.contract_templates, nadlan_pro.contracts,
             nadlan_pro.signatures, nadlan_pro.signature_events to service_role;

-- ── API ─────────────────────────────────────────────────────────────────────
create or replace function public.np_templates(p_office uuid default null)
returns table (id uuid, key text, name text, body_md text, fields jsonb, is_system boolean)
language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select t.id, t.key, t.name, t.body_md, t.fields, t.is_system
  from nadlan_pro.contract_templates t
  where t.is_system or (p_office is not null and t.office_id = p_office)
  order by t.sort, t.name;
$$;

-- Everything a template needs about one deal, so the browser fills placeholders
-- from real rows rather than from whatever the agent remembers.
create or replace function public.np_contract_context(p_deal uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'deal_id', d.id, 'price', d.price, 'commission_pct', d.commission_pct,
    'property_address', pr.address, 'property_city', pr.city,
    'property_rooms', pr.rooms, 'property_area', pr.area_sqm,
    'property_gush', pr.gush, 'property_helka', pr.helka,
    'buyer_name', bc.full_name,  'buyer_id', bc.id_number,  'buyer_email', bc.email,
    'seller_name', sc.full_name, 'seller_id', sc.id_number, 'seller_email', sc.email,
    'office_name', o.name, 'broker_license', o.license_number,
    -- The individual's licence when they have one, the office's otherwise: the
    -- disclosure names whoever actually brokered it.
    'broker_name', coalesce(m.full_name, o.name),
    'broker_own_license', m.license_number
  )
  from nadlan_pro.deals d
  join nadlan_pro.offices o on o.id = d.office_id
  left join nadlan_pro.office_members m on m.office_id = o.id and m.user_id = auth.uid()
  left join nadlan_pro.properties pr on pr.id = d.property_id
  left join nadlan_pro.contacts bc on bc.id = d.buyer_contact_id
  left join nadlan_pro.contacts sc on sc.id = d.seller_contact_id
  where d.id = p_deal;
$$;

create or replace function public.np_contract_create(p jsonb)
returns jsonb language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_id uuid; v_sig jsonb := '[]'::jsonb; r jsonb; v_tok text; v_sid uuid;
begin
  if coalesce(trim(p->>'body_html'), '') = '' then
    raise exception 'לא ניתן ליצור מסמך ריק';
  end if;
  insert into nadlan_pro.contracts (
    office_id, deal_id, template_id, title, body_html, status,
    broker_name, broker_license, expires_at, created_by)
  values (
    (p->>'office_id')::uuid, nullif(p->>'deal_id','')::uuid, nullif(p->>'template_id','')::uuid,
    coalesce(nullif(p->>'title',''), 'מסמך'), p->>'body_html', 'draft',
    p->>'broker_name', p->>'broker_license',
    nullif(p->>'expires_at','')::timestamptz, auth.uid())
  returning id into v_id;

  for r in select * from jsonb_array_elements(coalesce(p->'signers', '[]'::jsonb)) loop
    insert into nadlan_pro.signatures (contract_id, contact_id, signer_name, signer_email, signer_role)
    values (v_id, nullif(r->>'contact_id','')::uuid,
            coalesce(r->>'name', 'חותם'), nullif(r->>'email',''), r->>'role')
    returning token, id into v_tok, v_sid;
    v_sig := v_sig || jsonb_build_object('id', v_sid, 'name', r->>'name',
                                         'email', r->>'email', 'token', v_tok);
  end loop;
  return jsonb_build_object('contract_id', v_id, 'signers', v_sig);
end $$;

create or replace function public.np_contract_send(p_id uuid)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  update nadlan_pro.contracts
     set status = 'sent', sent_at = coalesce(sent_at, now()), updated_at = now()
   where id = p_id and status = 'draft';
  if not found then
    raise exception 'המסמך לא נמצא, כבר נשלח, או שאין לך הרשאה';
  end if;
  insert into nadlan_pro.signature_events (signature_id, event)
  select s.id, 'sent' from nadlan_pro.signatures s where s.contract_id = p_id;
end $$;

create or replace function public.np_contracts(p_office uuid, p_deal uuid default null)
returns table (
  id uuid, deal_id uuid, title text, status text, sent_at timestamptz,
  completed_at timestamptz, signer_count bigint, signed_count bigint, created_at timestamptz
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select c.id, c.deal_id, c.title, c.status::text, c.sent_at, c.completed_at,
         (select count(*) from nadlan_pro.signatures s where s.contract_id = c.id),
         (select count(*) from nadlan_pro.signatures s where s.contract_id = c.id and s.signed_at is not null),
         c.created_at
  from nadlan_pro.contracts c
  where c.office_id = p_office and (p_deal is null or c.deal_id = p_deal)
  order by c.created_at desc;
$$;

-- The contract plus every signer and the full evidence log. This is what gets
-- shown when someone asks "prove they signed it".
create or replace function public.np_contract_get(p_id uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'contract', to_jsonb(c),
    'signers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.signer_name, 'email', s.signer_email, 'role', s.signer_role,
        'level', s.level::text, 'signed_at', s.signed_at, 'declined_at', s.declined_at,
        'decline_reason', s.decline_reason, 'token', s.token,
        'signed_ip', s.signed_ip, 'document_hash', s.document_hash,
        'events', coalesce((
          select jsonb_agg(jsonb_build_object('event', e.event, 'at', e.at, 'ip', e.ip) order by e.at)
          from nadlan_pro.signature_events e where e.signature_id = s.id), '[]'::jsonb)
      ) order by s.created_at)
      from nadlan_pro.signatures s where s.contract_id = c.id), '[]'::jsonb)
  )
  from nadlan_pro.contracts c where c.id = p_id;
$$;

-- ── The signing side ────────────────────────────────────────────────────────
-- A signer is a client, not a more30 user, so these three are the only
-- functions in this schema granted to `anon`. They are SECURITY DEFINER and the
-- token is the entire credential, so each gives up as little as possible: the
-- fetch returns the document text and nothing about the office, the deal, or
-- the other signers' tokens.

create or replace function public.np_sign_fetch(p_token text)
returns jsonb language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare v jsonb; v_sid uuid;
begin
  select s.id into v_sid from nadlan_pro.signatures s where s.token = p_token;
  if v_sid is null then
    return jsonb_build_object('ok', false, 'error', 'הקישור אינו תקף.');
  end if;
  -- Opening the link is itself evidence, logged before anything is returned so
  -- a fetch that later errors is still on the record.
  insert into nadlan_pro.signature_events (signature_id, event) values (v_sid, 'opened');
  select jsonb_build_object(
    'ok', true, 'signature_id', s.id, 'signer_name', s.signer_name,
    'signer_role', s.signer_role, 'already_signed', s.signed_at is not null,
    'signed_at', s.signed_at, 'declined_at', s.declined_at, 'level', s.level::text,
    'title', c.title, 'body_html', c.body_html,
    'broker_name', c.broker_name, 'broker_license', c.broker_license,
    'expired', c.expires_at is not null and c.expires_at < now(),
    'status', c.status::text
  ) into v
  from nadlan_pro.signatures s join nadlan_pro.contracts c on c.id = s.contract_id
  where s.id = v_sid;
  return v;
end $$;

-- sha256() from pg_catalog rather than pgcrypto's digest(): digest lives in the
-- `extensions` schema, and this function pins search_path (a SECURITY DEFINER
-- function with a loose search_path is a hijacking risk). Widening the path to
-- reach digest would undo that. Same hash, one less dependency.
create or replace function public.np_sign_submit(
  p_token text, p_signature_data text, p_ip text default null, p_ua text default null)
returns jsonb language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare v_sid uuid; v_cid uuid; v_signed timestamptz; v_exp timestamptz; v_hash text;
begin
  select s.id, s.contract_id, s.signed_at, c.expires_at,
         encode(sha256(convert_to(c.body_html, 'utf8')), 'hex')
    into v_sid, v_cid, v_signed, v_exp, v_hash
  from nadlan_pro.signatures s join nadlan_pro.contracts c on c.id = s.contract_id
  where s.token = p_token;

  if v_sid is null then return jsonb_build_object('ok', false, 'error', 'הקישור אינו תקף.'); end if;
  if v_signed is not null then return jsonb_build_object('ok', false, 'error', 'המסמך כבר נחתם.'); end if;
  if v_exp is not null and v_exp < now() then
    return jsonb_build_object('ok', false, 'error', 'תוקף הקישור פג.');
  end if;
  if coalesce(trim(p_signature_data), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'לא התקבלה חתימה.');
  end if;

  -- level stays 'secure'. Nothing on this path can set 'certified', and the
  -- table constraint would refuse it without a provider reference anyway.
  update nadlan_pro.signatures
     set signed_at = now(), signature_data = p_signature_data,
         signed_ip = p_ip, signed_ua = p_ua, document_hash = v_hash, level = 'secure'
   where id = v_sid;

  insert into nadlan_pro.signature_events (signature_id, event, ip, user_agent, detail)
  values (v_sid, 'signed', p_ip, p_ua, jsonb_build_object('document_hash', v_hash));

  -- Complete only when nobody is still outstanding.
  update nadlan_pro.contracts c
     set status = case
           when not exists (select 1 from nadlan_pro.signatures s
                            where s.contract_id = c.id and s.signed_at is null)
             then 'signed'::nadlan_pro.contract_status
           else 'partially_signed'::nadlan_pro.contract_status end,
         completed_at = case
           when not exists (select 1 from nadlan_pro.signatures s
                            where s.contract_id = c.id and s.signed_at is null)
             then now() else null end,
         updated_at = now()
   where c.id = v_cid;

  return jsonb_build_object('ok', true, 'signed_at', now(), 'document_hash', v_hash, 'level', 'secure');
end $$;

create or replace function public.np_sign_decline(p_token text, p_reason text default null)
returns jsonb language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare v_sid uuid;
begin
  select s.id into v_sid from nadlan_pro.signatures s
  where s.token = p_token and s.signed_at is null;
  if v_sid is null then
    return jsonb_build_object('ok', false, 'error', 'הקישור אינו תקף או שכבר נחתם.');
  end if;
  update nadlan_pro.signatures
     set declined_at = now(), decline_reason = nullif(trim(coalesce(p_reason,'')), '')
   where id = v_sid;
  insert into nadlan_pro.signature_events (signature_id, event, detail)
  values (v_sid, 'declined', jsonb_build_object('reason', p_reason));
  return jsonb_build_object('ok', true);
end $$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.np_templates(uuid)', 'public.np_contract_context(uuid)',
    'public.np_contract_create(jsonb)', 'public.np_contract_send(uuid)',
    'public.np_contracts(uuid,uuid)', 'public.np_contract_get(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;

  -- The signing three: the only place anon is granted anything here.
  foreach fn in array array[
    'public.np_sign_fetch(text)',
    'public.np_sign_submit(text,text,text,text)',
    'public.np_sign_decline(text,text)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('grant execute on function %s to anon, authenticated', fn);
  end loop;
end $$;

-- The three documents a brokerage actually needs, as system templates.
-- Each carries the broker licence disclosure required by the 2024 ethics rules.
insert into nadlan_pro.contract_templates (office_id, key, name, body_md, fields, is_system, sort)
values
(null, 'broker_agreement', 'הסכם תיווך',
'# הסכם תיווך במקרקעין

נערך ונחתם ביום {{date}}

**בין:** {{broker_name}}, מתווך/ת מקרקעין, רישיון מספר {{broker_license}} ("המתווך")
**לבין:** {{client_name}}, ת.ז. {{client_id}} ("הלקוח")

## 1. הנכס
{{property_address}}{{property_details}}

## 2. דמי תיווך
הלקוח מתחייב לשלם למתווך דמי תיווך בשיעור {{commission_pct}}% מסכום העסקה,
בתוספת מע״מ כדין. דמי התיווך ישולמו במועד חתימת ההסכם המחייב בין הצדדים.

## 3. גילוי נאות
המתווך מצהיר כי הוא בעל רישיון תיווך בתוקף מספר {{broker_license}}, וכי אין לו
עניין אישי בנכס מעבר לדמי התיווך המפורטים לעיל, אלא אם צוין אחרת בכתב.

## 4. תוקף
הסכם זה תקף למשך {{duration_months}} חודשים מיום חתימתו.

---
_חתימת הלקוח:_ {{signature}}
_תאריך:_ {{signed_date}}',
'["date","broker_name","broker_license","client_name","client_id","property_address","commission_pct","duration_months"]'::jsonb,
true, 10),

(null, 'memorandum', 'זיכרון דברים',
'# זיכרון דברים

נערך ונחתם ביום {{date}}

**המוכר:** {{seller_name}}, ת.ז. {{seller_id}}
**הקונה:** {{buyer_name}}, ת.ז. {{buyer_id}}

## 1. הנכס
{{property_address}}{{property_details}}

## 2. התמורה
סכום התמורה המוסכם: {{price}} ש״ח.

## 3. המשך
הצדדים מתחייבים לחתום על הסכם מכר מפורט בתוך {{days_to_contract}} ימים מיום
חתימת זיכרון דברים זה, אצל עורך דין שייבחר בהסכמה.

## 4. גילוי המתווך
העסקה נערכה בתיווך {{broker_name}}, רישיון מספר {{broker_license}}.

> **הערה משפטית:** זיכרון דברים עשוי להיחשב הסכם מחייב. מומלץ להיוועץ בעורך דין
> לפני החתימה.

---
_חתימת המוכר:_ {{signature_seller}}
_חתימת הקונה:_ {{signature_buyer}}
_תאריך:_ {{signed_date}}',
'["date","seller_name","seller_id","buyer_name","buyer_id","property_address","price","days_to_contract","broker_name","broker_license"]'::jsonb,
true, 20),

(null, 'viewing_confirmation', 'אישור הצגת נכס',
'# אישור הצגת נכס

ביום {{date}} הוצג ללקוח {{client_name}}, ת.ז. {{client_id}}, הנכס שברחוב
{{property_address}}.

ההצגה בוצעה על ידי {{broker_name}}, מתווך/ת מקרקעין, רישיון מספר {{broker_license}}.

הלקוח מאשר בזאת כי הנכס הוצג לו על ידי המתווך, וכי ידוע לו שבמקרה של התקשרות
בעסקה לגבי נכס זה יחולו דמי תיווך כמוסכם.

---
_חתימת הלקוח:_ {{signature}}
_תאריך:_ {{signed_date}}',
'["date","client_name","client_id","property_address","broker_name","broker_license"]'::jsonb,
true, 30)
on conflict do nothing;
