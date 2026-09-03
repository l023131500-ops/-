# 32 נדל"ן ברגע + 36 נדל"ן פרו — deploy-readiness (P2, per OWNER ORDER 2026-09-02b)

## 2026-09-03, session (loop A) — RequestForm leads (נסח/רמ"י/היתר) נשמרו ל-DB אך נעלמו: אין לוח ניהול ל-`document_requests`

בדיקה עצמאית של `document_requests` (הטבלה הכללית שמזינה `RequestForm.tsx`,
מוטמעת בדף הבית `app/page.tsx` וב-`/request`) מצאה `grep` אחד עם תוצאה
יחידה בכל הריפו: `lib/store.ts`'s `submitDocumentRequest` — הכתיבה בלבד.
שום קובץ לא קרא מהטבלה מעולם. `document_requests` כבר נושאת עמודת `status`
(ברירת מחדל `'new'`) שמעולם לא נקראה על ידי שום קוד — בדיוק אותה מחלקת-פער
שנמצאה שוב ושוב היום ב-`tabu_requests`/`tik_meida_requests` (ראו
`CLAUDE.md`), רק שכאן זה הטופס הכללי-יותר והישן-יותר שקדם לשניהם, וכבר
תועד כפער-ידוע-ולא-תוקן בסבב `session 5` (25/08/2026): "בקשות אליו נעלמות
היום בלי שאף אחד רואה אותן... לא תוקן בסבב הזה (מחוץ לסקופ)". לקוח ששלח
שם+טלפון/מייל דרך דף הבית עצמו (לא רק `/request`) ובחר "נסח טאבו"/"אישור
רמ״י"/"מידע היתר"/"מסמך אחר" קיבל "הבקשה נשמרה ✓" — אבל הבקשה נעלמה
לצמיתות מבחינת הצוות. אומת חי ב-MCP: הטבלה קיימת עם RLS מופעל ומדיניות
`public_insert_requests` (INSERT-בלבד ל-`public`, `with check(true)`) —
בדיוק אותו דפוס כמו `tabu_requests`/`report_requests`, לא באג-אבטחה (אין
מדיניות SELECT/UPDATE, כך שגם למרות ה-GRANT הרחב שכבר קיים על הטבלה, קריאה
בפועל חסומה לגמרי חוץ מ-`service_role`).

**התיקון:** לוח ניהול חדש, אותו דפוס מדויק כמו `TabuRequestsBoard`/
`TikMeidaRequestsBoard` (אין מיגרציה חדשה — הטבלה/עמודת ה-`status` כבר
קיימות, רק חיווט קריאה+פעולה חסרים):
- `lib/store.ts`: `listDocumentRequests`/`pendingDocumentRequestCount`/
  `markDocumentRequestContacted` (service-role, `getStore()` הקיים) —
  מותנה ב-`status='new'` כדי שלחיצה כפולה לא תדרוס תיוג קודם, בדיוק כמו
  `markTabuRequestSent`.
- `app/api/admin/document-requests/route.ts` (GET+POST, `adminGate`
  הקיים, אותו חוזה כמו `tabu-requests/route.ts`).
- `components/admin/DocumentRequestsBoard.tsx` — רשימת בקשות + תג
  סטטוס (חדש/נוצר קשר) + כפתור "סומן שנוצר קשר".
- מקטע "בקשות מסמכים (נסח / רמ״י / היתר / אחר)" חדש ב-`app/admin/page.tsx`,
  אחרי "בקשות תיק מידע להיתר" ולפני "התראות אזוריות" — אותו gate על
  `ADMIN_TOKEN` כמו שני הלוחות הסמוכים.

אומת: `npx esbuild` (רשת זמינה הסבב הזה) תרגם את כל ארבעת הקבצים
שנוספו/שונו נקי (`--bundle --platform=node`, עם `--external` על כל
ה-imports החיצוניים/פנימיים). בדיקת איזון-סוגריים על כל ארבעת הקבצים
עברה. אומת חי ב-MCP בתוך `BEGIN;...ROLLBACK;` מול הטבלה האמיתית: הכנסת
בקשה מדומה → `UPDATE ... WHERE status='new'` ראשון הופך אותה ל-`contacted`
(1 שורה) → אותו `UPDATE` בדיוק בשנית מחזיר 0 שורות (השומר עובד, בדיוק כמו
שני-קליקים על הכפתור) → מצב סופי `contacted` אומת בשאילתה נפרדת אחרי שני
העדכונים (לא בתוך אותו `WITH` — CTEs מתקנים בשלב-אימות ראשון גילו ש-CTEs
מקבילות בפקודה אחת לא רואות זו את זו, אז חולק לשלושה statements עוקבים
כמו הקוד האמיתי) — התאמה מדויקת בין ה-DB וההתנהגות ש-`markDocumentRequestContacted`
מיישמת. אפס שיוריות אחרי `ROLLBACK` (נבדק בנפרד). לא הופעלה `apply_migration`
בכלל — אין שינוי סכימה/RLS/מדיניות, רק קוד-אפליקציה שקורא/כותב דרך מפתח
השירות הקיים כבר.

