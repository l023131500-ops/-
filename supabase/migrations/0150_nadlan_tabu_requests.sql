-- more30 · 32 nadlan-berega — client-facing TABU-extract request queue
-- ============================================================================
-- P2 FEATURE (core.projects #33, build_tasks id=4/11): "TABU workflow:
-- checkbox+grade in VIP report -> mgmt task+email(gush/helka) -> upload nesach
-- + Research button -> disabled btn until sent -> active view/download + AI
-- plain-language rights explanation -> attach to client".
--
-- Everything AFTER origination already existed before this migration: upload
-- + AI analysis (nadlan.tabu_documents, lib/tabudoc.ts), the plain-language
-- explanation (analysis.summary, already 3-5 spoken-Hebrew lines a buyer needs
-- to know), and attaching the analyzed extract to the client (reportEmailHtml
-- already renders tabuBlock() into the emailed report via tabuForProperty()).
-- What never existed: any way for the CLIENT to actually ask for one. Every
-- tabu_documents row today was uploaded because a staff member manually
-- decided to, with zero record of a client ever requesting it and zero
-- notification telling staff a gush/helka needs a real extract pulled from
-- the Land Registry. This table is that missing origination step ("checkbox
-- + grade" -> "mgmt task + email").
--
-- Deliberately NOT reusing nadlan.report_requests: that table is the intake
-- form for an entire property *report* (before any report exists), while this
-- is a request made by a client already looking at an existing VIP report who
-- additionally wants the real TABU extract pulled. tabu_documents.request_id
-- stays an optional FK to report_requests (unrelated, pre-existing) --
-- tabu_requests.tabu_document_id below is the new, separate link from a
-- request to the document that eventually fulfilled it.
--
-- RLS mirrors nadlan.report_requests exactly (verified live via
-- information_schema.role_table_grants / pg_policies before writing this):
-- INSERT-only for `public`, no SELECT/UPDATE/DELETE policy for anon/
-- authenticated at all -- a client can create a request but can never read
-- anyone else's (this table holds real names/emails/phones, same sensitivity
-- class as report_requests). All reads/updates go through the service key,
-- same as report_requests/tabu_documents.
-- ============================================================================

create table if not exists nadlan.tabu_requests (
  id bigint generated always as identity primary key,
  gush text not null,
  helka text not null,
  tat_helka text,
  entrance text,
  apartment text,
  address text,
  city text,
  asset_type text,
  -- "grade" per the owner's spec wording — request priority.
  grade text not null default 'normal' check (grade in ('normal', 'urgent')),
  requester_name text,
  requester_email text not null,
  requester_phone text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'fulfilled', 'failed')),
  -- best-effort flag: did the staff-notification email actually go out.
  -- Independent of `status` -- a request can be `pending` with the email
  -- having failed (RESEND not configured), which the admin board surfaces.
  admin_email_sent boolean not null default false,
  admin_email_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  sent_by text,
  fulfilled_at timestamptz,
  -- Set once the extract that answers this request is uploaded+analyzed.
  tabu_document_id bigint references nadlan.tabu_documents(id) on delete set null
);

create index if not exists tabu_requests_status_idx on nadlan.tabu_requests (status);
create index if not exists tabu_requests_parcel_idx on nadlan.tabu_requests (gush, helka);

alter table nadlan.tabu_requests enable row level security;

create policy public_insert_tabu_requests
  on nadlan.tabu_requests
  for insert
  to public
  with check (true);

-- Same grant set as report_exports/tabu_documents (0143): anon/authenticated
-- get table-level grants but RLS only exposes INSERT (no SELECT/UPDATE/DELETE
-- policy), matching report_requests' live grant set exactly.
grant select, insert, update, delete, references, trigger, truncate
  on nadlan.tabu_requests
  to anon, authenticated, service_role;
