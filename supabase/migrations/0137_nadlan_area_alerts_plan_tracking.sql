-- more30 · 32 nadlan-berega + 36 nadlan-pro — "מעקב אזור" also watches nearby
-- planning (תב"ע) entries, not just registered deals
-- ============================================================================
-- Module 3 of NADLAN_PRO_מחקר_ואפיון.md חלק ג' promises the watch/alert
-- engine notifies on "נכס חדש שנמכר, שינוי מחיר, היתר/תב"ע חדשה, הזדמנות
-- השקעה" — but lib/areaalerts.ts (0133) only ever diffed registered deals
-- (`notified_deal_keys`). This adds the same send-once ledger pattern for
-- nearby planning entries (lib/nearbyplans.ts's `nearbyConstructionPlans`,
-- already built+verified for the report's §12 panel), keyed by
-- `planNumber|status` so a status change (e.g. "בבדיקה" -> "אישור") is
-- treated as new and re-notified, same as a brand-new plan.
--
-- Additive only: new column with a safe default, existing rows unaffected.

alter table nadlan.area_alerts
  add column if not exists notified_plan_keys text[] not null default '{}';
