# Roadmap — Client Management & Collaboration Platform

## Current State (Analysis)

Already in place:
- **Auth & roles:** `user_roles` (admin/client/partner), `has_role()` security-definer, `_authenticated` gate, separate admin/partner/client layouts.
- **Core tables:** `profiles`, `client_profiles` (with `uploaded_documents` jsonb + `payment_status`/`lead_source`), `partner_profiles`, `partner_assignments` (treatment_status), `tasks`, `communication_logs`, `client_consents`, `visibility_rules`.
- **Content:** `categories` (topic|professional), `topics` (+ category, response template), `professionals`, `client_topic_states`, `client_professional_assignments`.
- **Intake & automation:** `leads` table + public `/api/public/leads/submit`, `outbox_queue` with pg_net trigger → `/api/public/hooks/outbox-dispatch` → signed outbound POST to configured n8n `outbound_url` (HMAC + `X-API-Key`); inbound `/api/public/webhooks/incoming` (API-key-gated). `global_event_log` mirrors profile/task events.
- **UI:** Admin (clients, partners, tasks, content, access, transactions, integrations), Client (status, documents, consents), Partner (clients, tasks, feedbacks), public `/contact`.

Gaps that this roadmap closes: client data is shallow (name/email/phone only); no household/financial structure; no per-field custom-field engine; partner permission model is binary (assigned or not) with no per-section visibility; outbound payloads are ad-hoc per event type; no formal inbound action API (the inbound webhook only upserts `client_profiles`); no per-document ACLs; partner dashboard is mostly placeholder.

---

## Phase 1 — Advanced Data Model

Goal: turn `client_profiles` from a thin record into a normalized 360° profile, plus a schemaless custom-field engine for fields that vary per client/business line.

**New tables**
- `client_personal_details` (1:1, client_id PK) — id_number, date_of_birth, gender, marital_status, address (street/city/zip/country), residency_status, occupation, employer, notes.
- `client_financial_profile` (1:1) — monthly_income, monthly_expenses, assets_summary, liabilities_summary, bank_name, account_type, tax_residency, risk_profile.
- `client_family_members` (1:N) — relation (spouse/child/parent/sibling/other), full_name, id_number, date_of_birth, dependent (bool), notes.
- `client_employment_history` (1:N) — employer, role, start_date, end_date, monthly_gross, notes.
- `client_bank_accounts` (1:N) — bank, branch, account_number_last4, type, currency, primary (bool).
- `custom_field_definitions` — entity_type ('client'|'partner'|'professional'|'topic'), key, label, type ('text'|'number'|'date'|'boolean'|'select'|'multiselect'), options jsonb, required, visible_to_roles[], sort_order.
- `custom_field_values` — definition_id, entity_id, value jsonb. Unique (definition_id, entity_id).
- `documents` (replaces `client_profiles.uploaded_documents` jsonb) — id, owner_client_id, uploaded_by, category, name, storage_path, mime, size, status, partner_visible (bool), notes, timestamps. Migration backfills existing jsonb rows.

**Conventions**
- All tables: `created_at`/`updated_at` + `set_updated_at` trigger.
- RLS: clients see own; admin full; partner gated via Phase 2.
- GRANTs to `authenticated` + `service_role`; no `anon`.
- `uploaded_documents` jsonb column stays for one release with a copy script, then dropped in a follow-up migration.

**Deliverables**
- 1 migration (schema + RLS + backfill).
- TypeScript types regenerate automatically.
- Server fns: `getClientFullProfile`, `upsertPersonalDetails`, `upsertFinancialProfile`, CRUD for family/employment/bank, custom-field CRUD.

---

## Phase 2 — Access Control Layer

Goal: granular partner permissions beyond "assigned/not assigned", and per-document ACLs.

**Schema**
- `partner_permissions` — partner_id, section enum (`personal`|`financial`|`family`|`employment`|`bank`|`documents`|`tasks`|`communication`|`custom_fields`), access enum (`none`|`read`|`write`). Default deny.
- `partner_assignments` gains `permission_overrides jsonb` for per-client exceptions.
- `documents.partner_visible` + new `document_acls` (document_id, partner_id, access).
- `visibility_rules` extended: rule per (role, section, condition) — drives both API filtering and UI hiding.

**Security primitives**
- New SECURITY DEFINER fn `partner_can_access(_partner uuid, _client uuid, _section text, _level text)` — checks assignment + permission + override. All partner-scoped RLS policies call it.
- Admin server fns gated by `assertAdmin`.
- Document storage policy on `client-documents` bucket: only owner client, assigned partner with `documents:read` + ACL allowing, or admin.