אפס רגרסיה: `submitDocumentRequest`/`RequestForm.tsx`/`/api/request` לא
נגעו — נתיב היצירה הציבורי זהה לפני/אחרי. שני קבצים חדשים + הרחבה תוספתית
של `lib/store.ts` ומקטע חדש ב-`app/admin/page.tsx` (import אחד + `<Section>`
אחת, שום לוח/מקטע/ייבוא קיימים לא נגעו). נדחף לענף
`fix/32-nadlan-berega-document-requests-admin-board-0903` — לא מוזג. System
35 KioskFleet ו-36 nadlan-pro לא נגעו, לפי ה-HARD STEERING.

## 2026-09-02, session (loop A) — quantified the P2 "not live" blocker, same method as apps/35-kioskfleet/STATUS.md session 7

`core.projects` note #33 got `OWNER ORDER 2026-09-02b` today: MERGE each
priority system's best/latest work to main and DEPLOY, in order
35 → 32+36 → 01 → .... System 35 was already fully diagnosed (STATUS.md
here in `apps/35-kioskfleet`, session 7): 0 `core.build_tasks` todo rows,
a clean 14-commit-ahead integration tip, but no way to actually promote it
from this sandbox (no Railway CLI/token). This round did the equivalent
check for the next system in priority order, 32+36, instead of re-running
the same diagnosis on 35 a second time (that would be exactly the busywork
the new owner order says to stop).

**Build state:** `core.build_tasks` has **zero** `todo` rows for `32`, `36`,
`01`, `15`, `35` (all `done`) — confirmed live via MCP this round. There is
no pending feature work in this loop's slice; what remains is purely the
deploy step.

**Integration tip:** `feat/32-36-nadlan-reconcile-orphaned-chain-0902`
(`782cbe60`) already reconciles the full ~59-branch, ~1700-commit P2 chain
(360 panorama, street-video walk, TABU + tik-meida-le-heter workflows,
comparables trend chart, marketing-copy/images homepage, personal history,
report/report-pull audit trails, nadlan-pro team/forum/rentals/office-site/
lead-intake/area-watch, RLS + FK-index + search_path perf/security fixes)
into a single clean tip. `git rev-list --left-right --count` against this
repo's own main branch (`claude/build-monorepo-more30-peilok`) shows the
reconcile tip is strictly ahead (0 commits behind), and `git merge-tree`
against their merge-base shows a clean merge with no conflict markers in
the P2-scoped files. Same shape as 35: reconciled, tested (per each session's
own individual verification, logged throughout `apps/32-nadlan-berega/
CLAUDE.md`), not merged.

