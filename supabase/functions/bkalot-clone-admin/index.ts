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

  const ROUTES = ["login", "session", "logout", "cases", "case", "render", "document", "queue", "dispatch"];
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
    const out = await rpc("bkalot_clone_render", {
      p: { ...payload, site_url: SITE_URL },
    });
    if (!out.ok) return out.res;
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

  // case — מזהה מספרי בלבד. בדיקה כאן ולא במסד, כי rpc עם טיפוס שגוי מחזיר
  // 400 מ-PostgREST, והרשת הזו כותבת מחדש סטטוסי שגיאה ל-400 ממילא — כלומר
  // הוא לא היה ניתן להבחנה מנפילת שער.
  const idRaw = payload["id"];
  const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
  if (idRaw === undefined || idRaw === null || !Number.isSafeInteger(id)) {
    return json({ ok: false, error: "case_id_required" }, 200);
  }
  const out = await rpc("bkalot_clone_admin_case", { p_id: id });
  if (!out.ok) return out.res;
  return json({ ...(out.body as Record<string, unknown>), admin: g.admin });
});