**Admin UI**
- "הגדרת הרשאות וחשיפה" page gains a Permission Matrix per partner (sections × access) and a per-assignment override panel.

---

## Phase 3 — Automation Infrastructure (n8n, bidirectional)

Goal: one standardized contract for outbound events and a formal inbound action API. Full logging.

**Outbound — Standardized Event Envelope**
Every `outbox_queue` row is dispatched as:
```
{
  "event_id": "<uuid>",
  "event_type": "<dot.case>",        // client.created, client.updated, document.uploaded,
                                      // task.created, task.status_changed, topic.sent,
                                      // lead.created, partner.assigned, communication.logged
  "occurred_at": "<iso>",
  "schema_version": 1,
  "actor": { "user_id": "...", "role": "admin|client|partner|system" },
  "subject": { "type": "client|lead|task|document|topic", "id": "..." },
  "data": { ... event-specific, snake_case ... },
  "context": { "client_data": {...}, "partner_data": {...}, "links": {...} }
}
```
Headers: `X-API-Key`, `X-Webhook-Signature` (HMAC-SHA256), `X-Event-Type`, `X-Event-Id`. Existing dispatcher already does most of this — refactor `topics.sendTopicToClient` and `leads.submitLead` to emit this exact envelope; new events for documents/tasks/communications added via DB triggers writing into `outbox_queue`.

**Inbound — Action API**
- Single endpoint `POST /api/public/hooks/n8n-actions` (API-key + HMAC).
- Body: `{ "action": "client.update" | "client.create_task" | "communication.log" | "document.mark_reviewed" | "partner.assign" | "topic.send" | "client.merge", "data": {...}, "idempotency_key": "..." }`.
- Each action validated by Zod, executed via existing server fns under `supabaseAdmin`, recorded in new `inbound_action_log` (action, payload, status, error, idempotency_key UNIQUE).
- Existing `/api/public/webhooks/incoming` kept as deprecated alias for one release.

**Logging**
- `webhook_logs` table — direction (in|out), endpoint, event_type, status, latency_ms, request_headers (redacted), request_body, response_status, response_body, error.
- Admin "Integrations" page gains a log viewer with filters + retry button (re-enqueues outbox row).

**Reliability**
- Outbox retry: cron-style sweep every 5 min (pg_cron) re-dispatches `failed` rows with `attempts < 5`, exponential backoff via `next_attempt_at`.
- Dead-letter view for `attempts >= 5`.

---

## Phase 4 — UI/UX Implementation

**Admin**
- Client profile rebuilt as tabbed 360° view: Overview · Personal · Financial · Family · Employment · Banking · Documents · Topics · Professionals · Tasks · Communication · Custom Fields · Activity (from `global_event_log` + `webhook_logs`).
- Custom Fields manager (definitions CRUD with type/options/visibility).
- Permission Matrix UI (Phase 2).
- Integrations: outbound/inbound log viewer, replay, secret rotation hint, n8n endpoint reference card.

**Partner Dashboard** (currently placeholders)
- Home: KPIs (active clients, open tasks, overdue, recent activity).
- Clients: only assigned clients; sections filtered by `partner_permissions` + overrides.
- Tasks: kanban scoped to partner.
- Documents: only those with ACL grant.
- Feedback / notes back to admin via `communication_logs`.

**Client Dashboard**
- Status tracker (existing) + new sections: Personal/Financial/Family editable forms (write-back via server fns), Documents with category picker and per-doc status, Consents, Messages from partner.

**Cross-cutting**
- All forms RTL/Hebrew, react-hook-form + zod, optimistic updates via TanStack Query.
- Loading/error boundaries on every route (already standard here).

---

## Technical Notes

- Migrations split per phase (one big migration per phase, idempotent where possible). Each new `public` table follows the 4-step pattern (CREATE → GRANT → ENABLE RLS → POLICY).
- No service-role key in client code; admin ops always via `createServerFn` with `assertAdmin` or signature-verified public route.
- `outbox_queue` schema unchanged (just richer payloads); new `inbound_action_log` + `webhook_logs` + per-phase tables.
- Bidirectional contract documented in `docs/n8n-contract.md` (added in Phase 3).
- No breaking changes to existing routes; deprecations carry one-release overlap.

---

## Suggested Sequencing

1. **Phase 1** migration + server fns + types — ~1 build cycle.
2. **Phase 2** permissions schema + `partner_can_access` + admin matrix UI.
3. **Phase 3** standardized envelope refactor + inbound action API + logs.
4. **Phase 4** UI rebuild (admin tabs → partner dashboard → client forms).

Approve and I'll begin with Phase 1.
