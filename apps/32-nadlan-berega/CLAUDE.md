# CLAUDE.md — נדל"ן ברגע (קרא אותי בתחילת כל סשן)

## עדכון — 02/09/2026, session 2 (Loop A — אותו פער בדיוק ב-36 nadlan-pro, `sites/36-nadlan-pro/tivuch/app.html`)
המשך ישיר לרשומה שמתחת (32): הפער בין `fulfilled_at`/שם-מסמך שקיימים ב-DB
לבין מה שמוצג ללוח היה קיים גם ב-36 — יישום עצמאי לגמרי (`app.html` בלבד,
לא Next.js). `np_property_get` כבר מחזיר `sent_at`/`fulfilled_at` לכל שורת
`tabu_requests`/`tik_meida_requests` וגם `documents[].name`, אבל
`tabuHtml()`/`tikMeidaHtml()` (בערך שורות 1341/1505) רינדרו רק
`r.created_at` — `grep -n "fulfilled_at" app.html` החזיר אפס תוצאות לפני
התיקון. אותה מחלקת-פער בדיוק, קוד-תצוגה נפרד לגמרי מ-32 כי 36 אין לו Next.js.

נוסף בשני המקומות: שורה ירוקה "הושלם &lt;תאריך&gt; · &lt;שם-קובץ&gt;" כשה-
בקשה `fulfilled` וקיים `fulfilled_at`; חסר-מסמך/חסר-תאריך מדלג על השורה
בלי קריסה. אומת ע"י חילוץ `tabuHtml`/`tikMeidaHtml` + התלויות (`esc`/`dt`/
`dtm`/`TABU_STATUS_HE`/וכו') לקובץ עצמאי והרצה ב-Node מול 4 תרחישים
(pending, fulfilled+מסמך, fulfilled-tikmeida+מסמך, fulfilled-בלי-מסמך) —
כולם רינדרו נכון, התרחיש-קצה לא קרס. `node --check` נקי על שני בלוקי
ה-`<script>` המחולצים מהקובץ. בדיקת איזון-סוגריים על הקובץ המלא עברה
(931/931/3298/3298/251/251). אפס רגרסיה — תוספת טהורה, 9 שורות. נדחף לענף
`fix/36-nadlan-pro-tabu-tikmeida-fulfillment-visibility-0902` (919e56fe) —
לא מוזג. System 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 02/09/2026 (Loop A — לוחות בקשות נסח/תיק-מידע לא הציגו הושלמה-מתי/איזה-מסמך)
בעקבות OWNER ORDER 2026-09-02b (core.projects #33, "DEPLOY MANDATE"): כל
build_tasks של 35/32/36/01/15 מאומת `todo=0`, ודוחות deploy-readiness מ-
`3f59488a`/`95359bec`/`8aef6bc7` כבר תיעדו שהחסם היחיד הוא Vercel CLI חסר
בסביבה הזו — לא עוד עבודת-תיעוד חוזרת (STOP BUSYWORK). במקום זה בוצעה
ביקורת-איכות טרייה על 32 שמצאה פער אמיתי: `tabu_requests`/`tik_meida_requests`
כבר נושאות `fulfilled_at`/`tabu_document_id`/`tik_meida_document_id` (נכתבות
ע"י `fulfillMatchingTabuRequests`/`fulfillMatchingTikMeidaRequests`, ראו
session 7 למטה), וה-API routes כבר בוחרות את העמודות — אבל
`TabuRequestsBoard.tsx`/`TikMeidaRequestsBoard.tsx` מעולם לא רינדרו אותן.
צוות שראה כרטיס בסטטוס "הושלם" לא ידע מתי זה קרה או איזה מסמך שהועלה מילא
את הבקשה.

נוסף `attachFulfilledTabuDocumentNames`/`attachFulfilledTikMeidaDocumentNames`
(`lib/requests.ts`) — שולפות בבת-אחת את `file_name` של כל מסמך-שמילא בקשה,
קרויות משני ה-routes (`GET /api/admin/tabu-requests`,
`GET /api/admin/tik-meida-requests`). שתי הלוחות מקבלות שורת-הצלחה ירוקה על
כרטיס `fulfilled` עם התאריך ושם-הקובץ.

**אין עדיין שום שורה חיה בארבע הטבלאות** (`tabu_requests`/`tabu_documents`/
`tik_meida_requests`/`tik_meida_documents` — כולן 0 שורות, נבדק חי) — הפער
עדיין תיאורטי-לעת-עתה, אבל אמיתי ומוכן לרגע שהזרימה תשמש בפועל. אומת חי
ב-MCP (בלי `BEGIN/ROLLBACK` בפעם הראשונה בטעות — `execute_sql` בלי עטיפה
מפורשת מ-commit-ת מיד; תוקן ע"י ניקוי מפורש): הוכנסה שורת-מסמך אמיתית +
שורת-בקשה `fulfilled` שמצביעה עליה בכל אחת מהזוגות, הורצה בדיוק אותה שאילתת
ה-`SELECT id,file_name ... WHERE id IN (...)` שהעוזר החדש מריץ — אישרה
שם-קובץ נכון — ואז שתי השורות נמחקו ואומת שכל ארבע הטבלאות חזרו ל-0 (זהה
למצב שלפני הבדיקה). כל 5 הקבצים שהשתנו קומפלו נקי עם esbuild (הותקן מקומית
ל-`/tmp` לצורך הבדיקה הזו — לראשונה שיש `esbuild` אמיתי לבדיקת-syntax בסבב
`apps/32`, לא רק בדיקת-איזון-סוגריים כמו כל סבב קודם). אפס רגרסיה:
`fulfilled_document_name` הוא שדה אופציונלי חדש להעשרת-תצוגה בלבד — שום
עמודה/RPC/route קיימים לא נגעו. נדחף לענף
`fix/32-nadlan-berega-tabu-tikmeida-fulfillment-visibility-0902` — לא מוזג.
System 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 31/08/2026 (Loop A — build_tasks id=29: QUALITY AUDIT closed, homepage was missing images entirely)
`core.build_tasks` id=29 ("QUALITY AUDIT to marketing-ready: verify street
VIDEO works; stunning brochure + 2-4 illustrative images; WORKING customer
login") found `app/page.tsx` had **zero images anywhere** — confirmed by
grep and a live WebFetch render ("lacks hero imagery or illustrative
photography"). Built a new Supabase Edge Function
`nadlan-marketing-images` (reads `RECRAFT_API_KEY` from `core.secrets` via
`more30_secrets_fetch`, same pattern as `np-tabu-document-analyze`; calls
Recraft v4, same shape already proven in `apps/26-modaot-studio`), invoked
it once, got 4 real on-brand navy/gold illustrations into a new public
bucket `nadlan-marketing`. Wired into the homepage: `hero-skyline` as a
low-opacity hero background, the other three (`document-identity`,
`street-view-scan`, `trusted-report`) illustrate a new "לא עוד דוח טקסט —
נכס שרואים" section — which also fixed a real copy gap: the homepage never
mentioned the already-built 360 panorama / street-video features at all.

Login re-verified live (`more30.com/auth-button.js` → HTTP 200, real JS,
unchanged). Street video: infra re-confirmed intact and unregressed
(bucket + `street_video_cache` table), but full browser E2E
(`MediaRecorder`) remains impossible in this sandbox — same ceiling every
prior `apps/32` session has hit, `street_video_cache` still has 0 real rows.
Don't re-open that specific sub-item without a real browser or an
owner-run manual check.

Verified: esbuild transpile clean, then bundled+server-rendered with real
`react-dom/server` (stubbed `next/link`/`ReportRequestForm`) — rendered
successfully with all 4 image URLs present. All 4 images independently
confirmed live (200, `image/webp`) and visually reviewed. Committed+pushed
to `fix/32-nadlan-berega-marketing-images-0831` (cf695ae5) — not merged.

## עדכון — 26/08/2026 (Loop A, session 13 — build_tasks id=6 חלק (c) נסגר: "ההיסטוריה שלי")
`core.build_tasks` id=6 (system 32, priority 60) נשאר `todo` מ-session 9 (ראו
למטה) בגלל חלק (c) בלבד: "הנתונים האמיתיים נגישים רק מאחורי כפתור כניסה
למערכת". לנעול את `/report`/`/p/[slug]` מאחורי כניסה כפשוטו היה שובר את
הדוח-החינמי-בלי-הרשמה-ניתן-לשיתוף-בוואטסאפ המתועד — קונפליקט ממשי מול "אפס
רגרסיה", לא "עוד לא הגעתי". אותה רשומה הציעה בעצמה את הפתרון שבוצע הסבב הזה:
לבנות יכולת **נוספת** מאחורי הכניסה המשותפת הקיימת, בלי לגעת בנתיב הציבורי —
"למשל היסטוריית-חיפושים אישית".

נבנה עמוד "ההיסטוריה שלי" (`/history`) הנעול מאחורי הכניסה המשותפת
(`auth-button.js`/localStorage `more30-auth`). מיגרציה `0158`:
`nadlan.report_history` (RLS מופעל בלי policy — service-role בלבד, אותה עמדה
כמו `saved_reports`/`street_video_cache`). `lib/reporthistory.ts`
(`recordView`/`listHistory`) + `lib/requireuser.ts` (מאמת JWT מול
`/auth/v1/user`, אותו דפוס בדיוק כמו `apps/40-gannenet/lib/require-user.ts`
המוכח) + `lib/session.ts` (קריאת הטוקן בצד הלקוח, אותו דפוס כמו
`apps/40-gannenet/lib/session.ts`) + `GET`/`POST /api/history`.
`ReportView.tsx` מקבל `useEffect` שקט שרושם צפייה **רק** כשכבר יש סשן
מחובר — `sessionToken()` מחזיר `null` מיידית ובלי שום קריאת רשת לצופה
אנונימי (הרוב המכריע של הביקורים), כך שהנתיב הציבורי לא משתנה כלל.

אומת חי ב-MCP: `BEGIN;...ROLLBACK;` (הכנסה+צירוף מול שורת `saved_reports`
אמיתית) לפני `apply_migration`, ואז טרנזקציה מגולגלת-לאחור נוספת שכפלה את
סמנטיקת ה-upsert-על-קונפליקט(`user_id,slug`) של האפליקציה — אישרה שצפייה
חוזרת מתכווצת לשורה אחת עם `viewed_at` מעודכן. `get_advisors` (security)
מראה רק `rls_enabled_no_policy` הצפוי, אין אזהרה חדשה. בדיקת איזון-סוגריים
נקייה על כל 8 הקבצים; לוגיקת `sessionToken`, רג'קס ה-slug, ונפילה-לאחור
של תווית-ההיסטוריה שוכפלו עצמאית ב-Node טהור מול 20 תרחישים, כולם עברו.

אפס רגרסיה: `/report`/`/p/[slug]` וכל route/RPC/handler קיים אחר לא נגעו —
תוספת טהורה בלבד. נדחף לענף `feat/32-nadlan-berega-personal-history-0826`
(b20d7b06) — לא מוזג. `core.build_tasks` id=6 סומן `done` — **כל** שורות
P2 (32+36) עכשיו `done` (0 `todo`). System 35 KioskFleet לא נגע, לפי
ה-HARD STEERING.

## עדכון — 26/08/2026 (Loop A, session 12 — system 36 nadlan-pro, build_tasks id=14: יומן דוחות אמת)
`core.build_tasks` id=14 (system 36, priority 70): "Management: every search
and produced report fully visible — full detail, who produced, when, status;
full audit trail." זהו ה-counterpart של id=7 (session הקודם למטה, שסגר את
אותו פער על 32) — אבל בשונה מ-32 (דוח ציבורי בלי כניסה, "who produced" לא
ניתן למימוש בכלל), 36 הוא CRM משרדי מאומת — "מי משך" היא שאלה עם תשובה
אמיתית כאן.

`np_property_truth_set` (0010, נקרא מ-`fetchTruth` בכל לחיצה על "משוך דוח
אמת") תמיד רק דרס את `properties.truth_report`/`truth_report_at`/
`truth_report_error` — בלי היסטוריה ובלי לדעת מי משך. מיגרציה `0157`
מוסיפה `nadlan_pro.report_pulls` (RLS: owner/manager רואים את כל יומן
המשרד, סוכן רגיל רואה רק את המשיכות שלו — אותו פיצול כמו commissions,
id=1) ומרחיבה את `np_property_truth_set` (`CREATE OR REPLACE`, אותה חתימה
והתנהגות בדיוק) להכניס שורת-יומן אחת באותה טרנזקציה של כתיבת הדוח. RPC
חדש `np_report_pulls(p_office, p_limit)` מחזיר את היומן עם כותרת/כתובת
הנכס ושם המושך (`office_members.full_name`) — ה-RLS על הטבלה עושה את
הסינון לפי תפקיד, לא הפונקציה. סקציית "יומן דוחות אמת" חדשה במסך
"הגדרות" (`renderReportPullsBox`) מרנדרת את זה כטבלה, גלויה לכל תפקיד
(owner/manager רואים הכול, סוכן רואה את שלו).

אומת חי ב-MCP בטרנזקציה מגולגלת-לאחור מול המשרד האמיתי "משרד בדיקה QA
18/08" (owner אמיתי + `qa.np.agent@more30.com` שנוסף זמנית כחבר אמיתי):
owner מושך דוח (הצלחה) + agent מושך דוח (כישלון, עם `error_text`) →
`np_report_pulls` של owner מחזיר שתיים (`[success,error]`) →
`np_report_pulls` של agent מחזיר רק את שלו (`[error]`) →
`np_report_pulls` של זר-לא-חבר מחזיר 0 → `INSERT` ישיר לטבלה בהתחזות
ל-`requested_by` של מישהו אחר בלי חברות נדחה ע"י מדיניות ה-RLS (`42501`,
אומת בהרצה נפרדת כי הדחייה מפילה את הטרנזקציה כולה). אפס שיוריות אחרי
`ROLLBACK`. `get_advisors` (security) אחרי ההחלה — אין אזהרה חדשה שמזכירה
`report_pulls`/`np_property_truth_set`/`np_report_pulls`. `node --check`
נקי על ה-`<script type="module">` שחולץ (186,512 תווים); בדיקת
איזון-סוגריים על הקובץ המלא עברה (906/906, 3200/3200, 240/240). לוגיקת
רינדור השורות (נפילה-חזרה לכתובת כשאין כותרת, בריחת-XSS, נפילה-חזרה
לשם-מושך חסר) שוכפלה עצמאית ב-Node מול 5 תרחישים, כולם עברו כולל
בריחת-HTML נכונה.

אפס רגרסיה: `np_property_truth_set` שומר על אותה חתימה והתנהגות בדיוק
כמו לפני (0010) — התוספת היחידה היא שורת-היומן, שלא יכולה להיכשל לאף
קורא שכתיבת ה-`truth_report` שלו כבר הצליחה (RLS על ה-INSERT מסתמכת על
אותו `can_touch` שכבר נאכף על ה-UPDATE של הטבלה). שום RPC/handler/UI
קיימים אחרים לא נגעו חוץ מהסקציה החדשה. נדחף לענף
`fix/36-nadlan-pro-report-pulls-audit-trail-0825` — לא מוזג. System 35
KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, session 11 — build_tasks id=7: יומן ביקורת מלא במרכז השליטה)
`core.build_tasks` id=6 (priority 60) נשאר `todo` בכוונה: חלק (c) שלו ("data
behind Enter-System login") הוא קונפליקט ממשי מתועד מול זכות-קיימת
(דוח-חינמי-בלי-הרשמה/שיתוף-וואטסאפ), לא "עוד לא הגעתי" — ראה הרשומה למטה
(session 9) לניתוח המלא. במקום לחזור על אותה בדיקה, הסבב הזה עבר ל-id=7
(priority 70, "every search and produced report fully visible — full
detail... full audit trail"), עדיין `todo`/לא-מתועד עד היום.

בדיקה מצאה ש-`SavedReportsBoard.tsx` (מרכז השליטה) כבר מציג את כל הנכסים
שנבדקו, אבל רק **מונה מצטבר** (`generations`/`views`) — לא יומן-אירועים
ברמת-בקשה. שני מקורות-נתונים לרמת-האירוע כבר קיימים בפועל, פשוט לא נקראו
משום מקום: (1) `nadlan.saved_report_versions` (141 שורות בפועל) — נכתבת
בכל `saveReport()` (`lib/savedreports.ts`) עם תג-זמן/רמה/סוג-נכס לכל הפקה
בפועל, אבל שום קוד לא קרא ממנה מעולם. (2) `nadlan.report_exports` — נרשמת
בכל הורדת PDF/מצגת (`logExport()`, `lib/store.ts`), אבל `property_id`
תמיד היה `null`: `logExport` קיבל את `propertyKey` כפרמטר ומעולם לא כתב
אותו לשום עמודה — **באג אמיתי**, לא רק שדה לא-מנוצל. חקירה נוספת גילתה
שגם אם הפרמטר היה נכתב, זה לא היה עוזר: `report_exports.property_id` הוא
`bigint` עם FK ל-`nadlan.properties` — טבלה **אחרת לגמרי**, שייכת לתכונת
"כרטיס זיהוי נכס" הישנה (`app/api/profile`, `PropertyIdCard.tsx`,
`cacheProfile()`), לא לזרם-הדוח החי (`/report`) שמזהה הכל לפי `slug`
(`text`, `saved_reports.slug` — אותו מפתח בדיוק ש-`street_video_cache`/
`tabu_documents` כבר משתמשים בו). כתיבת `propertyKey` הגולמי (`q`, מחרוזת
חיפוש חופשית) לעמודת `bigint` שמפנה לזהות-נכס לגמרי אחרת לא הייתה מתקנת
כלום — הייתה רק מחליפה `null` בערך שגוי.

**התיקון:** מיגרציה `0156` מוסיפה `nadlan.report_exports.slug` (FK ל-
`saved_reports.slug`, אותו מודל-זהות כמו כל שאר הטבלאות בזרם הזה) —
`property_id`/`nadlan.properties` לא נגעו, התכונה הישנה ממשיכה לעבוד זהה.
`ReportView.tsx`/`Presentation.tsx` חושפים עכשיו את ה-`permalink` של הדוח
שרונדר בפועל דרך תכונת `data-permalink` (על `[data-cat]`'s parent ועל
`[data-deck-ready]` בהתאמה) — `/api/pdf`/`/api/deck` (Puppeteer headless)
קוראים אותה אחרי הרינדור ומעבירים ל-`logExport`, כך שכל הורדה משוייכת
לנכס הנכון סוף-סוף. `lib/savedreports.ts` מקבל `listVersionsBySlug`,
`lib/store.ts` מקבל `listExportsBySlug`, ו-`GET /api/admin/saved/history?
slug=` חדש מאחד את שניהם. `SavedReportsBoard.tsx`: כל שורת-נכס מקבלת
כפתור "יומן ביקורת" שנטען בעצלנות ומרנדר את כל האירועים (הפקות+הורדות)
ממוינים לפי זמן — לא רק שני מספרים מצטברים.

**"who produced" לא מומש:** `/report`/`/present` הם עמודים ציבוריים לגמרי
בלי התחברות (אותה החלטת-ארכיטקטורה מתועדת ב-session 9/5 למטה — דוח-חינמי-
בלי-הרשמה ושיתוף-וואטסאפ) — אין זהות-משתמש לשייך לאירוע-חיפוש כלשהו, אותה
מגבלה בדיוק כמו כל שאר הזרם הציבורי הזה. "status" מיוצג ע"י סוג-האירוע עצמו
(הפקת-דוח לפי רמה / הורדת-PDF / הורדת-מצגת), לא שדה-סטטוס נפרד שלא קיים לו
משמעות בזרם הזה.

אומת חי ב-MCP: `BEGIN;...ROLLBACK;` לפני ההחלה (insert+join על העמודה
החדשה מול שורה אמיתית ב-`saved_reports`) ואז `apply_migration` אמיתי;
טרנזקציה מגולגלת-לאחור נוספת אחרי ההחלה שכפלה את שתי השאילתות
(`listExportsBySlug`/`listVersionsBySlug`) מול נתונים אמיתיים — כולל שורת
`saved_report_versions` היסטורית אמיתית (מ-05/08/2026, לא נוצרה בבדיקה הזו)
שחזרה נכון מהצירוף. `SELECT count(*) WHERE report_type='test_pdf'` אחרי
כל הבדיקות = 0 (אפס שיוריות); `report_type='pdf_vip'` (10 שורות אמיתיות
מ-24/08) אושרו כנתונים קיימים-מראש, לא תוצר של הבדיקה. `get_advisors`
(security+performance) אחרי ההחלה: רק `rls_enabled_no_policy` הצפוי (אותה
עמדה כמו `saved_reports`/`saved_report_versions`) ו-`unused_index` על
האינדקס החדש (טבעי, טרם נסרק) — אין אזהרה חדשה/בלתי-צפויה. בדיקת
איזון-סוגריים על כל 8 הקבצים שנוספו/שונו עברה נקי. אין `node_modules`/
דפדפן בסביבה הזו לקליק-דרך, אותה מגבלה כמו כל סבב `apps/32` קודם.

אפס רגרסיה: `report_exports.property_id`/`nadlan.properties` (זרם-ה-
"כרטיס-זיהוי" הישן) לא נגעו; המונים המצטברים הקיימים ב-`SavedReportsBoard`
לא שונו — יומן-הביקורת הוא הרחבה תוספתית (שורה-נפתחת-לפי-דרישה) בלבד.
נדחף לענף `fix/32-nadlan-berega-saved-reports-audit-trail-0825` (55711503)
— לא מוזג. System 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, system 36 nadlan-pro — תיק מידע להיתר, build_tasks id=12 חלק 2 נסגר)
`core.build_tasks` id=12 (system 36, priority 50): "Planning info auto-pull
shown immediately; tik-meida-le-heter as official request workflow
(request->mgmt->issue->attach)". חלק 1 (מידע תכנוני מוצג מיידית, בלי בקשה)
כבר היה בנוי ואומת: `potentialHtml()` ב-`tivuch/app.html` מרנדר את עובדות
ה-XPLAN/התחדשות-עירונית החינמיות של מערכת 32 ללא תנאי בכל משיכת "דוח אמת"
(נוסף בסבב `96ed76d8`). חלק 2 — תיק מידע להיתר כתהליך-בקשה רשמי — היה חסר
לגמרי במסלול הזה.

מיגרציה `0155`: `nadlan_pro.tik_meida_requests` (אותה צורה בדיוק כמו
`tabu_requests` מ-`0153` — request/grade/status, RLS: כל חבר משרד שיכול
לגעת בנכס יכול לבקש, רק owner/manager יכול לשנות סטטוס) +
`np_tikmeida_request_create`/`np_tikmeida_request_mark_sent`/
`np_tikmeida_document_upload`. הבדל מכוון אחד מ-TABU: **אין שלב ניתוח-AI**
— בדיוק כמו ש-32's tik-meida workflow (`0152`) גם הוא ללא ניתוח-AI, כי תיק
מידע הוא מסמך רשמי של ועדה, לא נסח גולמי שצריך לפרסר. לכן העלאת הקובץ *היא*
שלב ה"הפקה" וממלאת את הבקשה (status → `fulfilled`) באופן מיידי, בלי
Edge Function נוסף. הקובץ המופק הוא שורת `property_documents` קיימת
(קטגוריה `permit` — "מידע להיתר" הוא פשוטו כמשמעו מידע תכנוני עבור היתר),
לא טבלה מקבילה, ומשתמש באותו bucket פרטי `nadlan-pro-docs`. "צירוף ללקוח"
ממחזר את דפוס העתק-קישור הקיים, כמו ב-TABU.

נוספה סקציית "בקשות מידע להיתר (תיק מידע)" בדרואר הנכס (`tikMeidaHtml`/
`wireTikMeida`), מוצגת רק כשיש גוש/חלקה, ישר אחרי סקציית נסח הטאבו הקיימת.
`np_property_get` מחזיר עכשיו גם `tik_meida_requests` לצד `tabu_requests`
הקיים, באותה קריאה אחת לדרואר.

אומת חי דרך MCP בטרנזקציות מגולגלות-לאחור מול משרד QA אמיתי (owner אמיתי +
agent אמיתי שנוסף זמנית כחבר משרד): agent יוצר בקשה (הצליח) · agent מנסה
לסמן כהוגש (נחסם ע"י RLS — לא מנהל) · owner מסמן כהוגש (הצליח) · agent מנסה
להעלות (נחסם — לא מנהל) · ניסיון העלאה על בקשה שעדיין `pending` (לא `sent`)
נחסם ע"י הפונקציה עצמה · owner מעלה על הבקשה שהוגשה (הצליח, מילא אוטומטית
— `status=fulfilled`, `document_id` מוגדר, `property_documents` קיבל שורה
עם `category='permit'`) · `np_property_get` בדיקת-צורה נפרדת אישרה שהמפתח
`tik_meida_requests` מוחזר עם כל השדות. אפס שאריות בשתי הבדיקות (אין
`COMMIT` בשום קריאת MCP, כל שינוי התבטל אוטומטית בסגירת הסשן). `get_advisors`
(security) לאחר ההחלה — אין אזהרות חדשות על `nadlan_pro.tik_meida_requests`
או על הפונקציות החדשות. `node --check` נקי על ה-`<script>` שחולץ; בדיקת
איזון-סוגריים על הקובץ המלא עברה (900/900 סוגריים מסולסלים, 3178/3178
עגולים, 239/239מרובעים). תוספת טהורה — מיגרציה חדשה + סקציית UI חדשה, אף
שורה קיימת (כולל TABU) לא נגעה. System 35 KioskFleet לא נגע, לפי
ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, system 36 nadlan-pro — TABU workflow, build_tasks id=11 נסגר)
`core.build_tasks` id=11 ("TABU workflow" על system 36) נשאר `todo` מסבב
session 5 (ראה למטה) בכוונה: "36 הוא כלי-פנים למתווכים... נדרשת בדיקת-scope
לפני מימוש, לא רק העתקה". הסבב הזה עשה את בדיקת-ה-scope ובנה בהתאם: 36 הוא
CRM B2B פרטי בלי דוח-VIP ציבורי ובלי /admin משותף בכלל (בשונה מ-32) — אז
"checkbox+grade בדוח VIP" ו"צוות ניהול מרכזי" הועתקו-מחדש ל: "משימת ניהול"
= בעלים/מנהל **של אותו משרד עצמו** (אותו תפקיד שכבר שוער ל-rent-payment-waive/
templates/office-delete), ונסח טאבו נשמר כשורת `property_documents` קיימת
(קטגוריה `tabu` כבר שמורה לזה, ראו `PDOCCAT_HE`) ולא בטבלה מקבילה.

נוסף: `nadlan_pro.tabu_requests` (מיגרציה `0153`, RLS: כל חבר יכול לבקש,
רק owner/manager יכול לשנות סטטוס) + `np_tabu_request_create`/
`np_tabu_request_mark_sent`/`np_tabu_document_upload` + Edge Function חדש
`np-tabu-document-analyze` (מוריד את הנסח הפרטי עם מפתח השירות, קורא
ל-Anthropic דרך המפתח המשותף ב-`core.secrets`, אותו דפוס בדיוק כמו
`events-ai`/`np-send-signature` הקיימים) — מבנה החילוץ זהה ל-`lib/tabudoc.ts`
של 32, עם תוספת `perFloorRights` לנסח מרוכז (המענה ל"AI plain-language
rights-**per-floor**" המפורש שבמפרט). "צירוף ללקוח" ממחזר את דפוס
העתק-קישור הקיים (הזמנת-צוות, פתיחת-מסמך) כי אין תשתית-מייל בכלל ב-`nadlan_pro`.

**באג אמיתי שנתפס באימות ותוקן (מיגרציה `0154`):** `revoke all ... from
public` על `np_tabu_document_analysis_save` **לא** הספיק — Supabase מעניק
`EXECUTE` ל-`authenticated`/`anon` על פונקציה חדשה בסכימת `public` כברירת-מחדל
(default privileges), ו-`public` הוא pseudo-role נפרד. בדיקה חיה הוכיחה בפועל
שבעלים-משרד רגיל הצליח לקרוא לפונקציה ולזייף תוצאת-ניתוח — תוקן ע"י
`revoke execute ... from authenticated, anon` מפורש, ואומת מול
`information_schema.role_routine_grants` לפני ואחרי.

אומת חי ב-MCP בתוך `BEGIN/ROLLBACK` מול המשרד האמיתי "משרד בדיקה QA 18/08":
agent יכול לבקש אך לא לסמן-נשלח/להעלות; owner מסמן-נשלח ואז מעלה; העלאה
לפני `status=sent` נדחית; הרשאת-ניתוח נדחית לסוכן ומאושרת לבעלים;
`analysis_save` לא נגיש לשום authenticated. `get_advisors` נקי (אחרי תיקון
המשך על אינדקסים חסרים לעמודות FK החדשות). `node --check` נקי; בדיקת-איזון
מלאה על הקובץ (861/861, 3062/3062, 224/224); ה-Edge Function תורגם עם
esbuild; לוגיקה טהורה (parseJson/normalize/UI gating) שוכפלה ב-Node מול 17
תרחישים. אפס רגרסיה — `propDocsHtml`/העלאת-מסמך גנרית לא נגעו,
`np_property_get`/`np_property_documents` הורחבו אדיטיבית בלבד. נדחף לענף
`fix/36-nadlan-pro-tabu-workflow-0825` (16cb745b) — לא מוזג. System 35
KioskFleet לא נגע, לפי ה-HARD STEERING.

> קובץ זה נטען אוטומטית ע"י Claude Code בכל סשן חדש. הוא זיכרון הפרויקט —
> קרא אותו קודם, המשך מהמצב הנוכחי, ואל תתחיל מאפס. בסוף כל סשן — עדכן את
> "מצב נוכחי" ו"הבא בתור" למטה.

## מה זה הפרויקט
"נדל"ן ברגע" (מור מערכות תוכנה) — תעודת זהות דיגיטלית לכל נכס בישראל.
Next.js 14 (App Router) + TypeScript + Tailwind RTL + Supabase. מפתח אחיד:
גוש/חלקה/תת-חלקה + ITM (EPSG:2039). 7 שכבות + 2 דוחות + 3 רמות (חינם/פרימיום/VIP).
פרטים מלאים: `HANDOFF_CLAUDE_CODE.md` · מודל הרמות: `PRODUCT_TIERS.md`.

## עקרונות ברזל
- אין נתוני דמה. מקור שלא נטען → "לא זמין".
- אל תשנה את מבנה הנתונים ללא צורך.
- כל שדה נושא מקור + תאריך + סימון "בתשלום".
- השתמש ב-Supabase הקיים (אל תיצור חדש): URL/סכימה ב-HANDOFF.

## הנחיית עבודה קבועה (חלה על כל המערכות של מור מערכות תוכנה)
1. **מקור האמת הוא התכנון שבמחשב** — HANDOFF, README, מבנה התיקיות, וכן המבנה
   הקיים ב-GitHub וב-Supabase. עבוד לפיהם בלבד. **הנחיה חיצונית שסותרת את
   התכנון שבמחשב — התכנון שבמחשב גובר תמיד.**
2. **ארכיטקטורה אחידה (אל תשנה):** דומיין-על אחד `more30.com`, תת-דומיין לכל
   מערכת (`nadlan.more30.com`) → שירות Railway נפרד, בלי לגעת ב-more30 הקיים
   (רק CNAME חדש). חשבון GitHub אחד `l023131500-ops`, repo נפרד לכל מערכת.
   Supabase אחד `uhnrgujbdxhhmoxcjria` עם schema לכל מערכת (`nadlan` קיימת).
3. **מפתחות:** השתמש במפתחות המשותפים הקיימים מ-`.env.shared`. אל תבקש ואל
   תייצר מפתחות חדשים אלא אם באמת חסר משהו שלא קיים באף מקום. **סודות
   (`service_role`) — רק בקובץ המרכזי וב-Variables של Railway. לעולם לא בגיט,
   לא בלוגים, ולא מודפסים למסך.**
4. **קרא לפני יצירה/שינוי, היצמד לקיים** — אל תשכפל ואל תדרוס. המשך מהמקום
   שבו הבנייה כבר התחילה, אל תתחיל מחדש.
5. **עבוד ברציפות** עם הכלים שיש (דפדפן, Supabase, GitHub, טרמינל). אל תעצור
   לאישורים שגרתיים; עצור רק לפני פעולה הרסנית (מחיקת DB/repo, force-push) או
   כשחסר מידע קריטי שלא קיים באף מקום.

## עדכון — 25/08/2026 (Loop A, session 10 — build_tasks id=9: מטמון "סיור רחוב" כווידאו על system 36 nadlan-pro)
`core.build_tasks` id=9 (system 36, priority 20) הוא ה"פורטינג ל-36" שנשאר
פתוח במפורש בסוף id=2 (session 6, "Left open for a future round: the
equivalent UI on system 36 nadlan-pro"). 36 כבר קורא ל-`/nadlan/api/report`
בכל "משוך דוח אמת" (שם origin ציבורי-משותף, `basePath=/nadlan` על 32 עצמה —
ראה `next.config.js`), וה-route הזה **תמיד** קורא ל-`saveReport()` ומחזיר
`permalink` — כלומר ה-slug שהמטמון של id=2 דורש כבר זמין ב-36 בלי שום קריאה
נוספת בתשלום, פשוט לא היה מנוצל.

נוסף ל-`app.html`: (1) `fetchTruth` עכשיו ממזג `p.truth_report = report`
במקום (בנוסף לעותק-התצוגה המקומי הקיים) — כדי ש-`p` (אותו object reference
ש-`wireStreetWalk(p)` כבר סוגר מעליו מרגע פתיחת המגירה) יישא את ה-`permalink`
העדכני לצריכה מאוחרת יותר, בלי לשבור שום קורא קיים אחר של `p`. (2) פאנל
"סיור רחוב" (שכבר בנוי, קרוסלת-תמונות בלבד) מקבל עכשיו את שתי היכולות
שכבר קיימות ב-32's `StreetWalkPanel.tsx`: בדיקת-מטמון (`checkWalkVideoCache`,
GET `/nadlan/api/street-video?slug=...` — ה-endpoint הציבורי הקיים של 32
עצמה, בלי שרת/סכימה/bucket חדשים) שמחליפה את הקרוסלה בנגן `<video>` כשיש
כבר קליפ שמור לנכס הזה, וכפתור-יוזמה "🎬 צור סרטון רחוב" (`generateWalkVideo`)
שמקליט את אותן מסגרות בדיוק על קנבס נסתר (`canvas.captureStream()`+
`MediaRecorder`, בדיוק כמו הרכיב המקורי ב-32) ומעלה ל-`/nadlan/api/street-video`
(POST) — כל צופה הבא של אותו נכס מקבל את הקליפ ישירות. גדור מאחורי
feature-detection (`WALK_CAN_GENERATE`) וקיום `permalink`, אותו שער בדיוק
כמו ב-32.

אומת: `node --check` על ה-`<script type="module">` המחולץ עבר נקי (167,222
תווים, גדל מ-~160,668 לפני התוספת). בדיקת איזון-סוגריים על הקובץ המלא
תקינה (816/816 מסולסלים, 2904/2904 עגולים, 209/209 מרובעים). לוגיקת בחירת
mime-type (מעדיף MP4/avc1, נופל ל-WebM/vp9, `null` כשאין תמיכה) ולוגיקת
ה-guard על בדיקת-המטמון (מתעלמת מ-permalink מיושן, מ-box מנותק, ומ-cache-miss)
שוכפלו עצמאית ב-Node טהור מול 7 תרחישים — כולם עברו. אין דפדפן/`MediaRecorder`
אמיתי בסנדבוקס הזה כדי להריץ הקלטה מקצה-לקצה — אותה מגבלה בדיוק כמו כל סבב
`app.html`-בלבד קודם; קוד ההקלטה עוקב מילה-במילה אחרי `StreetWalkPanel.tsx`
המוכח על 32. אפס רגרסיה: הקרוסלה הקיימת מוצגת זהה בכל מקרה שאין בו קליפ
שמור/דפדפן לא-תומך (אותו `walkFrameHtml` לא נגע), וכפתור-ההקלטה מוצג רק
בתוספת, לא מחליף שום UI קיים. `core.build_tasks` id=9 סומן `done`. System 35
KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, session 9 — build_tasks id=6, חלק א+ב: דף הבית הפך לתדמית שיווקית טהורה)
`core.build_tasks` id=6 (system 32, priority 60) הוא בפועל P2 ACCURACY SPEC v2
§4 (core.projects #32, "FINAL STAGE — only AFTER the data system is complete
and accurate"): (a) להסיר כל ניסוח הנדסי/גילוי-נאות מהאתר הציבורי — רק תוכן
שיווקי; (b) לבנות את האתר הציבורי כאתר-תדמית מלוטש; (c) הנתונים האמיתיים
נגישים **רק** מאחורי כפתור "כניסה למערכת"; (d) כפתור הורדת מצגת/PDF שעובד
היטב.

**(d) נבדק ונמצא כבר קיים ותקין:** `/api/pdf`+`/api/deck` (Puppeteer headless
דרך `lib/browser.ts`) כבר ממתינים ל-`[data-cat]`/`[data-deck-ready]` (לא רק
`networkidle0`, שנמצא לא מספיק בסבב 19/08), כוללים timeout ארוך (300 שניות),
שם-קובץ עברי תקין (`filename*=UTF-8`), וכבר רושמים ל-`report_exports` דרך
`logExport()` (תוקן 19/08). לא נמצא שום באג — לא נגעתי בקבצים האלה.

**(c) לא בוצע הסבב הזה — קונפליקט ממשי, לא רק "עוד לא הגעתי":** `/report?q=`
ו-`/p/[slug]` (הקישור הקבוע) מתועדים **במפורש** בקובץ הזה (ראה סעיף TABU
workflow למטה, "למה לא הוצג נתון-נסח על המסך") כציבוריים-בכוונה וניתנים-
לניחוש **כדי לאפשר שיתוף ב-WhatsApp** — זו החלטת ארכיטקטורה מודעת שכבר
נבדקה ונדחתה פעם אחת (הצגת TABU על הדוח הציבורי) בגלל חשיפת מידע. גיוד
הנחיית ה-Loop A שמריץ את הסבב הזה קובע במפורש "Zero regression: never
delete or simplify an existing feature" — וגם "הדוח החינמי בלי הרשמה" הוא
הצעת-הערך המרכזית שחוזרת עשרות פעמים בקובץ הזה (`PRODUCT_TIERS.md`, המחיר
הראשי בדף הבית). לנעול את `/report`/`/p/[slug]` מאחורי כניסה **בהתאם למילה
"ONLY" שבספק** היה שובר את שניהם בבת אחת — לא "עוד לא נבנה" אלא קונפליקט
ישיר בין הנחיה חדשה להחלטת-ארכיטקטורה קיימת ומתועדת. **תגלית חשובה:** מנגנון
הכניסה עצמו **כבר קיים וחי** על האתר הזה — `<script src="https://more30.com/
auth-button.js" defer />` ב-`app/layout.tsx` (שורה 91) כבר טוען את כפתור
הכניסה המשותף של כל פלטפורמת more30 (Supabase Auth על אותו פרויקט
`uhnrgujbdxhhmoxcjria`, כניסה/הרשמה/אזור-אישי/ניהול — ראה
`portal/public/auth-button.js`, אפילו מתעד מפורשות "ב-`/nadlan` (Next.js)"
כמערכת שהוא רץ עליה). כלומר "כפתור כניסה למערכת" לא חסר תשתית — מה שחסר הוא
רק ההחלטה **מה** לנעול מאחוריו בלי לשבור שיתוף/דוח-חינמי-בלי-הרשמה. נשאר
פתוח לסבב עם אישור-בעלים מפורש על איך ליישב את שתי הדרישות הסותרות (או:
לבנות תוכן/יכולת **נוספת** מאחורי הכניסה הקיימת בלי לגעת בנתיב הציבורי, למשל
היסטוריית-חיפושים אישית).

**(a)+(b) בוצע במלואו הסבב הזה:** דף הבית (`app/page.tsx`) היה כבר ברובו
שיווקי, אבל נשא שני קטעים בסגנון הנדסי/גילוי-נאות בתוך זרימת המכירה
הראשית: קופסת "לרחוב אחד יש לפעמים שני שמות" (הסבר-שיטת-התאמה טכני) וקופסת
"איך אנחנו מציגים נתונים" (מסגרת אמת/מקורב/הערכה + "אנחנו לא ממציאים ולא
משלימים בניחוש" — ניסוח הנדסי מובהק), וגם קישור-כותרת "מאיפה מגיעים
הנתונים ←" ישירות מהזרימה הראשית. הוחלפו בקופסה שיווקית אחת (אותה דוגמה
בדיוק — "דרך מרדכי"/"רחוב אתרוג" — אבל כניסוח יתרון-ללקוח, לא הסבר-שיטה)
עם קריאה-לפעולה. גם רוככו שלוש משפטים: משפט ה-hero ("הכול ממקורות רשמיים...
ומה שאין, כתוב שאין" → "בלי הפתעות אחרי החתימה"), פריט-רשימה אחד ("עם המקור
שלו ועם דרגת הוודאות שלו" → "קל לקרוא, קל לשתף"), והקדמת "שלוש רמות של דוח"
("מקורות שאינם עולים לנו כסף" → "התמונה הראשונית בלי עלות"). **לא נגעתי**
בעמוד `/report` עצמו (שם ה-badges אמת/מקורב/הערכה הם *עקרון ברזל של המוצר*
עצמו, לא דיסקליימר להסרה — ראה ראש הקובץ הזה) ולא בעמוד `/sources` (עמוד
שקיפות עצמאי, עדיין מקושר מהניווט העליון "מקורות ותמחור" — לא נמחק, רק
הוסר הקישור הכפול מדף הבית עצמו). ניווט לא נגע, `/order`/`ReportRequestForm`
לא נגעו.

אומת: בדיקת איזון-סוגריים על הקובץ המלא עברה (40/40 מסולסלים, 22/22 עגולים,
53/53 מרובעים). כל class חדש (`bg-navysurface`, `text-[#cdd6ea]`) שוכפל
ממקום קיים כבר בקוד (`app/layout.tsx` footer, אותו טון-עיצוב) ולא הומצא.
`grep` על הטקסט שהוסר אישר שאין קובץ אחר (בדיקה/רכיב) שתלוי בו. אין
`node_modules` בסביבה הזו, אז `next build`/`tsc` לא הורצו — אותה מגבלה כמו
כל סבב קודם; זה שינוי תוכן-JSX סטטי בלבד, בלי import/state/handler חדשים,
כך שסיכון-הבנייה נמוך משמעותית מסבבי-קוד רגילים. אפס רגרסיה: שום route/
API/RPC/handler/state לא נגע — רק טקסט וקופסה אחת בעמוד סטטי אחד. `core.
build_tasks` id=6 נשאר `todo` (רק חלק a+b מתוך a-d הושלם; c דורש החלטת-בעלים
כדי לא לשבור זכות-קיימת, ותועד למעלה למה). נדחף לענף
`feat/32-nadlan-berega-homepage-marketing-copy-0825`. System 35 KioskFleet
לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, session 8 — build_tasks id=5: תיק מידע להיתר — workflow request→mgmt→issue→attach)
`core.build_tasks` id=5 (system 32, priority 50): "Planning info auto-pull
(govmap/minhal ha-tichnun layers) shown immediately; tik-meida-le-heter as
official request workflow (request->mgmt->issue->attach)". חלק ראשון נבדק
ונמצא כבר בנוי במלואו: ייעוד קרקע + מרשם התכניות (XPLAN שכבות 1/4) נשאלים
ללא תלות-רמה בכל דוח (`lib/permits.ts`/`lib/xplan.ts`) ומוצגים מיד ב-
`PermitsPanel.tsx` — אין בקשה נדרשת. חלק שני היה חסר לגמרי: שום דרך ללקוח
*לבקש* תיק מידע להיתר רשמי (מסמך שהוועדה המקומית מנפיקה לפי חלקה — שונה
לגמרי מסיכום התכניות האוטומטי, ושונה מנסח טאבו) — אין רישום בקשה, אין
התראה לצוות, ואין ערוץ להחזיר את התיק ללקוח.

נבנה אותו דפוס בדיוק כמו "TABU workflow" (id=4, ראו הרשומה הבאה למטה),
בהתאמה ל"תיק מידע" (ברמת גוש/חלקה שלמה, לא לפי דירה — הוועדה מנפיקה לחלקה,
לא ליחידה בתוכה; ואין שלב "ניתוח AI" — תיק מידע הוא מסמך רשמי מהוועדה
שהתוכן שלו כבר "מדבר", בשונה מנסח טאבו שדורש חילוץ נתונים גולמי):

- מיגרציה `0152_nadlan_tik_meida_requests.sql`: `nadlan.tik_meida_documents`
  (RLS מופעל בלי policy — service-role בלבד, אותה עמדה כמו `tabu_documents`)
  + `nadlan.tik_meida_requests` (RLS: INSERT בלבד ל-`public`, `with
  check(true)`, אותו grant set כמו `tabu_requests`) + bucket פרטי חדש
  `tik-meida` (25MB, pdf/jpeg/png/webp).
- `lib/requests.ts`: `createTikMeidaRequest`/`listTikMeidaRequests`/
  `pendingTikMeidaRequestCount`/`markTikMeidaRequestSent`/
  `recordTikMeidaRequestEmailResult`/`saveTikMeidaDocument`/
  `listTikMeidaDocuments`/`tikMeidaForProperty`/
  `fulfillMatchingTikMeidaRequests` — האחרון פשוט מ-`fulfillMatchingTabuRequests`
  (אין דירוג דירה/כניסה/בניין: כל תיק חל על החלקה כולה, אז ההתאמה היא
  גוש/חלקה בלבד).
- `app/api/tik-meida-request/route.ts` (POST ציבורי): מאמת גוש/חלקה/מייל,
  יוצר שורה, שולח מייל-התראה best-effort לצוות (`TIK_MEIDA_ADMIN_EMAIL`,
  נופל ל-`TABU_ADMIN_EMAIL` הקיים אם לא הוגדר ייעודי — אותו צוות מקבל שני
  סוגי הבקשות).
- `app/api/admin/tik-meida-requests/route.ts` (GET+POST mark_sent) +
  `TikMeidaRequestsBoard.tsx` (לוח ניהול חדש, מחובר ב-`/admin` בסקשן נפרד):
  רשימת בקשות, כפתור "סומן כהוגש לוועדה", וטופס-העלאה מוטמע ("העלאת תיק
  מידע": קובץ + הערת-תמצות קצרה אופציונלית) שקורא ל-
  `app/api/admin/tik-meida/route.ts` (PUT) — ההעלאה **היא** ה"הנפקה": מיד
  אחריה `fulfillMatchingTikMeidaRequests` משייכת ומעדכנת סטטוס ל-`fulfilled`
  לכל בקשה ממתינה/שנשלחה לאותה חלקה, בלי שלב ביניים נפרד.
- `TikMeidaRequestPanel.tsx` (VIP בלבד, אותו שער כמו `TabuRequestPanel`):
  צ'קבוקס + עדיפות (רגילה/דחופה) + שדה "מטרת הבקשה" (חופשי — מה מתכננים
  לבקש היתר עבורו) + שם/מייל/טלפון/הערות, מוצג בדוח אחרי `TabuRequestPanel`.
  כותב בלבד, לעולם לא קורא תיקים קיימים (אותה סיבה בדיוק כמו טאבו: דף הדוח
  ציבורי/משותף).
- `lib/reporthtml.ts`: `tikMeidaBlock()` חדש (שם קובץ + תאריך קבלה + הערת
  התמצות) + שדה `tikMeidaDocs` ב-`ReportEmailOptions`, קרוי מיד אחרי
  `tabuBlock`. `app/api/admin/requests/route.ts` קורא ל-`tikMeidaForProperty`
  (גוש/חלקה בלבד) ומעביר את התוצאה — זהו ה"attach to client" בפועל, באותו
  ערוץ מסירה (המייל שנשלח ללקוח).

אומת: בדיקת איזון-סוגריים על כל 11 הקבצים החדשים/שהשתנו — כולם תקינים.
מיגרציה הורצה תחילה בתוך `BEGIN;...ROLLBACK;` (יצירת בקשה, סימון-כנשלח,
העלאת-תיק, שיוך אוטומטי, ואימות ששורת חלקה **אחרת** לא הושפעה) ואז הוחלה
בפועל דרך `apply_migration`. אומתה שוב חי אחרי ההחלה: בקשה על גוש 9999/888
+ בקשה נפרדת על גוש 7777/111 → סימון-נשלח → העלאת-תיק על 9999/888 → שיוך
אוטומטי הפך את הבקשה הראשונה ל-`fulfilled` עם `tik_meida_document_id`/
`fulfilled_at` נכונים, בעוד הבקשה על החלקה האחרת נשארה `pending` בלי שינוי —
בדיוק כמו שקרה בבדיקת ה-ROLLBACK. שתי הבדיקות רצו בלי `COMMIT`/`ROLLBACK`
מפורש בסוף (טעות בשלב הביניים) — אומת בנפרד ש-0 שורות נשארו ב-DB אחרי
(`execute_sql` רץ בכל קריאה בחיבור/session נפרד, וטרנזקציה פתוחה בלי COMMIT
נסגרת ב-ROLLBACK אוטומטי כשה-session מסתיים — לא הותיר שיוריות, אך לקח
לב שזו לא ההתנהגות המכוונת ולתמיד לסגור טרנזקציה במפורש). `get_advisors`
(security) אחרי ההחלה מראה רק `rls_enabled_no_policy` INFO על
`tik_meida_documents` — צפוי ומכוון, אותה עמדה כמו `tabu_documents`, אין
אזהרה על `tik_meida_requests` (מדיניות ה-INSERT מספקת את הלינטר) ואין אזהרה
חדשה אחרת. אין `node_modules`/דפדפן בסביבה הזו לקליק-דרך, אותה מגבלה כמו
כל סבב `apps/32` קודם. אפס רגרסיה: תוספת טהורה — טבלאות/bucket חדשים, שתי
פונקציות UI חדשות + שורת-רינדור אחת חדשה ב-`ReportView`/`reporthtml.ts`,
שני imports חדשים + סקשן `/admin` חדש — שום route/RPC/handler/UI קיימים
לא נגעו. `core.build_tasks` id=5 סומן `done`. System 35 KioskFleet לא נגע,
לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, session 7 — build_tasks id=4 הושלם: שיוך נסח-שנותח לבקשת-הלקוח)
`core.build_tasks` id=4 ("TABU workflow", system 32) נשאר `todo` מסבב session 5
בגלל שני פריטים פתוחים: (1) counterpart על system 36 — התברר בסבב הזה, בבדיקת
מבנה `core.build_tasks` (עמודת `feature` שלא נקראה קודם), ש**זו שורה נפרדת
לגמרי** — `id=11` על `system_number='36'`, לא חלק מ-`id=4`. אז זה לא חסם את
סגירת id=4. (2) "שיוך-קישור" (`tabu_requests.tabu_document_id`/`fulfilled_at`)
היה עמודות מוכנות בסכימה בלי שום קוד שכותב אליהן — זה כן היה בתוך scope id=4
עצמו, ותוקן הסבב הזה.

`fulfillMatchingTabuRequests(doc)` חדש ב-`lib/requests.ts`: אחרי שניתוח נסח
מסתיים בהצלחה (`POST /api/admin/tabu`, אחרי `saveTabuAnalysis` — לא ב-`PUT`
ההעלאה הגולמית; ראו ההערה המקורית במיגרציה `0150`: "uploaded **and analyzed**"),
מאתר שורות `tabu_requests` בסטטוס `pending`/`sent` לאותו גוש/חלקה, ומסמן
`fulfilled` + `fulfilled_at` + `tabu_document_id` לכל שורה שהנסח **מכסה** —
אותו כלל-רלוונטיות בדיוק שכבר קיים ב-`tabuForProperty` (נסח "בניין שלם" מכסה
הכול; נסח "דירה"/"כניסה" מכסה רק בקשה בלי תת-חלקה/כניסה מצוינת, או עם התאמה
מדויקת). לא נוגע ב-`TabuPanel`/`PUT` הקיימים (העלאה יזומה של צוות בלי בקשת-
לקוח) בשום צורה — הפעולה החדשה best-effort (`.catch(() => null)`) ולא חוסמת
את שמירת הניתוח עצמו אם היא נכשלת.

אומת: לוגיקת ה-`covers()` שוכפלה עצמאית ב-Node טהור מול 7 תרחישים (נסח-בניין
מכסה הכול, נסח-דירה תואם/לא-תואם תת-חלקה, נסח-דירה מכסה בקשה-בלי-תת-חלקה,
נסח-כניסה תואם/לא-תואם/מכסה-ריק) — כולם עברו. אומת חי ב-MCP בתוך
`BEGIN;...ROLLBACK;`: 3 בקשות מדומות לאותו גוש/חלקה מדומים (תת-חלקה תואמת,
תת-חלקה שונה, ללא תת-חלקה) + נסח מדומה scope=apartment עם אותה תת-חלקה
כמו הבקשה הראשונה — התוצאה תואמת בדיוק לצפוי: הבקשה התואמת והבקשה-ללא-תת-חלקה
עברו ל-`fulfilled` עם `tabu_document_id`/`fulfilled_at` נכונים, הבקשה עם
תת-חלקה שונה נשארה `sent` בלי שינוי. `ROLLBACK` אימת אפס שיוריות (0 שורות
לפני ואחרי). בדיקת איזון-סוגריים על שני הקבצים ששונו עברה נקי
(`lib/requests.ts`: 306/306/101/101/27/27, `route.ts`: 134/134/91/91/5/5).
אין `node_modules`/`tsc` בסביבה הזו, אותה מגבלה כמו כל סבב קודם.

`core.build_tasks` id=4 סומן `done`. id=11 (אותו feature, system 36 —
counterpart אמיתי, שורה נפרדת) נשאר `todo` לסבב הבא: 36 הוא כלי-פנים למתווכים
(לא דוח-ציבורי-ללקוח כמו 32), אז "checkbox+grade מתוך דוח VIP" כפשוטו לא
בהכרח מתאים שם — נדרשת בדיקת-scope לפני מימוש, לא רק העתקה. אפס רגרסיה: פונקציה
חדשה + קריאה נוספת אחת בנקודה קיימת — שום handler/RPC/UI קיימים לא נגעו.
System 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, session 6 — build_tasks id=2: מטמון "סיור רחוב" כווידאו)
`core.build_tasks` id=2 ("Auto street video along property road — Street View
frames to MP4, cached per property") היה `todo` מאז שנוצרה הטבלה. סבבים קודמים
(ראו "סיור רחוב — גרסת-ביניים כנה" למטה) בנו במפורש רק חצי מהפריט — רצף תמונות
Street View מתחלף, לא וידאו — ודחו את חלק ה-MP4/ffmpeg שוב ושוב מאותה סיבה:
אין `ffmpeg` binary ואין `node_modules` בסביבת הבנייה הזו (נבדק שוב הסבב הזה:
`which ffmpeg` ריק, `ls node_modules` לא קיים), וגם ב-Vercel serverless התקנת
binary חיצוני אינה נתיב פשוט.

**החלטת ארכיטקטורה:** במקום לדחות שוב, הקידוד עצמו הועבר למקום שבו כבר קיים
מקודד וידאו אמיתי בחינם — הדפדפן של הצופה עצמו. `StreetWalkPanel.tsx` (כשהדפדפן
תומך ב-`MediaRecorder`+`canvas.captureStream`, מזוהה ב-feature-detection, בלי
לשבור דפדפנים ישנים/PDF headless שלא תומכים) מציע כפתור "🎬 צור סרטון רחוב":
מצייר את אותן מסגרות בדיוק (`streetWalk.points`, אותו מקור נתונים כמו הקרוסלה
הקיימת, דרך `/api/image` הקיים) על קנבס נסתר, מקליט אותן ל-Blob אמיתי (MP4 אם
הדפדפן תומך בקידוד `avc1`, אחרת WebM — נבחר דרך `MediaRecorder.isTypeSupported`)
ומעלה אותו פעם אחת ל-`/api/street-video` (POST, ציבורי כמו tabu-request/
area-alert — לא דורש התחברות). כל צופה הבא של אותו נכס מקבל את הקליפ השמור
ישירות (GET לפי `slug`, אותו permalink קבוע כמו הקישור הקבוע ב-`lib/savedreports.ts`)
בלי להקליט מחדש — זה בדיוק מה ש"cached per property" מבקש, בלי להמציא תלות
ffmpeg בשרת שלא ניתן לאמת בסביבה הזו בכלל.

**מה נוסף:** מיגרציה `0151_nadlan_street_video_cache.sql` — טבלה
`nadlan.street_video_cache` (RLS מופעל בלי policy, בדיוק כמו `saved_reports`:
כל גישה עוברת דרך מפתח השירות) + באקט אחסון ציבורי-קריאה חדש
`nadlan-street-video` (15MB, `video/webm`/`video/mp4` בלבד — הקליפ הוא רק
קידוד-מחדש של אותן תמונות Street View ציבוריות שכבר מוגשות דרך `/api/image`,
אין בו מידע פרטי, אותה עמדה בדיוק כמו `nadlan-pro-media`). `lib/store.ts`:
`getStreetVideo`/`saveStreetVideo` (מפתח הנתיב הפיזי הוא hash של ה-slug ולא
ה-slug עצמו — הוא יכול לכלול עברית לנכס בלי גוש/חלקה, ראה `slugOf`, ואין
תקדים בקוד הזה לתווים לא-ASCII בנתיב אחסון). `lib/savedreports.ts`:
`savedReportExists` חדש — קיום-בלבד בלי להגדיל את מונה הצפיות של `readSaved`,
כדי שבדיקת-קיום ל-slug (הגנה מפני קליפים תחת מזהה מומצא) לא תזייף צפיות.
`app/api/street-video/route.ts` (GET/POST חדשים). `ReportView.tsx` קיבל
`preloadedSlug` חדש — גילוי אמיתי תוך כדי הבנייה: בנתיב הקישור הקבוע
(`/p/[slug]`, `SavedReportView.tsx`) ה-JSON השמור ב-DB הוא ה-`PropertyReport`
הגולמי בלבד (`permalink` מתווסף רק בתשובת ה-API החי, לא נשמר בתוך הדוח עצמו) —
בלי `preloadedSlug` הפיצ'ר היה נעלם בשקט בדיוק בעמוד שבו יש לו הכי הרבה ערך
(צפיות חוזרות של אותו נכס, בדיוק מקרה השימוש של מטמון).

**באג אמיתי שנתפס באימות ותוקן לפני הפריסה:** `MediaRecorder` נושא קודק בתוך
ה-`type` (למשל `video/webm;codecs=vp9`) — ההשוואה המקורית
`ALLOWED_MIME.includes(file.type)` הייתה דוחה כל קליפ תקין (רק
`video/webm`/`video/mp4` המדויקים היו עוברים), וגם ה-`contentType` שהיה מועבר
לאחסון לא היה תואם ל-`allowed_mime_types` המדויק של הבאקט. תוקן: `baseMime =
file.type.split(';')[0]` לפני גם ההשוואה וגם ה-upload/השמירה ב-DB.

אומת: אין `node_modules`/דפדפן בסביבה הזו (כרגיל), אז לא ניתן להריץ
`MediaRecorder`/`canvas.captureStream` בפועל — זו אותה מגבלה בדיוק כמו כל סבב
`app.html`/TSX-בלבד קודם, ומתועדת כמגבלה מפורשת, לא הוסתרה. מה שכן אומת: (1)
בדיקת איזון-סוגריים על כל 7 הקבצים שנוספו/שונו — כולם תקינים; (2) `SLUG_RE`
(התבנית שמאמתת `slug` בנתיב) נבדקה ב-Node טהור מול פלט אמיתי של `slugOf` —
כולל התרחיש שנתפס תוך כדי בדיקה: `slugOf` **כן** מייצר slugs עם עברית לנכס
בלי גוש/חלקה (כתובת חופשית), ורג'קס ראשוני שהתיר רק ASCII היה דוחה אותם תמיד;
תוקן לטווח היוניקוד העברי המדויק של `slugOf` עצמו (`֐`-`׿`), ונבדק
גם שהוא דוחה path-traversal/רווח/מחרוזת ריקה/קצרה מדי; (3) לוגיקת הוולידציה
של ה-POST route (slug/mime/גודל/מספר-מסגרות) שוכפלה עצמאית ב-Node טהור מול 7
תרחישים — כולם עברו, כולל הבאג שנמצא ותוקן; (4) בחירת-סיומת הקובץ (`mp4`
מול `webm`) ובניית-הנתיב-בהאש נבדקו דטרמיניסטית. אומת חי ב-MCP: המיגרציה
הורצה תחילה בתוך `BEGIN;...ROLLBACK;` (כולל בדיקת-קיום-slug מול שורה אמיתית
ב-`nadlan.saved_reports`, יצירת קליפ ראשון, ורענון/upsert לאותו slug עם נתיב
אחר — נבדק שנשארת בדיוק שורה אחת, לא כפילות), ואז הוחלה בפועל דרך
`apply_migration`; `get_advisors` (security) אחריה מראה רק `rls_enabled_no_policy`
INFO על `street_video_cache` — אותה אזהרה-צפויה-ומכוונת בדיוק כמו
`saved_reports`, לא ממצא חדש. אין העלאת-storage אמיתית שנבדקה (דורשת
`@supabase/supabase-js` מותקן, לא זמין כאן) — הקוד עוקב מילה-במילה אחרי אותו
`db.storage.from(bucket).upload(path, bytes, {contentType, upsert})` שכבר
מוכח עובד ב-`app/api/admin/tabu/route.ts`.

אפס רגרסיה: קובץ מיגרציה חדש + קובץ API חדש + שתי פונקציות חדשות ב-`lib/
store.ts` + פונקציה חדשה ב-`lib/savedreports.ts` (אדיטיבית, שום ייצוא קיים
לא נגע) + שני props אופציונליים חדשים (`permalink` ל-`StreetWalkPanel`/
`PropertyImagery`, `preloadedSlug` ל-`ReportView`, כולם ברירת-מחדל `null`) —
נתיב הקרוסלה הקיים (`allFailed`/רצף-תמונות) לא נגע כלל, ומוצג בדיוק כמו לפני
בכל מקרה שבו אין קליפ שמור (כולל דפדפן שלא תומך בהקלטה — הכפתור פשוט לא
מוצג). System 35 KioskFleet לא נגע, לפי ה-HARD STEERING (owner directive v2,
2026-08-25) שמעביר סבב זה ל-P2 Real-estate.

## עדכון — 25/08/2026 (Loop A, session 5 — TABU workflow §1-2: מקור-הבקשה מהלקוח, שהיה חסר לגמרי)
`core.build_tasks` id=4/11 ("TABU workflow": checkbox+grade → mgmt task+email →
upload+Research → view/download+AI-explanation → attach to client) עדיין
`todo` על שתי המערכות. ביקורת מלאה (הופעל Explore agent + קריאה ישירה) מצאה
ש-3 מתוך 5 השלבים כבר קיימים ועובדים, ורק אחד חסר לגמרי:

- **קיים:** העלאה+ניתוח AI (`tabu_documents`, `lib/tabudoc.ts`, `TabuPanel` ב-
  `RequestsBoard.tsx`) — ה"ניתוח" כבר כתוב ב-`analysis.summary` (3-5 שורות
  עברית מדוברת, בדיוק "מה שקונה צריך לדעת") — זה כבר ההסבר-בשפה-פשוטה שהמפרט
  מבקש, רק לא תויג ככזה במפורש.
- **קיים ומחובר בפועל (אומת בקוד, לא הונח):** צירוף ללקוח — `reportEmailHtml`
  (`lib/reporthtml.ts`) כבר מרנדר `tabuBlock(opts.tabuDocs)`, ו-`/api/admin/
  requests` (route.ts שורה 117) כבר קורא ל-`tabuForProperty()` ומעביר את
  התוצאה ל-`reportEmailHtml` בכל שליחת דוח בפועל.
- **חסר לגמרי (עד הסבב הזה):** שום דרך ללקוח *לבקש* נסח. כל שורה ב-
  `tabu_documents` הגיעה מיוזמת צוות בלבד — אין רישום שלקוח ביקש, ואין שום
  התראה לצוות איזה גוש/חלקה דורש הזמנה אמיתית מרשם המקרקעין.

**למה לא הוצג נתון-נסח על המסך (רק במייל):** `/report?q=` הוא עמוד ציבורי
לגמרי (כל מי שמזין את הכתובת רואה VIP אם מוסיף `tier=vip` ל-URL — אין בדיקת
תשלום ברמת העמוד), וגם הקישור הקבוע `/p/[slug]` **דטרמיניסטי מכתובת/גוש-חלקה**
(`slugOf` ב-`lib/savedreports.ts`, לא טוקן סודי) — שני העמודים משותפים/ניתנים-
לניחוש במפורש בכוונה (לינק ל-WhatsApp). `lib/tabudoc.ts` עצמו כותב במפורש
"אין מסלול ציבורי" לנתוני נסח (שמות בעלים, סכומי משכנתה אמיתיים) בגלל זה
בדיוק. הוספת נתוני נסח לאחד העמודים האלה הייתה **חושפת מידע משפטי פרטי לכל מי
שיודע/מנחש כתובת** — נסוג מהרעיון הזה במפורש אחרי בדיקה, לא רק דילוג.

**מה נבנה בפועל (רק §1-2, השלב שבאמת חסר):**
- מיגרציה `0150_nadlan_tabu_requests.sql`: `nadlan.tabu_requests` — RLS זהה
  ל-`report_requests` (INSERT בלבד ל-`public`, `with check(true)`, אותו grant
  set בדיוק כמו `report_exports`/`tabu_documents`). אומת חי: insert תקין
  עובר, `grade`/`status` לא-חוקיים נדחים ע"י check constraint, מעברי סטטוס
  pending→sent→fulfilled עובדים, `get_advisors` (security) לא הראה אזהרה
  חדשה. `tabu_document_id`/`fulfilled_at` נשארים בסכימה בלי קוד שכותב אליהם —
  חיבור-הקישור בפועל (העלאת נסח ← איזו בקשה היא עונה עליה) **נשאר פתוח**
  לסבב הבא, במכוון: לא רציתי לנעול/לשנות את זרימת ה-`TabuPanel` הקיימת
  (צוות מעלה נסח יזום גם בלי בקשת לקוח — יכולת קיימת, אסור לפגוע בה).
- `lib/requests.ts`: `createTabuRequest`/`listTabuRequests`/
  `pendingTabuRequestCount`/`markTabuRequestSent`/`recordTabuRequestEmailResult`
  — אותו דפוס בדיוק כמו `report_requests` (anon יוצר, service קורא/מעדכן).
- `app/api/tabu-request/route.ts` (POST, ציבורי): מאמת גוש/חלקה/מייל, יוצר
  שורה, ואז best-effort שולח מייל-התראה לצוות (`TABU_ADMIN_EMAIL`, משתנה סביבה
  חדש — צריך הגדרה ב-Vercel; בלעדיו/בלי RESEND הבקשה עדיין נשמרת,
  `admin_email_error` מתעד את הסיבה במקום להעלים אותה בשקט).
- `app/api/admin/tabu-requests/route.ts` + `TabuRequestsBoard.tsx` (לוח ניהול
  חדש, `adminGate` זהה ל-`RequestsBoard`): רשימת בקשות + כפתור "סומן כהוזמן —
  נשלח לרשם המקרקעין" (הפעולה האנושית שאי אפשר להפוך לאוטומטית — אין API
  ציבורי לנסח, ראה `lib/tabu.ts`). מחובר בעמוד `/admin` (section נפרד, אחרי
  "בקשות דוח").
- `TabuRequestPanel.tsx` (VIP בלבד, `tier === 'vip'`, אותו שער כמו `VipPanel`):
  צ'קבוקס + בורר עדיפות (רגילה/דחופה) + שם/מייל/טלפון/הערות, בדוח עצמו
  (`ReportView.tsx`, אחרי `VipPanel`). **כותב בלבד** — אף פעם לא קורא נתוני
  נסח קיימים, מהסיבה שהוסברה למעלה.

⚠️ קיים כבר מנגנון ישן ונפרד — `document_requests`/`RequestForm.tsx`/
`/api/request` (`doc_type: 'tabu'|'rami'|'permit'|'other'`, עמוד `/request`
עצמאי). לא נגעתי בו: הוא כללי (4 סוגי מסמך, בלי גוש/חלקה-חובה, בלי "grade"),
ובבדיקה נמצא **ללא שום צרכן בניהול** (`grep` על `document_requests` מחזיר רק
את `lib/store.ts` עצמו) — כלומר בקשות אליו נעלמות היום בלי שאף אחד רואה אותן.
לא תוקן בסבב הזה (מחוץ לסקופ), אבל שווה לדעת שהוא שם ולא מיותר להחליף/לתקן
בנפרד. `tabu_requests` החדש **לא** מחליף אותו.

אומת: `node --check` לא זמין ל-TSX (כרגיל, אין `tsc`/`node_modules` בסביבה),
כך שהאימות היה בדיקת איזון-סוגריים ממוקדת על כל קובץ חדש/שהשתנה (עברו נקי;
הסטטיסטיקה השלילית שדיווח סקריפט האיזון על `ReportView.tsx` המלא אומתה
כתקלה קיימת-מראש של הסקריפט מול generics/JSX בקובץ הענק הזה — נבדק גם על
הגרסה *לפני* השינוי שלי, אותה תוצאה בדיוק) + שכפול-לוגיקה עצמאי ב-Node טהור
של ולידציית ה-route (7 תרחישים: גוש/חלקה חסרים, מייל לא תקין, grade לא-מוכר
→ נופל ל-`normal`, רווחים-בלבד נחשב חסר — כולם עברו). מיגרציית ה-DB אומתה חי
דרך MCP (insert/constraint/status-transition + advisors, לא רק קריאת קוד).
אפס רגרסיה: שני API routes חדשים + שני קומפוננטות חדשות + section חדש בעמוד
ניהול + טבלה חדשה — שום route/קומפוננטה/RPC קיימים לא נגעו. System 35
KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, session 4 — core.build_tasks reconciliation + implausible-price warning על system 36)
הסבב הזה קרא לראשונה את `core.build_tasks` (טבלה חדשה שנוצרה היום ב-21:22:58,
מקור-האמת החדש ל-PROGRESS CONTRACT לפי הנחיית הבעלים ב-core.projects #33).
שתי שורות בעדיפות 10 (32+36, "360 panorama at property exact coords") נמצאו
כבר בנויות ומאומתות במלואן מסבבים קודמים היום (`PanoramaPanel.tsx` + `lib/
panoramalookup.ts`/`lib/mapillary.ts`/`lib/googlemaps.ts` ל-32,
`loadPanorama`/`panoramaHtml` ב-`app.html` ל-36 — שתיהן עם Google Street
View + נפילת-Mapillary + תאריך-צילום מוצג) — סומנו `done` בטבלה כדי שהיא
תשקף את המצב האמיתי, בלי לבזבז סבב על בנייה חוזרת.

שורת עדיפות 30 ("exact price per sqm... advertised shown separately;
implausible-ratio warning e.g. 1 NIS") נמצאה בנויה במלואה ב-32
(`plausibleAgainstMarket` ב-`lib/buildreport.ts`, סף 0.2x–5x מול חציון
העסקאות הרשומות — מילולית "1 ₪" כדוגמה בהערת הקוד המקורית) אבל **חלקית**
ב-36: `valuationHtml()` ב-`app.html` כבר מפריד נכון בין מחיר-מבוקש
(`p.price`, שדה הנכס של המתווך) לבין הערכת-שווי-רשומה (`val.mid`, מ-
`valuation.comparables` הרשום) — אבל יחס קיצוני (למשל מתווך שהקליד "1" ₪
בטעות) סווג `diffPct < -10 → 'good'` (ירוק, "מציאה!"), ולא כאזהרת-קלט
חשודה. תוקן: נוסף `implausible` (אותו סף 0.2x–5x בדיוק כמו 32) — כשחורג,
הטייל מוצג `warn` (לא `good`) וקופסת-`.note` מסבירה שהיחס מעיד כמעט תמיד על
טעות הקלדה ("בדוק את השדה מחיר בכרטיס הנכס"), במקום לתייג בטעות "מציאה".
טווח סביר (±15%) ממשיך להתנהג בדיוק כמו לפני — אפס רגרסיה.

אומת: `node --check` על ה-`<script type="module">` המחולץ עבר נקי (160,668
תווים); בדיקת איזון-סוגריים על הקובץ המלא תקינה (791/791/2787/2787/207/207).
שוכפלה עצמאית ב-Node טהור לוגיקת ה-classify מול 8 תרחישים (טעות-1-₪,
ספרה-חסרה, מציאה-לגיטימית -15%, יקר-לגיטימי +15%, בטווח רגיל, יקר-קיצוני
פי-6, בלי askPrice/שכירות, בלי val.mid) — כל 8 תואמים את ההתנהגות הצפויה,
כולל ששני התרחישים הלגיטימיים (±15%) לא השתנו. אין דפדפן/`node_modules`
בסנדבוקס הזה לקליק-דרך, אותה מגבלה כמו כל סבב `app.html`-בלבד קודם. אפס
רגרסיה: שורה אחת שונתה (מיפוי-קלאס), שתי שורות נוספו (`implausible` + קופסת
אזהרה) — שום handler/RPC/שדה קיימים אחרים לא נגעו. נדחה+נדחף לענף
`fix/36-nadlan-pro-implausible-price-warning-0825`. System 35 KioskFleet לא
נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, system 36 nadlan-pro — תבניות חוזה משרדיות: אין נתיב כתיבה)
נבדק ונדחה בסבב הקודם (contract-parcel-details) ותועד כפער אמיתי שנשאר פתוח
בכוונה: `nadlan_pro.contract_templates` (`0012_nadlan_pro_contracts.sql`) כבר
תוכננה בדיוק בשביל זה — `office_id null` = תבנית מערכתית משותפת, `office_id`
מוגדר = נוסח משרדי עצמאי, RLS (`np_tpl_write`) כבר גודר כתיבה ל-
`nadlan_pro.manages_office(office_id)`, ואינדקס ייחודי כבר שומר על מפתחות
נפרדים בין משרדים — אבל אף RPC לא חשף נתיב כתיבה. `contractForm()` ב-`app.html`
קרא רק ל-`np_templates()` (קריאה בלבד) כדי למלא את בורר התבניות. בפועל: כל
משרד היה תקוע עם שלוש התבניות המערכתיות הקבועות מילה במילה — בלי שום דרך
להתאים סעיף ספציפי למשרד, ברירת-מחדל אחרת למשך זמן, או שורת גילוי-נאות
מקומית.

תוקן: שתי RPCs חדשות (מיגרציה `0146`) — `np_template_save` (יצירה/עדכון של
נוסח משרדי עצמי; `security invoker` כך ש-RLS אוכף בפועל: שורות `is_system`
ושל משרדים אחרים פשוט לא נראות/לא ניתנות לכתיבה, בדיוק כמו כל טבלה אחרת
בסכימה הזו) ו-`np_template_delete` (מחיקה, מסונן במפורש `is_system=false`
כדי שתבנית מערכתית לעולם לא תימחק גם אם ינסו). ב-`app.html`, מסך "הגדרות"
קיבל מקטע חדש "תבניות מסמכים": רשימת כל התבניות (מערכתיות + משרדיות),
"עריכה"/"מחיקה" לתבנית משרדית, "שכפול לנוסח משרדי" לתבנית מערכתית (פותח
עורך מוזן-מראש מהמקור, שמירה יוצרת עותק חדש ולא נוגעת במקור), ו-"+ תבנית
משרדית חדשה" ליצירה מאפס — משתמש ב-`drawer()` הקיים, אותו דפוס בדיוק כמו
`contractForm()`. גדור ל-`canManage` (owner/manager) בצד הלקוח, תואם בדיוק
לאכיפת השרת.

אומת: `node --check` על ה-`<script type="module">` המחולץ עבר נקי; בדיקת
איזון-סוגריים על הקובץ המלא תקינה. אומת חי ב-MCP פעמיים — פעם בתוך
`BEGIN;...ROLLBACK;` לפני ההחלה (הפונקציות הוגדרו זמנית באותה טרנזקציה) ופעם
נוספת אחרי `apply_migration` האמיתי מול הפונקציות החיות בפועל, שתיהן במשרד
האמיתי "משרד בדיקה QA 18/08 - אל תמחק": יצירת תבנית משרדית (מזהה חוזר, `
is_system=false`), הופעתה ב-`np_templates()` לצד 3 המערכתיות ללא פגיעה בהן,
עדכון שם/תוכן, ניסיון-חסימה למחוק תבנית מערכתית (נדחה כצפוי), מחיקת התבנית
המשרדית (חוזר ל-0), וניסיון כתיבה ע"י "זר" שאינו חבר במשרד (נדחה ע"י RLS) —
`ROLLBACK`/מחיקה בסוף כל בדיקה אימתו אפס שיוריות. `get_advisors` (security)
הורץ אחרי ההחלה — אין אזהרה חדשה שמזכירה `np_template_save`/`np_template_delete`.
אפס רגרסיה: שתי RPCs חדשות + מקטע UI חדש בלבד — `np_templates`/`contractForm`/
כל RPC/handler קיימים אחרים לא נגעו. נדחף לענף
`fix/36-nadlan-pro-office-contract-templates-0825` — לא מוזג. system 35
KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, system 36 nadlan-pro — מסמכים לחתימה הציגו כתובת בלי גוש/חלקה)
בדיקה שיטתית (השוואת כל RPC בשם `np_contract_*`/`np_invoice_*` שמוגדר
ב-`supabase/migrations/*.sql` מול כל אתר-קריאה ב-`sites/36-nadlan-pro/tivuch/
*.html`, אותה שיטה בדיוק כמו סבבי rent-payment-waive/office-delete הקודמים)
מצאה ש-`np_contract_context` (`0012_nadlan_pro_contracts.sql`) כבר מחזיר
`property_gush`/`property_helka` בתוך ה-jsonb שהוא בונה מנתוני העסקה
האמיתיים — אבל `contractForm()` ב-`app.html` (מייצר מסמכים לחתימה: הסכם
תיווך / זיכרון דברים / אישור הצגת נכס) מעולם לא העביר את שני השדות האלה
(ולא את `property_area`) לתוך `{{property_details}}` — רק `property_rooms`
הגיע בפועל. בפועל: מתווך שהפיק הסכם/זיכרון-דברים לנכס ספציפי בתוך בניין
מפוצל (כמה תתי-חלקות על אותו גוש/חלקה) קיבל מסמך שמזהה את הנכס רק לפי
כתובת+מספר חדרים — בדיוק השדה שאמור לזהות את הנכס באופן משפטי-מדויק
(גוש/חלקה, ותת-חלקה כשקיימת) נשאר בחוץ, למרות שהוא כבר מוצג בכל מקום אחר
בקובץ הזה (כרטיס נכס, מעקב-אזור, איתור פנורמה/סיור-רחוב).

