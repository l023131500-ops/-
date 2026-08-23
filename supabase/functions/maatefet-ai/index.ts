import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * maatefet-ai — סוכן AI למדריך/ה (drafting assistant for instructors).
 *
 * Why an Edge Function: the Anthropic key must never reach a browser, and
 * PostgREST functions cannot make outbound HTTP calls. This function is the
 * only place the key is read (from core.secrets via more30_secrets_fetch,
 * service_role-only — same one-copy-to-rotate stance as docs/SECRETS.md).
 *
 * verify_jwt is ON (unlike maatefet-ics, whose caller is a calendar poller):
 * the gateway rejects anything without a valid Supabase JWT. On top of that
 * this function re-checks, with the CALLER'S OWN token against maatefet_me(),
 * that the caller is a verified instructor on an aal2 (2FA-passed) session —
 * the same gate every maatefet screen enforces. The daily cost cap is not
 * enforced here at all: public.maatefet_ai_consume() (migration 0130) owns
 * the count atomically in the database, so no way of calling this function
 * can spend past the cap.
 *
 * The three actions mirror the spec's "סוכן AI למדריך" item: lesson-plan
 * draft adapted to segment/community, respectful reminder phrasing, and
 * meeting-notes summary with action items. Everything returned is a DRAFT
 * the instructor reviews; the prompts forbid halachic rulings and diagnoses.
 * Nothing the instructor types is stored — only the usage count row.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1500;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...cors },
  });
}

