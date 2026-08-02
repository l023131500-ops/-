-- more30 · 36 nadlan-pro — invoices (stage 3) and commission tracking
-- ============================================================================
-- The legal position, verified August 2026: the Tax Authority requires an
-- allocation number (מספר הקצאה) on any tax invoice above a threshold, before
-- VAT. The threshold has stepped down 25,000 → 20,000 → 10,000 → 5,000 ILS
-- (June 2026, current). A brokerage commission on a flat is essentially always
-- above 5,000, so allocation numbers are the normal path here, not an edge case.
--
-- We do NOT talk to the Tax Authority directly. That needs accreditation, a
-- token that rotates quarterly, and ongoing security work. An authorised
-- provider (iCount / Green Invoice / Morning) issues the document and obtains
-- the allocation number; we record what came back.
--
-- The red line is enforced by a table constraint, not only in the UI: nothing
-- that looks like a tax invoice can exist without an allocation number.
-- ============================================================================

do $$ begin
  create type nadlan_pro.invoice_doc_type as enum
    ('tax_invoice', 'receipt', 'tax_invoice_receipt', 'payment_request', 'credit_note');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nadlan_pro.invoice_status as enum ('draft','issued','paid','cancelled','failed');
exception when duplicate_object then null; end $$;

-- A function of date, not a constant. An invoice issued last year must stay
-- judged by the rule that applied then; a constant would silently rewrite
-- history every time the Tax Authority steps the number down.
create or replace function nadlan_pro.allocation_threshold(p_on date default current_date)
returns numeric language sql immutable as $$
  select case
    when p_on >= date '2026-06-01' then 5000
    when p_on >= date '2026-01-01' then 10000
    when p_on >= date '2025-01-01' then 20000
    when p_on >= date '2024-05-01' then 25000
    else null            -- before the regime existed
  end::numeric;
$$;

create table if not exists nadlan_pro.invoices (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid not null references nadlan_pro.offices(id) on delete cascade,
  deal_id    uuid references nadlan_pro.deals(id) on delete set null,
  contact_id uuid references nadlan_pro.contacts(id) on delete set null,
  doc_type   nadlan_pro.invoice_doc_type not null default 'tax_invoice',
  status     nadlan_pro.invoice_status not null default 'draft',

  -- Null provider means nothing was issued: this row is a local draft only.
  provider        text,
  provider_doc_id text,
  provider_error  text,

  document_number   text,
  allocation_number text,      -- the whole point of the module

  amount_before_vat numeric(14,2) not null,
  vat_rate          numeric(5,2),   -- stored, not assumed: a reissue after a
  vat_amount        numeric(14,2),  -- VAT change must not restate itself
  total_amount      numeric(14,2),
  currency          text not null default 'ILS',

  -- The threshold in force on the issue date, copied in at write time so the
  -- row can be audited without re-deriving the law.
  threshold_applied numeric(14,2),

  customer_name  text,
  customer_id    text,
  customer_email text,
  description    text,
  pdf_url        text,
  issued_at      timestamptz,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),

  constraint tax_invoice_needs_allocation check (
    doc_type not in ('tax_invoice', 'tax_invoice_receipt')
    or status <> 'issued'
    or threshold_applied is null
    or amount_before_vat < threshold_applied
    or nullif(trim(coalesce(allocation_number, '')), '') is not null
  )
);

create index if not exists idx_np_inv_office on nadlan_pro.invoices(office_id, created_at desc);
create index if not exists idx_np_inv_deal   on nadlan_pro.invoices(deal_id);

alter table nadlan_pro.invoices enable row level security;

do $$ begin
  create policy np_invoices_all on nadlan_pro.invoices for all
    using (nadlan_pro.can_touch(office_id, created_by))
    with check (nadlan_pro.can_touch(office_id, created_by));
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on nadlan_pro.invoices to authenticated;
grant all on nadlan_pro.invoices to service_role;

-- What the invoice button may do, answered server-side so the rule lives in one
-- place rather than being re-decided by every screen.
create or replace function public.np_invoice_precheck(p_deal uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'deal_id', d.id,
    'commission_amount', d.commission_amount,
    'threshold', nadlan_pro.allocation_threshold(current_date),
    'needs_allocation',
      d.commission_amount is not null
      and d.commission_amount >= nadlan_pro.allocation_threshold(current_date),
    'provider', o.invoice_provider,
    'provider_connected', nullif(trim(coalesce(o.invoice_provider, '')), '') is not null,
    -- Only a provider can obtain an allocation number, so without one there is
    -- no tax invoice. The UI then offers a payment request and says why.
    'can_issue_tax_invoice', nullif(trim(coalesce(o.invoice_provider, '')), '') is not null,
    'blocked_reason', case
      when nullif(trim(coalesce(o.invoice_provider, '')), '') is null
        then 'לא מחובר ספק חשבוניות מורשה. בלי ספק אי אפשר לקבל מספר הקצאה מרשות המסים, ולכן אי אפשר להפיק חשבונית מס.'
      else null end,
    'buyer_name', bc.full_name, 'buyer_email', bc.email, 'seller_name', sc.full_name
  )
  from nadlan_pro.deals d
  join nadlan_pro.offices o on o.id = d.office_id
  left join nadlan_pro.contacts bc on bc.id = d.buyer_contact_id
  left join nadlan_pro.contacts sc on sc.id = d.seller_contact_id
  where d.id = p_deal;
$$;

