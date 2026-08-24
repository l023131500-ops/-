import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * events-ai — סוכן ה-AI של האירוע (38-events-gifts, EVENTS_BUILD.md §4).
 *
 * Why an Edge Function: the Anthropic key must never reach a browser, and
 * PostgREST functions cannot make outbound HTTP calls. Same one-copy-to-rotate
 * stance as maatefet-ai: the key is read from core.secrets via
 * more30_secrets_fetch, service_role-only.
 *
 * The agent knows the REAL event: it fetches evg_event_dashboard with the
 * CALLER'S OWN token (RLS applies exactly as in the owner UI) and grounds
 * every draft/summary in that data — no invented facts. Ownership is then
 * re-verified in the database by public.evg_ai_consume() (migration 0141),
 * which also owns the daily cap atomically: dashboard READ access is wider
 * than ownership (hall owners can read events at their hall, 0131), so the
 * DB-side owner check is the real gate, not the dashboard fetch.
 *
 * Four actions mirror the spec item "סוכן AI: ניסוח הזמנות/תזכורות, סיכום
 * אישורי הגעה, זיהוי מי לא ענה":
 * - invite / reminder / thanks: draft a WhatsApp-ready message TEMPLATE that
 *   keeps the message-center placeholders ({שם}, {קישור}, …) literally, so
 *   "שימוש כנוסח" drops it straight into the existing send machinery.
 * - rsvp_summary: a status read-out + prioritized next actions + who has not
 *   answered, computed from real guest rows aggregated server-side here.
 * Everything returned is a draft the owner reviews; nothing typed is stored —
 * only the usage count row.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1500;

const ACTIONS = ["invite", "reminder", "thanks", "rsvp_summary"] as const;
type Action = (typeof ACTIONS)[number];
const TONES: Record<string, string> = {
  warm: "חם ומשפחתי",
  festive: "חגיגי ומרומם",
  formal: "מכובד ורשמי",
  light: "קליל ושמח",
};

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

type Guest = {
  full_name: string;
  phone: string | null;
  group_name: string | null;
  invited_count: number;
  rsvp_status: string;
  rsvp_count: number | null;
  checkin_at: string | null;
  invite_sent_at: string | null;
  reminder_sent_at: string | null;
};
type Dashboard = {
  event: {
    id: string;
    title: string;
    event_type: string;
    event_date: string | null;
    event_time: string | null;
    venue_name: string | null;
    address: string | null;
    description: string | null;
    invite_hosts: string | null;
    invite_message: string | null;
    gift_goal_agorot: number | null;
  } | null;
  guests: Guest[];
  gifts: { amount_agorot: number }[];
};

const TYPE_HE: Record<string, string> = {
  wedding: "חתונה",
  bar_mitzvah: "בר מצווה",
  bat_mitzvah: "בת מצווה",
  brit: "ברית",
  engagement: "אירוסין",
  other: "אירוע",
};

function eventFacts(ev: NonNullable<Dashboard["event"]>): string {
  return [
    `סוג האירוע: ${TYPE_HE[ev.event_type] ?? "אירוע"}`,
    `שם האירוע: ${ev.title}`,
    ev.event_date
      ? `תאריך: ${new Date(ev.event_date + "T00:00").toLocaleDateString("he-IL")}`
      : "תאריך: טרם נקבע",
    ev.event_time ? `שעה: ${ev.event_time}` : "",
    ev.venue_name ? `מקום: ${ev.venue_name}` : "",
    ev.address ? `כתובת: ${ev.address}` : "",
    ev.invite_hosts ? `מי מזמינים: ${ev.invite_hosts}` : "",
    ev.invite_message ? `מילים אישיות שכתבו בעלי האירוע בהזמנה: ${ev.invite_message}` : "",
  ].filter(Boolean).join("\n");
}

