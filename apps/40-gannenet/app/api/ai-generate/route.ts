import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { callerFromRequest, GENERATE_AUTH_REQUIRED_MSG } from "@/lib/require-user";

export const runtime = "nodejs";
// A generation is one long upstream call with nothing to stream to the browser
// until it parses, so the only thing standing between it and a platform
// timeout is this ceiling plus the effort setting on the request below.
export const maxDuration = 60;

const SYSTEM_PROMPT = `אתה עוזר פדגוגי מומחה לגיל הרך עבור רשת גני ילדים בציבור החרדי והדתי בישראל. הקפד על הכללים הבאים בכל תגובה:
(1) שפה ומונחים — השתמש אך ורק בשפה חינוכית, חמה, מכבדת ובעלת גוון יהודי־תורני, בהתייחסות לפרשת השבוע, מועדי ישראל ומידות טובות בגובה עיני הילד.
(2) התאמה גילאית — התאם את רמת ההסברים, אורך הטקסטים ואופי הפעילויות בדיוק לשכבת הגיל המבוקשת (מעון / טרום־חובה / חובה).
(3) כשרות ויזואלית ותוכנית — אין לכלול תכנים או הנחיות עיצוב שאינם הולמים את ערכי החינוך החרדי; ההנחיות ליצירה ולציורים יהיו נקיות, צנועות וממוקדות בלמידה חווייתית.
(4) פלט — החזר תמיד JSON תקין בלבד בפורמט:
{ "title": "", "ageGroup": "", "instructions": "", "contentElements": ["", ""], "designHints": ["", ""] }
ללא טקסט חופשי נוסף מחוץ ל-JSON.`;

// The model is asked for bare JSON but often wraps it in a ```json fence, or
// puts a sentence before it. Without this the whole raw string ended up in
// `instructions` and the teacher read the JSON.
function extractJson(text: string): any | null {
  const trimmed = (text || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  for (const candidate of [fenced?.[1], trimmed]) {
    if (!candidate) continue;
    try { return JSON.parse(candidate); } catch {}
    const open = candidate.indexOf("{");
    const close = candidate.lastIndexOf("}");
    if (open !== -1 && close > open) {
      try { return JSON.parse(candidate.slice(open, close + 1)); } catch {}
    }
  }
  return null;
}

// The page renders contentElements/designHints with .map(); a model that
// returns a string instead of an array would throw on render.
function asList(value: any): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string" && v.trim());
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export async function POST(req: NextRequest) {
  // לפני קריאת הגוף ולפני כל דבר אחר, מאותו נימוק כמו ב-POST /api/catalog: מה
  // שיושב מעבר לשורה הזאת הוא קריאה בתשלום ל-Anthropic במפתח שלנו, ועד כה כל
  // קורא באינטרנט שידע את הכתובת יכול היה להפעיל אותה — בלי חשבון, בלי שם,
  // ובלי תקרה. הצפייה במדף ובמערכי השיעור נשארת פתוחה לכולן; רק ההוצאה נגדרת.
  const caller = await callerFromRequest(req);
  if (!caller) {
    return NextResponse.json({ error: GENERATE_AUTH_REQUIRED_MSG, authRequired: true }, { status: 401 });
  }

  try {
    const { topic, ageGroup, style } = await req.json();
    if (!topic) return NextResponse.json({ error: "חסר נושא" }, { status: 400 });

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return NextResponse.json({
        notConnected: true,
        title: `דף משימה: ${topic}`,
        ageGroup: ageGroup || "טרום־חובה",
        instructions: "כדי להפעיל יצירה אמיתית בזמן אמת, יש להזין מפתח ANTHROPIC_API_KEY במשתני הסביבה. זהו תצוגת דוגמה של מבנה הפלט.",
        contentElements: [`פתיחה בנושא "${topic}"`, "3 שאלות התאמה מותאמות לגיל", "משימת צביעה נקייה", "דקלום קצר בחרוזים"],
        designHints: ["כותרת מעוצבת למעלה", "קווים נקיים לגזירה", "אלמנטים גרפיים צנועים בלבד"],
      });
    }

    const client = new Anthropic({ apiKey: key });
    const request = {
      // claude-3-5-sonnet-latest was retired; the API answered every request
      // with 404 not_found_error. On this model thinking is on by default and
      // max_tokens bounds thinking + text together, so 1500 would truncate.
      model: "claude-opus-5",
      max_tokens: 16000,
      // Writing one worksheet from a fully specified brief is not an
      // intelligence-sensitive task, and at the default effort (high) it spent
      // ~72 s thinking — past any serverless function limit. `output_config` is
      // GA on the API but postdates the vendored SDK's types (0.27.3); the SDK
      // serialises this object as-is, so the field reaches the API and the cast
      // below is only there to satisfy the compiler.
      output_config: { effort: "low" },
      // Thinking stays on. Measured against the same three topics it costs
      // almost nothing here — thinking off ran 41.2/37.3/32.8 s against
      // 37.1/59.1 s with it on — because what this route pays for is writing
      // ~2 KB of menuqad Hebrew, not reasoning. Turning it off would buy a few
      // seconds and cost the documented risk of internal XML tags leaking into
      // the answer, so it is not worth it. See STATUS.md for the next lever.
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `צור דף משימה. נושא: ${topic}. קבוצת גיל: ${ageGroup || "טרום־חובה"}. סוג פעילות: ${style || "דף עבודה"}.` }],
    };
    const msg = await client.messages.create(request as unknown as Anthropic.MessageCreateParamsNonStreaming);
    const text = msg.content.map((c: any) => (c.type === "text" ? c.text : "")).join("");
    const parsed = extractJson(text);
    const data = parsed
      ? {
          title: parsed.title || `דף משימה: ${topic}`,
          ageGroup: parsed.ageGroup || ageGroup || "טרום־חובה",
          instructions: typeof parsed.instructions === "string" ? parsed.instructions : "",
          contentElements: asList(parsed.contentElements),
          designHints: asList(parsed.designHints),
        }
      : { title: `דף משימה: ${topic}`, ageGroup: ageGroup || "טרום־חובה", instructions: text, contentElements: [], designHints: [] };
    return NextResponse.json(data);
  } catch (e: any) {
    // Anthropic SDK errors carry a status; pass it through so the page can tell
    // "try again in a moment" apart from "this will never work".
    const status = typeof e?.status === "number" ? e.status : 500;
    // Upstream messages can be a whole JSON body (a filtering proxy's block
    // page, for instance) — keep enough to diagnose, not a wall of text.
    const raw = String(e?.message || "").replace(/\s+/g, " ").trim();
    const detail = raw.length > 160 ? raw.slice(0, 160) + "…" : raw;
    const message =
      status === 429 ? "מנוע ה-AI עמוס כרגע. נסי שוב בעוד רגע."
      : status === 401 || status === 403 ? "מפתח ה-AI אינו תקף. יש לפנות לניהול."
      : status >= 500 ? "מנוע ה-AI אינו זמין כרגע. נסי שוב בעוד רגע."
      : "יצירת הדף נכשלה.";
    return NextResponse.json({ error: detail ? `${message} (${detail})` : message }, { status });
  }
}
