// bkalot-clone-intake — שכבה 1 של שכפול בקלות: תעבורת ה-HTTP של קליטת פנייה
// core.issues #223 (המשך ישיר של #222 / מיגרציה 0058).
//
// מה היה: public.bkalot_clone_intake(jsonb) קיימת ונבדקה, אבל EXECUTE שלה ניתן
// ל-service_role בלבד — anon ו-authenticated נמדדו false. כלומר אין שום דרך
// לקרוא לה מדפדפן. הפונקציה הזו היא הדרך היחידה, והיא דקה בכוונה: היא לא
// מחליטה כלום על תוכן הפנייה. כל האימות, הכיווץ לפי הסוג וחיבור הזכויות
// יושבים במסד (0058), ולכן אין כאן עותק שני של הכללים שיכול להסתעף ממנו.
//
// למה rpc אל public ולא כתיבה ישירה לטבלאות: הסכמה bkalot_clone אינה חשופה
// ל-PostgREST כלל (רק public ו-graphql_public הן), ולכן גם service_role אינו
// יכול להגיע אליה דרך /rest/v1. הפונקציה ב-public היא הנתיב.
//
// למה fetch ולא supabase-js: בקשה אחת, בלי סשן ובלי realtime. ייבוא ספרייה
// שלמה כאן היה מוסיף תלות שצריך לתחזק בשביל POST יחיד.
//
// 🚫 מצב טסט: הפונקציה במסד מחזירה queued:false ואינה נוגעת ב-outbound_queue.
//    שום הודעה אינה יוצאת החוצה בצעד הזה.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// cases.raw שומר את ה-payload המלא, ולכן גוף גדול אינו רק תעבורה אלא שורה
// שנשארת במסד. 16KB הוא מעל ומעבר לטופס הזה (הארוך בשדותיו הוא note).
const MAX_BODY = 16 * 1024;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-max-age": "86400",
};

// כל תשובה — גם דחייה — היא JSON עם error כקוד, כדי שהטופס יתרגם לעברית בצד
// הלקוח ולא יקרא נוסח שהשרת המציא (#223 סעיף 3).
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed", allowed: ["POST"] }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    // אין מפתח = אין נתיב כתיבה. עדיף להיכשל רועש מלהחזיר ok על שום כתיבה.
    return json({ ok: false, error: "server_misconfigured" }, 500);
  }

  const rawBody = await req.text();
  // בייטים ולא תווים: הטופס בעברית, וכל תו בו הוא שני בייטים ב-UTF-8. מדידה
  // באורך המחרוזת הייתה מכפילה בפועל את התקרה שנרשמה כאן.
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY) {
    return json({ ok: false, error: "body_too_large", max_bytes: MAX_BODY }, 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody || "null");
  } catch {
    return json({ ok: false, error: "body_not_json" }, 400);
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return json({ ok: false, error: "body_not_object" }, 400);
  }

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/bkalot_clone_intake`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ p: payload }),
    });
  } catch (e) {
    return json({ ok: false, error: "rpc_unreachable", detail: String(e) }, 502);
  }

  const text = await res.text();
  if (!res.ok) {
    // כשל מסד אמיתי (הפונקציה חסרה, הרשאה נשללה, חריגה שלא נתפסה). הוא נשלח
    // כפי שהוא ולא מתורגם — נוסח שהומצא כאן היה מסתיר את הסיבה מהבא.
    return json({ ok: false, error: "rpc_failed", status: res.status, detail: text.slice(0, 500) }, 502);
  }

  // ההצלחה והדחייה כאחת חוזרות ב-200: דחיית אימות היא תוצאה תקינה של בקשה
  // תקינה, והלקוח קורא ok/error מהגוף בכל מקרה. כך non-2xx נשאר סימן יחיד
  // ל"משהו שאינו הטופס" — וזה גם מה שמחזיק ברשת הזו, שכותבת מחדש סטטוסי
  // שגיאה של Supabase ל-400.
  return new Response(text, {
    status: 200,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });
});
