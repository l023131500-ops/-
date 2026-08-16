// bkalot-clone-admin — שכבה 2 של שכפול בקלות: כתובת ה-HTTP של הניהול
// core.issues #224 סעיף 3 (המשך ישיר של מיגרציות 0060 ו-0061).
//
// מה היה: שש פונקציות קיימות ונבדקו במסד — שתי קריאה (0060) וארבע כניסה (0061)
// — ול-EXECUTE שלהן service_role בלבד. כלומר השער נבנה, נמדד ב-25 בדיקות,
// ולא הייתה ולו כתובת אחת שדפדפן יכול לפנות אליה. זו הכתובת.
//
// הפונקציה דקה בכוונה, כמו bkalot-clone-intake: היא אינה מחליטה דבר על זהות
// ואינה קוראת טבלה. הנעילה, השוואת הזמנים, פקיעת הסשן והדפדוף יושבים במסד,
// ולכן אין כאן עותק שני של הכללים שיכול להסתעף מהם. מה שכן נמצא כאן ואינו
// יכול לשבת במסד: הרכבת השער — session מאומת לפני כל קריאה, ולא במקביל לה.
//
// ⚠️ הכרעה: bkalot_clone_admin_create אינה חשופה כאן, בכוונה ובמפורש. פונקציה
//    שיוצרת משתמש ניהול ואין לפניה שער היא בדיוק החור שה-revoke של 0061 סגר;
//    כתובת HTTP אליה הייתה פותחת אותו מחדש מכיוון אחר. יצירת מנהל נעשית
//    בקריאת SQL ישירה בלבד.
//
// ⚠️ הטוקן בכותרת x-admin-token ולא ב-Authorization — סטייה מהמקור, וכפויה:
//    verify_jwt=true גורם ל-gateway של Supabase לפרסר את Authorization כ-JWT,
//    והטוקן שלנו הוא 32 בייט אטומים ולא JWT. שם, הבקשה נדחית ב-401 לפני
//    שהקוד הזה רץ בכלל. Authorization נשאר למפתח ה-anon (ציבורי מעצם הגדרתו),
//    והזהות שלנו בכותרת נפרדת. הדפוס עצמו — טוקן אטום מ-state בזיכרון, בלי
//    localStorage ובלי cookies — נשמר.
//
// ── v2 (שכבה 3, לבנה 2) ──────────────────────────────────────────────────────
// נוסף נתיב render. מיגרציה 0063 בנתה את bkalot_clone_render ומדדה אותה,
// ול-EXECUTE שלה service_role בלבד — כלומר הרנדרר קיים ואין ולו כתובת אחת
// שמסך הניהול יכול לפנות אליה. זו הכתובת.
//
// ⚠️ זהו הנתיב הראשון כאן שכותב. חמשת הקודמים קוראים ומאמתים בלבד, ולכן הוא
//    יושב מאחורי אותו שער בדיוק ולא לפניו — ומעבר לזה אין לו הרשאה משלו:
//    bkalot_clone_render היא service_role בלבד, והדרך היחידה להגיע אליה היא
//    דרך הקוד הזה.
//
// 🚫 מצב טסט: אין כאן שום מסלול יוצא. render מפיק שורה ב-documents ותו לא —
//    queue_id נשאר null, ואין נגיעה ב-outbound_queue, ב-delivery_log ולא בשום
//    ערוץ שליחה. הכתיבה היחידה של הפונקציה הזו היא המסמך עצמו.
//
// ── v3 (שכבה 3, לבנה 3) ──────────────────────────────────────────────────────
// נוסף נתיב document. render כותב גוף — 5,223 תווי HTML נמדדו בשורה — ואין ולו
// נתיב אחד שקורא אותו בחזרה: bkalot_clone_admin_case מחזירה מטא-דאטה בלבד,
// במפורש (0060 שורה 215). 0064 בנתה את bkalot_clone_admin_document, שוב
// service_role בלבד. זו הכתובת שלה, והיא קריאה בלבד — הנתיב היחיד שכותב כאן
// נשאר render.
//
// ── v4 (שכבה 3, לבנת השליחה הראשונה) ─────────────────────────────────────────
// נוסף נתיב queue. 0067 בנתה את bkalot_clone_queue ומדדה אותה במסד — יעד ברשימת
// הבדיקה, יעד שאינו בה, בלי הסכמה, לחיצה שנייה — ושוב service_role בלבד. כלומר
// המסמך יכול להיכנס לתור ואין ולו כתובת אחת שמסך הניהול יכול לפנות אליה. זו
// הכתובת, וזה בדיוק החצי הראשון של #234.
//
// ⚠️ זהו הנתיב השני כאן שכותב, והראשון שכותב לתוך מנגנון השליחה. לכן הוא יושב
//    מאחורי אותו שער בדיוק כמו render — לא לפניו ולא לצידו — ואין לו הרשאה
//    משלו: bkalot_clone_queue היא service_role בלבד, והדרך היחידה להגיע אליה
//    היא דרך הקוד הזה.
//
// ⚠️ אין כאן ולו ארגומנט אחד שנוגע ב-mode, ב-status או ב-to_address. הנמען נגזר
//    במסד מאיש הקשר של הפנייה, mode='test' קשיח שם, ורשימת ההיתר נבדקת שם.
//    שכפול של אחד מהשלושה כאן היה עותק שני של כלל בטיחות שיכול להסתעף בשקט —
//    וההסתעפות הזו היא מייל שיוצא לאדם אמיתי.
//
// 🚫 מצב טסט: הנתיב הזה מכניס לתור ואינו שולח. אין כאן קריאה יוצאת אחת — לא
//    מייל, לא webhook ולא ערוץ. השורה נכנסת ל-outbound_queue ונשארת שם.
//
// ── v5 (שכבה 3, לבנת המעבד) ──────────────────────────────────────────────────
// נוסף נתיב dispatch. 0070 בנתה את bkalot_clone_dispatch ומדדה אותה במסד —
// מסלול מלא, לחיצה שנייה, שורה חסומה, mode=live, יעד שהוסר, וקלט פגום — ושוב
// service_role בלבד. כלומר לשכפול יש מעבד ואין ולו כתובת אחת שמסך הניהול יכול
// לפנות אליה, בדיוק כמו queue לפני v4. זו הכתובת, וזה #234 סעיף 2.
//
// ⚠️ זהו הנתיב השלישי כאן שכותב, והראשון שמשנה מצב של שורה שכבר בתור. לכן הוא
//    יושב מאחורי אותו שער בדיוק כמו render ו-queue, ואין לו הרשאה משלו:
//    bkalot_clone_dispatch היא service_role בלבד, והדרך היחידה להגיע אליה היא
//    דרך הקוד הזה.
//
// ⚠️ אין כאן ולו ארגומנט אחד שנוגע ב-mode, ב-status או ב-to_address — אותה
//    הכרעה כמו ב-queue ומאותה סיבה. שלושת השומרים של 0070 (app_key, mode=test,
//    היעד ברשימת הבדיקה ברגע העיבוד) יושבים במסד בלבד; עותק שני שלהם כאן היה
//    כלל בטיחות שיכול להסתעף בשקט, וההסתעפות הזו היא מייל שיוצא לאדם אמיתי.
//
// 🚫 מצב טסט: הנתיב הזה מעבד ואינו שולח. 0070 מסמנת skipped ולא sent, sent_at
//    נשאר null, ואין בה net.http, pg_net, Resend ולא קריאה יוצאת אחת. שליחה
//    אמיתית תדרוש מיגרציה, לא פרמטר — וגם לא כתובת HTTP.
//
// ── v6 (שכבה 3, לבנת הכרעת האדם) ─────────────────────────────────────────────
// נוסף נתיב set-status. 0072 בנתה את bkalot_clone_admin_set_status ומדדה אותה
// במסד — תשע דחיות, ארבעה מסלולים, updated_at שזז על שינוי וקפוא על לחיצה
// חוזרת — ושוב service_role בלבד. כלומר סגירת פנייה קיימת כפונקציה ואין ולו
// כתובת אחת שמסך הניהול יכול לפנות אליה, בדיוק כמו queue לפני v4 ו-dispatch
// לפני v5. זו הכתובת.
//
// ⚠️ שם הנתיב במקף — set-status — ולא setStatus ולא status. הראשון היה הסגנון
//    היחיד כאן שאינו kebab, והשני היה נקרא כמו קריאת קריאה ("מה הסטטוס") בעוד
//    שזה נתיב שכותב. שם שנקרא כמו קריאה על נתיב שכותב הוא בדיוק הטעות שגורמת
//    למישהו לקרוא לו כדי «לבדוק».
//
// ⚠️ זהו הנתיב הרביעי כאן שכותב, והראשון שכותב הכרעה של אדם ולא תוצאה של
//    מכונה. לכן הוא יושב מאחורי אותו שער בדיוק כמו render/queue/dispatch, ואין
//    לו הרשאה משלו: bkalot_clone_admin_set_status היא service_role בלבד.
//
// ⚠️ אין כאן ולו בדיקה אחת על ערך ה-status. רשימת ההיתר (in_progress/closed/
//    rejected), הסירוב ל-sent ול-new וההבחנה בין status_unknown ל-
//    status_not_settable יושבות במסד בלבד. עותק שני של הרשימה כאן היה נשאר
//    מאחור ברגע ש-'sent' יהפוך לניתן־להשגה — כלומר מסך שמסרב לערך שהמסד כבר
//    מקבל, או גרוע מזה, מעביר ערך שהמסד כבר אינו מקבל.
//
// 🚫 מצב טסט: הנתיב הזה נוגע בעמודה status של bkalot_clone.cases ותו לא. אין
//    בו נגיעה ב-outbound_queue, ב-delivery_log ולא בשום ערוץ שליחה, ואין ולו
//    קריאה יוצאת אחת. 0072 דוחה 'sent' במפורש, ולכן גם אין דרך לסמן פנייה
//    כנשלחה בלי שנשלחה.
//
// ── v7 (שכבה 3, הזהות עוברת מהשער אל ההכרעה) ─────────────────────────────────
// 0076 בנתה את decided_by/decided_at על cases ונתנה ל-set_status ארגומנט שני,
// p_admin_id. v6 קוראת עם ארגומנט אחד, ולכן כל לחיצה בייצור כותבת decided_at
// מלא ו-decided_by null — «אדם הכריע ואיננו יודעים מי». זו הפעימה שמעבירה את
// הזהות: היא כבר יושבת כאן, ב-g.admin שחזר מהשער, ומוחזרת ללקוח מאז v6 בלי
// שאיש כותב אותה.
//
// ⚠️ הזהות נלקחת מ-g.admin בלבד — מתשובת bkalot_clone_admin_session על הטוקן
//    שבכותרת — ולעולם לא מהגוף. זו בדיוק הכרעה (1) של 0076: הגוף מועבר ל-p
//    כפי שהוא ובכוונה בלי סינון מפתחות, ולכן מפתח admin_id בתוכו מגיע מהדפדפן.
//    לו הייתה הזהות נקראת משם, כל מחזיק טוקן היה חותם הכרעה בשם מנהל אחר —
//    ורישום זהות שניתן לזיוף גרוע מהיעדר רישום, כי הוא נראה בדיוק כמו האמת.
//    p_admin_id הוא ארגומנט שני ולא מפתח ב-p, ואובייקט הארגומנטים נבנה כאן.
//
// ⚠️ ערך שאינו מספר שלם בטוח נשלח כ-null ואינו נשלח כפי שהוא. השער מחזיר
//    bigint, ומספר שגדול מ-Number.MAX_SAFE_INTEGER כבר עבר עיגול ב-JSON.parse
//    לפני שהקוד הזה רואה אותו — כלומר הוא היה נכתב לעמודה כזהות של מנהל אחר.
//    null אומר «איננו יודעים מי», וזה מצב שהסכמה יודעת לתאר (0076 הכרעה 2);
//    מזהה שגוי אומר שקר שאי אפשר להבחין בו.

