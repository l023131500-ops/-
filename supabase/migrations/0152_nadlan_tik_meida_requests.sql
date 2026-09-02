-- more30 · 32 nadlan-berega — client-facing "תיק מידע להיתר" request queue
-- ============================================================================
-- core.build_tasks id=5 (system 32, priority 50): "Planning info auto-pull
-- (govmap/minhal ha-tichnun layers) shown immediately; tik-meida-le-heter as
-- official request workflow (request->mgmt->issue->attach)".
--
-- The first half was already fully built before this migration: land use +
-- the plans registry (XPLAN layers 1/4) are queried unconditionally in every
-- report via lib/permits.ts / lib/xplan.ts and shown immediately in
-- PermitsPanel.tsx, no request needed. What never existed is a workflow for
-- the *official* "תיק מידע להיתר" (Building-Permit Information File) that the
-- local planning committee issues on request — a different, heavier document
-- than the auto-pulled plan/land-use summary, requested per parcel from the
-- committee itself, same as a TABU extract is requested from the Land
-- Registry. This migration mirrors 0150_nadlan_tabu_requests.sql exactly for
-- that same "checkbox+grade -> mgmt task+email -> upload+note -> attach"
-- shape, at the parcel level (a תיק מידע covers the whole גוש/חלקה, not a
-- single apartment the way a TABU extract can).
--
-- RLS mirrors nadlan.tabu_requests exactly (verified live via
-- information_schema.role_table_grants / pg_policies before writing this):
-- INSERT-only for `public`, no SELECT/UPDATE/DELETE policy for anon/
-- authenticated -- a client can create a request but can never read anyone
-- else's (real names/emails/phones, same sensitivity class as tabu_requests).
-- tik_meida_documents has RLS enabled with no policy at all, same posture as
-- tabu_documents/saved_reports: every read/write goes through the service key.
-- ============================================================================

create table if not exists nadlan.tik_meida_documents (
  id bigint generated always as identity primary key,
  request_id bigint,
  gush text not null,
  helka text not null,
  address text,
  city text,
  file_name text not null,
  file_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  -- מה שהצוות כותב בעברית פשוטה כשהתיק מתקבל מהוועדה — למה זה מרשה/דורש,
  -- לא ניתוח AI (בשונה מנסח טאבו): תיק מידע הוא מסמך רשמי מהוועדה עצמה,
  -- והתוכן שלו כבר "מדבר" — הצוות רק מתמצת אותו בקצרה, לא מפענח נתונים גולמיים.
  note text,
  uploaded_by text,
  uploaded_at timestamptz not null default now()
);

create index if not exists tik_meida_documents_parcel_idx on nadlan.tik_meida_documents (gush, helka);

alter table nadlan.tik_meida_documents enable row level security;

grant select, insert, update, delete, references, trigger, truncate
  on nadlan.tik_meida_documents
  to service_role;

create table if not exists nadlan.tik_meida_requests (
  id bigint generated always as identity primary key,
  gush text not null,
  helka text not null,
  address text,
  city text,
  asset_type text,
  -- מה שהלקוח מתכנן לבקש היתר עבורו — הקשר חופשי לוועדה, לא שדה מובנה.
  purpose text,
  grade text not null default 'normal' check (grade in ('normal', 'urgent')),
  requester_name text,
  requester_email text not null,
  requester_phone text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'fulfilled', 'failed')),
  admin_email_sent boolean not null default false,
  admin_email_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  sent_by text,
  fulfilled_at timestamptz,
  -- Set once the תיק מידע that answers this request is uploaded.
  tik_meida_document_id bigint references nadlan.tik_meida_documents(id) on delete set null
);

create index if not exists tik_meida_requests_status_idx on nadlan.tik_meida_requests (status);
create index if not exists tik_meida_requests_parcel_idx on nadlan.tik_meida_requests (gush, helka);

alter table nadlan.tik_meida_requests enable row level security;

create policy public_insert_tik_meida_requests
  on nadlan.tik_meida_requests
  for insert
  to public
  with check (true);

grant select, insert, update, delete, references, trigger, truncate
  on nadlan.tik_meida_requests
  to anon, authenticated, service_role;

alter table nadlan.tik_meida_documents
  add constraint tik_meida_documents_request_id_fkey
  foreign key (request_id) references nadlan.tik_meida_requests(id) on delete set null;

create index if not exists tik_meida_documents_request_idx on nadlan.tik_meida_documents (request_id);

-- Private bucket — a תיק מידע may include the applicant's own building/lot
-- details tied to a real request; same posture as `tabu` (0150-era, live-only
-- bucket), not public like nadlan-street-video/nadlan-pro-media.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tik-meida', 'tik-meida', false, 26214400,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
