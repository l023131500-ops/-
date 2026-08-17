-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), and no SUPABASE_ACCESS_TOKEN/SB_PAT
-- is set in process, user or machine scope, so the Management API bootstrap
-- is out too. core.run_progress is not reachable from here by any route.
--
-- Joins the existing queue (see QA/*/*-0817/_heartbeat-pending.sql for the
-- full list and run order) — run all pending files in git-log commit order,
-- not folder-name order. Delete each file once its row lands.

insert into core.run_progress (phase, task, status, note) values (
'anti-drift sweep — NEEDS_USER.md §0ג "מכסת הפריסות של Vercel נגמרה" נבדק מחדש: החשבון עבר ל-Pro ב-12/08, הסעיף היסטוריה בלבד',
$$vercel-quota-recheck-0817 — NEEDS_USER.md §0ג נשא כותרת 🔴 "חוסם כל
אימות נוסף" מאז 03-06/08, מלפני שהחשבון עבר ל-Vercel Pro ב-12/08 (המכסה
החינמית 100/יום הוסרה לגמרי — כבר תועד ב-SYSTEMS_STATUS.md §"מה נשאר
לתקן" אבל מעולם לא עודכן ב-NEEDS_USER.md עצמו). שני התיקונים שהסעיף
תיעד כ"כתובים וממתינים לפריסה" (tivuch, kesef — ריפוד פוטר <24px) נבדקו
עכשיו מחדש מול הייצור: node scripts/qa/platform-audit.mjs נגד /tivuch
ו-/kesef (desktop+mobile+dark) — small:0 בכל שש המדידות. הכותרת שונתה
מ-🔴 ל-✅ עם הערת "עודכן 17/08" בראש הסעיף. אין שינוי קוד, אין פריסה —
מדידה + תיקון תיעוד. זה בלוק NEEDS_USER מיושן, לא בלוק SYSTEMS_STATUS —
סוג ראשון מהיום (needs-user-blockers-can-be-stale).

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס
שורות נכתבו בפועל בריצה הזו — אין גישת DB בכלל.

ראיות: QA/platform/vercel-quota-recheck-0817/_results.json.$$,
'blocked',
$$commit on fix/nadlan-a11y, pushed. Anti-drift sweep item: NEEDS_USER.md
§0ג ("Vercel deploy quota exhausted — blocks all further verification")
still carried its original 🔴 header from 03-06/08, predating the 12/08
Vercel Pro upgrade that removed the free-tier 100/day cap (already noted
in SYSTEMS_STATUS.md but never back-ported to NEEDS_USER.md itself). Its
two "written, waiting on deploy" fixes (tivuch, kesef footer touch
targets <24px) were re-measured live: platform-audit.mjs against
/tivuch and /kesef (desktop+mobile+dark) returns small:0 across all six
checks — both fixes are deployed. Header changed 🔴→✅ with a dated
17/08 resolution note. No code change; doc correction only. First
NEEDS_USER-side stale blocker found today (prior finds were all
SYSTEMS_STATUS-side). Joins the pending-heartbeat queue; run in commit
order.$$
);