// ── v8 (שכבה 3, הזהות עוברת מהשער אל ההפקה) ──────────────────────────────────
// 0083 בנתה את produced_by על documents ונתנה ל-render ארגומנט שני, p_admin_id.
// v7 קוראת עם ארגומנט אחד, ולכן כל לחיצה על «הפק» בייצור כותבת גוף מלא
// ו-produced_by null — «מסמך הופק ואיננו יודעים מי הפיק אותו». אותו פיצול בדיוק
// כמו 0076 → v7, ואותה העברה: הזהות כבר יושבת כאן, ב-g.admin שחזר מהשער.
//
// ⚠️ שלוש השורות של v7 מועתקות כפי שהן ולא מופשטות לפונקציה משותפת. הן זהות
//    היום, אבל שני הנתיבים אינם חייבים להישאר זהים — set_status רושם מי הכריע
//    ו-render רושם מי הפיק — והפשטה משותפת הופכת שינוי באחד לשינוי שקט בשני.
//
// ⚠️ אין כאן coalesce, וזו סטייה מכוונת מ-0076: הפקה חוזרת דורסת את
//    produced_by בערך שהתקבל, כולל null, מפני ש-render כותבת גוף חדש בכל
//    קריאה — וייחוס הגוף של מנהל שני למנהל הראשון גרוע מ-null. ההכרעה יושבת
//    ב-0083 (הכרעה 5), לא כאן; הקוד הזה מעביר ואינו מחליט.