**What "deploy" actually means here — new finding this round, more severe
than 35's case:** unlike kiosk (a single Railway service tracking one
branch), `/nadlan` and `/tivuch` are **not served by this monorepo's git
history at all**, even though `apps/32-nadlan-berega/` lives here. Checked
three independent ways:
1. This repo's own `vercel.json` (root) has `"git": {"deploymentEnabled":
   false}` — pushing to this repo's `origin` (`l023131500-ops/-`) would not
   trigger a Vercel build even if it were otherwise safe to do.
2. `NIGHT_PROGRESS.md` documents the real mechanism used every time `/nadlan`
   and `/tivuch` actually went live: a **separate Vercel project per system**
   (`nadlan-more30`, `nadlan-pro-more30` — "אינו ב-monorepo `apps/` כלל"),
   updated by manually staging a build into `_deploy/<proj>/` and running
   `vercel deploy --prod` from a machine with the Vercel CLI and
   `l023131500-ops-projects`-scoped credentials, then the **portal's own**
   `vercel.json` rewrites proxy `more30.com/nadlan` → that separate project.
   `SYSTEMS_STATUS.md` (17/08 Lighthouse pass) confirms `/nadlan`/`/tivuch`
   are live today — but that reflects whatever was last hand-deployed that
   way, not this branch's tip.
3. This sandbox has **no Vercel CLI, no Railway CLI, and no `deploy_to_vercel`
   MCP tool connected** (checked `which vercel railway` → empty; `ToolSearch
   vercel deploy` → only `mcp__supabase__deploy_edge_function` matches,
   unrelated). The MCP tool `NIGHT_PROGRESS.md` describes using for this
   exact purpose in an earlier session is not available in this session.

**Net effect:** for 32/36 (and, by the same argument, likely 01/15 — not
individually re-verified this round to stay in scope), reaching the
`OWNER ORDER 2026-09-02b` deploy mandate needs two things this sandbox does
not have: (a) this session's own standing rule against pushing a
production-tracked branch, same as documented for 35, and (b) — new this
round — the actual deploy credentials/CLI simply are not present here even
if (a) were resolved. Unlike 35 (one `git push` + an unknown-shape "Railway
promote" step), getting 32/36 live requires a human with the Vercel CLI
logged into `l023131500-ops-projects` to pull this reconciled tip and run
the `_deploy/`-staging + `vercel deploy --prod` sequence `NIGHT_PROGRESS.md`
documents. Flagging this precisely, the same way 35's session 7 did, instead
of leaving "not deployed" as an unquantified recurring note.

Not merged, not deployed, no code changed this round (verification-only,
zero new commits to app source). `core.build_tasks` for 32/36 confirmed
still 0 `todo` — no regression, no new work invented to look busy.

## 2026-09-03, session (loop A) — TABU/tik-meida analyzed docs never reached the plain-text email

Per the standing instruction not to re-litigate the deploy blocker (already
exhaustively documented above and in `NEEDS_USER.md`), this round went back
to feature-completeness auditing against `core.projects` note #33's TOP
BUILD DIRECTIVE, specifically the TABU workflow's "attach to client" step.
The TABU/tik-meida workflows themselves (request → mgmt task+email → upload
→ AI research pass → attach-to-client, `build_tasks` id=4/5) were already
fully built across many earlier sessions today (see `CLAUDE.md` for the
full history, including a same-day fix that added `perFloorRights` to
`lib/tabudoc.ts`'s AI extraction to match system 36).

Cross-checking that same-day `perFloorRights` fix against every surface
that renders TABU analysis found a real, separate gap that predates today:
`app/api/admin/requests/route.ts` (the route that actually sends the
purchased report to the client) already fetches `tabuDocs`/`tikMeidaDocs`
via `tabuForProperty()`/`tikMeidaForProperty()` and passes them into
`reportEmailHtml(report, { tabuDocs, tikMeidaDocs, ... })` — but the same
call site invoked `reportEmailText(report)` with **only** the report,
never the docs. `reportEmailText` is the plain-text part of the multipart
email (`sendEmail({ html, text })`) — read by text-only mail clients and
used as the fallback/spam-filter body on every send. Every other report
section (street stats, nearby plans, feasibility, valuation, listings,
price trend, VIP estimates) already has a matching text-rendering path in
`reportEmailText` — TABU and tik-meida were the only two sections that were
HTML-only. A client whose report included a paid, analyzed nesach tabu or
an issued tik-meida document — the actual product being sold in that
workflow — never saw that content at all if they read the text part.

**Fix:** added `tabuBlockText()`/`tikMeidaBlockText()` to
`lib/reporthtml.ts`, mirroring `tabuBlock()`/`tikMeidaBlock()` field for
field (owners, mortgages, cautionNotes, leases, otherEncumbrances,
`perFloorRights`, registered parcel/sub-parcel/shared areas, unreadable
fields, summary; tik-meida: file name, upload date, staff note) as plain
text instead of HTML. `reportEmailText()` gained an optional second
parameter `{ tabuDocs?, tikMeidaDocs? }` (defaults to `[]` via `docs?.X ??
[]`, so any other/future caller invoking it with just `report` keeps the
exact same behavior as before). The two new sections are inserted at the
same relative position as the HTML version — after the price-trend
section, right before the VIP-estimates section. Call site updated:
`text: reportEmailText(report, { tabuDocs, tikMeidaDocs })`.

Verified: `npx esbuild lib/reporthtml.ts --bundle` (network available this
round) transpiled clean with no errors; bracket-balance check on both
changed files (`lib/reporthtml.ts`: 710/710 parens, 644/644 braces, 72/72
brackets; `route.ts`: 65/65, 58/58, 6/6). `tabuBlockText`/`tikMeidaBlockText`
logic was independently replicated in standalone Node (no `node_modules`/
`tsc` in this sandbox) and run against 18 scenarios: empty doc arrays (both
functions return `''`), a doc with `analysis: null` (excluded, matches
`tabuBlock`'s `done` filter), a full apartment-scope doc exercising every
field including `perFloorRights` and all three area fields, a
building-scope doc with no mortgages/cautionNotes (correctly falls back to
the "none found" line, matching `tabuBlock`'s exact branching), and
tik-meida docs with/without a staff note — all 18 passed, matching the
HTML version's behavior field-for-field. No DB schema touched (pure
application code) so no `BEGIN/ROLLBACK` verification was needed for this
specific fix. Zero regression: `reportEmailHtml`/`tabuBlock`/`tikMeidaBlock`
untouched; `reportEmailText`'s existing sections (street/valuation/listings/
categories/deals/priceTrend/vipEstimates/warnings) are unchanged, only two
new conditional sections inserted. `core.build_tasks` id=116 (system 32,
priority 72) inserted as `done` with the full note. Committed to
`fix/32-nadlan-berega-tabu-tikmeida-email-text-0903`, pushed — not merged.
System 35 KioskFleet, systems 01/15/36, and no protected schema (`zr_*`,
`csj`, `csj_src`, `igud`) touched, per the HARD STEERING / task scope.
