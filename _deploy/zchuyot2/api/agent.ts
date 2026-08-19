/**
 * "רייטס-אייג'נט" — סוכן מיצוי הזכויות של מערכת 22, בפריסה תחת more30.com/zchuyot.
 *
 * למה לא ה-Edge Function המקורי: הוא דורש `LOVABLE_API_KEY` (שער ה-AI של
 * Lovable) שאינו זמין בפריסה הזו. הפונקציה כאן שומרת על אותו חוזה בדיוק —
 * מקבלת `{ messages }` ומחזירה SSE בפורמט של OpenAI
 * (`data: {"choices":[{"delta":{"content":"…"}}]}`) — כך שקוד הלקוח שקורא
 * את הזרם לא השתנה כלל. רק ספק ה-AI הוחלף ל-Anthropic.
 *
 * מאגר הזכויות נקרא מהפרויקט המקורי (trerolyv) עם המפתח הציבורי — אותה
 * הרשאת קריאה שיש ללקוח עצמו. אין כאן service_role.
 */

const SUPABASE_URL = (process.env.RIGHTS_SUPABASE_URL ?? "").replace(/﻿/g, "").trim();
const SUPABASE_KEY = (process.env.RIGHTS_SUPABASE_KEY ?? "").replace(/﻿/g, "").trim();
const AI_KEY = (process.env.ANTHROPIC_API_KEY ?? "").replace(/﻿/g, "").trim();
const AI_MODEL = (process.env.AI_MODEL ?? "claude-opus-5").replace(/﻿/g, "").trim();

export const config = { maxDuration: 120 };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIELDS = [
  "topic_name", "category", "plain_description", "eligibility_criteria",
  "financial_potential", "required_documents", "how_to_apply",
  "accompanying_benefit", "bureaucratic_pitfalls", "target_audience", "service_link",
].join(",");

/** מטמון בין קריאות באותה instance — המאגר משתנה נדיר, והבנייה שלו יקרה. */
let contextCache: { text: string; count: number; at: number } | null = null;

async function rightsContext(): Promise<{ text: string; count: number }> {
  if (contextCache && Date.now() - contextCache.at < 10 * 60_000) return contextCache;

  const url = `${SUPABASE_URL}/rest/v1/rights_reference?select=${FIELDS}&order=topic_number&limit=1000`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`rights_reference ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const rows = (await res.json()) as Record<string, string | null>[];

  const text = rows
    .map((r) =>
      [
        `נושא: ${r.topic_name ?? ""} | קטגוריה: ${r.category ?? ""}`,
        r.plain_description ? `תיאור: ${r.plain_description}` : "",
        r.eligibility_criteria ? `תנאי זכאות: ${r.eligibility_criteria}` : "",
        r.financial_potential ? `פוטנציאל כספי: ${r.financial_potential}` : "",
        r.target_audience ? `קהל יעד: ${r.target_audience}` : "",
        r.required_documents ? `מסמכים נדרשים: ${r.required_documents}` : "",
        r.how_to_apply ? `דרכי ביצוע: ${r.how_to_apply}` : "",
        r.accompanying_benefit ? `הטבות נלוות: ${r.accompanying_benefit}` : "",
        r.bureaucratic_pitfalls ? `מוקשים ביורוקרטיים: ${r.bureaucratic_pitfalls}` : "",
        r.service_link ? `קישור: ${r.service_link}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n---\n");

  contextCache = { text, count: rows.length, at: Date.now() };
  return contextCache;
}

/** אותו system prompt של ה-Edge Function המקורי, כדי לשמור על אופי הסוכן. */
function systemPrompt(ctx: string): string {
  return `אתה נציג שירות אנושי ומקצועי של ארגון "בקלות" - מיזם חברתי למיצוי זכויות בישראל.
דבר בעברית טבעית, חמה ומקצועית. אל תדבר כמו בוט - דבר כמו נציג אמיתי שרוצה לעזור.
השתמש באמוג'י במידה. היה ממוקד ותכליתי.

הנה כל מאגר הזכויות שלנו:
${ctx}

כללים חשובים:
1. ענה רק על בסיס המידע שיש לך במאגר. אם אין לך מידע - אמור זאת בכנות והפנה ליצירת קשר בטלפון 02-3131500.
2. כשהלקוח מתאר מצב - נתח אותו וחפש זכויות רלוונטיות ממש מהמאגר.
3. תן מידע מדויק: תנאי זכאות, מסמכים, דרכי הגשה.
4. אם יש כמה זכויות רלוונטיות - פרט את כולן.
5. הצע תמיד לבדוק עוד זכויות או ליצור קשר לליווי אישי.
6. אל תמציא מידע שלא קיים במאגר.
7. ליצירת קשר: טלפון 02-3131500, מייל L023131500@gmail.com, עמדות נדרים פלוס.`;
}

const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;
const delta = (content: string) => sse({ choices: [{ delta: { content } }] });

export default async function handler(req: any, res: any) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "RIGHTS_SUPABASE_URL/KEY חסרים בפריסה" });
  }
  if (!AI_KEY) return res.status(503).json({ error: "ANTHROPIC_API_KEY אינו מוגדר בפריסה" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) return res.status(400).json({ error: "חסרות הודעות" });

  let ctx: { text: string; count: number };
  try {
    ctx = await rightsContext();
  } catch (e) {
    return res.status(502).json({ error: e instanceof Error ? e.message : "טעינת המאגר נכשלה" });
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": AI_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 2000,
      // שיחת שירות מתוך מאגר נתון — ניסוח, לא הסקה. חשיבה דלוקה רק מאריכה.
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: systemPrompt(ctx.text),
      messages: messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? ""),
      })),
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = upstream.ok ? "no body" : (await upstream.text()).slice(0, 300);
    console.error("[rights-agent] anthropic error", upstream.status, detail);
    return res.status(502).json({ error: "שגיאה בשירות AI" });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  // תרגום זרם Anthropic → פורמט ה-delta של OpenAI, שהלקוח כבר יודע לקרוא.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).replace(/\r$/, "");
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim());
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
            res.write(delta(ev.delta.text));
          }
        } catch {
          /* שורה חלקית — תושלם בקריאה הבאה */
        }
      }
    }
    res.write("data: [DONE]\n\n");
  } catch (e) {
    console.error("[rights-agent] stream error", e);
    res.write(delta("\n\nמצטער, השיחה נקטעה. נסו שוב או התקשרו ל-02-3131500 💚"));
    res.write("data: [DONE]\n\n");
  }
  res.end();
}