// ── v9 (שכבה 3, מונח החיפוש עובר מהרשימה אל הפנייה) ──────────────────────────
// 0097 נתנה ל-bkalot_clone_admin_case ארגומנט שני, p_q, ומסמנת בו על כל שורת
// יומן אם היא זו שנשאה את המונח (note_matched). v8 קוראת {p_id: id} ותו לא,
// ולכן המונח שהוקלד ברשימה אינו מגיע אל המסד והשדה חוזר false בכל שורה — נמדד
// מעל HTTP מול השער הפרוס עצמו לפני השינוי הזה: q='המס הקודמת' על פנייה שבה
// שורת יומן נושאת בדיוק את המילים האלה החזירה false בשלוש השורות. אותו פיצול
// בדיוק כמו 0076 → v7 ו-0083 → v8: המסד יודע, השער אינו מעביר.
//
// ⚠️ סדר: המסד קודם והשער אחריו, ולא הפוך. 0097 נפרסה לבדה מפני שיש לה ברירת
//    מחדל — v8 המשיכה לקרוא {p_id} ולקבל בדיוק את מה שקיבלה קודם. ההפך היה
//    מכבה כל מסך פנייה בייצור: {p_id, p_q} אל חתימה שיש בה p_id בלבד מחזיר
//    404 מ-PostgREST, ולכן קוד השער הזה אינו יכול להיפרס אחורה מעבר ל-0097.
//
// ⚠️ הכרעה (1): המפתח הוא q — אותו שם בדיוק ששולחת הרשימה אל cases — ולא
//    search ולא note_q. הקורא כאן אינו מחפש מחדש; זו אותה שאלה שהמשיכה מהשורה
//    שעליה לחץ, ושם שני לאותו דבר היה הופך את המסך לשני מקומות שיכולים
//    להסתעף. אין כאן ברירת מחדל ואין ערך שמומצא: גוף בלי q הוא מסך שנפתח בלי
//    חיפוש, וזה בדיוק המצב שבו 0097 מחזירה false בכל השורות והמסך שותק.
//
// ⚠️ הכרעה (2): p_q הוא ארגומנט שני ואינו מפתח בגוף — כמו p_admin_id ומאותה
//    סיבה מבנית: bkalot_clone_admin_case מקבלת סקלרים (bigint, text) ולא p
//    jsonb, בשונה מ-cases/render/document/queue/dispatch. זו גם הסיבה
//    שהבדיקה על id יושבת כאן ולא במסד, כפי שנכתב מעל.
//
// ⚠️ הכרעה (3): רק string עובר; כל השאר null. הארגומנט הוא text, ואובייקט או
//    מערך בגוף היו מחזירים 400 מ-PostgREST — והרשת הזו כותבת מחדש סטטוסי
//    שגיאה ל-400 ממילא, כלומר הוא לא היה ניתן להבחנה מנפילת שער. זו בדיוק
//    ההכרעה של idRaw שמעליו, על אותו נתיב ומאותו טעם.
//
// ⚠️ הכרעה (4): אין כאן trim, אין nullif ואין escape. 0097 עושה את שלושתם
//    בעצמה — btrim+nullif על המונח, ושלוש ההחלפות של 0094 על '\', '%' ו-'_'
//    לפני ה-ilike — ועותק שני שלהם כאן היה גם מסתעף בשקט וגם מכפיל את
//    ההימלטות, כלומר הופך חיפוש של '%' לחיפוש של '\%'.
//
// 🚫 מצב טסט: הנתיב הזה קורא ואינו כותב. ארגומנט אחד נוסף לפונקציית קריאה,
//    ואין כאן נגיעה ב-outbound_queue, ב-delivery_log ולא בשום ערוץ שליחה.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// גופי הבקשה כאן קטנים (מייל+סיסמה, או מסננים) — אין payload שנשמר למסד כמו
// cases.raw בקליטה, ולכן התקרה נמוכה יותר מזו של intake.
const MAX_BODY = 4 * 1024;