async function pgRpc(
  fn: string,
  args: Record<string, unknown>,
  auth: { apikey: string; bearer: string },
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: auth.apikey,
      Authorization: `Bearer ${auth.bearer}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body (e.g. void RPC) is fine */
  }
  return { ok: res.ok, status: res.status, data };
}

// field caps: a drafting assistant never needs more than this, and bounding
// the prompt bounds the spend per call.
const LIMITS: Record<string, Record<string, number>> = {
  lesson_plan: { topic: 300, community: 120, level: 300 },
  reminder: { about: 500, recipient_name: 80 },
  summary: { notes: 6000 },
};

function cleanInput(
  action: string,
  raw: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, cap] of Object.entries(LIMITS[action])) {
    const val = typeof raw[key] === "string" ? (raw[key] as string).trim() : "";
    out[key] = val.slice(0, cap);
  }
  return out;
}

const SEGMENT_HE: Record<string, string> = {
  kallah: "מדריכת כלות",
  chatan: "מדריך חתנים",
};
const COUPLE_SIDE: Record<string, string> = { kallah: "כלה", chatan: "חתן" };

function systemPrompt(segment: string): string {
  return [
    "אתה עוזר כתיבה מקצועי בתוך 'מעטפת' — פלטפורמה לליווי מדריכי חתנים ומדריכות כלות בציבור הדתי בישראל.",
    `המשתמש/ת מולך: ${SEGMENT_HE[segment] ?? "מדריך/ה"}.`,
    "כתוב עברית תקנית, בטון מכובד, חם וצנוע, המתאים לקהל דתי וחרדי.",
    "כללים מחייבים:",
    "1. אינך פוסק הלכה. בכל נקודה שדורשת הכרעה הלכתית כתוב במפורש 'לבירור אצל רב/פוסק' — לעולם אל תכריע בעצמך.",
    "2. אל תמציא עובדות, שמות, מקורות או ציטוטים. אם חסר מידע — כתוב 'להשלמה על ידי המדריך/ה'.",
    "3. אינך מאבחן מצב רפואי, נפשי או זוגי, ואינך נותן ייעוץ טיפולי.",
    "4. התוצר הוא טיוטה בלבד: המדריך/ה קורא/ת ועורך/ת אותה לפני כל שימוש מול זוג.",
    "5. השב בטקסט פשוט (בלי Markdown), מוכן להעתקה כמו שהוא.",
  ].join("\n");
}

function userPrompt(
  action: string,
  input: Record<string, string>,
  segment: string,
  durationMinutes: number,
): string {
  const side = COUPLE_SIDE[segment] ?? "חתן/כלה";
  if (action === "lesson_plan") {
    return [
      `בנה טיוטת מערך שיעור להדרכת ${side}.`,
      `נושא: ${input.topic}`,
      input.community ? `עדה/קהילה: ${input.community}` : "",
      input.level ? `רקע הזוג: ${input.level}` : "",
      `משך: ${durationMinutes} דקות.`,
      "מבנה נדרש: מטרות השיעור, פתיחה, גוף השיעור (נקודות עיקריות עם חלוקת זמנים), שאלות לשיחה, סיכום, ומשימה קטנה להמשך.",
    ].filter(Boolean).join("\n");
  }
  if (action === "reminder") {
    return [
      `נסח שתי גרסאות קצרות (עד שלושה משפטים כל אחת) של הודעת תזכורת מכובדת ל${side}, מתאימה לשליחה בוואטסאפ.`,
      `נושא התזכורת: ${input.about}`,
      input.recipient_name ? `שם הנמען/ת: ${input.recipient_name}` : "פנה/י בלשון נעימה בלי שם פרטי.",
      "סמן את הגרסאות 'גרסה 1:' ו'גרסה 2:'.",
    ].filter(Boolean).join("\n");
  }
  return [
    "לפניך רישום חופשי של מפגש הדרכה. הפק ממנו:",
    "1. תקציר קצר של המפגש (עד חמישה משפטים).",
    "2. פריטי פעולה למדריך/ה.",
    `3. פריטי פעולה ל${side}/לזוג.`,
    "4. נושאים מוצעים למפגש הבא.",
    "אל תוסיף שום מידע שאינו מופיע ברישום. אם סעיף ריק — כתוב 'לא עלה במפגש'.",
    "הרישום:",
    "---",
    input.notes,
    "---",
  ].join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return json(401, { error: "נדרשת התחברות." });

  let body: { action?: string; input?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "גוף הבקשה אינו JSON תקין." });
  }

  const action = String(body.action ?? "");
  if (!(action in LIMITS)) return json(400, { error: "כלי לא מוכר." });
  const rawInput = body.input && typeof body.input === "object" ? body.input : {};
  const input = cleanInput(action, rawInput as Record<string, unknown>);

  const required = action === "lesson_plan" ? "topic" : action === "reminder" ? "about" : "notes";
  if (!input[required]) return json(400, { error: "חסר שדה חובה." });

  // duration is the one non-text field; clamp to the same 15–240 range as
  // maatefet_suggest_slots (0124).
  const durationMinutes = Math.min(240, Math.max(15,
    parseInt(String((rawInput as Record<string, unknown>).duration_minutes ?? "45"), 10) || 45));

  // ── who is calling? — the caller's own token, so RLS + the verified/aal2
  //    gates in maatefet_me() apply exactly as they do on every screen.
  const me = await pgRpc("maatefet_me", {}, { apikey: ANON_KEY, bearer });
  const meData = (me.ok ? me.data : null) as
    | { instructor?: { id: string; status: string; segment: string; full_name: string } | null; aal?: string }
    | null;
  const ins = meData?.instructor;
  if (!ins || ins.status !== "verified") {
    return json(403, { error: "העוזר זמין למדריך/ה מאומת/ת בלבד." });
  }
  if (meData?.aal !== "aal2") {
    return json(403, { error: "נדרש אימות דו-שלבי (2FA) פעיל בחיבור הנוכחי." });
  }

  // ── spend one unit of today's quota — atomic, DB-owned (migration 0130).
  const consume = await pgRpc(
    "maatefet_ai_consume",
    { p_instructor_id: ins.id, p_action: action },
    { apikey: SERVICE_KEY, bearer: SERVICE_KEY },
  );
  if (!consume.ok) {
    const msg = String((consume.data as { message?: string })?.message ?? "");
    if (msg.includes("quota")) {
      return json(429, { error: "מכסת ההכנות היומית נוצלה. המכסה מתחדשת מחר." });
    }
    console.error("maatefet-ai consume failed:", consume.status, msg);
    return json(500, { error: "שגיאה פנימית בבדיקת המכסה." });
  }
  const quota = consume.data as { used: number; cap: number };

  // ── the Anthropic key, from the one copy in core.secrets (scoped rows
  //    override global ones; rows arrive globals-first, so last write wins).
  const secrets = await pgRpc(
    "more30_secrets_fetch",
    { p_scope: "maatefet" },
    { apikey: SERVICE_KEY, bearer: SERVICE_KEY },
  );
  const secretMap: Record<string, string> = {};
  for (const row of (secrets.ok ? (secrets.data as { name: string; value: string }[]) : [])) {
    secretMap[row.name] = row.value;
  }
  // BOM-strip: a U+FEFF inside a key breaks header construction far from the
  // cause (docs/SECRETS.md, the claude-opus-5 incident in system 26).
  const apiKey = (secretMap["ANTHROPIC_API_KEY"] ?? "").replace(/﻿/g, "").trim();
  if (!apiKey) {
    console.error("maatefet-ai: ANTHROPIC_API_KEY missing from core.secrets");
    return json(500, { error: "שירות ה-AI אינו מוגדר כרגע. פנו למנהל המערכת." });
  }

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt(ins.segment),
      messages: [{
        role: "user",
        content: userPrompt(action, input, ins.segment, durationMinutes),
      }],
    }),
  });

  if (!aiRes.ok) {
    console.error("maatefet-ai anthropic error:", aiRes.status, await aiRes.text());
    return json(502, { error: "שירות ה-AI לא זמין כרגע. נסו שוב בעוד רגע." });
  }

  const aiData = await aiRes.json() as { content: { type: string; text?: string }[] };
  const text = (aiData.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) return json(502, { error: "שירות ה-AI החזיר תשובה ריקה. נסו שוב." });

  return json(200, { text, used: quota.used, cap: quota.cap });
});