create or replace function public.np_invoices(p_office uuid, p_deal uuid default null)
returns table (
  id uuid, deal_id uuid, doc_type text, status text, provider text,
  document_number text, allocation_number text, amount_before_vat numeric,
  vat_amount numeric, total_amount numeric, customer_name text,
  pdf_url text, issued_at timestamptz, provider_error text, created_at timestamptz
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select i.id, i.deal_id, i.doc_type::text, i.status::text, i.provider,
         i.document_number, i.allocation_number, i.amount_before_vat,
         i.vat_amount, i.total_amount, i.customer_name,
         i.pdf_url, i.issued_at, i.provider_error, i.created_at
  from nadlan_pro.invoices i
  where i.office_id = p_office and (p_deal is null or i.deal_id = p_deal)
  order by i.created_at desc;
$$;

-- Records what an authorised provider returned. Called by the server-side route
-- after the provider responds, never by the browser — only the server holds the
-- provider key.
--
-- The explicit check duplicates the table constraint on purpose: the constraint
-- guarantees correctness, this turns a constraint violation into a sentence a
-- person can act on.
create or replace function public.np_invoice_record(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_id        uuid;
  v_doc       nadlan_pro.invoice_doc_type := coalesce(nullif(p->>'doc_type',''), 'tax_invoice')::nadlan_pro.invoice_doc_type;
  v_status    nadlan_pro.invoice_status   := coalesce(nullif(p->>'status',''), 'draft')::nadlan_pro.invoice_status;
  v_amount    numeric := nullif(p->>'amount_before_vat','')::numeric;
  v_alloc     text    := nullif(trim(coalesce(p->>'allocation_number','')), '');
  v_threshold numeric := nadlan_pro.allocation_threshold(current_date);
begin
  if v_amount is null then
    raise exception 'סכום לפני מע״מ חובה';
  end if;

  if v_status = 'issued'
     and v_doc in ('tax_invoice', 'tax_invoice_receipt')
     and v_threshold is not null
     and v_amount >= v_threshold
     and v_alloc is null then
    raise exception
      'לא ניתן לרשום חשבונית מס על % ₪ בלי מספר הקצאה. הסף הנוכחי הוא % ₪ לפני מע״מ.',
      v_amount, v_threshold;
  end if;

  insert into nadlan_pro.invoices (
    office_id, deal_id, contact_id, doc_type, status, provider, provider_doc_id,
    provider_error, document_number, allocation_number, amount_before_vat,
    vat_rate, vat_amount, total_amount, threshold_applied,
    customer_name, customer_id, customer_email, description, pdf_url,
    issued_at, created_by)
  values (
    (p->>'office_id')::uuid, nullif(p->>'deal_id','')::uuid, nullif(p->>'contact_id','')::uuid,
    v_doc, v_status,
    nullif(p->>'provider',''), nullif(p->>'provider_doc_id',''), nullif(p->>'provider_error',''),
    nullif(p->>'document_number',''), v_alloc, v_amount,
    nullif(p->>'vat_rate','')::numeric, nullif(p->>'vat_amount','')::numeric,
    nullif(p->>'total_amount','')::numeric, v_threshold,
    p->>'customer_name', p->>'customer_id', p->>'customer_email',
    p->>'description', nullif(p->>'pdf_url',''),
    case when v_status = 'issued' then now() else null end,
    auth.uid())
  returning id into v_id;

  -- An issued invoice moves the deal's commission along, so the two cannot
  -- disagree about whether the money has been billed.
  if v_status = 'issued' and (p->>'deal_id') is not null then
    update nadlan_pro.commissions
       set status = 'invoiced'
     where deal_id = (p->>'deal_id')::uuid and status = 'pending';
  end if;

  return v_id;
end $$;

create or replace function public.np_commission_save(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_id uuid := nullif(p->>'id','')::uuid;
begin
  if v_id is null then
    insert into nadlan_pro.commissions (office_id, deal_id, member_id, payer, pct, amount, status, note)
    values ((p->>'office_id')::uuid, (p->>'deal_id')::uuid,
            coalesce(nullif(p->>'member_id','')::uuid, auth.uid()),
            coalesce(nullif(p->>'payer',''), 'buyer'),
            nullif(p->>'pct','')::numeric, nullif(p->>'amount','')::numeric,
            coalesce(nullif(p->>'status',''), 'pending')::nadlan_pro.commission_status,
            p->>'note')
    returning id into v_id;
  else
    update nadlan_pro.commissions c set
      member_id = coalesce(nullif(p->>'member_id','')::uuid, c.member_id),
      payer  = coalesce(nullif(p->>'payer',''), c.payer),
      pct    = coalesce(nullif(p->>'pct','')::numeric, c.pct),
      amount = coalesce(nullif(p->>'amount','')::numeric, c.amount),
      status = coalesce(nullif(p->>'status','')::nadlan_pro.commission_status, c.status),
      collected_at = case when nullif(p->>'status','') = 'collected'
                          then coalesce(c.collected_at, now()) else c.collected_at end,
      note = coalesce(p->>'note', c.note)
    where c.id = v_id;
    if not found then
      raise exception 'רשומת העמלה לא נמצאה, או שאין לך הרשאה לערוך אותה';
    end if;
  end if;
  return v_id;
end $$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.np_invoice_precheck(uuid)',
    'public.np_invoices(uuid,uuid)',
    'public.np_invoice_record(jsonb)',
    'public.np_commission_save(jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