// כתובת האתר שנכנסת למסמך נקבעת כאן ואינה מתקבלת מהגוף, גם לא ממנהל מחובר.
// {{siteUrl}} נשתל בתוך href בגוף ה-HTML; ה-escape של 0063 מונע יציאה מהמאפיין
// אבל אינו מגביל סכימה, ולכן ערך שמגיע מבחוץ יכול לשתול קישור זר במסמך שאדם
// יקרא — ובהמשך יישלח. מקור אחד, בקוד.
const SITE_URL = "https://more30.com/bkalot-studio";

// x-admin-token חייב להופיע כאן: preflight שאינו מכריז עליו יגרום לדפדפן
// לחסום את הבקשה האמיתית — והבדיקה משורת הפקודה, שאינה שולחת preflight,
// הייתה עוברת בירוק. זו בדיוק המלכודת שנמדדה ב-#223 על ה-OPTIONS.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-admin-token",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-max-age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });
}

// קריאת rpc אחת אל public. bkalot_clone אינה חשופה ל-PostgREST כלל, ולכן גם
// service_role אינו מגיע לטבלאות דרך /rest/v1 — הפונקציות ב-public הן הנתיב.
async function rpc(name: string, args: Record<string, unknown>): Promise<
  { ok: true; body: unknown } | { ok: false; res: Response }
