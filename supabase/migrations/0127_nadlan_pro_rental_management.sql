-- more30 · 36 nadlan-pro — rental management ("שכירויות" tab, module 6)
-- ============================================================================
-- BACKFILL NOTICE: see 0126's header — applied live 2026-08-25 without a
-- matching repo file until now. Captures the final live state.
-- ============================================================================
--
-- The last unbuilt MVP-wave item from NADLAN_PRO_מחקר_ואפיון.md חלק ו': no
-- lease/tenant/payment-schedule table existed at all. "Ending soon" / "past
-- due" is computed at read time from end_date/renewal_notice_days
-- (np_leases), not stored — no cron needed to keep it honest.

do $$ begin
  create type nadlan_pro.lease_status as enum ('active', 'ended', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nadlan_pro.rent_payment_status as enum ('due', 'paid', 'waived');
exception when duplicate_object then null; end $$;

create table if not exists nadlan_pro.leases (
  id                    uuid primary key default gen_random_uuid(),
  office_id             uuid not null references nadlan_pro.offices(id) on delete cascade,
  owner_id              uuid references auth.users(id),
  property_id           uuid not null references nadlan_pro.properties(id) on delete cascade,
  landlord_contact_id   uuid references nadlan_pro.contacts(id),
  tenant_contact_id     uuid references nadlan_pro.contacts(id),
  monthly_rent          numeric,
  deposit_amount        numeric,
  start_date            date not null,
  end_date              date not null,
  renewal_notice_days   integer not null default 60,
  status                nadlan_pro.lease_status not null default 'active',
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists leases_office_idx on nadlan_pro.leases(office_id);
create index if not exists leases_property_idx on nadlan_pro.leases(property_id);
create index if not exists leases_active_end_idx on nadlan_pro.leases(end_date) where status = 'active';

create table if not exists nadlan_pro.rent_payments (
  id          uuid primary key default gen_random_uuid(),
  lease_id    uuid not null references nadlan_pro.leases(id) on delete cascade,
  due_date    date not null,
  amount      numeric not null,
  paid_amount numeric,
  paid_at     timestamptz,
  status      nadlan_pro.rent_payment_status not null default 'due',
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists rent_payments_lease_idx on nadlan_pro.rent_payments(lease_id);
create index if not exists rent_payments_due_idx on nadlan_pro.rent_payments(due_date) where status = 'due';

alter table nadlan_pro.leases enable row level security;
alter table nadlan_pro.rent_payments enable row level security;

-- Same office/owner gate every other nadlan_pro write table already uses
-- (deals, properties — nadlan_pro.can_touch, defined in 0009).
do $$ begin
  create policy np_leases_all on nadlan_pro.leases for all
    using (nadlan_pro.can_touch(office_id, owner_id))
    with check (nadlan_pro.can_touch(office_id, owner_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_rent_payments_all on nadlan_pro.rent_payments for all
    using (exists (
      select 1 from nadlan_pro.leases l
      where l.id = rent_payments.lease_id and nadlan_pro.can_touch(l.office_id, l.owner_id)
    ))
    with check (exists (
      select 1 from nadlan_pro.leases l
      where l.id = rent_payments.lease_id and nadlan_pro.can_touch(l.office_id, l.owner_id)
    ));
exception when duplicate_object then null; end $$;

revoke all on nadlan_pro.leases from anon;
revoke all on nadlan_pro.rent_payments from anon;

create or replace function public.np_leases(
  p_office uuid, p_status text default null, p_property uuid default null, p_limit int default 200
) returns table(
  id uuid, property_id uuid, property_title text, property_address text,
  landlord_contact_id uuid, landlord_name text, tenant_contact_id uuid, tenant_name text,
  monthly_rent numeric, deposit_amount numeric, start_date date, end_date date,
  renewal_notice_days int, status text, notes text, created_at timestamptz,
  days_to_end int, is_ending_soon boolean, is_overdue boolean, next_due_date date
) language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select l.id, l.property_id, pr.title, pr.address,
         l.landlord_contact_id, lc.full_name,
         l.tenant_contact_id, tc.full_name,
         l.monthly_rent, l.deposit_amount,
         l.start_date, l.end_date, l.renewal_notice_days,
         l.status::text, l.notes, l.created_at,
         (l.end_date - current_date)::int,
         (l.status = 'active' and l.end_date >= current_date
          and (l.end_date - current_date) <= l.renewal_notice_days),
         (l.status = 'active' and l.end_date < current_date),
         (select rp.due_date from nadlan_pro.rent_payments rp
          where rp.lease_id = l.id and rp.status = 'due'
          order by rp.due_date asc limit 1)
  from nadlan_pro.leases l
  join nadlan_pro.properties pr on pr.id = l.property_id
  left join nadlan_pro.contacts lc on lc.id = l.landlord_contact_id
  left join nadlan_pro.contacts tc on tc.id = l.tenant_contact_id
  where l.office_id = p_office
    and (p_status is null or l.status::text = p_status)
    and (p_property is null or l.property_id = p_property)
  order by l.end_date asc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

create or replace function public.np_lease_get(p_id uuid)
returns jsonb language sql stable security invoker
set search_path = nadlan_pro, public, pg_temp as $$
  select jsonb_build_object(
    'lease', to_jsonb(l),
    'property', (select to_jsonb(pr) from nadlan_pro.properties pr where pr.id = l.property_id),
    'landlord', (select to_jsonb(c) from nadlan_pro.contacts c where c.id = l.landlord_contact_id),
    'tenant', (select to_jsonb(c) from nadlan_pro.contacts c where c.id = l.tenant_contact_id),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', rp.id, 'due_date', rp.due_date, 'amount', rp.amount,
               'paid_amount', rp.paid_amount, 'paid_at', rp.paid_at,
               'status', rp.status::text, 'note', rp.note
             ) order by rp.due_date)
      from nadlan_pro.rent_payments rp where rp.lease_id = l.id), '[]'::jsonb)
  )
  from nadlan_pro.leases l where l.id = p_id;
$$;

create or replace function public.np_lease_save(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_start date;
  v_end date;
begin
  if v_id is null then
    v_start := (p->>'start_date')::date;
    v_end   := (p->>'end_date')::date;
    if v_start is null or v_end is null then
      raise exception 'תאריך התחלה ותאריך סיום הם שדות חובה';
    end if;
    if v_end < v_start then
      raise exception 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה';
    end if;
    insert into nadlan_pro.leases (
      office_id, owner_id, property_id, landlord_contact_id, tenant_contact_id,
      monthly_rent, deposit_amount, start_date, end_date, renewal_notice_days,
      status, notes)
    values (
      (p->>'office_id')::uuid,
      coalesce(nullif(p->>'owner_id', '')::uuid, auth.uid()),
      (p->>'property_id')::uuid,
      nullif(p->>'landlord_contact_id', '')::uuid,
      nullif(p->>'tenant_contact_id', '')::uuid,
      nullif(p->>'monthly_rent', '')::numeric,
      nullif(p->>'deposit_amount', '')::numeric,
      v_start, v_end,
      coalesce(nullif(p->>'renewal_notice_days', '')::integer, 60),
      coalesce(nullif(p->>'status', ''), 'active')::nadlan_pro.lease_status,
      p->>'notes')
    returning id into v_id;
  else
    select coalesce(nullif(p->>'start_date', '')::date, l.start_date),
           coalesce(nullif(p->>'end_date', '')::date, l.end_date)
      into v_start, v_end
      from nadlan_pro.leases l where l.id = v_id;
    if not found then
      raise exception 'החוזה לא נמצא, או שאין לך הרשאה לערוך אותו';
    end if;
    if v_end < v_start then
      raise exception 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה';
    end if;
    update nadlan_pro.leases l set
      property_id         = coalesce(nullif(p->>'property_id', '')::uuid, l.property_id),
      landlord_contact_id = coalesce(nullif(p->>'landlord_contact_id', '')::uuid, l.landlord_contact_id),
      tenant_contact_id   = coalesce(nullif(p->>'tenant_contact_id', '')::uuid, l.tenant_contact_id),
      monthly_rent        = coalesce(nullif(p->>'monthly_rent', '')::numeric, l.monthly_rent),
      deposit_amount      = coalesce(nullif(p->>'deposit_amount', '')::numeric, l.deposit_amount),
      start_date          = v_start,
      end_date            = v_end,
      renewal_notice_days = coalesce(nullif(p->>'renewal_notice_days', '')::integer, l.renewal_notice_days),
      status               = coalesce(nullif(p->>'status', '')::nadlan_pro.lease_status, l.status),
      owner_id            = coalesce(nullif(p->>'owner_id', '')::uuid, l.owner_id),
      notes               = coalesce(p->>'notes', l.notes)
    where l.id = v_id;
  end if;
  return v_id;
end $$;

create or replace function public.np_rent_payment_save(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_id uuid := nullif(p->>'id', '')::uuid;
begin
  if v_id is null then
    insert into nadlan_pro.rent_payments (lease_id, due_date, amount, note)
    values ((p->>'lease_id')::uuid, (p->>'due_date')::date, (p->>'amount')::numeric, p->>'note')
    returning id into v_id;
  else
    update nadlan_pro.rent_payments rp set
      due_date = coalesce(nullif(p->>'due_date', '')::date, rp.due_date),
      amount   = coalesce(nullif(p->>'amount', '')::numeric, rp.amount),
      note     = coalesce(p->>'note', rp.note)
    where rp.id = v_id;
    if not found then
      raise exception 'התשלום לא נמצא, או שאין לך הרשאה לערוך אותו';
    end if;
  end if;
  return v_id;
end $$;

create or replace function public.np_rent_payment_mark_paid(p_id uuid, p_paid_amount numeric default null)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  update nadlan_pro.rent_payments rp set
    status = 'paid',
    paid_at = now(),
    paid_amount = coalesce(p_paid_amount, rp.amount)
  where rp.id = p_id;
  if not found then
    raise exception 'התשלום לא נמצא, או שאין לך הרשאה לערוך אותו';
  end if;
end $$;

-- Idempotent: only inserts months that don't already have a row for this
-- lease, so re-running "הפקת לוח" after a manual edit never duplicates rows.
create or replace function public.np_lease_generate_schedule(p_lease uuid)
returns integer language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_lease nadlan_pro.leases;
  v_month date;
  v_created integer := 0;
begin
  select * into v_lease from nadlan_pro.leases where id = p_lease;
  if not found then
    raise exception 'החוזה לא נמצא, או שאין לך הרשאה לערוך אותו';
  end if;
  if v_lease.monthly_rent is null or v_lease.monthly_rent <= 0 then
    raise exception 'יש להזין שכר דירה חודשי לפני הפקת לוח תשלומים';
  end if;

  v_month := date_trunc('month', v_lease.start_date)::date;
  while v_month <= v_lease.end_date loop
    if not exists (
      select 1 from nadlan_pro.rent_payments rp
      where rp.lease_id = p_lease
        and date_trunc('month', rp.due_date) = v_month
    ) then
      insert into nadlan_pro.rent_payments (lease_id, due_date, amount)
      values (p_lease, greatest(v_month, v_lease.start_date), v_lease.monthly_rent);
      v_created := v_created + 1;
    end if;
    v_month := (v_month + interval '1 month')::date;
  end loop;
  return v_created;
end $$;