// deterministic aggregation — the numbers and the names come from real rows,
// the model only writes them up. Name list is capped to bound the prompt.
const MAX_NAMES = 100;
function rsvpFacts(d: Dashboard): string {
  const guests = d.guests ?? [];
  const souls = (g: Guest) => g.rsvp_status === "yes" ? (g.rsvp_count ?? g.invited_count) : g.invited_count;
  const by = (s: string) => guests.filter((g) => g.rsvp_status === s);
  const yes = by("yes"), no = by("no"), maybe = by("maybe"), pending = by("pending");
  const giftTotal = (d.gifts ?? []).reduce((s, g) => s + g.amount_agorot, 0);

  const groups = new Map<string, { total: number; yes: number; pending: number }>();
  for (const g of guests) {
    const key = g.group_name || "בלי קבוצה";
    const row = groups.get(key) ?? { total: 0, yes: 0, pending: 0 };
    row.total++;
    if (g.rsvp_status === "yes") row.yes++;
    if (g.rsvp_status === "pending") row.pending++;
    groups.set(key, row);
  }

  const pendingNames = pending.slice(0, MAX_NAMES).map((g) => {
    const flags = [
      g.group_name || "בלי קבוצה",
      g.phone ? "יש טלפון" : "אין טלפון",
      g.invite_sent_at ? "קיבל/ה הזמנה" : "טרם נשלחה הזמנה",
      g.reminder_sent_at ? "קיבל/ה תזכורת" : "בלי תזכורת",
    ];
    return `- ${g.full_name} (${flags.join(", ")})`;
  });

  return [
    `סה"כ הזמנות (בתי אב): ${guests.length} · סה"כ נפשות מוזמנות: ${guests.reduce((s, g) => s + g.invited_count, 0)}`,
    `אישרו הגעה: ${yes.length} הזמנות, ${yes.reduce((s, g) => s + souls(g), 0)} נפשות`,
    `לא מגיעים: ${no.length} · אולי: ${maybe.length} · טרם ענו: ${pending.length}`,
    `טרם ענו ועוד לא נשלחה להם הזמנה: ${pending.filter((g) => !g.invite_sent_at).length}`,
    `טרם ענו, קיבלו הזמנה אך לא תזכורת: ${pending.filter((g) => g.invite_sent_at && !g.reminder_sent_at).length}`,
    `טרם ענו וכבר קיבלו תזכורת: ${pending.filter((g) => g.reminder_sent_at).length}`,
    `טרם ענו ואין להם טלפון במערכת: ${pending.filter((g) => !g.phone).length}`,
    `מתנות שנאספו (מצב טסט): ₪${Math.round(giftTotal / 100).toLocaleString("he-IL")}` +
      (d.event?.gift_goal_agorot
        ? ` מתוך יעד ₪${Math.round(d.event.gift_goal_agorot / 100).toLocaleString("he-IL")}`
        : ""),
    "",
    "פילוח לפי קבוצות (קבוצה: סה\"כ הזמנות / אישרו / טרם ענו):",
    ...[...groups.entries()].map(([k, v]) => `- ${k}: ${v.total} / ${v.yes} / ${v.pending}`),
    "",
    pending.length
      ? `רשימת מי שטרם ענו${pending.length > MAX_NAMES ? ` (${MAX_NAMES} הראשונים מתוך ${pending.length})` : ""}:`
      : "כולם ענו — אין ממתינים.",
    ...pendingNames,
  ].join("\n");
}

const SYSTEM_PROMPT = [
  "אתה עוזר הכתיבה והניתוח של 'אירועים ומתנות' — פלטפורמת ניהול אירועים (חתונות, בר/בת מצווה, בריתות) בעברית, בפלטפורמת more30.",
  "המשתמש מולך הוא בעל/ת האירוע. כתוב עברית תקנית, חמה ומכבדת, שמתאימה גם לקהל מסורתי ודתי.",
  "כללים מחייבים:",
  "1. אל תמציא עובדות: השתמש אך ורק בפרטי האירוע ובנתונים שסופקו לך. פרט שחסר — פשוט אל תזכיר אותו.",
  "2. הודעות נשלחות בוואטסאפ דרך מרכז ההודעות של המערכת, שמחליף אוטומטית סימוני-מקום. כשמבקשים ממך נוסח הודעה, שלב את סימוני-המקום האלה בדיוק כפי שהם, עם הסוגריים המסולסלים: {שם} = שם המוזמן, {קישור} = הקישור האישי של המוזמן. אל תמציא סימוני-מקום חדשים ואל תכתוב שם של מוזמן ספציפי.",
  "3. התוצר הוא טיוטה בלבד: בעל האירוע קורא ועורך לפני כל שליחה.",
  "4. השב בטקסט פשוט בלבד (בלי Markdown, בלי כותרות בסימני #), מוכן להעתקה כמו שהוא.",
  "5. אמוג'י — במידה ובטעם, בהתאם לטון המבוקש.",
].join("\n");