תוקן: `np_contract_context` (מיגרציה חדשה `0145`) מוסיף גם `property_tat_helka`
(עמודה קיימת ב-`nadlan_pro.properties`, לא נבחרה קודם בכלל) לצד השניים
הקיימים. ב-`app.html`, בניית `property_details` בתוך `contractForm()` הורחבה
משורה בודדת ("חדרים בלבד") למערך שמצרף חדרים+שטח+"גוש X חלקה Y[/תת-חלקה]"
(אותה תבנית בדיוק כמו "גוש 6941 חלקה 112" שכבר מוצגת בפאנל הפנורמה/סיור-רחוב
בקובץ הזה), מדלג על כל שדה חסר ולא מציג גוש/חלקה חלקיים (רק כששניהם קיימים
יחד). שום RPC/handler/טופס קיימים אחרים לא נגעו.

אומת: `node --check` על ה-`<script type="module">` המחולץ עבר נקי; בדיקת
איזון-סוגריים על הקובץ המלא תקינה (766/766 מסולסלים, 2689/2689 עגולים,
202/202 מרובעים). שוכפלה עצמאית ב-Node טהור לוגיקת בניית `property_details`
מול 7 תרחישים (כל השדות מלאים כולל תת-חלקה, גוש/חלקה בלי תת-חלקה, חדרים
בלבד כמו ההתנהגות הישנה, `ctx` ריק, גוש בלי חלקה, חלקה בלי גוש — שני
המקרים האחרונים לא מציגים גוש/חלקה חלקי) — כולם עברו. אומת חי ב-MCP:
לפני התיקון ב-DB, `np_contract_context` על עסקה זמנית עם נכס נושא
גוש/חלקה/תת-חלקה החזיר `ctx=null` בתוך אותו `WITH`-CTE שיוצר את העסקה
(מוזרות-נראות של ה-CTE, לא קשורה למיגרציה עצמה — אומת מיד אחר כך עם
INSERT-ים נפרדים באותה טרנזקציה), ואז לאחר החלת המיגרציה האמיתית דרך
`apply_migration`, אותה בדיקה (עסקה+נכס זמניים בתוך `BEGIN;...ROLLBACK;`,
במשרד האמיתי "משרד בדיקה QA 18/08 - אל תמחק") החזירה `property_tat_helka`
נכון לצד שני השדות הקיימים — `ROLLBACK` בסוף אימת אפס שיוריות (0 עסקאות/0
נכסים ב-DB לפני ואחרי). `get_advisors` (security) הורץ אחרי ההחלה — אין
אזהרה חדשה שמזכירה `np_contract_context`; 9 השגיאות הקיימות בפרויקט כולן
בסכימות אחרות לגמרי (`knowledge_chunks`/`rights_*`/`more30_*`), לא קשורות.
אפס רגרסיה: שדה מוחזר נוסף אחד ברמת ה-RPC (אדיטיבי בלבד) + בניית-מחרוזת
מורחבת בנקודת-קריאה יחידה — שום handler/טופס/RPC קיימים אחרים לא נגעו.
נדחה+נדחף לענף `fix/36-nadlan-pro-contract-parcel-details-0825` (5821832c)
— לא מוזג. system 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

