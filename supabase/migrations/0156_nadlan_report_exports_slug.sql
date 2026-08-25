-- more30 · 32 nadlan-berega — link report_exports to the live property model
-- (core.build_tasks id=7: "every search and produced report fully visible —
-- full detail, who produced, when, status; full audit trail")
-- ============================================================================
-- `report_exports.property_id` (bigint, FK -> nadlan.properties) was wired
-- for a *different*, older caching model (`lib/store.ts` cacheProfile /
-- app/api/profile — a legacy "property ID card" feature, see
-- PropertyIdCard.tsx / app/api/agent). The live report flow's identity model
-- (`/report`, `/present`, saved_reports, saved_report_versions,
-- street_video_cache, tabu_documents, ...) keys everything by the permanent
-- `slug` (text) from lib/savedreports.ts — never by nadlan.properties.id.
-- Because of that mismatch, `logExport()` (app/api/pdf, app/api/deck) always
-- inserted `property_id=null`: every PDF/deck download ever logged was
-- unattributable to any property, so it could never be shown as part of that
-- property's audit trail.
--
-- Fix: add `slug`, referencing the same live identity as every other table
-- in this flow. `property_id`/`nadlan.properties` are left untouched — that
-- legacy feature still works exactly as before, zero regression.
-- ============================================================================

alter table nadlan.report_exports
  add column if not exists slug text references nadlan.saved_reports (slug) on delete set null;

create index if not exists report_exports_slug_idx on nadlan.report_exports (slug);