function userPrompt(action: Action, d: Dashboard, tone: string, note: string): string {
  const ev = d.event!;
  const toneLine = `טון מבוקש: ${TONES[tone] ?? TONES.warm}.`;
  const noteLine = note ? `בקשה נוספת מבעל האירוע (לכבד אם אפשר): ${note}` : "";
  if (action === "invite") {
    return [
      "נסח הודעת הזמנה אחת לוואטסאפ, לשליחה אישית לכל מוזמן.",
      "חובה: לפתוח בפנייה עם {שם}, ולסיים בשורה שמסבירה שאישור ההגעה, פרטי האירוע וכרטיס הכניסה נמצאים בקישור האישי — ואז {קישור} בשורה משלו.",
      "אורך: עד שמונה שורות קצרות.",
      toneLine, noteLine,
      "פרטי האירוע (להשתמש רק במה שקיים):", eventFacts(ev),
    ].filter(Boolean).join("\n");
  }
  if (action === "reminder") {
    return [
      "נסח הודעת תזכורת קצרה ועדינה לוואטסאפ, למוזמנים שטרם אישרו הגעה.",
      "חובה: לפתוח בפנייה עם {שם}, לא להאשים ולא ללחוץ, ולסיים עם {קישור} בשורה משלו.",
      "אורך: עד חמש שורות קצרות.",
      toneLine, noteLine,
      "פרטי האירוע (להשתמש רק במה שקיים):", eventFacts(ev),
    ].filter(Boolean).join("\n");
  }
  if (action === "thanks") {
    return [
      "נסח הודעת תודה לוואטסאפ לנותני מתנה אחרי האירוע.",
      "חובה: לפתוח בפנייה עם {שם}. אפשר לשלב את {סכום} רק אם זה מרגיש טבעי ומכבד — עדיף בלי. אסור לכלול {קישור}.",
      "אורך: עד חמש שורות קצרות.",
      toneLine, noteLine,
      "פרטי האירוע (להשתמש רק במה שקיים):", eventFacts(ev),
    ].filter(Boolean).join("\n");
  }
  return [
    "לפניך נתוני אישורי ההגעה האמיתיים של האירוע. הפק מהם דוח מצב קצר לבעל האירוע:",
    "1. תמונת מצב בשלושה-ארבעה משפטים (כמה אישרו, כמה ממתינים, איפה זה עומד ביחס לגודל האירוע).",
    "2. שלוש-חמש המלצות פעולה מסודרות לפי עדיפות, מבוססות אך ורק על הנתונים (למשל: למי כדאי לשלוח תזכורת, למי אין טלפון וכדאי להשיג, אילו קבוצות מפגרות מאחור).",
    "3. רשימת מי שטרם ענו, מקובצת לפי קבוצה, עם ציון מי כבר קיבל תזכורת ומי אין לו טלפון.",
    "אל תוסיף שום שם או מספר שלא מופיע בנתונים. אם אין ממתינים — כתוב זאת וברך על ההיענות.",
    noteLine,
    "פרטי האירוע:", eventFacts(ev),
    "",
    "נתוני אישורי ההגעה:", rsvpFacts(d),
  ].filter(Boolean).join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return json(401, { error: "נדרשת התחברות." });

  let body: { event_id?: string; action?: string; tone?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "גוף הבקשה אינו JSON תקין." });
  }

  const action = String(body.action ?? "") as Action;
  if (!ACTIONS.includes(action)) return json(400, { error: "כלי לא מוכר." });
  const eventId = String(body.event_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return json(400, { error: "מזהה אירוע חסר." });
  const tone = String(body.tone ?? "warm");
  // free-text wish is capped: a drafting assistant never needs more, and
  // bounding the prompt bounds the spend per call.
  const note = String(body.note ?? "").trim().slice(0, 300);

  // ── who is calling? the token's own user — this id is what the DB-side
  //    owner check in evg_ai_consume() verifies against the event row.
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${bearer}` },
  });
  if (!userRes.ok) return json(401, { error: "פג תוקף החיבור — יש להתחבר מחדש." });
  const userId = ((await userRes.json()) as { id?: string }).id;
  if (!userId) return json(401, { error: "פג תוקף החיבור — יש להתחבר מחדש." });

  // ── the real event, through the caller's own token (RLS applies) ──
  const dash = await pgRpc("evg_event_dashboard", { p_event_id: eventId }, {
    apikey: ANON_KEY,
    bearer,
  });
  const d = (dash.ok ? dash.data : null) as Dashboard | null;
  if (!d?.event) return json(403, { error: "האירוע לא נמצא או שאינו שלך." });

  // ── spend one unit of today's quota — atomic + owner-verified, DB-owned
  //    (migration 0141). This is the gate that rejects a hall owner who can
  //    read the dashboard but does not own the event.
  const consume = await pgRpc(
    "evg_ai_consume",
    { p_owner_auth_user_id: userId, p_event_id: eventId, p_action: action },
    { apikey: SERVICE_KEY, bearer: SERVICE_KEY },
  );
  if (!consume.ok) {
    const msg = String((consume.data as { message?: string })?.message ?? "");
    if (msg.includes("quota")) {
      return json(429, { error: "מכסת ההכנות היומית נוצלה. המכסה מתחדשת מחר." });
    }
    if (msg.includes("owner")) {
      return json(403, { error: "העוזר זמין לבעל האירוע בלבד." });
    }
    console.error("events-ai consume failed:", consume.status, msg);
    return json(500, { error: "שגיאה פנימית בבדיקת המכסה." });
  }
  const quota = consume.data as { used: number; cap: number };

  // ── the Anthropic key, from the one copy in core.secrets (scoped rows
  //    override global ones; rows arrive globals-first, so last write wins).
  const secrets = await pgRpc(
    "more30_secrets_fetch",
    { p_scope: "events" },
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
    console.error("events-ai: ANTHROPIC_API_KEY missing from core.secrets");
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
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt(action, d, tone, note) }],
    }),
  });

  if (!aiRes.ok) {
    console.error("events-ai anthropic error:", aiRes.status, await aiRes.text());
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