**נבדק ונדחה בסבב הזה (מתועד כאן כדי לא לבזבז קרדיטים על בדיקה חוזרת):**
אותה השוואה שיטתית ל-`np_office_settings_get/save`, `np_templates`, ולכל
`np_invoice_*`/`np_member_invite_*`/`np_lease_*` מצאה שהכול כבר מחווט
נכון (כולל תפקיד-הזמנה לא-קבוע, לוח תשלומי-שכירות מלא, טבלת חשבוניות
עם אכיפת-סף חוקי ב-constraint). שני פערים אמיתיים נשארו פתוחים בכוונה
כי הם דורשים החלטת-מוצר/משאב חדש ולא רק חיווט: (1) תבניות-חוזה ספציפיות
למשרד (`contract_templates.office_id`+מדיניות-RLS לכתיבה כבר קיימות בDB,
אבל אין שום כפתור/RPC ב-UI ליצור/לערוך תבנית משרד — כל משרד מוגבל
לשלוש התבניות המערכתיות הקבועות); (2) `invoice_provider`/`invoice_provider_ref`
(0009) חסרי נתיב-כתיבה בכל מקום בקוד, כך שסטטוסי חשבונית `paid`/`cancelled`
ו-doc_type `tax_invoice` לעולם לא ניתנים להשגה מה-UI — אבל זה תלוי ב-NEEDS_USER
(מפתח ספק-חשבוניות) בדיוק כמו שה-QA doc כבר מתעד, לא פער-חיווט סמוי.