> {
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
    });
  } catch (e) {
    return { ok: false, res: json({ ok: false, error: "rpc_unreachable", detail: String(e) }, 502) };
  }
  const text = await res.text();
  if (!res.ok) {
    // כשל מסד אמיתי נשלח כפי שהוא ואינו מתורגם — נוסח שהומצא כאן היה מסתיר
    // את הסיבה מהבא.
    return {
      ok: false,
      res: json({ ok: false, error: "rpc_failed", status: res.status, detail: text.slice(0, 500) }, 502),
    };
  }
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, res: json({ ok: false, error: "rpc_bad_json", detail: text.slice(0, 200) }, 502) };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed", allowed: ["POST"] }, 405);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: "server_misconfigured" }, 500);
  }

  const ROUTES = ["login", "session", "logout", "cases", "case", "render", "document", "queue", "dispatch", "set-status"];
  const seg = new URL(req.url).pathname.split("/").filter(Boolean);
  const action = seg[seg.length - 1] ?? "";
  if (!ROUTES.includes(action)) {
    return json({ ok: false, error: "route_not_found", allowed: ROUTES }, 404);
  }

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY) {
    return json({ ok: false, error: "body_too_large", max_bytes: MAX_BODY }, 413);
  }
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody || "{}");
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json({ ok: false, error: "body_not_object" }, 400);
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "body_not_json" }, 400);
  }

  if (action === "login") {
    // ip ו-user_agent נלקחים מהבקשה ולא מהגוף. לקוח שהיה יכול לכתוב אותם
    // בעצמו היה הופך את שורת ה-audit לעדות שהוא חיבר — עדיף בלי מקור מאשר
    // מקור שקרי, ולכן מה שהגיע בגוף נדרס.
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const ua = (req.headers.get("user-agent") ?? "").slice(0, 300);
    const out = await rpc("bkalot_clone_admin_login", {
      p: { ...payload, ip: ip || null, user_agent: ua || null },
    });
    return out.ok ? json(out.body) : out.res;
  }

  // מכאן והלאה — הכל מאחורי השער. הטוקן נקרא מהכותרת בלבד ולא מהגוף: טוקן
  // שיושב בגוף היה נכתב ללוגים של כל שכבת ביניים שמדפיסה בקשות.
  const token = (req.headers.get("x-admin-token") ?? "").trim();

  if (action === "logout") {
    // חוזר ok:true גם על טוקן שאינו קיים (אידמפוטנטי, 0061), ולכן אינו זקוק
    // לשער — ואסור שיהיה לו: יציאה שנכשלת על סשן שכבר פג היא מסך תקוע.
    const out = await rpc("bkalot_clone_admin_logout", { p_token: token });
    return out.ok ? json(out.body) : out.res;
  }

  const gate = await rpc("bkalot_clone_admin_session", { p_token: token });
  if (!gate.ok) return gate.res;
  const g = gate.body as { ok?: boolean; error?: string; admin?: unknown };
  if (g?.ok !== true) {
    // 401 ולא 200: כאן, בניגוד לדחיית אימות בטופס הציבורי, אין «בקשה תקינה
    // שנדחתה לגופה» — אין זהות, ואין תשובה לתת.
    return json({ ok: false, error: g?.error ?? "invalid_session" }, 401);
  }

  if (action === "session") return json(g);

  if (action === "cases") {
    const out = await rpc("bkalot_clone_admin_cases", { p: payload });
    if (!out.ok) return out.res;
    // הזהות מוחזרת עם הרשימה כדי שמסך הניהול לא יידרש לקריאה שנייה רק כדי
    // לדעת מי מחובר.
    return json({ ...(out.body as Record<string, unknown>), admin: g.admin });
  }

  if (action === "render") {
    // case_id ו-template_key עוברים כפי שהם. כאן, בניגוד ל-case, אין סיבה
    // לשכפל את הבדיקה: הארגומנט הוא jsonb ולא bigint, ולכן שום ערך אינו מפיל
    // את PostgREST על casting — ו-0063 כבר מחזיר case_id_required על מה שאינו
    // ספרות. עותק שני של הכלל כאן היה יכול להסתעף ממנו בשקט.
    //
    // הזהות אינה נוסעת בתוך p — ראה ⚠️ של v7 ו-v8. site_url כבר מוכיח שהגוף
    // הזה אינו נאמן לדפדפן, ולכן דווקא כאן היה מתקבל על הדעת להוסיף לו עוד
    // מפתח; אבל site_url נכתב מעל מה שהגיע ו-produced_by היה נקרא ממנו.
    const adminId = (g.admin as { id?: unknown } | null | undefined)?.id;
    const p_admin_id = typeof adminId === "number" && Number.isSafeInteger(adminId)
      ? adminId
      : null;
    const out = await rpc("bkalot_clone_render", {
      p: { ...payload, site_url: SITE_URL },
      p_admin_id,
    });
    if (!out.ok) return out.res;
    // הזהות מוחזרת עם התשובה כמו בכל נתיב שמאחורי השער. מ-v8, כמו ב-set-status
    // מ-v7, היא אינה רק מי שביקש: produced_by נכתב בשורה עצמה, וה-admin שחוזר
    // כאן הוא מי שנכתב לתוכה זה עתה — אותו ערך בדיוק, משני צידי הקריאה.
    return json({ ...(out.body as Record<string, unknown>), admin: g.admin });
  }

  if (action === "document") {
    // id עובר כפי שהוא, מאותה סיבה בדיוק כמו ב-render ולא מהעדפה: הארגומנט
    // jsonb ולא bigint, ולכן שום ערך אינו מפיל את PostgREST על casting —
    // ו-0064 כבר מחזיר document_id_required על מה שאינו ספרות. הבדיקה של case
    // למטה קיימת רק כי שם הארגומנט bigint.
    const out = await rpc("bkalot_clone_admin_document", { p: payload });
    if (!out.ok) return out.res;
    return json({ ...(out.body as Record<string, unknown>), admin: g.admin });
  }

  if (action === "queue") {
    // document_id עובר כפי שהוא, מאותה סיבה בדיוק כמו ב-document: הארגומנט
    // jsonb ולא bigint, ו-0067 כבר מחזיר document_id_required על מה שאינו
    // ספרות ו-document_not_found על 25 ספרות שאינן נכנסות ל-bigint.
    //
    // הגוף מועבר כפי שהוא ובכוונה בלי סינון מפתחות: ל-0067 אין שום מפתח קלט
    // מלבד document_id/id, וכל השאר נופל שם. סינון כאן היה נראה כמו הגנה
    // ומוסיף מקום שני שצריך לעדכן כשהפונקציה תקבל מפתח נוסף.
    const out = await rpc("bkalot_clone_queue", { p: payload });
    if (!out.ok) return out.res;
    return json({ ...(out.body as Record<string, unknown>), admin: g.admin });
  }

  if (action === "dispatch") {
    // queue_id עובר כפי שהוא, מאותה סיבה בדיוק כמו ב-queue ולא מהעדפה:
    // הארגומנט jsonb ולא bigint, ולכן שום ערך אינו מפיל את PostgREST על
    // casting — ו-0070 כבר מחזיר queue_id_required על מה שאינו ספרות
    // ו-queue_row_not_found על 25 ספרות שאינן נכנסות ל-bigint.
    //
    // הגוף מועבר כפי שהוא ובכוונה בלי סינון מפתחות, כמו ב-queue: ל-0070 אין
    // שום מפתח קלט מלבד queue_id/id, וכל השאר נופל שם.
    const out = await rpc("bkalot_clone_dispatch", { p: payload });
    if (!out.ok) return out.res;
    return json({ ...(out.body as Record<string, unknown>), admin: g.admin });
  }

  if (action === "set-status") {
    // case_id ו-status עוברים כפי שהם, מאותה סיבה בדיוק כמו ב-queue וב-dispatch:
    // הארגומנט jsonb ולא bigint, ולכן שום ערך אינו מפיל את PostgREST על casting
    // — ו-0072 כבר מחזירה case_id_required על מה שאינו ספרות ו-case_not_found
    // על 25 ספרות שאינן נכנסות ל-bigint.
    //
    // הגוף מועבר כפי שהוא ובכוונה בלי סינון מפתחות, כמו בשני הנתיבים שלפניו:
    // ל-0072 אין שום מפתח קלט מלבד case_id/id ו-status, וכל השאר נופל שם.
    // ומכיוון שכך — ראה ⚠️ של v7 — הזהות אינה יכולה לנסוע בתוכו.
    const adminId = (g.admin as { id?: unknown } | null | undefined)?.id;
    const p_admin_id = typeof adminId === "number" && Number.isSafeInteger(adminId)
      ? adminId
      : null;
    const out = await rpc("bkalot_clone_admin_set_status", { p: payload, p_admin_id });
    if (!out.ok) return out.res;
    // הזהות מוחזרת עם התשובה כמו בכל נתיב שמאחורי השער. מ-v7 היא כבר אינה
    // התיעוד היחיד: decided_by נכתב בשורה עצמה, וה-admin שחוזר כאן הוא מי
    // שנכתב לתוכה זה עתה — אותו ערך בדיוק, משני צידי הקריאה.
    return json({ ...(out.body as Record<string, unknown>), admin: g.admin });
  }

  // case — מזהה מספרי בלבד. בדיקה כאן ולא במסד, כי rpc עם טיפוס שגוי מחזיר
  // 400 מ-PostgREST, והרשת הזו כותבת מחדש סטטוסי שגיאה ל-400 ממילא — כלומר
  // הוא לא היה ניתן להבחנה מנפילת שער.
  const idRaw = payload["id"];
  const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
  if (idRaw === undefined || idRaw === null || !Number.isSafeInteger(id)) {
    return json({ ok: false, error: "case_id_required" }, 200);
  }
  // v9 — הכרעות (1)–(4) למעלה. q הוא אותו מפתח שהרשימה כבר שולחת, מחרוזת בלבד,
  // והוא נוסע כארגומנט שני ולא בתוך גוף — כמו p_admin_id וכמו p_id שמעליו.
  const qRaw = payload["q"];
  const p_q = typeof qRaw === "string" ? qRaw : null;
  const out = await rpc("bkalot_clone_admin_case", { p_id: id, p_q });
  if (!out.ok) return out.res;
  return json({ ...(out.body as Record<string, unknown>), admin: g.admin });
});