## עדכון — 25/08/2026 (Loop A, סעיף "הרחוב" חסר מהמייל ומהמצגת/PDF)
`QA/nadlan-v2.md` §המלצות #1 היה פתוח: סעיף §7 "הרחוב" (`StreetPanel.tsx`)
קיים רק במסך החי — `reportEmailHtml`/`reportEmailText` (`lib/reporthtml.ts`)
והמצגת/`api/deck` (`Presentation.tsx`) מעולם לא הכירו אותו, למרות שהמפרט
מונה אותו כאחת מארבע השכבות שחייבות להופיע (הנכס · הבניין · **הרחוב** ·
השכונה) וההיגזרות עצמן לא מושכות מקור חדש ולא עולות אגורה. לקוח שרק פותח
את המייל שקיבל, או את ה-PDF/מצגת שהורדו, לא ראה בכלל מה נמכר ברחוב שלו —
רק מי שנשאר על המסך החי ראה.

תוקן: הלוגיקה הטהורה (סינון עסקאות לפי שם-רחוב+כינויים, פסילת רשומות
חריגות מהחציון, קיבוץ לפי מספר בית, מיון לפי קרבה למספר הנכס) הוצאה מתוך
`StreetPanel.tsx` ל-`lib/streetstats.ts` (`computeStreetStats`) — אותו
דפוס "חשב פעם אחת, רנדר משלושה משטחים" שכבר קיים ל-valuation/comparables
(`ComparablesTrend.tsx`, `buildValuationSlide`). נוסף `streetBlock()` חדש
ל-`reportEmailHtml`/`reportEmailText` (טבלת סטטיסטיקות + טבלת מספרי-בתים,
עד 8 שורות, אותה הגבלה כמו המסך) ושקופית "הרחוב" חדשה ל-`buildSlides`
ב-`Presentation.tsx` (מוצגת רק כשיש לפחות עסקה אחת ברחוב). `StreetPanel.tsx`
עצמו עבר לקרוא לפונקציה המשותפת במקום לשכפל את הלוגיקה — אותה תצוגה
בדיוק, אותם שדות.

אין `node_modules` בסביבה הזו אז `tsc`/`next build` לא הורצו — אותה מגבלה
כמו כל סבב קודם. אומת: בדיקת איזון-סוגריים על ארבעת הקבצים; שכפול עצמאי
ב-Node טהור של `computeStreetStats` מול 9 תרחישים (רחוב עם כינוי כמו
"הבעשט", פסילת רשומה חריגה מהחציון תוך שהיא עדיין נספרת בסך-הכול, אפס
עסקאות ברחוב, מיון לפי קרבה כשלנכס עצמו אין עסקה) — כולם עברו. אפס
רגרסיה: `StreetPanel.tsx` מרנדר זהה לפני/אחרי (אותם שדות, אותה צורה),
ושתי התוספות (מייל, מצגת) הן סעיפים/שקופיות חדשים בלבד — שום שדה/חישוב/
מסך קיימים לא נגעו. נדחה+נדחף לענף
`fix/32-nadlan-berega-street-section-email-deck-0825` — לא מוזג. system 35
KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, השלמת מיגרציות חסרות — 4 טבלאות saved_reports/tabu)
לאחר סבב האינדקסים החסרים (0142), `get_advisors` (security) המשיך להראות
`rls_enabled_no_policy` על 4 טבלאות ב-`nadlan`: `saved_reports` (19 שורות),
`saved_report_versions` (141 שורות), `report_exports` (22 שורות),
`tabu_documents` (0 שורות). RLS מופעל וללא מדיניות = חסימה מוחלטת לכל תפקיד
פרט ל-`service_role` — נבדק בקוד (`lib/savedreports.ts`, `lib/requests.ts`,
`lib/store.ts`) שזה בדיוק הדפוס בפועל: כל גישה עוברת דרך מפתח שירות בלבד,
אז זה **לא** באג, אלא התנהגות מכוונת. הבאג האמיתי היה שהטבלאות האלה
(כמו גם `nadlan_report_requests_and_tabu` ו-`nadlan_saved_reports_permanent_links`
שכבר רשומות ב-`list_migrations` החי) מעולם לא תועדו כקובץ מיגרציה בריפו —
סביבה חדשה שנבנית מ-`supabase/migrations/` בלבד הייתה חסרה את ארבע הטבלאות
האלה לגמרי, בזמן ש-`lib/*` כבר תלוי בהן.

מיגרציה חדשה `0143_nadlan_saved_reports_backfill.sql` יוצרת מחדש בדיוק את
ה-DDL החי (עמודות, FK-ים, CHECK-ים, אינדקסים, RLS מופעל, GRANT-ים) שנשלף
ישירות מה-DB דרך `information_schema`/`pg_constraint`/`pg_indexes` —
`CREATE TABLE IF NOT EXISTS` בלבד, לא reconstruction מהזיכרון. אומת חי ב-MCP:
הרצה בתוך `BEGIN;...ROLLBACK;` קודם (ספירת שורות זהה לפני/אחרי — 19/141/22/0),
ואז החלה אמיתית דרך `apply_migration` (idempotent, אפס שינוי בפועל כי
הטבלאות כבר קיימות) — ספירת שורות שוב זהה אחרי, ו-`get_advisors` (security)
מציג בדיוק אותן 8 אזהרות כמו לפני (4 `rls_enabled_no_policy` הצפויות + 2
`function_search_path_mutable` + 2 `*_security_definer_function_executable`
על `current_tier` — לא קשורות לסבב הזה, לא נגעו). אפס רגרסיה, אפס שינוי
לנתונים החיים — תיעוד/שחזוריות טהורה, כמו סבב `2a6a9fcf` (nadlan_pro) אבל
ל-`nadlan` (32). נדחף לענף `fix/32-nadlan-saved-reports-migration-backfill-0825`
— לא מוזג. system 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, תיקון initplan נוסף — nadlan.subscribers)
`get_advisors` (performance) סימן עוד טבלה עם `auth_rls_initplan` מלבד שתי
טבלאות הפורום של 36 שתוקנו קודם היום (ראה למטה): `nadlan.subscribers`
(מנוי/מסלול-תשלום ברמת-משתמש, לא קשור ל-`nadlan_pro`) — מדיניות
`own_subscription` שקוראת ל-`auth.uid()` ישירות ב-`USING`, נבדקת מחדש לכל
שורה במקום פעם אחת לכל שאילתה.

תוקן באותו דפוס בדיוק כמו התיקון הקודם (מיגרציה 0139): מיגרציה חדשה 0140
עוטפת את `auth.uid()` ב-`(select auth.uid())` דרך `ALTER POLICY` — שכתוב
ביטוי טהור, אותם תפקידים, אותה תוצאה בוליאנית לכל שורה. אין קובץ מיגרציה
מקומי קיים לטבלה הזו מלכתחילה (נוצרה חי לפני שהריפו הזה התחיל לעקוב אחרי
`nadlan`/`subscribers` — אותה מגבלת "מיגרציה חיה בלבד" כמו כמה טבלאות
אחרות בסבבים קודמים), אז 0140 הוא הראשון שמתעד את המדיניות הזו בריפו.

אומת חי ב-MCP בתוך `begin;...rollback;` עם שני משתמשי `auth.users` אמיתיים
(לא UUID מומצא — `subscribers.user_id` הוא FK אמיתי ל-`auth.users`, ו-
`tier`/`status` כפופים ל-CHECK constraints קיימים): `set local role
authenticated` + `request.jwt.claims` הדמו כל משתמש בתורו מול שתי השורות —
כל אחד רואה בדיוק שורה אחת (את שלו), לא שתיים — בדיוק כמו לפני התיקון.
`rollback` בסוף אימת אפס שיוריות. `get_advisors` (performance) הורץ מחדש
אחרי החלת המיגרציה — האזהרה על `nadlan.subscribers` נעלמה, לא נוספה אזהרה
חדשה. אפס רגרסיה: שכתוב-ביטוי טהור על מדיניות בודדת, שום טבלה/RPC/UI אחר
לא נגע. נדחה+נדחף לענף `fix/32-nadlan-berega-subscribers-rls-initplan-0825`
— לא מוזג. system 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, system 36 nadlan-pro — מחיקת משרד: RPC חי בלי שום דרך להגיע אליו)
בדיקה שיטתית (השוואת כל RPC בשם `np_*` שמוגדר ב-`supabase/migrations/*.sql`
מול כל אתר-קריאה ב-`sites/36-nadlan-pro/tivuch/*.html`, אותה שיטה בדיוק
כמו סבב ה-rent-payment-waive למטה) מצאה עוד RPC חי שאף קובץ לקוח לא קורא לו:
`np_office_delete` (`0130_nadlan_pro_office_delete.sql`, תיאור-המיגרציה
מכנה אותו "QA cleanup path") — פונקציה שלמה עם בדיקת-הרשאה (owner בלבד,
זהה ל-`role='owner' and is_active`) ומחיקה-מדורגת דרך גרף ה-FK (חברים/
נכסים/עסקאות/אנשי-קשר/שכירויות/מסמכים כולם `on delete cascade` על
`offices.id` כבר מ-0009) — אבל אף כפתור/handler ב-`app.html`/`office.html`/
שאר קבצי 36 לא קרא לה אף פעם. בפועל: משרד שרצה להתפרק/לצאת מהמערכת לא
היה יכול להסיר את עצמו מהמוצר בכלל — רק דרך SQL/MCP ישיר, מה שסותר את
העובדה שהמיגרציה עצמה כבר בנתה את שכבת ההרשאה הנכונה בציפייה לזה.

נוסף לטאב "הגדרות" (`renderSettings`/`wireSettingsBody` ב-`app.html`)
מקטע "אזור מסוכן" חדש, גלוי רק כש-`OFFICE.role==='owner'` (מראה בצד
הלקוח בלבד את אותה בדיקה שהשרת כבר אוכף — לא הרשאה חדשה): שדה טקסט
שדורש הקלדת שם המשרד המדויק לאישור + כפתור `.btn-danger` (המחלקה כבר
קיימת בקובץ, בשימוש בכפתורי הסרה/מחיקה אחרים) מאחורי `confirm()` נוסף,
אותו דפוס כפול-אישור כמו כל פעולה הרסנית אחרת בקובץ הזה. `s` (אובייקט
ההגדרות) הועבר עכשיו כפרמטר דרך כל ארבע נקודות ה-`wireSettingsBody()`
הקיימות (טוגל-פרסום, רג'נרציית-טוקן-ציבורי, טוגל-קליטת-לידים,
רג'נרציית-טוקן-לידים) כדי שבדיקת-ההתאמה של שם המשרד תישאר נכונה גם
אחרי כל עדכון-הגדרות ביניים, לא רק בטעינה הראשונית. שום RPC/מיגרציה
חדשים — הפונקציה כבר הייתה חיה במלואה, זו תוספת-חיווט UI בלבד, אותו
סוג פער בדיוק כמו rent-payment-waive/commission-tracking שנמצאו קודם
היום.

אומת חי ב-MCP: מכיוון שהפעולה הרסנית ובלתי-הפיכה, לא הורצה נגד המשרד
האמיתי "משרד בדיקה QA 18/08 - אל תמחק" (השם עצמו מזהיר מפורשות) — נבנה
משרד-חד-פעמי עם שני משתמשי-QA אמיתיים (owner+agent) וישות `contacts`
תלויה, בתוך `begin;...rollback;`: (1) ניסיון מחיקה ע"י agent (לא owner)
נדחה עם `42501`/"רק בעלים יכול למחוק את המשרד", המשרד נשאר קיים; (2)
מחיקה אמיתית ע"י ה-owner האמיתי החזירה `office_after=0`/
`members_after=0`/`contacts_after=0` — מחיקה-מדורגת מלאה ומאומתת, לא
רק שורת ה-offices. `rollback` בסוף שתי הבדיקות אימת אפס שיוריות (המשרד
הזמני לא קיים יותר בבדיקה נפרדת אחרי). `get_advisors` (security+
performance) נבדק מסונן ל-`nadlan_pro`/`office_delete` — אין ממצא חדש
(שתי אזהרות `function_search_path_mutable` הקיימות-מראש על פונקציות
אחרות לא קשורות). `node --check` נקי על ה-`<script type="module">`
המחולץ (154,586 תווים); ספירת סוגריים מאוזנת על הקובץ המלא (766/766
מסולסלים, 2682/2682 עגולים, 201/201מרובעים). אין דפדפן/`node_modules`
בסנדבוקס הזה לקליק-דרך, אותה מגבלה כמו כל סבב `app.html`-בלבד קודם.

אפס רגרסיה: מקטע UI תוספתי אחד + handler תוספתי אחד, שינוי-חתימה יחיד
(`wireSettingsBody(canManage)`→`wireSettingsBody(canManage, s)`) עודכן
בעקביות בכל ארבע נקודות הקריאה הקיימות — שום RPC/מיגרציה/handler קיים
אחר לא נגע. נדחה+נדחף לענף
`fix/36-nadlan-pro-office-delete-danger-zone-0825` (46dacadc) — לא
מוזג. system 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, system 36 nadlan-pro — פעולות ידניות/עריכה/ויתור בלוח תשלומי שכירות)
בדיקה שיטתית (השוואת כל RPC בשם `np_*` שמוגדר ב-`supabase/migrations/*.sql`
מול כל אתר-קריאה ב-`sites/36-nadlan-pro/tivuch/*.html`) מצאה שני RPC שקיימים
חי אבל אף קובץ לקוח לא קורא להם: `np_rent_payment_save` (יצירה/עריכה של
שורת-תשלום, `0127_nadlan_pro_rental_management.sql`) ו-status `'waived'`
(חלק מ-`nadlan_pro.rent_payment_status` שם ב-0127) שה-UI כבר נשא לו תווית
עברית מוכנה (`RSTATUS_HE.waived === 'ויתור'`) — אבל שום פונקציה לא הגדירה
מעולם שורת-תשלום כ"ויתור". בפועל: מתווך שהפיק "לוח תשלומים חודשי" יכול היה
רק לסמן שורה קיימת כ"שולם" — לא להוסיף תשלום חד-פעמי מחוץ ללוח (למשל דמי
ניקיון), לא לתקן תאריך/סכום שגוי לפני הגבייה, ולא לרשום חודש שבו המשכיר
ויתר על התשלום — מצב שה-schema וה-UI עצמו כבר ציפו לו אבל אי אפשר היה
להגיע אליו בכלל.

נוסף `np_rent_payment_waive(p_id)` (מיגרציה 0138, שיקוף מדויק של
`np_rent_payment_mark_paid` — אותה טבלה, אותה הגנת-RLS דרך שער office/owner
של החוזה, אותה שגיאת "לא נמצא"). `np_rent_payment_save` הקיים לא שונה כלל
(אין צורך). ב-`app.html`: כפתור "+ תשלום ידני" (יצירה), כפתור "עריכה" לכל
שורה ב-status `due` (עריכה, אותה טופס-מוקפץ בדיוק כמו היצירה, עם `p.id`),
כפתור "ויתור" לכל שורה כזו (מאחורי `confirm()`, כמו כל פעולה הרסנית אחרת
בקובץ הזה), ועמודת "הערה" חדשה בטבלה כדי שתשלום ידני/מתוקן יהיה קריא בלי
SQL. שום handler/שדה/RPC קיים לא נגע.

אומת: המיגרציה הוחלה חי (`get_advisors` נקי, אין ממצא חדש); בתוך
`begin;...rollback;` על המשרד האמיתי "משרד בדיקה QA 18/08" (התחזות ל-owner
האמיתי דרך `set local role authenticated` + `request.jwt.claims`) — יצירת
תשלום ידני, עריכת סכום בשורה שהופקה אוטומטית, ויתור על שורה, וסימון-כשולם
הקיים כולם נחתו נכון בטבלה; ואז התחזות למשתמש-זר לא-משויך אימתה שיצירה/
עריכה/ויתור כולם נדחים ע"י אותה מדיניות RLS מבוססת-`can_touch()` שכל טבלת-
כתיבה אחרת ב-`nadlan_pro` כבר משתמשת בה — לא נוספה הרשאה חדשה. `node --check`
נקי על ה-`<script type="module">` המחולץ; ספירת סוגריים/תושבים מאוזנת על
הקובץ המלא. אין דפדפן/`node_modules` בסנדבוקס הזה לקליק-דרך, אותה מגבלה
כמו כל סבב `app.html`-בלבד קודם.

אפס רגרסיה: פונקציה תוספתית אחת + כפתור/עמודה תוספתיים בטבלת תשלומים
קיימת — שום handler/שדה/RPC קיים לא נגע. נדחה+נדחף לענף
`fix/36-nadlan-pro-rent-payment-manual-edit-waive-0825` (a552d18a) — לא
מוזג. system 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, המצגת/PDF (`/present`, `/api/deck`) לא הציגו הערכת שווי וטבלת השוואה בכלל)
בדיקה עצמאית של שלושת משטחי הרינדור (מסך חי `ReportView.tsx`, PDF/מייל
`lib/reporthtml.ts`, מצגת/דק `components/report/Presentation.tsx`) מצאה
ששניים הראשונים מציגים כל קטגוריה/עובדה גנרית (`report.categories`), אז
תכונות חדשות (למשל `potential`, ראה הרשומה למטה) מגיעות אליהם אוטומטית —
אבל `Presentation.tsx` בונה שקופיות בבחירת-שדות ידנית (`buildSlides()`),
ומעולם לא כלל שקופית ל-`d.valuation`/`comparables`/`streetNameMismatch`,
למרות ש-P2 ACCURACY SPEC §E (core.projects #33) דורש טבלת עסקאות-השוואה +
טווח שווי במפורש, וזה כבר קיים ומוצג בדוח המסך והPDF (`ValuationPanel.tsx`)
ובמצגת nadlan-pro (`comparablesHtml`/`comparablesTrendHtml` ב-app.html). מי
שרואה רק את המצגת מול לקוח — בדיוק השימוש שלה — לא ראה בכלל את מספר ההערכה
שמצדיק את שאר הדוח, ולא את העסקאות שעליהן היא נשענת.

תוקן: שקופית חדשה ב-`buildSlides()` (בין "עסקאות שנסגרו" ל"מה יש מסביב"),
דרך `hasValuation(d.valuation)` (type guard קיים כבר ב-`lib/valuation.ts`,
לא נכתב חדש) — טווח שווי + הסבר + עד 4 עסקאות ההשוואה המובילות (כתובת,
תאריך, מחיר, מחיר למ"ר, קרבה). כשיש אי-התאמת שם-רחוב (`d.building.
streetNameMismatch`) ההערה מתווספת לתת-הכותרת, אותו נוסח שכבר קיים בדוח
המסך. `/api/deck` מרנדר את `/present?print=1` (אושר ב-`app/api/deck/
route.ts`), כך שה-PDF יורש את השקופית אוטומטית בלי שינוי נוסף. `Slide`
(הטיפוס הקיים) לא שונה — רק `kicker/title/subtitle/rows`, אותה צורה
שהשקופיות הקיימות ("עסקאות שנסגרו") כבר משתמשות בה.

אין node_modules בסנדבוקס הזה אז `tsc`/`next build` לא רצו; אומת בבדיקת
איזון-סוגריים על הקובץ המלא, ובשכפול Node טהור של `buildValuationSlide`
מול 5 תרחישים: הערכה רגילה, אי-התאמת שם-רחוב מתווספת לתת-הכותרת,
`notEnoughData` → 0 שקופיות (לא נדחפת שקופית ריקה), `valuation===null` →
0 שקופיות, עסקת השוואה עם שדות חסרים (`address/date/price/pricePerSqm`
כולם `null`) → נופלת בבטחה ל-"—"/תווית ריקה בלי לזרוק. `d.valuation`
נבנה ללא תלות ברמה (`valuate()` רץ תמיד ב-buildReport, אותו דבר שכבר
תיעדנו על `comparablesHtml` ב-36), אז השקופית מופיעה בכל הרמות שיש להן
מספיק עסקאות — לא רק VIP. אפס רגרסיה: שקופית חדשה אחת + import אחד, שום
שקופית/טיפוס/ראוט קיים לא נגע. system 35 KioskFleet לא נגע, לפי ה-HARD
STEERING (owner directive v2, 2026-08-25) שמעביר את הסבב הזה ל-P2 Real-
estate.

**נבדק ונדחה (לא בוצע, כדי לא לבזבז קרדיטים על דבר חסום):** נסיון להשלים
המלצה #1 מ-`QA/nadlan.md` ("שנת בנייה ממקור GIS עירוני" — ת"א/ירושלים/
חיפה) נבדק חי מהסביבה הזו: `gisn.tel-aviv.gov.il` מחזיר דף "תחזוקה"
(maintenance), `gisviewer.jerusalem.muni.il` מחזיר 403 Access Denied —
אותה מחלקת חסימה בדיוק כמו `govmap.gov.il` המתועדת כבר. לא הומצא אף
endpoint או שדה — נבדק ונמצא חסום, לא מומש בניחוש.

## עדכון — 25/08/2026 (Loop A, system 36 nadlan-pro — פוטנציאל השבחה בדוח האמת)
`NADLAN_PRO_מחקר_ואפיון.md` מודול 7 ("ניתוח כדאיות והשקעה") מבטיח "תשואה,
השוואה אזורית, **פוטנציאל השבחה (תב"ע/הפשרה)**, סימולציית משכנתא/רווח".
`feasibilityHtml()` הקיים ב-`app.html` (מודול 7, נבנה בסבב קודם) מכסה תשואה/
משכנתא/מס רכישה, וההשוואה האזורית כבר מכוסה ע"י `comparablesHtml`/
`comparablesTrendHtml` (סבבים קודמים) — אבל שום מקום לא הציג פוטנציאל השבחה
(התחדשות עירונית/ייעוד קרקע/תוכניות בהליך) בכלל.

בדיקה מצאה שהנתון הזה כבר קיים: `queryPlanningAtPoint`/`checkRenewal`
ב-`lib/buildreport.ts` (32) נשאלים **תמיד**, בלי תלות ברמה — הם מקורות
ממשלתיים חינמיים (XPLAN, מפת ההתחדשות העירונית של משרד הבינוי), לא מקור
בתשלום שגייטד ל-VIP כמו `nearbyConstructionPlans`/§12. `facts.potential`
נבנה ללא בדיקת-רמה ומוחזר כחלק מ-`categories` בכל תשובת `/api/report`,
כולל `tier=basic` — כלומר system 36 כבר מקבל את הנתון הזה בכל לחיצה על
"משוך דוח אמת", ופשוט לא הציג אותו.

נוסף `potentialHtml(categories)` ל-`app.html`: מאתר את הקטגוריה `potential`
בתוך `r.categories`, מציג רק שדות עם ערך אמיתי (מדלג על שדות עם
`missingReason` בלבד) — "שייך למתחם התחדשות עירונית", "ייעוד הקרקע",
"תוכניות שחלות על הנכס" וכו', בהתאם למה שהנכס הספציפי החזיר בפועל. קרוי
מתוך `truthHtml` מיד אחרי `valuationHtml`. אין שליפה חדשה, אין שינוי סכימה —
תוספת תצוגה בלבד על נתון שכבר זורם לקובץ הזה.

אומת: `node --check` על ה-`<script type="module">` המחולץ עבר נקי (145,965
תווים). שוכפלה עצמאית ב-Node טהור (`node_modules` לא מותקן כאן) לוגיקת
`potentialHtml` מול 6 תרחישים: קטגוריה עם ערכים אמיתיים ומעורבים
null/ריכים, קטגוריית `potential` חסרה לגמרי, קטגוריה עם כל השדות null,
`categories` כ-`undefined`/`null` (נפילה-לאחור בטוחה לדוחות ישנים בלי
קריסה), ובריחת-XSS על label/value — כל 14 הבדיקות עברו. אין דפדפן חי
בסנדבוקס הזה לקליק-דרך, אותה מגבלה כמו כל סבב `app.html`-בלבד קודם.
אפס רגרסיה: פונקציה חדשה + שורה אחת ב-`truthHtml`, שום קטע/handler/RPC
קיימים לא נגעו. נדחה+נדחף לענף
`feat/36-nadlan-pro-potential-upside-in-truth-report-0825` (96ed76d8) —
לא מוזג. system 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, פערי-שרשרת מ-Loop C נסגרו — העלאת מסמכים אמיתית ל-36 + מיגרציית 0135 הושלמה)
בדיקה עצמאית מצאה שהענף הזה (שרשרת Loop A) וענף Loop C (Fable) התפצלו
מזמן ומעולם לא התאחדו — כל commit ששיוך `Co-Authored-By: Claude Fable 5`
נוגע רק ב-`apps/32`/`sites/36-nadlan-pro`/`supabase/migrations` (לא נוגע
במערכת אחרת מחוץ ל-slice הזה), ולכן ניתן לשלוף commits ספציפיים בלי לסכן
מערכות אחרות. שלושה נמצאו רלוונטיים: `58011f2e`+`8f331218` (32, דיוק
זיהוי-בניין — `streetVerified`/`houseVerified`+אינטרפולציית-מרשם, "נסגר"
לפי ההערה ב-core.projects #32 אבל בפועל **לא** בשרשרת הזאת) ו-`c2325a82`
(36, העלאת קבצים אמיתית למאגר מסמכי-נכס). הסבב הזה תיקן את `c2325a82`
בלבד (הקטן והבטוח מביניהם ל-slice הנוכחי) — שני תיקוני 32 (32-geocode
node_modules-heavy, `buildreport.ts`/`geocode.ts` שהשתנו מאוד משני הצדדים)
נשארים פתוחים לסבב עתידי עם יכולת מיזוג זהירה יותר.

תוך כדי, נמצא באג אמיתי **בעבודה של הסבב הזה עצמו** (לא של Loop C): גיבוי
10 המיגרציות (2a6a9fcf, ראה למטה) לכד את `storage_path`/bucket/מדיניות-
storage של מסמכי-נכס (`0135_nadlan_pro_docs_upload.sql`) אבל **פספס** את
שלושת פונקציות ה-RPC שבאותה מיגרציה חיה בדיוק (`np_property_document_add`,
`np_property_documents`, `np_property_get`) — אומת מול `pg_get_functiondef`
חי: הדאטהבייס האמיתי כבר מכיל אותן (Loop C הריץ את המיגרציה המקורית חי
ב-24/08), אבל קובץ הריפו לא. סביבה חדשה שהייתה נבנית מהריפו הזה הייתה
מקבלת bucket+עמודה בלי שום דרך אמיתית לכתוב/לקרוא `storage_path` דרכם
(`url` גם נשאר NOT NULL בטעות, חוסם כל העלאה בלי קישור מודבק). תוקן:
שלוש הפונקציות + `alter column url drop not null` נוספו ל-`0135`,
מילה-במילה מול `pg_get_functiondef` החי (לא שוחזר מהזיכרון) — אומת שוב
ב-`begin;...rollback;` נקי על הדאטהבייס האמיתי, אפס שגיאות.

עם ה-RPC layer שלם, נוסף גם צד ה-UI מ-`c2325a82` ל-`sites/36-nadlan-pro/
tivuch/app.html` (`propDocsHtml`/`wirePropDocs`) — שדה "או קובץ מהמחשב",
פתיחה דרך Signed URL קצר-מועד (`sb.storage...createSignedUrl`, אותו דפוס
`sb.storage` הקיים כבר להעלאת תמונות ב-`nadlan-pro-media`), ומחיקת האובייקט
מה-storage כניקוי best-effort לצד מחיקת השורה. הקטע הזה ב-`app.html` לא
נגע ע"י אף סבב Loop A קודם (`propDocsHtml`/`wirePropDocs` זהים בדיוק למצב
שלפני `c2325a82`), אז ההעתקה הייתה נקייה בלי קונפליקט. אומת: `node --check`
על ה-`<script type="module">` המחולץ עבר נקי; `OFFICE.id`+תבנית-נתיב
`{office}/{property}/{ts}-{filename}` הושוו מילה-במילה מול התבנית הקיימת
כבר בהעלאת-תמונות (`nadlan-pro-media`, שורה 1867). `np_property_get`→
`d.documents`→`propDocsHtml(d.documents)`/`wirePropDocs(p, d.documents)`
אומת כשרשרת יחידה — אין צרכן שני של הצורה הישנה. אפס רגרסיה: הדבקת-קישור
ממשיכה לעבוד זהה (`storage_path=null`), מסמכים קיימים (כולם עם `url`
בלבד) ממשיכים לפתוח דרך `<a href>` כרגיל. system 35 KioskFleet לא נגע.

## עדכון — 25/08/2026 (Loop A, גיבוי 10 מיגרציות שהוחלו חי ולא נשמרו בריפו — 32+36)
בדיקה של `mcp__supabase__list_migrations` מול `supabase/migrations/` המקומי
מצאה פער אמיתי: כל מודול שנבנה על `nadlan_pro`/`nadlan` מ-18/08 עד עכשיו —
`nadlan_area_alerts`(+`_delivery_tracking`), `nadlan_pro_team_invites`,
`nadlan_pro_property_save_images_clear_fix`, `nadlan_rental_cache_area_month_unique`,
`0144_nadlan_pro_docs_upload`, `nadlan_pro_role_set_owner_guard`,
`nadlan_pro_rental_management`, `nadlan_pro_forum`(+`_fix_cross_office_names`),
`nadlan_pro_office_public_site`(+`_token_regen_fix_search_path`),
`nadlan_pro_office_delete`, `nadlan_pro_listing_purpose`(+3 המשך-מיגרציות),
`nadlan_pro_lead_intake`(+`_enum`+`_regen_revoke_anon`) — הוחל חי דרך ה-MCP
אבל **מעולם לא נשמר כקובץ בריפו**. הריפו והדאטהבייס החי סטו זה מזה: מי שהיה
בונה סביבה חדשה מהריפו הזה (או `supabase db reset`) היה מקבל סכימה חסרה —
בלי טאב "צוות", בלי שכירויות, בלי פורום, בלי אתר-משרד ציבורי, בלי קליטת
לידים חיצונית — כל אלה כבר חיים ב-production ומשמשים את app.html בפועל.

תוקן: 10 קבצי מיגרציה חדשים (0126–0135), כל אחד לפי גבול-פיצ'ר (לא לפי כל
מיגרציה חיה בנפרד) עם DDL שנשלף ואומת ישירות מהדאטהבייס החי (`pg_get_functiondef`,
`information_schema`, `pg_policies`, `pg_indexes`) — לא שוחזר מהזיכרון/מהתיעוד.
כשמיגרציה חיה תיקנה באג באותו יום (למשל role_set_owner_guard, forum_fix_cross_office_names,
office_public_token_regen_fix_search_path, lead_intake_regen_revoke_anon) — הקובץ
המגובה מכיל ישירות את הגרסה **הסופית המתוקנת**, לא את מצב-הביניים הפגיע, כי
המטרה היא סביבה חדשה נכונה, לא שחזור-היסטוריה מדויק. כל 10 הקבצים אומתו
חיים בפועל — לא רק נקראו: כל אחד הורץ בתוך `begin; ... rollback;` על
הדאטהבייס האמיתי דרך ה-MCP (לא רק בדיקת-תחביר סטטית), ותפס ותיקן שני פערים
אמיתיים באמצע האימות: (1) הריפו ניחש `alter table … add constraint …
offices_public_token_key` אבל `offices_lead_intake_token` בפועל מוגן ב-unique
**אינדקס** רגיל (`offices_lead_intake_token_idx`), לא constraint בשם קבוע —
תוקן לפי המבנה האמיתי; (2) `exception when duplicate_object` לא תופס
`42P07 duplicate_table` שקורה כש-constraint עם שם implicit כבר קיים — הורחב
ל-`when duplicate_object or duplicate_table`. גם תוקן פער-הפניה-קדימה עצמאי:
`np_office_public` (0129) הפנה במקור ל-`properties.listing_purpose` שנוסף רק
ב-0131 המאוחר יותר — הוזזה ההגדרה עם השדה ל-0131 כדי שכל קובץ יהיה עצמאי אם
ירוץ ברצף על דאטהבייס ריק. אפס שינוי לדאטהבייס החי עצמו — כל הקבצים תוספתיים
(`create table/type if not exists`, `create or replace function`, `do $$
... exception when duplicate_object then null`) ומשקפים בדיוק את המצב שכבר
רץ; זו עבודת תיעוד/שחזור-סביבה, לא שינוי פיצ'ר. system 35 KioskFleet לא נגע.

## עדכון — 25/08/2026 (Loop A, תיקון שני בכיוון-מצלמה ב"סיור רחוב" — heading קבוע לכל מסגרת, לא רק לעוגן)
בדיקת-אימות עצמאית **על התיקון הקודם באותו יום** (הרשומה מיד למטה — 763ebf48,
ששילחה שעות ספורות קודם) מצאה שהוא תיקן רק חצי מהבעיה: הוא פתר את ה-404
השקט (`aimQuality`'s "<4מ' קרוב מדי לכוון"), אבל השאיר באג גיאומטרי אחר,
עדין יותר — heading **קבוע אחד** (`svAim.heading`, מחושב פעם אחת בעוגן
בלבד) שימש לכל חמש מסגרות ה"סיור", כולל השתיים-שתיים במרחק ±20/±40 מ'
מהעוגן. זה נכון **רק** במסגרת העוגן עצמה (offset=0) — בכל מסגרת אחרת
המצלמה זזה לאורך הרחוב בעוד הבניין נשאר במקומו, כך שהאזימוט האמיתי אל
הבניין **משתנה** עם המרחק מהעוגן, ו-heading קבוע גורם לכל מסגרת חוץ
מהעוגן להצטלם לכיוון שגוי.

**כימות עצמאי** (סקריפט Node טהור, שוחזר גיאומטרית משורות §3 האמיתיות
ב-`QA/nadlan.md` — מיקום מצלמה+מרחק+heading אמיתיים לארבע כתובות המפרט):
בהינתן מרחק עוגן-לבניין של 9–39 מ' (הטווח האמיתי שנמדד), ההליכה של ±40 מ'
לאורך הרחוב יוצרת שגיאת-כיוון של **27° עד 77°** בין ה-heading הקבוע
לבין ה-heading הנכון של אותה מסגרת (חושב ב-`bearingDeg` מהנקודה עצמה אל
הבניין) — בדיוק ככל שהבניין קרוב יותר לרחוב, השגיאה גדולה יותר. במקרה
הגרוע (דורש טוב 17, 9 מ' בלבד מהרחוב) מסגרת ±40 מ' הייתה מצטלמת בסטייה
של 77° מהבניין — כמעט לאורך הרחוב עצמו, לא לרוחבו. בניגוד לבאג הקודם
(404 גלוי, "אין תמונה"), הבאג הזה **מציג תמונה אמיתית** בכל מסגרת (200,
לא 404) — רק שברוב המסגרות היא לא מראה את הבניין המבוקש, בניגוד עקרון-
הברזל "אין נתוני דמה" בראש הקובץ הזה: תמונה אמיתית שמרמזת שהיא מהנכס אבל
אינה, מטעה יותר מ"אין תמונה".

**התיקון:** `heading` מחושב עכשיו **בנפרד לכל נקודה** — `bearingDeg(candidate.lat,
candidate.lng, lat, lng)` (מהנקודה עצמה, שכבר יושבת על הכביש בקירוב הידוע
של הנקודה הקרובה ביותר לפנורמה האמיתית — אותו קירוב ש-`aimQuality` כבר
נשען עליו), במקום שימוש חוזר ב-`svAim.heading` הקבוע. `streetWalk.points`
עבר מ-`{lat,lng}[]` ל-`{lat,lng,heading}[]`, ושדה `streetWalk.heading`
העליון הוסר (כל נקודה נושאת את שלה). אותו שינוי בדיוק ב-`lib/panoramalookup.ts`
(`lookupStreetWalk`, מסלול system 36) שמשכפל אותה גיאומטריה.
`StreetWalkPanel.tsx` (32) ו-`app.html` (36) עודכנו לקרוא ל-`current.heading`/
`c.heading` (לכל מסגרת) במקום `streetWalk.heading`/`state.heading` (קבוע גלובלי).

**נפילה-לאחור בטוחה:** דוח שמור ישן (מהשעות הבודדות שבהן הפיצ'ר עם ה-heading
הקבוע היה חי) חסר `heading` בכל נקודה → `current.heading`/`c.heading` הוא
`undefined` → ה-URL נושא `heading=undefined` → `/api/image` לא מפרש את זה
כמספר תקין (`Number.isFinite` false) ונופל בחזרה לנתיב האוטומטי הישן (אותה
התנהגות שהייתה לפני 763ebf48) — לא קורס, רק חוזר להתנהגות פחות-טובה שכבר
הייתה קיימת.

אומת: סקריפט Node עצמאי (ללא תלויות) שחזר את שלוש הכתובות מ-`QA/nadlan.md`
§3 גיאומטרית (מיקום פנורמה+heading+מרחק אמיתיים → נקודת הבניין), חישב את
חמש נקודות-ההליכה לכל אחת, והשווה heading-קבוע מול heading-לכל-נקודה —
בכל ארבע הכתובות, offset=0 זהה ל-heading המקורי (0° הפרש, כצפוי — זו אותה
נקודה), וכל offset אחר מראה הפרש משמעותי (27°–77°) בדיוק כפי שהניתוח
הגיאומטרי חוזה. בדיקת איזון-סוגריים ייעודית (לא הבדיקה הגולמת שנכשלת על
regex בקבצים גדולים, ראו סבבים קודמים) אושרה ידנית על הבלוק שהשתנה ב-
`buildreport.ts`, ומלאה על `panoramalookup.ts`/`StreetWalkPanel.tsx`.
`node --check` על ה-`<script type="module">` המחולץ מ-`app.html` עבר נקי
(141,595 תווים). `node_modules` לא מותקן כאן, אז `tsc`/`next build` לא
הורצו — אותה מגבלה כמו כל סבב קודם. אין דפדפן חי לוודא ויזואלית שהתמונה
מציגה את הבניין הנכון בכל מסגרת עכשיו. אפס רגרסיה: שינוי מבנה שדה תוסף
(לא נוגע בשום שדה/פאנל/API אחר), נפילה-לאחור בטוחה לדוחות שמורים ישנים.
system 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, תיקון כיוון-מצלמה ב"סיור רחוב" — 32+36)
בדיקת-אימות עצמאית של "סיור רחוב" (הרשומה למטה, ששילחה אתמול) מצאה שהפיצ'ר
היה שבור בפועל, לא רק "ביניים כן". `StreetWalkPanel.tsx` (32) ו-`app.html`
(36) קראו ל-`/api/image?kind=street&lat=..&lng=..` **בלי** `heading` —
וכש-`/api/image` לא מקבל `heading` מפורש הוא קורא ל-`streetViewShot(lat,lng)`,
שמתייחס ל-(lat,lng) **כאל הבניין שצריך לכוון אליו** ומאתר את הפנורמה הקרובה
ביותר **לנקודה הזו עצמה**. זה נכון לתמונת-בניין בודדת (הבניין תמיד מוסט
מהכביש), אבל שגוי לחלוטין ל"סיור רחוב": כל נקודת-מועמד ב-streetWalk כבר
יושבת **על הכביש** (`destinationPoint` מהעוגן = מיקום הפנורמה הקרובה לנכס),
ולכן הפנורמה האמיתית הקרובה ביותר לנקודת-מועמד כזו כמעט תמיד במרחק של מטרים
בודדים ממנה — ו-`aimQuality` דוחה כל מרחק כזה כ"קרוב מדי לכוון" (סף 4מ',
הכלל שנועד למנוע כיוון-אקראי כשהפנורמה כמעט על הבניין). התוצאה בפועל: רוב או
כל המסגרות של "סיור רחוב" היו נכשלות בשקט (404 "אין צילום רחוב זמין") בדיוק
כשהמפרט דורש שלא להציג כלום כשלא בטוחים — רק שכאן זה קרה כמעט תמיד, לא רק
בקצה-מקרים.

התיקון: `svAim.heading`/`aim.heading` (האזימוט מהפנורמה-העוגן אל הבניין,
שכבר מחושב פעם אחת לכל הדוח) נשמר עכשיו בתוך `streetWalk`/`lookupStreetWalk`
ומועבר במפורש כ-`heading=` בכל קריאת תמונה — כך שכל מסגרת ב"סיור" מכוונת
לאותו בניין אמיתי, בלי לעבור דרך הנתיב האוטומטי השגוי. שדה חדש בלבד
(`heading: number`) על שני הטיפוסים (`PropertyReport['streetWalk']`,
`StreetWalkLookupResult`) — דוח ישן שנשמר בלי השדה (אם קיים כזה — הפיצ'ר עצמו
נשלח רק אתמול) מתדרדר לאותה התנהגות שגויה שהייתה קיימת קודם, לא קורס.

אומת: שכפול עצמאי ב-Node טהור של התרחיש (עוגן על הכביש, כיוון pano→בניין
נתון, 5 נקודות-מועמד לאורך הרחוב) הראה שנקודת "הפנורמה הקרובה ביותר" לכל
מועמד נופלת תמיד מתחת לסף 4מ' (המחשה של הבאג), ושה-heading הקבוע עובר נכון
לכל 5 המסגרות אחרי התיקון. בדיקת איזון-סוגריים על כל שלושת קובצי ה-TS/TSX
שהשתנו עברה נקי; `node --check` על ה-`<script type="module">` המחולץ מ-
`app.html` עבר נקי (141,264 תווים). `node_modules` לא מותקן כאן, אז
`tsc`/`next build` לא הורצו — אותה מגבלה כמו כל סבב קודם. אין דפדפן חי
בסנדבוקס הזה כדי לוודא ויזואלית שהתמונה אכן מציגה את הבניין ולא רק ש-404
נעלם. אפס רגרסיה: שדה חדש + פרמטר URL חדש בשתי מערכות, שום לוגיקת בחירת-
נקודות/דדופ לא נגעה. system 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, "סיור רחוב" גם על system 36 nadlan-pro)
הרשומה הקודמת (למטה) בנתה "סיור רחוב" (רצף תמונות Street View אמיתיות
לאורך הרחוב, ראו שם) רק על 32 עצמה, והשאירה בפירוש "system 36 nadlan-pro
(סבב נפרד, כמו הפנורמה — 36 קורא ל-`/api/report` ב-`tier=basic` בכוונה כדי
לא לשלם על מקורות VIP, כך ש-`streetWalk` לא יגיע אליו בלי מסלול נפרד וזול
כמו `panoramalookup.ts`)" כפריט פתוח — בדיוק אותו דפוס שכבר נפתר לפנורמה
עצמה בסבב קודם יותר (ראו "פנורמה על system 36" למטה).

נוסף `lookupStreetWalk(q)` ל-`lib/panoramalookup.ts` (32): משכפל בדיוק את
אותה גיאומטריה/סף שכבר קיימים ב-`buildreport.ts` (עוגן = מיקום הפנורמה
הקרובה ביותר, הליכה ניצבת לאזימוט "מהפנורמה אל הבניין" דרך `destinationPoint`
הקיים ב-`lib/aim.ts`, 5 נקודות מועמדות ±40/±20/0 מ', דדופ פנורמות-עוקבות-
זהות, סף 3 נקודות אמיתיות) — אבל בלי דוח VIP ובלי תלות ברמה, ובלי שום קריאה
בתשלום: כל קריאה כאן היא `streetViewMeta` (בדיקת מטא-דאטה חינמית). נוסף
`app/api/streetwalk-lookup/route.ts` (אותו דפוס בדיוק כמו `panorama-lookup/
route.ts` הקיים לצידו — `GET ?q=`).

ב-`app.html` (36): פאנל "סיור רחוב" חדש בכרטיס הנכס (אחרי הפנורמה, לפני
"דוח האמת"). בשונה מהפנורמה (שמוצגת אוטומטית כי `panorama-embed` אינו
מחויב לפי שימוש), **התמונות עצמן** של סיור הרחוב עוברות דרך `/api/image`
הקיים — שכן הוא מחויב לכל קריאה (Street View **Static** API). לכן הפאנל
לא נטען אוטומטית אלא מאחורי כפתור-יוזמה מפורש ("הצג סיור רחוב"), אותו דפוס
מודע-עלות בדיוק כמו "משוך דוח אמת" הקיים כבר בקובץ הזה. קרוסלה בג'אווהסקריפט
טהור (הקובץ הזה בלי React) — ניגון אוטומטי כל 1.4 שנ', הקודם/הבא/עצור,
ומעקב-כשל לכל מסגרת (מסגרת שנכשלת מדולגת מיד, לא מחכה לטיק הבא) — אותה
התנהגות בדיוק כמו `StreetWalkPanel.tsx` ב-32 (React), רק משוכפלת ידנית
כי אין React בקובץ הזה. הטיימר בודק `box.isConnected` בכל טיק כדי לא להמשיך
לרוץ על צומת מנותק אחרי סגירת המגירה בלי "עצור" מפורש (המגירה כאן לא חושפת
hook לניקוי-בסגירה כמו `useEffect` cleanup ב-React).

אומת: לוגיקת הבחירה/דדופ שוכפלה עצמאית ב-Node טהור (ללא תלויות) מול 5
תרחישים (כיסוי מלא → 5 נקודות, כיסוי דליל שעדיין עובר את סף-3 → 3, כיסוי
דליל מדי → `null`, כל המועמדים על אותה פנורמה בדיוק → `null`, דדופ חלקי
שעדיין משאיר מספיק → 4) — כולם תואמים בדיוק את התוצאה שאותה לוגיקה כבר
נותנת ב-`buildreport.ts`. בדיקת איזון-סוגריים ייעודית על `lib/panoramalookup.ts`
ועל ה-route החדש עברה נקי. `node --check` על ה-`<script type="module">`
המחולץ מ-`app.html` עבר נקי (140,725 תווים, גדל מ-134,620 לפני התוספת).
`node_modules` לא מותקן כאן, אז `tsc`/`next build` לא הורצו — אותה מגבלה
כמו כל סבב קודם. אפס רגרסיה: קובץ API חדש + פונקציה חדשה ב-32 (לא נוגעים
בשום קובץ/מסלול/רמה קיימים), ופאנל+כמה פונקציות חדשות ב-`app.html` של 36
(שום טאב/פאנל/handler קיים לא נגע). system 35 KioskFleet לא נגע, לפי
ה-HARD STEERING. **נותר פתוח:** המסלול האמיתי המבוקש (MP4 מקודד-ffmpeg) —
עדיין דורש סבב עם `ffmpeg`/יכולת-בנייה אמיתית, על שתי המערכות.

## עדכון — 25/08/2026 (Loop A, "סיור רחוב" — גרסת-ביניים כנה לפריט הווידאו של P2 FEATURE)
פריט 2 של הנחיית הבעלים "P2 FEATURE" (core.projects #33, 25/08/2026) ביקש
בכל דף נכס "auto-generated short STREET VIDEO... server-side sample a
sequence of Street View frames along the street road polyline... encode to
MP4 with ffmpeg, cache per-property." סבבים קודמים (ראה למטה, "פנורמה
אינטראקטיבית") בנו את פריט 1 (פנורמה) במלואו על 32, אבל דחו את פריט 2 בפירוש
כל סבב עד כה כי `ffmpeg`/`node_modules` אינם זמינים בסביבת הבנייה הזו —
נבדק שוב הסבב הזה, עדיין נכון (אין `ffmpeg` בנתיב, אין `node_modules`).

**החלטה מודעת:** במקום לדחות שוב בלי לספק כלום, נבנתה גרסת-ביניים כנה שמספקת
ערך אמיתי עכשיו: `streetWalk` (`lib/buildreport.ts`) — רצף תמונות **אמיתיות**
ומתוארכות מ-Google Street View לאורך הרחוב (לא וידאו מקודד, ומתויג ככזה בכל
מקום ב-UI — "רצף תמונות... לא וידאו"). פריט ה-MP4/ffmpeg עצמו **נשאר פתוח**,
לא סומן כסגור.

**גיאומטריה:** נוסף `destinationPoint(lat,lng,bearing,distanceM)` ל-`lib/aim.ts`
(אותו מודול "גאומטריה טהורה בלי import" כמו `bearingDeg`/`haversineKm`
הקיימים, ניתן להרצה עצמאית) — נוסחת forward-geodesic סטנדרטית, מיוצא-מחדש
מ-`googlemaps.ts` כמו `bearingDeg`. העוגן הוא מיקום **הפנורמה** הקרובה
ביותר לנכס (`streetViewMetaRes.lat/lng` — נמצא בפועל על הכביש, בשונה
מקואורדינטת הנכס עצמה שיכולה להיות מוסטת פנימה), והכיוון הוא ניצב לאזימוט
"מהפנורמה אל הבניין" שכבר מחושב ב-`svAim.heading` (§3, `aimQuality`) — כלומר
**לאורך** הרחוב ולא לרוחבו. 5 נקודות מועמדות (±40/±20/0 מ') נבדקות כל אחת
בנפרד מול `streetViewMeta` (חינמי — ראה `lib/costs.ts`), נקודות בלי כיסוי
מושמטות, ונקודות עוקבות שנופלות על **אותה פנורמה בדיוק** (כיסוי דליל) מכווצות
לאחת. פחות משלוש נקודות אמיתיות → `streetWalk = null` (כמו סף-3-הנקודות הקיים
כבר ב-`ComparablesTrend`).

**VIP בלבד** (`tierMayUseImagery(tier)`, אותו שער כמו `panorama`/`streetView`
הקיימים) — וגם עוקב אחר `svAim.ok`, לא רק `streetViewMetaRes.available`: אם
המרחק/הכיוון לא מהימנים מספיק לצילום הבודד, הם גם לא עוגן אמין להליכה על
הרחוב. `lib/costs.ts` מקבל שורת עלות חדשה ("סיור רחוב", עד 5×streetViewImage)
כדי שמרכז השליטה ימשיך לשקף עלות אמיתית — לא רק צילום הבניין הבודד.

`components/report/StreetWalkPanel.tsx` חדש (קרוי מ-`PropertyImagery.tsx` מיד
אחרי `PanoramaPanel`, אותו בלוק VIP): קרוסלה מתחלפת אוטומטית (1.4 שנ' למסגרת),
כפתורי הקודם/הבא/עצור, ומעקב-כשלים לכל מסגרת בנפרד (`onError` על כל `<img>`)
— מסגרת שנכשלת מדולגת מיד (לא מחכה לטיק הבא), וכשכולן נכשלו מוצג "אין כיסוי
לאורך הרחוב" בעברית, לא ריבוע שבור. `loading="eager"` (לא `lazy`) — אותה
מלכודת בדיוק שכבר מתועדת למעלה בקובץ הזה על `PropertyImagery.tsx`: טעינה
עצלה מונעת מהתמונה להיכנס ל-PDF/מצגת.

אומת: `destinationPoint` נבדק עצמאית ב-Node טהור מול 5 זוגות אזימוט/מרחק
(מרחק+אזימוט-חוזר תואמים בטווח <0.05 מ'/0.5°), מסע-הלוך-חזור (אזימוט+180°
לאותו מרחק חוזר לעוגן המקורי, <0.05 מ' סטייה), ועטיפת קו-התאריך-הבינלאומי
(180°). לוגיקת `streetWalk` (סינון+דדופ+סף-3) שוכפלה עצמאית ב-Node טהור מול
6 תרחישים: כיסוי מלא (5 נקודות), כיסוי דליל שעדיין עובר את הסף, כיסוי דליל
מדי (2 נקודות → `null`), `svAim` לא תקין (`null`, אפס קריאות רשת), רמה
לא-VIP (`null`, אפס קריאות רשת), ופנורמות-כפולות רצופות שמתכווצות לנקודה
אחת — כולם תואמים. בדיקת בנייה-מחדש של ה-diff (לא רק בדיקת סוגריים גולמית,
שנכשלה בגלל regex/גנריקות בקבצים גדולים) אימתה שהבלוקים החדשים סגורים נכון.
`node_modules` לא מותקן כאן, אז `tsc`/`next build` לא הורצו — אותה מגבלה כמו
כל סבב `apps/32` קודם. נבדק גם ש-`PropertyReport` נבנה במקום יחיד בקוד
(`buildreport.ts` עצמו) וכל שאר הצרכנים רק **castים** JSON שמור (`savedreports.ts`)
— כך ששדה חדש לא-אופציונלי לא שובר צרכן אחר; דוחות שמורים ישנים בלי השדה
מקבלים `undefined`, שה-panel מטפל בו זהה ל-`null` (`if (!streetWalk) return null`).

אפס רגרסיה: שדה תוסף חדש + פאנל תוסף חדש + פונקציה תוספת אחת ב-`aim.ts` +
שורת עלות תוספת אחת — שום שדה/פאנל/API/חישוב עלות קיימים לא נגעו. **נותר
פתוח:** system 36 nadlan-pro (סבב נפרד, כמו הפנורמה — 36 קורא ל-`/api/report`
ב-`tier=basic` בכוונה כדי לא לשלם על מקורות VIP, כך ש-`streetWalk` לא יגיע
אליו בלי מסלול נפרד וזול כמו `panoramalookup.ts`), והמסלול האמיתי המבוקש
(MP4 מקודד-ffmpeg) — עדיין דורש סבב עם `ffmpeg`/יכולת-בנייה אמיתית.

## עדכון — 25/08/2026 (Loop A, השוואת רחוב ששינה שם — התיקון עכשיו משפיע גם על העסקאות, לא רק על האזהרה)
בדיקה עצמאית של P2 ACCURACY SPEC v2 §3 מצאה שסבב קודם (ראו "אזהרת שינוי-שם
רחוב בזיהוי הבניין" למטה) פתר רק חצי מהדרישה: `streetNameMismatch` הוסיף
אזהרת-טקסט ללקוח, אבל `sortByProximity` — המנוע שמחליט אילו עסקאות נכנסות
לטבלת ההשוואה ולגרף מגמת-המחיר (שני הפיצ'רים שנוספו בסבבים קודמים) כ"באותו
רחוב" — המשיך להשוות רק מול `streetNames` המקורי (מה שהוקלד+הרשמי+כינויים).
עסקה של שכן באותו רחוב, רשומה תחת אותו שם-רחוב-ישן/שונה שכבר אומת כרישום
האמיתי של **הבניין הזה עצמו**, נפלה בשקט ל"בסביבה" (rank 1000) — בדיוק
ההפך ממה שהאזהרה הבטיחה ("עסקאות ההשוואה נשארות נכונות").

התיקון: `registeredStreetName` מתווסף לרשימת השמות שמועברת ל-`sortByProximity`
רק כש-`streetNameMismatch===true` (כלומר רק אחרי אימות, לא ניחוש) — עסקאות
נוספות תחת אותו שם-רשום מסווגות עכשיו נכון כ"באותו רחוב"/מרחק-ממספר-בית ולא
"בסביבה". במסלול הרגיל (בלי אי-התאמה) `streetNamesForProximity===streetNames`
בדיוק — אפס שינוי התנהגות. `system 36` יורש אוטומטית כי `app.html` קורא
לאותו `/nadlan/api/report`, בלי שינוי קוד שם.

אומת בשכפול Node עצמאי (`node_modules` לא מותקן כאן) של `matchesStreet`+
דירוג: תרחיש רחוב-ששינה-שם (סווג "בסביבה" לפני, "באותו רחוב" אחרי) + בדיקת
רגרסיה שהמסלול הרגיל זהה ביט-לביט. בדיקת איזון-סוגריים על הקובץ המלא עברה
(1964/1964 סוגריים). `tsc`/`next build` לא הורצו — אותה מגבלה כמו כל סבב
קודם. אפס רגרסיה: משתנה מקומי חדש אחד + החלפת ארגומנט בנקודת-קריאה יחידה.
נדחה+נדחף לענף `fix/32-nadlan-berega-street-rename-comparables-0825`
(e31b2faa) — לא מוזג. **נותר פתוח מ-P2 SPEC** (בלתי-משתנה מהסבב הקודם, כולם
חסומים סביבתית): וידאו-רחוב ffmpeg, אורתופוטו govmap, שדה buildYear
ברמת-עסקה, שלב הפרסום הסופי (v2 §4).

## עדכון — 25/08/2026 (Loop A, גרף מגמת-מחיר בטבלת ההשוואה, systems 32+36)
P2 ACCURACY SPEC §E (core.projects #33) מבקש בפירוש שני רכיבים נפרדים:
"a comparable-deals table (comparison of transactions) with adjustments;
**a price-trend chart** for the street/neighborhood". חצי ראשון (הטבלה) כבר
היה בנוי משלם על שתי המערכות (`ValuationPanel.tsx` ב-32,
`comparablesHtml()` ב-`app.html` של 36 — ראו העדכונים למטה). בדיקה עצמאית
מצאה שהחצי השני (הגרף) **לא היה קיים באף אחת מהמערכות**: ל-32 יש
`PriceTrend.tsx`, אבל הוא מציג את **מדד המחירים הארצי של הלמ״ס** (מגמת שוק
כללית), לא מגמה ברמת הרחוב/השכונה של הנכס הספציפי — ול-36 לא היה שום גרף
בכלל, רק הטבלה.

נוסף `components/report/ComparablesTrend.tsx` (32): גרף recharts (תלות
קיימת כבר בפרויקט, `PriceTrend.tsx` כבר משתמש בה) הבנוי **ישירות מ-
`valuation.comparables`** — אותן עסקאות בדיוק שהטבלה שמעליו כבר מציגה
(`valuate()` ב-`lib/valuation.ts` כבר בוחר אותן בסדר-עדיפות בניין→רחוב→
אזור) — בלי קריאת רשת/מקור חדש. מסנן לעסקאות עם תאריך ומחיר-למ״ר, ממיין
כרונולוגית, ודורש לפחות 3 נקודות (כמו הסף הקיים ב-`PriceTrend.tsx`) אחרת
לא מרנדר כלום — אין קו-מגמה על שתי נקודות. מחווט לתוך `ValuationPanel.tsx`
מיד אחרי טבלת ההשוואה, תמיד גלוי (לא תלוי בכפתור ההרחבה של הטבלה).

באותו דפוס בדיוק על 36: `comparablesTrendHtml()` חדש ב-`app.html`
(`sites/36-nadlan-pro/tivuch/app.html`) — אין ספריית גרפים בקובץ הזה, אז
SVG מוטמע ידני (`polyline`+`circle`), אותם נתונים בדיוק מ-`val.comparables`
(אותו אובייקט ש-`comparablesHtml()` הקיים כבר מרנדר לטבלה), אותו סף של 3
נקודות. קרוי מתוך `valuationHtml()` מיד אחרי `comparablesHtml(val.comparables)`.

אומת: `node --check` על ה-`<script type="module">` המחולץ מ-`app.html` עבר
נקי (134,620 תווים). בדיקת איזון-סוגריים ייעודית על שני קבצי ה-TSX ששונו/
נוספו ב-32 עברה נקי. `node_modules` לא מותקן כאן, אז `tsc`/`next build` לא
הורצו — אותה מגבלה כמו כל סבב `apps/32`/`app.html`-בלבד קודם. `recharts`
כבר תלות קיימת בפרויקט (`package.json`, בשימוש ב-`PriceTrend.tsx`), לא
נוספה תלות חדשה בשום מקום. אפס רגרסיה: קובץ חדש + הוספת שורה אחת ב-
`ValuationPanel.tsx` (import + קריאה אחת חדשה, שום JSX/handler קיים לא נגע),
ופונקציה חדשה + שורה אחת ב-`app.html` (שום טאב/פאנל/handler קיים לא נגע).

## עדכון — 25/08/2026 (Loop A, system 36 nadlan-pro — הפרדת מחיר מכירה/שכירות)
P2 ACCURACY SPEC סעיף D (core.projects #33, owner 2026-08-25): "ALWAYS separate
SALE price vs RENT price — never mix them. Record per listing: what the client
demands (asking price), the purpose (buy/sell/rent/invest), and the exact
figure." system 32 כבר מפריד לפי `ListingDealType` ('buy'|'rent'|'commercial')
בכל מקורות המודעות שלו — אבל **system 36 (nadlan-pro) בכלל לא הכיר את ההבחנה**:
`nadlan_pro.properties` נשא עמודת `price` בודדת ודו-משמעית ללא כל אינדיקציה אם
זה מחיר מבוקש למכירה או דמי שכירות חודשיים, וכל צרכן (רשימת נכסים, מגירת נכס,
עמוד ציבורי `listing.html`/`office.html`, ובמיוחד לוח "ניתוח כדאיות והשקעה"
במגירת הנכס) התייחס אליו כאילו הוא תמיד מחיר רכישה — לוח הכדאיות אפילו הריץ
`calcPurchaseTaxJs`/`calcMortgageJs` עליו, ו-`valuationHtml` השווה אותו מול
הערכת-שווי-למכירה של מנוע האמת (`val.mid`). נכס להשכרה עם `price=5500` היה
מייצר "מס רכישה" והשוואת-שווי הזויים על סכום ₪5,500 כאילו הוא מחיר דירה.

נוסף `nadlan_pro.listing_purpose` ('sale'/'rent', ברירת מחדל 'sale' — משמר
בדיוק את ההתנהגות הקיימת לכל שורה קיימת) + עודכנו שלוש RPCs (`np_property_save`
לשמירה, `np_properties` להצגה+סינון `p_purpose` חדש, `np_property_public` +
`np_office_public` לעמודים הציבוריים). ב-`app.html`: שדה "מטרה" בטופס עריכת
נכס (עם תווית מחיר דינמית "מחיר מכירה מבוקש"/"דמי שכירות חודשיים מבוקשים"),
עמודת "מטרה" + סיומת "לחודש" בטבלת הנכסים, מסנן מטרה חדש, ותיוג בעובדות הנכס
במגירה. לוח הכדאיות (מודול 7) מדלג לגמרי על חישובי מס-רכישה/משכנתא לנכס
המיועד להשכרה ומציג הודעה מתאימה במקום; `valuationHtml` מקבל `askPrice=null`
לנכס להשכרה כדי לא להשוות דמי-שכירות מול הערכת-שווי-למכירה. `listing.html`/
`office.html` מתייגים "לחודש" על מחיר של נכס להשכרה.

אומת חי ב-MCP בתוך BEGIN/ROLLBACK על המשרד האמיתי "משרד בדיקה QA 18/08": יצירת
נכס עם `listing_purpose=rent` נשמרת נכון, `np_properties` עם `p_purpose=rent`/
`sale`/ריק מסנן נכון, עדכון חלקי (שינוי כותרת בלבד, בלי `listing_purpose`)
משמר את הערך הקיים ולא מאפס אותו ל-'sale' (תבנית coalesce זהה לשאר השדות),
שינוי מפורש ל-`listing_purpose` עובד, ברירת מחדל ליצירה בלי השדה בכלל = 'sale',
ו-`np_property_public` מחזיר `listing_purpose` נכון בעמוד הציבורי. `get_advisors`
נקי (רק שתי הערות SECURITY DEFINER קיימות-מראש, לא קשורות לשינוי). node --check
נקי על שלושת קבצי ה-`<script>` המחולצים (app.html/listing.html/office.html);
אין דפדפן חי בסנדבוקס הזה לקליק-דרך, אותה מגבלה כמו כל סבב app.html-only קודם.
אפס רגרסיה: עמודה חדשה עם ברירת-מחדל בטוחה + הרחבת RPC אדיטיבית בלבד (פרמטר
חדש עם ברירת מחדל), שום שדה/פונקציה/דף קיים לא נהרס.

## עדכון — 25/08/2026 (Loop A, טבלת השוואה + אזהרת שינוי-שם רחוב על system 36 nadlan-pro)
בדיקה עצמאית אישרה ששלושת שיפורי הדיוק שנבנו על 32 בסבבים הקודמים (טבלת
ההשוואה עם קומה/גוש-חלקה/קרבה, סינון מחירי-מודעה בלתי-סבירים,
`streetNameMismatch`) כולם מגיעים ל-JSON של `/api/report` גם ב-`tier=basic`
בלי חסימה — `valuate()`/`plausibleAgainstMarket()`/דגל שינוי-הרחוב כולם
רצים ללא תלות ברמה בתוך `buildReport`, וה-route מחזיר את האובייקט המלא.
`sites/36-nadlan-pro/tivuch/app.html` (`truthHtml`/`fetchTruth`) כבר קורא
לאותו endpoint בדיוק (בלי `tier=vip`, ראו הרשומה למטה על הפנורמה) — אז
הנתונים כבר היו מגיעים למתווך על כל לחיצת "משוך דוח אמת", בחינם, בלי
קריאה נוספת. הפער היה רק בתצוגה: `truthHtml`/`valuationHtml` הציגו כתובת+
גוש/חלקה+מספר עסקאות+תמצית ההערכה, אבל לא את טבלת ההשוואה עצמה ולא את
אזהרת שינוי-הרחוב — בדיוק מה ש-P2 ACCURACY SPEC §E דורש במפורש גם על 36
("real-estate 32 + 36" בכל סעיף).

נוסף ל-`app.html`: (1) `comparablesHtml(val.comparables)` — אותה טבלה
בדיוק כמו `ValuationPanel.tsx` (תאריך/כתובת/גוש-חלקה/קומה/שטח/חדרים/קרבה/
מחיר/₪-למ"ר), קרויה מתוך `valuationHtml` אחרי כרטיסי ההערכה, תמיד פתוחה
(אין `<details>`/state-toggle בקובץ הזה בשום מקום אחר — נשמר אותו דפוס
בדיוק כמו שאר הטבלאות בקובץ). (2) קופסת אזהרה ב-`truthHtml`, מוצגת רק
כש-`r.building.streetNameMismatch===true`, עם `r.building.note` המלא (כולל
שם הרחוב הרשום בפועל) — משתמשת במחלקת ה-CSS `.note` הקיימת כבר בקובץ.

אומת: `node --check` על ה-`<script type="module">` המחולץ עבר נקי
(126,213 תווים, גדל מ-123,976 לפני התוספת). כל שדה חדש הושווה מילה-במילה
מול `ComparableDeal`/`BuildingIdentity` ב-32 (`lib/valuation.ts`,
`lib/buildreport.ts`) וגם מול פלט `/api/report` בפועל (route.ts מחזיר
`{ ...report, permalink }` בלי סינון). `dt`/`v`/`money`/`esc` הקיימים
בקובץ נעשה בהם שימוש חוזר בדיוק כמו בכל טבלה אחרת שם (נבדק: `dt` בשימוש
זהה ב-9 מקומות אחרים). אפס רגרסיה: שתי תוספות תצוגה בלבד (פונקציה חדשה +
משתנה מותנה אחד), שום handler/טאב/RPC/שדה קיימים לא נגעו.

## עדכון — 25/08/2026 (Loop A, אזהרת שינוי-שם רחוב בזיהוי הבניין)
P2 ACCURACY SPEC v2 §3 (core.projects #33) מבקש: "match by gush/helka +
coordinates, not by street name alone; note when a street was renamed so
comparables stay correct." הבדיקה מהסבב הקודם (ראה למטה, "קומה+גוש/חלקה+
קרבה") מצאה שהחלק הראשון כבר בנוי: שרשרת זיהוי הבניין ב-`buildreport.ts`
(`matchedBy`) כבר מעדיפה `polygon` (מזהה הבניין של מרשם העסקאות עצמו) ו-
`parcel` (גוש/חלקה מהקדסטר) בתור גיבוי כשההתאמה לפי רחוב+מספר בית נכשלת —
כלומר הזיהוי כבר לא תלוי בשם הרחוב במקרים כאלה. מה שהיה חסר בפועל הוא
החלק השני: **לספר ללקוח** כשזה קרה, כדי שהוא לא יתפלא לראות בטבלת ההשוואה
כתובת ברחוב אחר ממה שחיפש בלי הסבר.

נוסף `registeredStreetName`/`streetNameMismatch` ל-`BuildingIdentity`
(`lib/buildreport.ts`): כש-`matchedBy` הוא `polygon` או `parcel`, ושם
הרחוב הרשום בעסקאות הבניין שנמצא אינו תואם לאף שם ידוע ומאומת של הרחוב
המבוקש (`streetNames` — רשמי + מה שהוקלד + כינויים מאומתים, אותה קבוצה
ש-`filterToAddress` כבר בדק מולה למעלה בפונקציה) — זה סימן לרחוב ששינה שם
או שהמרשם כותב אותו אחרת. `normStreetName` (הנרמול הקיים ב-`lib/nadlan.ts`,
מוריד מילת-סוג מובילה כמו "רחוב"/"שדרות" כטוקן שלם) יוצא עכשיו מהמודול
כדי שההשוואה תשתמש באותה לוגיקה בדיוק שכבר קיימת שם, בלי לשכפל אותה.
`building.note` (שכבר זורם ל-`sourceNote` של העובדות "עסקאות בבניין הזה"/
"כמה דירות נמכרו בבניין" — נצרך ב-UI, לא רק בקוד) מקבל משפט נוסף כשמתגלה
הפער, כולל שם הרחוב כפי שהוא רשום בפועל.

אומת: שוכפלה עצמאית ב-Node טהור לוגיקת ה-`normStreetName`+`streetNameMismatch`
מול 7 מקרים (התאמה לשם הרשמי, התאמה לכינוי מאומת, אי-התאמה אמיתית עם
`matchedBy='parcel'`, `matchedBy='address'` לעולם לא מדגל כי כבר יש התאמה
מוגדרת, `matchedBy='none'` בלי עסקה רשומה, אין שום שם ידוע כלל → אי אפשר
לטעון שינוי-שם, ומילת-סוג מובילה כמו "שדרות" לא נחשבת אי-התאמה) — כולם
תואמים. `node_modules` לא מותקן כאן, אז `tsc`/`next build` לא הורצו; בדיקת
איזון-סוגריים ידנית וממוקדת על שני הבלוקים שנוספו עברה נקי, ואומת שיש
נקודת בנייה יחידה בקוד ל-`BuildingIdentity` (חיפוש מקיף בריפו) כך ששני
השדות החדשים הלא-אופציונליים לא שוברים צרכן אחר. אפס רגרסיה: שני שדות
חדשים + תוספת טקסט מותנית ל-`note` בלבד, שום שדה/לוגיקת-זיהוי קיימים לא
נגעו. נדחה לענף `fix/32-nadlan-berega-comparables-floor-parcel-0825`
(אותו ענף, המשך אותה חטיבת עבודה) — לא מוזג.

## עדכון — 25/08/2026 (Loop A, קומה+גוש/חלקה+קרבה בטבלת ההשוואה)
`components/report/ValuationPanel.tsx` (§2 הערכת שווי) הציגה טבלת "עסקאות
שההערכה נשענת עליהן" עם תאריך/כתובת/שטח/חדרים/מחיר/₪-למ"ר בלבד — בלי קומה,
בלי גוש/חלקה, בלי קרבה לנכס (בבניין הזה / באותו רחוב / בסביבה). זה בדיוק מה
ש-P2 ACCURACY SPEC §E (core.projects #33) מבקש מטבלת השוואה ברמת שמאי:
"floor... gush/helka... comparable-deals table with adjustments". הנתונים
כבר זרמו עד הסוף — `SoldDeal` ב-`lib/buildreport.ts` תמיד נשא
`floor`/`parcelLabel`/`proximityLabel`, ו-`valuate()` (`lib/valuation.ts`)
מעביר את אותם אובייקטים בדיוק ל-`comparables` (סינון/מיון, לא שכפול) — אבל
טיפוס `ComparableDeal` מעולם לא הכריז על השדות, והפאנל מעולם לא רינדר אותם.

נוסף `floor?`/`parcelLabel?` (אופציונליים — קריאה קיימת כלשהי ל-`valuate()`
בלי השדות האלה ממשיכה לעבוד ללא שינוי) ל-`ComparableDeal`, ושלוש עמודות
חדשות בטבלה (גוש/חלקה, קומה, קרבה לנכס — `proximityLabel` שכבר היה קיים
בטיפוס אבל לא מוצג). מכיוון שדוחות שמורים כבר שומרים את אובייקט ה-`SoldDeal`
המלא בתוך `comparables` (`lib/savedreports.ts` שומר את כל ה-JSON כמות שהוא),
גם דוחות ישנים במטמון מקבלים את העמודות החדשות מיידית, בלי backfill.

אומת: בדיקת איזון-סוגריים ייעודית על שני הקבצים עברה נקי; נקודת הקריאה
היחידה ל-`valuate()` (`buildreport.ts:1790`) נבדקה מילה-במילה — `soldDeals`
הוא `SoldDeal[]`, סופרסט מלא של `ComparableDeal` כולל השדות החדשים, כך
שההעברה תקינה בלי cast. `node_modules` לא מותקן כאן, אז `tsc`/`next build`
לא הורצו. אפס רגרסיה: שני שדות אופציונליים חדשים + שלוש עמודות תצוגה
בלבד, שום שדה/חישוב/פאנל אחר לא נגע. נדחה+נדחף לענף
`fix/32-nadlan-berega-comparables-floor-parcel-0825` (39c65b14) — לא מוזג.

## עדכון — 25/08/2026 (Loop A, פנורמה על system 36 nadlan-pro — בלי דוח VIP מלא)
ההנחיה מ-25/08 ("P2 FEATURE") מכסה את שתי המערכות (32+36), אבל הסבב הקודם
(ראה למטה) בנה רק על 32 והשאיר את 36 בפירוש כפריט פתוח — "אותו פיצ'ר בדיוק
על system 36 nadlan-pro". `sites/36-nadlan-pro/tivuch/app.html` כבר קורא ל-
`/nadlan/api/report` (דוח-אמת, ראה `truthHtml`/`fetchTruth`) אבל **בלי**
`tier=vip` — כך שהוא תמיד מקבל דוח `basic` (בכוונה, כדי לא לשלם על Apify/
Places/Distance Matrix בכל פתיחת נכס). `report.panorama` עצמו מוגבל ל-VIP
בלבד (`tierMayUseImagery`), אז פשוט להוסיף `&tier=vip` לקריאה הקיימת היה
פותר את הפנורמה אבל גם מפעיל את **כל** שאר המקורות בתשלום של דוח VIP בכל
לחיצה על נכס — בניגוד ישיר להנחיית הבעלים לתכונה הזו עצמה: "Use the existing
Google Maps API key already configured... no cost beyond existing key."

לכן, במקום להרחיב את מנגנון הרמות, נוסף מסלול צר ועצמאי ב-32:
`lib/panoramalookup.ts` (`lookupPanorama(q)`) + `app/api/panorama-lookup/
route.ts` (`GET ?q=`) — משתמש **רק** במקורות שהרמה החינמית כבר משתמשת בהם
(GovMap/Nominatim דרך `geocodeAddress`, קדסטר דרך `parcelByGushHelka` לגוש/
חלקה), ואז `streetViewMeta` (בדיקת-מטא-דאטה של גוגל — **חינמית**, בשונה
מהתמונה הסטטית עצמה) עם נפילה חזרה ל-Mapillary. שום קריאה בתשלום, שום שינוי
ל-`buildreport.ts`/`report.ts` (לא נוגע ברמות/VIP הקיימים של 32 עצמה —
הדוח הציבורי של 32 ממשיך להגביל פנורמה ל-VIP כפי שהיה).

ב-`app.html`: פאנל חדש "פנורמה אינטראקטיבית 360°" בכרטיס הנכס (לפני "דוח
האמת"), נטען אוטומטית בפתיחת הכרטיס (`loadPanorama`, זול/חינמי אז אין צורך
בכפתור-משיכה ידני כמו בדוח-האמת היקר) — קורא ל-`/nadlan/api/panorama-lookup`
(אותו origin, אותו דפוס בדיוק כמו `/nadlan/api/report`/`/nadlan/api/
area-alert` הקיימים), ומרנדר `<iframe>` אל `/nadlan/api/panorama-embed`
הקיים (אותו endpoint שנבנה עבור 32 עצמה — משותף, לא כפול) כשהמקור גוגל, או
`<img>` כשהמקור Mapillary. "אין כיסוי" כשאין נקודה/כיסוי בשני המקורות —
לא תמונה ריקה.

אומת: `node --check` על ה-`<script type="module">` המחולץ מ-`app.html` עבר
נקי (123,976 תווים) — אותה מגבלת-סביבה כמו כל סבב `app.html`-בלבד קודם, בלי
דפדפן חי לקליק-דרך. `lib/panoramalookup.ts`/`route.ts` נבדקו ידנית: בדיקת
איזון-סוגריים ייעודית עברה נקי, וכל ייבוא (`geocodeAddress`, `parcelByGushHelka`,
`itmToWgs84`, `resolveStreet`, `googleConfigured`, `streetViewMeta`,
`mapillaryNearest`, `parseQuery`) הושווה מילה-במילה מול חתימת הייצוא האמיתית
בקובץ המקור שלו. `node_modules` לא מותקן כאן, אז `tsc`/`next build` לא
הורצו. אפס רגרסיה: שני קבצים חדשים ב-32 (לא נוגעים בשום קובץ קיים), ותוספת
פאנל+2 פונקציות חדשות ב-`app.html` של 36 (שום טאב/פאנל/handler קיים לא נגע).

**נותר לסבב עם יכולת בנייה:** פריט 2 של אותה הנחיה (וידאו רחוב מקודד
ffmpeg) — עדיין לא בנוי על אף אחת מהמערכות, ראה הרשומה למטה.

## עדכון — 25/08/2026 (Loop A, פנורמה אינטראקטיבית 360°)
הנחיית בעלים 25/08/2026 (core.projects #33, "P2 FEATURE") ביקשה בכל דף נכס
(1) פנורמה אינטראקטיבית 360° בנקודת הגיאוקוד המדויקת (Google Street View
JS/Embed, נפילה חזרה ל-Mapillary כשאין כיסוי) עם תאריך צילום, ו-(2) סרטון
רחוב שנוצר אוטומטית מדגימת פריימים לאורך פוליגון הרחוב + קידוד ffmpeg. הסבב
הזה בנה **רק פריט 1 במלואו** — פריט 2 (וידאו) דורש תלות חדשה (ffmpeg/binary
בסביבת Vercel serverless), אחסון קבצים למטמון-לפי-נכס, ואין node_modules/
דפדפן בסביבה הזו לאמת בנייה מסוג הזה בבטחה; נדחה בכוונה לסבב עם יכולת בנייה.

**החלטת ארכיטקטורה מודעת:** ל-`/api/image` יש כלל ברזל תיעודי — "המפתח הוא
סוד צד-שרת, לעולם לא נשלח לדפדפן" — כי Street View **Static** API (תמונה
בודדת) נגבית לכל בקשה, וחשיפת המפתח הייתה מאפשרת לכל אחד לחייב את החשבון.
פנורמה **אינטראקטיבית** (סיבוב/זום חי) חייבת חיבור ישיר מהדפדפן אל גוגל —
אי אפשר לפרוקסי תצוגה חיה כמו שמפרוקסים תמונה בודדת. הפתרון שנבחר:
`/api/panorama-embed` (חדש) עושה 302 מהשרת אל Google **Maps Embed API** עם
`GOOGLE_MAPS_API_KEY` הקיים — כך שהמפתח לא מופיע בקוד המקור/בחבילת ה-JS
שלנו בכלל, רק בתגובת ההפניה עצמה. חשוב: Embed API **אינה מחויבת לפי שימוש**
(בשונה מ-Static API), כך שגם אם הכתובת נחשפת ב-DevTools זו לא חשיפת חיוב —
רק המלצה להגביל את המפתח ל-HTTP referrer ב-Cloud Console. שום מפתח חדש לא
נוצר, בדיוק לפי הכלל "השתמש במפתחות המשותפים הקיימים" שבראש הקובץ הזה.

`lib/buildreport.ts` מוסיף שדה `panorama` חדש ל-`PropertyReport` (VIP/
פרימיום בלבד, כמו `streetView` — `tierMayUseImagery`): גוגל כש-
`streetViewMetaRes.available` (כבר נמשך למעלה, בלי קריאת רשת כפולה), אחרת
Mapillary (`lib/mapillary.ts` חדש — Graph API v4, `closeto`+`radius=50`)
**רק אם** `MAPILLARY_ACCESS_TOKEN` מוגדר — אין טוקן כזה במערכת כרגע (נבדק:
לא מופיע באף `.env`/קוד בריפו), אז הנפילה-חזרה מדווחת "אין כיסוי" בעברית
במקום לנסות קריאה שתמיד תיכשל, בדיוק לפי "מקור שלא נטען → לא זמין". נוסף
ל-`envStatus()`/`sourceHealth()` ב-`lib/adminconfig.ts` כפריט אופציונלי-
חסר, באותו דפוס בדיוק כמו `APIFY_TOKEN`.

`components/report/PanoramaPanel.tsx` חדש, קרוי מ-`PropertyImagery.tsx`
בתוך אותו בלוק VIP-בלבד שכבר עוטף את צילום הבניין/תצלום האוויר/המפה
האזורית — פאנל נפרד מהצילום המכוון הקבוע (§3), ולכן מוצג גם כש-`precise`
של הצילום המכוון הוא `false` (כאן המשתמש מסתובב בעצמו, לא תלוי בחישוב
כיוון-אל-הבניין). `<iframe>` ל-Google דורש `apiUrl()` בדיוק כמו `<img>` —
אותה מלכודת `basePath` שכבר מתועדת בראש `PropertyImagery.tsx`.

לא הותקן `node_modules` באפליקציה הזו בסביבה הזו (אותה מגבלה כמו כל סבב
קודם), אז `tsc`/`next build` לא הורצו כאן. אומת: בדיקת איזון-סוגריים
ייעודית על כל הקבצים החדשים/שהשתנו עברה נקי; `PropertyReport['panorama']`
הושווה מילה-במילה מול קריאת היחיד `<PanoramaPanel report={report} />`;
כל שאר הצרכנים של `PropertyReport` (SavedReportView/reporthtml/sourcelog/
savedreports) רק **צורכים** את הטיפוס דרך `as PropertyReport` (cast על JSON
שמור) ולא בונים אותו כ-object literal, כך ששדה חדש לא-אופציונלי לא שובר
אף קובץ אחר; דוחות שמורים ישנים בלי השדה יקבלו `undefined` ברנדור, ש-
`PanoramaPanel` מטפל בו כ"אין כיסוי" — לא קריסה. אפס רגרסיה: `panorama`
הוא שדה תוסף חדש ופאנל תוסף חדש בלבד; שום שדה/פאנל/API קיימים לא נגעו.
נדחה+נדחף לענף `feat/32-nadlan-berega-interactive-panorama-0825` — לא
מוזג. **נותר לסבב עם יכולת בנייה:** פריט 2 של אותה הנחיית בעלים (סרטון
רחוב מקודד ffmpeg), ואותו פיצ'ר בדיוק על system 36 nadlan-pro (ההנחיה
מכסה את שתי המערכות; הסבב הזה התמקד ב-32 כי שם נמצא "עמוד הנכס" המרכזי
שמוצג ללקוח, לפי תיאור P2 ב-core.projects #33).

## עדכון — 25/08/2026 (Loop A, מטמון הפקה-חוזרת + תיקון תיעוד התראת-נכס-שמור)
`QA/nadlan.md` §המלצות #5 ("מטמון לדוח") היה פתוח: כל רינדור בונה מחדש כולל
הקריאות בתשלום. הממצא הקונקרטי: צפייה ב-VIP במסך ואז "הורדת PDF" ואז "מצגת"
הן **שלוש** הפקות נפרדות בתשלום לאותו נכס תוך דקות — `/api/pdf` ו-`/api/deck`
מנווטים בדפדפן חבוי (Playwright) ל-`/report?...` עם אותם פרמטרים בדיוק, וזה
מריץ שוב את כל `buildReport` מאפס.

נוסף מטמון קצר-טווח (6 שעות) ברמת `/api/report`, **לא** שינוי ל-`buildReport`
עצמו (הקובץ ההוא 3,300+ שורות, בלי `tsc`/`next build` בסביבה הזו לאימות
שינוי-מבנה עמוק). `lib/savedreports.ts` מקבל `fastParcelKey(q, assetType,
input)`: תואם בדיוק את הענף `p:` של `propertyKeyOf` הקיים, אבל בלי גיאוקוד —
עובד רק כש-`q` הוא בדיוק `גוש X חלקה Y` (הצורה ש-`ReportRequestForm` שולח
בלשונית "לפי גוש וחלקה", ושום דבר אחר). ו-`readFreshByParcelKey` — מחזיר
דוח שמור **רק** בהתאמת רמה מדויקת (לא VIP שמור בתשובה לבקשת חינמי/פרימיום —
זו הייתה חושפת תוכן ששולם עליו) ורק בתוך חלון-הטריות. `/api/report` בודק את
זה **לפני** `buildReport` ומחזיר ישירות ב-cache hit — 0 קריאות, לא רק פחות.
`refresh=1` (מ-"הפק דוח מעודכן" בקישור הקבוע, ומבאנר "דוח עדכני שכבר קיים"
החדש שמוצג ב-`/report` בזמן cache hit) ו-`sources=1` (מרכז השליטה, צריך לוג
מקורות אמיתי) שניהם עוקפים את המטמון במפורש.

**כיסוי חלקי במכוון:** חיפוש חופשי לפי כתובת עדיין לא נהנה מהמטמון — הזהות
(גוש/חלקה) נודעת רק אחרי גיאוקוד, שהוא חלק מ-`buildReport` עצמו. כיסוי מלא
דורש לפצל את הפונקציה לשלב-זיהוי (חינמי) ואז שלב-העשרה (בתשלום) עם בדיקת
מטמון ביניהם — שינוי אמיתי לליבה, נדחה לסבב עם יכולת בנייה לאימות.

אומת: שוכפלה עצמאית ב-Node טהור `tidy`+`fastParcelKey`+`propertyKeyOf` מול
4 מקרים (גוש/חלקה בלבד, עם תת-סוג נכס, עם תת-חלקה+דירה, כתובת חופשית →
`null`) — כולם תואמים. אומת גם מול שורה אמיתית ב-`nadlan.saved_reports`
(`p:14068/60|residential`, בת 16.5 שעות בזמן הבדיקה) שחלון ה-6-שעות **דוחה**
נכון (לא היה מחזיר תוכן ישן). איזון סוגריים נבדק על כל הקבצים שנגעו בהם.
`node_modules` לא מותקן כאן, אז `tsc`/`next build` לא הורצו.

גם תוקן תיעוד שגוי: המלצה #3 ("התראה על עסקה חדשה בנכס שמור") הייתה מסומנת
כפתוחה, אבל `AreaAlertSignup` כבר מוצג בתחתית כל דוח כולל דוחות שמורים
(`SavedReportView` עוטף את `ReportView` עם `preloaded`, ומרנדר את אותו רכיב
במלואו) — הפיצ'ר כבר בנוי ועובד, רק לא סומן. שום קוד לא שונה עבור סעיף זה.

אפס רגרסיה: שינוי היחיד בהתנהגות קיימת הוא cache-hit חדש שמופעל רק בתנאים
צרים (גוש/חלקה מדויק, רמה זהה, בתוך 6 שעות, בלי `refresh`/`sources`); בכל
מקרה אחר הנתיב הרגיל רץ בדיוק כמו קודם, וכשל בקריאת המטמון (DB לא זמין וכו')
נבלע ונופל לנתיב הרגיל.

## עדכון — 25/08/2026 (Loop A, תיקון תנאי-סף שני בפטור דירה יחידה)
ביקורת עצמאית של `lib/capitalgainstax.ts` (שנבנה באותו יום, ראו הרשומה
למטה) מצאה פער אמיתי: סעיף 49ב(2) קובע **שני** תנאי-סף מצטברים סביב 18
חודשים, לא אחד — `meetsMinHoldingPeriod` בדק רק את הראשון ("המוכר מחזיק
בדירה 18 חודשים לפחות מהיום שהייתה לדירת מגורים"). התנאי השני, שלא היה קיים
בכלל: "לא מכר דירת מגורים **אחרת** בפטור לפי אותו סעיף ב-18 החודשים שקדמו
למכירה הזו". אומת מול שני מקורות עצמאיים ברשת (חיפוש + fetch על
amitvered.co.il ותקציר capitax.co.il) לפני התיקון, לא רק בדיעבד — שניהם
מצטטים את שני התנאים כמצטברים ונפרדים. הדוח אינו יכול לדעת על מכירות אחרות
של הלקוח, ולכן זה קלט מפורש מהמשתמש (תיבת סימון "מכרתי דירת מגורים אחרת
בפטור זה ב-18 החודשים שקדמו למכירה הזו" ב-`VipPanel.tsx`, ברירת מחדל
`false` — כמו "דירה יחידה" שכבר קיים), לא ניחוש. שדה חדש אופציונלי
`soldAnotherExemptHomeInLast18Months` ב-`CapitalGainsTaxInput`, ותנאי-סף
חדש `exemptionIneligibleReason: 'recent-exempt-sale'`.

אומת: שוכפל עצמאית ב-Node טהור מול 7 מקרים (2 הדוגמאות המספריות המקוריות —
זהות, לא נפגעו; מקרה חדש שבו הסימון חוסם פטור שאחרת היה ניתן; ברירת מחדל
`false`/השמטת השדה לגמרי מייצרות תוצאה זהה; סדר-עדיפות בין שלוש הסיבות —
`not-single-home` ואז `holding-period` גוברות על `recent-exempt-sale`).
בדיקת איזון סוגריים על כל `VipPanel.tsx` (577 שורות) עברה. `node_modules`
לא מותקן כאן, אז `tsc`/`next build` לא הורצו. אפס רגרסיה — שדה אופציונלי
חדש עם ברירת מחדל זהה להתנהגות הקודמת, ענף/תנאי חדשים בלבד.

## עדכון — 25/08/2026 (Loop A, מס שבח)
`PRODUCT_TIERS.md` §VIP מבטיח "חישוב מיסוי (מס רכישה, מס שבח)" — מס רכישה
נבנה בסבב קודם (`lib/purchasetax.ts`), ומס שבח הושאר לא בנוי במכוון (ראו
הרשומה למטה, "מס רכישה") בגלל תלות בתאריכי קנייה/מכירה, פטור דירה יחידה
ורכיב אינפלציוני. נוסף `lib/capitalgainstax.ts` (`calcCapitalGainsTax`,
פונקציה טהורה): משלב שני מנגנונים שאומתו כל אחד מול **שני** מקורות משפטיים
עצמאיים לפני המימוש (לא רק בדיעבד) — (1) פטור דירה יחידה (סעיף 49ב(2), תקרה
5,008,000 ₪ ל-2026, מותנה בהחזקה 18+ חודשים; מעל התקרה רק החלק היחסי לפי
יחס-מחיר חייב), (2) חישוב ליניארי מוטב (סעיף 48א(ב2)) לחלק החייב: 0% על שבח
שנצבר עד 1.1.2014, 25% מ-1.1.2014 ואילך, מפוצל יחסית לפי ימי החזקה. כרטיס
חדש ב-`VipPanel.tsx` (תאריכי+מחירי קנייה/מכירה, עלויות השבחה, תיבת "דירה
יחידה") באותו דפוס בדיוק כמו כרטיס מס הרכישה (useMemo, CertaintyBadge
"estimate", גילוי-נאות).

**מגבלה מכוונת, מוצהרת בכרטיס עצמו:** שווי הרכישה **אינו מתואם למדד המחירים
לצרכן** — אין בסביבה הזו גישת רשת ישירה לשלוף סדרת מדד היסטורית לטווח
שרירותי (נבדק: `curl` ל-`api.cbs.gov.il` נכשל בטיים-אאוט, `lib/cbs.ts`
הקיים תומך רק ב"24 הנקודות האחרונות", לא בטווח שרירותי לאחור); זהו לכן
"שבח נומינלי" ולא "שבח ריאלי" מדויק כהגדרתו בחוק — מטה **כלפי מעלה**, לא
כלפי מטה (אינפלציה מצטברת מקטינה את השבח האמיתי לעומת הנומינלי), כך שהכרטיס
לעולם לא **מציג פחות** מס משיהיה בפועל. גם לא כולל קיזוז הפסדים או פטורים
מיוחדים (ירושה/פינוי-בינוי/תושב-חוץ/מכירה-לקרוב). גילוי-נאות מלא בכרטיס
מפנה לסימולטור הרשמי (misim.gov.il).

לא הותקן `node_modules` באפליקציה הזו בסביבה הזו, אז `tsc`/`next build` לא
הורצו כאן (אותה מגבלה כמו סבב מס-הרכישה). אומת: שתי הנוסחאות שוכפלו עצמאית
ב-Node טהור (ללא תלויות) ונבדקו מול **שתי דוגמאות חישוב מספריות עצמאיות**
שנמצאו בשני מקורות משפטיים שונים (לא רק תיאור מילולי) — (א) פיצול ליניארי:
רכישה 2000, מכירה 2020, שבח 500,000 ₪ → תוצאת המקור 37,603 ₪ מס, התוצאה כאן
37,491 ₪ (הפרש <1%, מהבדל זניח בספירת ימים בין המקורות); (ב) חריגה מתקרת
הפטור: שבח 1,500,000 ₪, מכירה 5,500,000 ₪, תקרה 5,008,000 ₪ → תוצאת המקור
"~33,500 ₪", התוצאה כאן 33,545 ₪ (בתוך טווח ה"~" המוצהר של המקור עצמו).
נבדקו גם 4 מקרי-קצה נוספים (פטור מלא מתחת לתקרה, החזקה קצרה מ-18 חודש,
רוכש אחרי 2014 בלי צורך בפיצול, הפסד ולא רווח) — כולם תואמים את החישוב
הידני הצפוי. אפס רגרסיה — קובץ חדש + כרטיס חדש בלבד, שום שדה/כרטיס/חישוב
קיימים לא נגעו.

## עדכון — 25/08/2026 (Loop A, תיקון בילד שבור — NearbyPlansPanel חסר)
`ReportView.tsx` (שורה 609, קטגוריית "פוטנציאל") ו-`PropertyImagery.tsx`
מייבאים `./NearbyPlansPanel` — אבל הקובץ עצמו לא היה קיים בעץ הזה בכלל
(`git log --all --follow` על הנתיב מחזיר ריק, וגם לא נמצא באף אחד משלושת
עצי ה-Loop המקבילים על הדיסק). ייבוא ל-מודול שלא קיים נכשל ב-`next
build`/webpack — כלומר קטגוריית "פוטנציאל" (§12 ב-`NADLAN_SPEC_V2.md`,
"אתרי בנייה ותכנון באזור הנכס") הייתה עלולה לשבור בנייה שלמה, לא רק להיות
ריקה. שכבת הנתונים עצמה (`lib/nearbyplans.ts`, מחוברת דרך `buildreport.ts`
ומסומנת על `InteractiveMap.tsx` בריבועים זהובים) הייתה קיימת ותקינה במלואה —
רק שכבת התצוגה מאחורי הכפתור חסרה.

נוסף `components/report/NearbyPlansPanel.tsx`: אותו דפוס כפתור-חשיפה בדיוק
כמו `FeasibilityPanel.tsx` הקיים (כותרת "מה נבנה באזור?" כלשון המפרט, סגור
כברירת מחדל, `tier==='basic'` → `null` לגמרי כי השכבה לא נשאלת ברמה
החינמית). בתוך הכרטיס: רשימת התוכניות (מספר/שם/סטטוס/מרחק דרך
`distanceText` הקיים ב-`lib/report.ts`), הודעת "לא זמין" כשהשליפה נכשלה
(`plans === null` בפרימיום/VIP) לעומת "לא אותרו תוכניות" כשהשליפה הצליחה
והחזירה רשימה ריקה — תואם את העיקרון "אין נתוני דמה. מקור שלא נטען → לא
זמין" בראש הקובץ הזה, ולא מבלבל כישלון-שליפה עם "אין בנייה בסביבה".

לא הותקן `node_modules` באפליקציה הזו בסביבה הזו (אותה מגבלה כמו סבב מס-
הרכישה הקודם), אז `tsc`/`next build` לא הורצו כאן. אומת ידנית: איזון
סוגריים/תגיות תקין (בדיקת Node ייעודית על התוכן הגולמי), חתימת ה-props
(`{ plans, tier }`) הושוותה מילה-במילה מול קריאת היחיד `<NearbyPlansPanel
plans={data.nearbyPlans} tier={tier} />` ב-`ReportView.tsx`, וטיפוסי
`NearbyPlan`/`ReportTier` הושוו מול ההגדרות ב-`lib/nearbyplans.ts`/
`lib/report.ts`. אפס רגרסיה — קובץ חדש בלבד, שום קובץ קיים לא נגע.

## עדכון — 25/08/2026 (Loop A, מס רכישה)
`PRODUCT_TIERS.md` §VIP מבטיח "חישוב מיסוי (מס רכישה, מס שבח)" בתור חישוב
פנימי שלנו (לא תלוי מקור חיצוני), לצד תשואה/משכנתא/תזרים שכבר היו קיימים —
אבל אף קובץ בקוד לא חישב מס רכישה בפועל. נוסף `lib/purchasetax.ts`: פונקציה
טהורה (`calcPurchaseTax`) לפי מדרגות מס הרכישה הרשמיות של רשות המסים
(דירה יחידה: 0%/3.5%/5%/8%/10%; דירה נוספת/משקיע: 8%/10%), מוקפאות
15.1.2026–15.1.2028 לפי הוראת ביצוע מיסוי מקרקעין 1/2026 (gov.il) — אומתו
מול כמה מקורות משפטיים עצמאיים ומול דוגמת חישוב מלאה (דירה יחידה
2,400,000 ₪ → 15,538 ₪, שהחישוב כאן משחזר בדיוק). כרטיס חדש ב-`VipPanel.tsx`
(מחיר + בחירת סוג רכישה → סכום מס, שיעור אפקטיבי, פירוט לפי מדרגה), באותו
דפוס בדיוק כמו כרטיסי התשואה/משכנתא/תזרים הקיימים (useMemo, CertaintyBadge
"estimate", גילוי-נאות שזה אומדן ולא ייעוץ מס אישי). לא הותקן `node_modules`
באפליקציה הזו בסביבה הזו, אז `tsc`/`next build` לא הורצו כאן — נבדק ידנית:
תחביר JSX/TS תואם לדפוס הקיים שורה-שורה, וחישוב המדרגות שוחזר ואומת עצמאית
ב-Node טהור (ללא תלויות) מול דוגמת ה-15,538 ₪ הרשמית לפני ואחרי הכתיבה לקבצי
המקור. **מס שבח (הפריט השני שמובטח באותה שורת PRODUCT_TIERS.md) נשאר לא
בנוי במכוון** — הנוסחה האמיתית תלויה בתאריכי קנייה/מכירה, פטור-דירה-יחידה,
רכיב אינפלציוני ומדרגות היסטוריות (לפני/אחרי 7.11.2001), ומחייבת בדיקה
זהירה יותר לפני שמציגים ללקוח מספר בנושא מס — לא מומש כדי לא להציג הערכת-מס
שגויה בשם "נתוני אמת". אפס רגרסיה — תוספת בלבד, שום שדה/כרטיס/חישוב קיימים
לא נגעו.

## עדכון — 25/08/2026 (Loop A)
שדה "פשיעה (אזור סטטיסטי)" בקטגוריית "סביבה וסיכונים" היה `pending` קבוע מאז
המעבר למודל הדוח החדש. חובר אמיתית: `lib/crime.ts` שואל את מאגר תיקי הפשיעה
של משטרת ישראל ב-data.gov.il (מסונן לפי סמל יישוב, `filters` של CKAN — אין
פוליגון אזור-סטטיסטי ציבורי, אז זו ספירה **ברמת יישוב**, לא רדיוס כמו
בתי-ספר/תחבורה, והשדה מתויג בהתאם: "פשיעה (רמת יישוב)"). קוד היישוב מגיע מ-
`findCityCode` הקיים ב-`lib/placenames.ts` (יוצא עכשיו, היה פרטי) על
`key.city` (שם הקדסטר). `resource_id` ברירת המחדל מאומת חי מול data.gov.il
(תל אביב 37,064 תיקים / ירושלים 29,910 / נתניה 8,644 ל-2025) וניתן לדריסה
דרך `DATAGOV_CRIME_RESOURCE`/`DATAGOV_CRIME_YEAR` בלי שינוי קוד, לשנה הבאה.
אפס רגרסיה — שדה אחד שהיה תמיד "לא זמין" הפך לנתון אמיתי; שום שדה/שכבה קיימים
לא נגעו.

## עדכון — 25/08/2026 (Loop A, היסטוריית הדירה הספציפית)
`QA/nadlan.md` §המלצות #4 ("חיפוש לפי תת-חלקה בעסקאות... להראות ללקוח את
היסטוריית **הדירה שלו** ולא רק של הבניין") היה פתוח: `matchedUnit` כבר איתר
עסקה בודדת שתואמת קומה+חדרים (כולל `tatHelka` שלה, מוצג כ"תת-החלקה של הדירה
שלך"), אבל אם אותה תת-חלקה נמכרה יותר מפעם אחת במרשם — אף מקום בדוח לא הראה
זאת כהיסטוריה של אותה דירה עצמה. נוסף `fact` חדש ב-`lib/buildreport.ts`
("היסטוריית מכירות של הדירה שלך"): מסנן את `buildingRealSales` (אותו סינון
"עסקה אמיתית" שכל שאר הדוח משתמש בו) לפי `tatHelka === matchedUnit.tatHelka`,
ומציג את כל המכירות ממוינות מהישן לחדש ("תאריך · מחיר ← תאריך · מחיר").
פחות משתי מכירות של אותה תת-חלקה → השדה חסר, עם `missingReason` שמפנה
ל"מחיר אחרון שנסגר בבניין" הקיים כדי לא לכפול מידע. תת-חלקה `'0'`
(לא רשום כבית משותף) מוחרגת. אין קריאה חיצונית חדשה — הכל מהנתונים שכבר
נשלפים ומעובדים היום (dedup כבר קורה קודם ב-`mergeDuplicateReports`, ראה
ההערה ב-`lib/nadlan.ts` על תת-חלקה לא-יציבה **בדיווחים כפולים** — לא רלוונטי
כאן כי הרשימה כבר מאוחדת בשלב מוקדם יותר).

לא הותקן `node_modules` באפליקציה הזו בסביבה הזו, אז `tsc`/`next build` לא
הורצו כאן. אומת: הלוגיקה (`filter`+`reverse`+`map`+`join`) שוכפלה עצמאית
ב-Node טהור מול נתוני עסקאות מדומים (שתי מכירות אותה תת-חלקה → ההיסטוריה
נכונה בסדר כרונולוגי; מכירה אחת → `null`; ללא `matchedUnit` → `null`;
תת-חלקה `'0'` → `null`), וחתימת ה-`Fact`/`fact()` הושוותה מול ההגדרה
ב-`lib/report.ts`. אפס רגרסיה — `fact` נוסף בלבד באותה מערך `facts.property`,
שום שדה/חישוב קיימים לא נגעו.

## מצב נוכחי — 29/07/2026 (דוח נכס עולמי)

**המערכת עברה למודל דוח חדש: 7 קטגוריות · 3 רמות · ודאות לכל נתון.**
המסמכים המחייבים: `docs/SOURCE_VERIFICATION.md` (כל בדיקה עם הפלט שהתקבל בפועל)
ו-`docs/REPORT_MODEL.md` (מבנה הדוח).

- מסלול הלקוח: כל הזנה → `/report?q=…` ישר לתוצאות. `/present` = מצגת. `/admin` = מרכז שליטה.
- מנוע הדוח: `lib/buildreport.ts`. מודל: `lib/report.ts`. עלויות: `lib/costs.ts`.
- מקורות חדשים שנבדקו חי: `lib/googlemaps.ts`, `lib/apify.ts`, `lib/elections.ts`, `lib/placenames.ts`.

### ארבע מלכודות שנמצאו בהרצה חיה — אל תחזור עליהן
1. **חייבים לתרגם שם רחוב לשם הרשמי לפני האיתור.** "האתרוג 5 חצור הגלילית"
   הגיע לגוש 14052 במקום 13893, כי שירות האיתור חיפש רחוב שלא קיים במרשם.
   הרחוב הרשמי הוא "דרך מרדכי" ו"אתרוג" הוא כינוי שלו.
2. **מרשם העסקאות משתמש בכינויים.** אותן עסקאות רשומות תחת "אתרוג" ולא תחת
   "דרך מרדכי". השוואה מול השם הרשמי בלבד הרסה את המיון לפי קרבה.
3. **מקף שובר את החיפוש החופשי של data.gov.il.** `q="תל אביב-יפו"` מחזיר 0.
   גם ה' הידיעה שוברת התאמה: `q="האתרוג"` לא מוצא את "אתרוג".
4. **אסור לטעון "כל רחובות העיר" ולסנן בזיכרון** — תל אביב חורגת מתקרת השורות
   והרחוב המבוקש מושמט בשקט. מסננים לפי `city_code` ומחפשים את הרחוב בשאילתה.

### מה עדיין לא זמין (ונאמר ללקוח במפורש)
- **קווי תחבורה בכל תחנה** — מרשם התחנות מפרסם מיקום בלבד; הקווים רק בארכיון
  לוחות הזמנים המלא, שאינו ניתן לשאילתה לפי כתובת.
- **נסח טאבו, זכויות בנייה כמותיות, היתרי בנייה** — אין ממשק ציבורי. ידני.
- **מיפוי כתובת→קלפי** — לא קיים. לכן אפיון האוכלוסייה תמיד "מקורב".

## מצב קודם
עודכן 20/07/2026 — **ה-MVP באוויר בפרודקשן על Vercel.**
- 🌐 **חי:** https://nadlan-berega.vercel.app (Vercel, פרויקט `nadlan-berega`, plan hobby).
  אומת מקצה לקצה: דיזנגוף 100 → גוש 7091/203, 70 עסקאות בחלקה, מדד "מחירי דירות",
  ייעוד קרקע + תב"ע 507-0880112 — **אפס אזהרות, כל 7 המקורות מחזירים נתוני אמת.**
- ✅ קוד מלא (7 שכבות, 2 דוחות, סוכן AI, טופס בקשות). `tsc --noEmit` נקי.
- ✅ בקאנד Supabase חי; מרשם המקורות מסונכרן למצב שנבדק בפועל (`status=verified_live`).
- ✅ **כתובת → גוש/חלקה עובד**, כיסוי 11/12 בבדיקה ארצית.
- ✅ ריפו פרטי `l023131500-ops/nadlan-berega` (GitHub) מחובר ל-Vercel (auto-deploy על push).
- ✅ **כל שכבות המקורות הפתוחים עובדות** (כויל 20/07/2026):
  · **התחדשות עירונית** — FeatureServer של משרד הבינוי (`GIS_UrbanRenewal` שכבה 1,
    954 מתחמים), point-in-polygon לפי ITM. מאומת: יוספטל 20 בת ים → מתחם "קוקיס",
    פינוי בינוי, 114 יח"ד, תב"ע 502-1358357.
  · **בתי ספר (28,312) + תחבורה (34,066)** — נטענו מ-data.gov.il לטבלת `nadlan.poi`
    (מטמון), וספירה ברדיוס 1 ק"מ אמיתי מנקודת הנכס (לא ספירת עיר גסה).

### ⚠️ הערות פריסה (חשוב לסשן הבא)
- **Railway נכשל** — ה-Metal builder לא הריץ builds (לוג ריק, תקלה מוכרת). עברנו ל-Vercel.
  נותר פרויקט Railway ריק `nadlan-berega` (id 17d20d43) — אפשר למחוק.
- **מלכודת BOM:** הזנת env ל-Vercel דרך `$val | vercel env add` ב-PowerShell 5.1 מוסיפה
  BOM (U+FEFF) לערך → שבר את XPLAN ("Failed to parse URL") ואת CBS (500). **הפתרון:
  להזין env דרך ה-API של Vercel (PATCH /v9/projects/{id}/env/{envId}), לא דרך stdin.**
- **NetFree:** הרשת המקומית של המשתמש מסננת דרך NetFree וחוסמת vercel.app (HTTP 418).
  צריך לאמת מול NetFree / להשתמש בתת-דומיין nadlan.more30.com אחרי חיבור DNS.
- **service_role עדיין ריק** ב-Vercel → קאשינג כבוי (עובד "חי בלבד"). למלא ב-Variables.

### ❗ תיקון חשוב לתיעוד הקודם: אין token ל-GovMap
ההנחה ש"GovMap דורש token" הייתה **אבחון שגוי**. אין token להשיג:
`es.govmap.gov.il` הוסר (כשל DNS) ו-`api.govmap.gov.il` מחזיר 403 מ-CloudFront.
הכשל האמיתי היה **אי-התאמת CRS**: השכבה `PARCEL_ALL` שמורה ב-EPSG:3857, ופילטר
CQL מתפרש ב-CRS המקורי, ולכן נקודת ITM החזירה תוצאה ריקה **בלי שגיאה**.
הפתרון: `opendata:Parcels_ITM` ב-GeoServer הפתוח — ללא אימות כלשהו.

### מה שהיה מתועד כ"מחובר" אך היה מת (כולם תוקנו)
| מקור | מה קרה | התיקון |
|---|---|---|
| עסקאות | `nadlan.gov.il/Nadlan.REST` מחזיר SPA HTML | עבר ל-`govmap.gov.il/api/real-estate` |
| תכנון | `ags.iplan.gov.il/arcgis/` דף שגיאה | הנתיב הוא `/arcgisiplan/`, שכבה 4 |
| מדד למ"ס | 120010 = מדד לצרכן כללי | המזהה הנכון: **40010** |

⚠️ שלושתם החזירו **HTTP 200 עם HTML**, כך ש-`res.ok` עבר והכשל התגלה רק בפרסינג.
`lib/http.ts` חוסם זאת עכשיו (זיהוי non-JSON + timeout + retry).

### מלכודות נתונים שאסור לשכוח
1. `street-deals` מחזיר עסקאות **בהיקף רחוב/גוש-עיר, לא בניין**. הרצל 42 החזיר את
   הרצל 7-176 על פני 15+ גושים. חובה להפריד `parcelTransactions` מ-`transactions`.
2. מערך הפוליגונים **אינו ממויין לפי רלוונטיות** — לקיחת `[0]` נותנת נתון שגוי.
3. במקור יש רשומות בתאריך **עתידי** (נצפתה 2027-10-14) — נפסלות.
4. הגיאוקוד של GovMap **מטושטש**: "הנביאים 5 צפת" → "הנשיאים 5 פת" (פתח תקווה).
   נחסם ע"י התאמת טוקן שלם על סיומת השאילתה + אימות צולב מול יישוב הקדסטר.

## הבא בתור (לפי הסדר — התחל מכאן)
1. חבר `SUPABASE_SERVICE_KEY` ב-`.env.local` (דשבורד → Settings → API) — בלעדיו אין קאשינג.
2. `hitchadshut.ts` — עדיין לא מחובר (התחדשות עירונית). לשקול
   `vatmal_mitchamim_muchrazim` ב-PlanningPublic במקום ה-Shapefile.
3. `DATAGOV_SCHOOLS_RESOURCE` — לזהות מאגר בתי ספר ארצי.
4. git init → ריפו בגיטאב → פריסה ל-Railway → תת-דומיין nadlan.more30.com.
5. חישובי VIP: תשואה, מס רכישה/שבח, יתכנות משכנתא, תזרים (ראה PRODUCT_TIERS).
6. זכויות בנייה כמותיות — אינטגרציית MAVAT דרך `pl_number`/`mp_id` (לא ב-XPLAN).

## עדכון — 25/08/2026 (Loop A, RLS initplan על טבלאות הפורום ב-36 nadlan-pro)
`get_advisors` (performance) סימן 7 מדיניות RLS על `nadlan_pro.forum_posts`/
`forum_comments` (שנוספו באותו יום בסבב הפורום, מודול 8) כ-`auth_rls_initplan`:
כל מדיניות קוראת ל-`auth.uid()` ישירות בביטוי ה-USING/WITH CHECK, כך ש-Postgres
מריץ אותה מחדש לכל שורה במקום פעם אחת לשאילתה. שאר טבלאות `nadlan_pro` נמנעות
מזה כי הן עוברות דרך פונקציות עטיפה STABLE SECURITY DEFINER (`can_touch`/
`manages_office`/`my_office_ids`) שהקריאה הפנימית שלהן ל-`auth.uid()` שקופה
ל-linter — הפורום היה היחיד עם `auth.uid()` כתוב ישירות בתוך מדיניות.

מיגרציה `0139_nadlan_pro_forum_rls_initplan_fix.sql` עטפה את כל 7 הקריאות
ב-`(select auth.uid())` דרך `ALTER POLICY` — אותה תוצאה בוליאנית לכל שורה,
אותם תפקידים, שום שינוי הרשאה/נראות. אומת חי ב-MCP בתוך `BEGIN/ROLLBACK` עם
שני משתמשים אמיתיים משני משרדים: קריאה חוצת-משרד עדיין עובדת (B רואה פוסט של
A), ניסיונות עדכון/מחיקה של B על תוכן של A עדיין נחסמים, B עדיין יכול
להוסיף/למחוק תגובה משלו, A עדיין יכול לערוך/למחוק פוסט משלו, ומשתמש בלי חברות
באף משרד עדיין רואה 0 פוסטים — כל 9 הבדיקות תואמות בדיוק להתנהגות שלפני
התיקון. `get_advisors` אחרי ההחלה: אפס אזהרות `auth_rls_initplan` על
`nadlan_pro`. אפס רגרסיה, אפס שיוריות אחרי rollback. נדחה+נדחף לענף
`fix/36-nadlan-pro-forum-rls-initplan-0825`. System 35 KioskFleet לא נגע, לפי
ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, multiple_permissive_policies ב-36 nadlan-pro)
`get_advisors` (performance) סימן 15 אזהרות `multiple_permissive_policies` על שלוש
טבלאות ב-`nadlan_pro`: `offices`, `office_members`, `contract_templates` (5
תפקידים × 3 טבלאות). לכל אחת מהן יש מדיניות SELECT לקריאה בלבד, ובנוסף מדיניות
"כתיבה" נפרדת שהוגדרה `FOR ALL` — כך שעל כל SELECT היה Postgres מריץ ומאחד
(OR) שתי מדיניות permissive במקום אחת. אלו שלוש הטבלאות היחידות בסכמה עם תנאי
קריאה שונה מתנאי כתיבה (כל חבר משרד פעיל קורא, רק owner/manager — `manages_office()`
— כותב); `contacts`/`deals`/`properties` משתמשות במדיניות `ALL` יחידה כי אצלן
תנאי הקריאה והכתיבה זהים (`can_touch()`). זרוע ה-SELECT שבמדיניות הכתיבה הייתה
מיותרת: `manages_office()` הוא כבר תת-קבוצה מלאה של תנאי הקריאה
(`my_office_ids()`/`is_super_admin()`), כך שהסרת SELECT ממדיניות הכתיבה לא
משנה אף שורה נראית — רק מבטלת הערכה כפולה.

מיגרציה `0141_nadlan_pro_multiple_permissive_policies_fix.sql` מחליפה כל מדיניות
`FOR ALL` בשלוש מדיניות מפורשות (INSERT/UPDATE/DELETE) עם אותם ביטויי
USING/WITH CHECK כמו קודם. אומת חי ב-MCP בתוך `BEGIN/ROLLBACK` על משרד ה-QA
האמיתי עם שלושה משתמשים: owner (קריאה+כתיבה מלאה נשארה עובדת: select, insert,
update, delete על contract_templates ו-offices), agent רגיל שנוסף זמנית
כחבר-צוות (קריאה נשארה עובדת, כל ניסיון כתיבה — הוספת תבנית, עדכון משרד,
מחיקת חבר-owner — נחסם בדיוק כמו לפני התיקון), ו-outsider ממשרד אחר לגמרי
(0 שורות בקריאה, לפני ואחרי). `get_advisors` אחרי ההחלה: אפס אזהרות
`multiple_permissive_policies` על `nadlan_pro`, אין אזהרות חדשות. אפס רגרסיה,
אפס שיוריות אחרי rollback. נדחה+נדחף לענף
`fix/36-nadlan-pro-multiple-permissive-policies-0825`. System 35 KioskFleet
לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, unindexed_foreign_keys ב-32 nadlan + 36 nadlan-pro)
`get_advisors` (performance) סימן 26 אזהרות `unindexed_foreign_keys`: 2 ב-`nadlan`
(`rental_data.property_id`, `report_exports.property_id`) ו-24 ב-`nadlan_pro`
(רוב עמודות ה-`created_by`/`*_contact_id`/`office_id`/`property_id` בטבלאות
כמו `deals`, `contracts`, `invoices`, `leases`, `activities`, `commissions`,
`forum_posts`/`forum_comments`, `office_members`, `office_invites`,
`property_documents`, `signatures`, `deal_checklist`, `deal_stage_events`,
`properties`). לעמודת FK בלי אינדקס מכסה יש Postgres שסורק סריקה סדרתית על
הטבלה-הבת בכל בדיקת מפתח-זר (ON DELETE CASCADE/SET NULL) וגם בכל שאילתה/מדיניות
RLS שמסננת/מצטרפת דרך אותה עמודה — כולל `can_touch()`/`manages_office()`
שרצות על כמעט כל SELECT במערכת.

מיגרציה `0142_nadlan_unindexed_foreign_keys_fix.sql` מוסיפה `CREATE INDEX IF
NOT EXISTS` בודד לכל אחת מ-26 העמודות (btree רגיל על עמודת ה-FK, בלי לשנות
מדיניות/סכמה/נתונים). אומת חי ב-MCP: כל 26 האינדקסים קיימים ב-`pg_indexes`
לאחר ההחלה, ו-`get_advisors` אחרי — אפס אזהרות `unindexed_foreign_keys` על
`nadlan`/`nadlan_pro` (האזהרה היחידה שנותרה, `unused_index`, היא צפויה
ותקינה — אינדקס חדש-לגמרי טבעי שטרם נסרק, לא פגם). אפס רגרסיה — פעולה תוספתית
בלבד, לא נגעה בשום מדיניות/RPC/UI קיימים. נדחה+נדחף לענף
`fix/32-36-nadlan-unindexed-foreign-keys-0825`. System 35 KioskFleet לא נגע,
לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, function_search_path_mutable ב-36 nadlan-pro)
`get_advisors` (security) סימן שתי אזהרות `function_search_path_mutable`:
`nadlan_pro.touch_updated_at()` (0009, טריגר ה-before-update על
offices/contacts/properties/deals) ו-`nadlan_pro.allocation_threshold()`
(0011, בדיקת סף מספר-הקצאה לחשבוניות) — שתיהן הוגדרו בלי `set search_path`,
בשונה משאר פונקציות `nadlan_pro` (`can_touch`/`manages_office`/
`my_office_ids` וכו' כבר קובעות אותו). search_path משתנה מאפשר לקורא
שיכול ליצור אובייקטים מוקדם יותר ב-search_path של הסשן שלו להצל הפניה לא
מוסמכת — לא ניצל בפועל כאן כי אף אחת מהפונקציות לא מפנה לאובייקט לא
מוסמך (touch_updated_at נוגעת רק ב-NEW.updated_at; allocation_threshold
משווה רק קבועים), אבל זו הפער שהלינטר מסמן והתיקון עולה שורה אחת.

מיגרציה `0144_nadlan_pro_function_search_path_fix.sql` מצמידה `set
search_path = nadlan_pro, public, pg_temp` דרך `ALTER FUNCTION` — קובע
פרמטר קונפיגורציה בלבד, לא מגדיר מחדש את גוף הפונקציה. אומת חי ב-MCP
בתוך `BEGIN/ROLLBACK`: `allocation_threshold` עדיין מחזירה את הערך הנכון
ל-2026-07-01/2025-06-01/2023-01-01 (5000/20000/null) אחרי התיקון, ו-UPDATE
על שורת משרד אמיתית עדיין הזיזה את `updated_at` דרך הטריגר. הוחל בפועל
דרך `apply_migration`; `get_advisors` אחרי — שתי האזהרות נעלמו, אין
אזהרות חדשות. אפס רגרסיה, אפס שינוי התנהגות. נדחה לענף
`fix/36-nadlan-pro-function-search-path-0825`. System 35 KioskFleet לא
נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, מטמון-הדוח המהיר הגיש דירה לא-נכונה)
בדיקת-אימות עצמאית על `47cc1701` (המטמון בן-6-השעות ל-`/api/report`, סבב
מוקדם יותר היום) מצאה רגרסיה אמיתית: `fastParcelKey` בונה מפתח-מטמון
מ-גוש/חלקה/תת-חלקה/כניסה/דירה בלבד — אבל `buildReport` (`lib/buildreport.ts`,
`matchedUnit`) מזהה **דירה ספציפית בתוך הבניין** לפי התאמת קומה ו/או מספר
חדרים לעסקה אמיתית, ומשתמש בה לעובדות שמוצגות כ-"אמת": שטח, קומה, היסטוריית
מכירות של תת-החלקה, שווי. כיוון ש-`fastParcelKey` התעלם מקומה/חדרים, שתי
פניות שונות לאותו גוש/חלקה (קומה 2 מול קומה 5, בלי תת-חלקה/כניסה/דירה) היו
מקבלות **בדיוק אותו מפתח-מטמון** — ומי שביקש שנייה בתוך חלון 6 השעות היה
מקבל את הדוח שנבנה לדירה של הראשון/ה, מוצג כאילו הוא הדוח שלו/ה. ניגוד ישיר
לעיקרון "אין נתוני דמה", ותקלה גרועה יותר מהחסימה שהתיקון המקורי (47cc1701)
דאג לה במפורש (רמה/מחיר ששולם עליו) — כאן מוצגים נתונים אמיתיים אך של נכס
אחר, בלי שום סימן שמשהו לא בסדר.

התיקון: `fastParcelKey` מחזיר `null` (המטמון המהיר מדולג, נופל לנתיב הרגיל
של בניית דוח מלאה) כשסופקו קומה ו/או חדרים — בדיוק כמו כשהשאילתה אינה בצורת
"גוש X חלקה Y". לא נגעתי ב-`propertyKeyOf`/שמירת הקישור הקבוע (סיפור נפרד,
קדם-קיים, מחוץ להיקף הסבב הזה) ולא ב-`saveReport` — רק בפונקציית קריאת-
המטמון החדשה מהיום. אומת ב-Node טהור עצמאי (אין node_modules בסביבה הזו):
קומה/חדרים שונים → שני `null` (בלי התנגשות מזויפת), קומה בלבד/חדרים בלבד →
`null`, ואילו המקרה הבטוח (בלי שדות-יחידה בכלל, או עם תת-חלקה/כניסה/דירה
בלבד) ממשיך להחזיר בדיוק את אותו מפתח כמו לפני — האופטימיזציה של
VIP-דוח→PDF→מצגת לאותו נכס עדיין פועלת במלואה כל עוד לא סופקו קומה/חדרים.
בדיקת איזון-סוגריים על הקובץ עברה. אפס רגרסיה בנתיב הבטוח, תוספת-תנאי אחת
בלבד. system 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## עדכון — 25/08/2026 (Loop A, session 3 — חסר סעיף "הערכת שווי" במייל)
המשך ביקורת RPC-מול-UI על 36 nadlan-pro (`app.html`) לא העלה עוד פערים —
עברתי על כל קריאות ה-`rpc()` (60+) מול חתימות הפונקציות האמיתיות ב-DB:
כל קריאה עם ארגומנט `p jsonb` בודד עטופה נכון ב-`{ p: ... }` (הבאג היחיד
מהסוג הזה, `np_forum_post_save`, כבר תוקן בסבב קודם), וכל קריאה עם ארגומנטים
בשם מפורש תואמת בדיוק לשמות בחתימה. גם `data-role="<user_id>"` ב-Team tab
נבדק ואינו באג — רק שם-attribute מטעה שמכיל את ה-user_id, לא את התפקיד.

עברתי ל-32 nadlan-berega ומצאתי פער אמיתי בשיטת "מחשבים פעם אחת, מרנדרים
בשלוש הבמות" (מסך/מייל/חפיסה) שהסבב הזה כבר השתמש בה על StreetPanel: סעיף
§2 "הערכת שווי" (`report.valuation`, `ValuationPanel.tsx`) מוצג במלואו על
המסך, ומגיע ל-PDF ולחפיסה (`Presentation.tsx` כבר בנה עבורו סלייד ב-סבב
קודם, וה-PDF route מרנדר את אותו עמוד `/report` בדפדפן headless) — אבל
**מעולם לא הופיע במייל עצמו** (`lib/reporthtml.ts`, `reportEmailHtml`/
`reportEmailText`), שהוא ערוץ המסירה הממשי של הדוח שנרכש
(`app/api/admin/requests/route.ts` בונה את המייל הזה ושולח אותו ללקוח).
לקוח שקיבל את הדוח רק במייל (ולא לחץ "צפייה באתר"/הוריד PDF) מעולם לא ראה
את טווח השווי המוערך — המספר שבגללו משלמים על הדוח מלכתחילה.

נוסף `valuationBlock()` (HTML) + סעיף מקביל בטקסט, בדיוק לפי שני המצבים
שכבר קיימים ב-`ValuationPanel.tsx`: הערכה מלאה (טווח, אמצע, מחיר למ"ר,
הסבר, אזהרת-פיזור-רחב אם יש, וטבלת עד 12 העסקאות שההערכה נשענת עליהן) וגם
המצב "אין די נתונים" (עם נפילה למחיר-למ"ר-אזורי אם יש). אפס מקור נתונים
חדש — כל השדות כבר קיימים על `report.valuation` (`lib/valuation.ts`,
`valuate()`, שרץ תמיד ב-`buildReport`, לא תלוי-tier). אומת ע"י חילוץ
`valuationBlock` (עם התלויות הישירות שלו: `esc`/`section`/`table`/`heDate`/
`hasValuation`) לקובץ עצמאי, קומפילציה עם esbuild (אין node_modules בסנדבוקס
הזה) והרצה ב-Node מול חמישה תרחישים מדומים — ללא valuation, "אין נתונים"
עם/בלי נפילה אזורית, הערכה מלאה עם עסקאות-השוואה+אזהרת-פיזור, והערכה עם
מערך עסקאות ריק — כולם רינדרו HTML תקין וסגור. בדיקת איזון-סוגריים על הקובץ
המלא עברה (414/414/412/412/42/42). תוספת טהורה — 111 שורות חדשות, אף שורה
קיימת לא נגעה. נדחה+נדחף לענף `fix/32-36-nadlan-rpc-audit-0825` (cc715524)
— לא מוזג. System 35 KioskFleet לא נגע, לפי ה-HARD STEERING.

## איך ממשיכים בין סשנים (חשוב!)
- עבוד ב-Claude Code **מקומי** (לא Remote) על התיקייה הזו — הכל נשמר על הדיסק.
- להמשך שיחה אחרונה: `claude --continue`   ·   לבחירת סשן קודם: `claude --resume`
- בסוף כל סשן: עדכן כאן "מצב נוכחי" + "הבא בתור", ובצע commit ל-git.

## פקודות מהירות
```
npm install
npm run dev            # פיתוח מקומי → http://localhost:3000
npm run build          # בנייה לפרודקשן
```
