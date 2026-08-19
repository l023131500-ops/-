/**
 * יכולות ה-AI הטקסטואליות למנוע המודעות:
 *   - copy:     יצירת קופי בעברית (Claude / Anthropic ישיר, Node fetch דרך custom-cred proxy)
 *   - concepts: הצעת קונספטים מתוך בריף (Claude)
 *
 * אימות: השרת רץ עם api_credentials=["custom-cred:api.anthropic.com"]. המפתח מוזרק
 * אוטומטית ע"י פרוקסי ה-HTTPS (undici ProxyAgent מוגדר ב-index.ts). נשמר גם לאחר פרסום.
 *
 * יצירת רקעי AI (תמונות) מטופלת ישירות ב-server/gemini.ts (Gemini / Nano Banana Pro).
 */

import { proxyFetch } from "./proxyFetch";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const TEXT_MODEL = process.env.ANTHROPIC_TEXT_MODEL || "claude-sonnet-4-5-20250929";

async function claude(system: string, user: string, maxTokens = 1500): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };
  if (process.env.ANTHROPIC_API_KEY) headers["x-api-key"] = process.env.ANTHROPIC_API_KEY;
  const res = await proxyFetch(ANTHROPIC_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: TEXT_MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json: any = await res.json();
  return (json.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
}

function extractJson(text: string): any {
  let t = text.trim();
  if (t.startsWith("```")) {
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) t = m[1].trim();
  }
  for (const pair of [["{", "}"], ["[", "]"]] as const) {
    const [o, c] = pair;
    const i = t.indexOf(o);
    const j = t.lastIndexOf(c);
    if (i !== -1 && j > i) {
      try { return JSON.parse(t.slice(i, j + 1)); } catch { /* try next */ }
    }
  }
  return JSON.parse(t);
}

export interface AiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  detail?: string;
}

export interface CopyVariant {
  title?: string;
  subtitle?: string;
  body?: string;
  cta?: string;
  [k: string]: unknown;
}

export async function generateCopy(input: {
  category?: string;
  message?: string;
  audience?: string;
  mood?: string[];
  fields?: Record<string, unknown>;
  variants?: number;
}): Promise<AiResult<{ variants: CopyVariant[] }>> {
  const n = input.variants || 3;
  const system =
    'אתה קופירייטר בכיר המתמחה בפרסום לציבור החרדי בישראל. ' +
    'אתה כותב עברית מדויקת, מכובדת ונאמנה למקורות, בשפה שמתאימה לקהל תורני. ' +
    'אתה מכיר את ניסוחי ההזמנות, שיעורי התורה, אירועים, שמחות, והכרזות קהילתיות. ' +
    'אתה משתמש בביטויים כמו \'בס"ד\', \'לזכות\', \'מעמד\', \'התוועדות\', כשמתאים. ' +
    'אינך ממציא עובדות (תאריכים/שמות/מקומות) — אם חסר מידע תשאיר שדה ריק. ' +
    'החזר אך ורק JSON תקין ללא טקסט נוסף.';
  const known = JSON.stringify(input.fields || {});
  const user =
    `קטגוריה: ${input.category || "כללי"}\n` +
    `קהל יעד: ${input.audience || "כללי"}\n` +
    `אווירה: ${(input.mood || []).join(", ") || "מכובד"}\n` +
    `המסר/רעיון של הלקוח: ${input.message || "(לא נמסר)"}\n` +
    `שדות קיימים (השלם/שפר בהתאם): ${known}\n\n` +
    `כתוב ${n} וריאציות קופי למודעה. כל וריאציה כוללת: ` +
    "title (כותרת ראשית קצרה ועוצמתית), subtitle (משפט משנה), " +
    "body (גוף קצר 1-3 שורות), cta (קריאה לפעולה אם רלוונטי). " +
    'החזר JSON במבנה: {"variants":[{"title":"","subtitle":"","body":"","cta":""}]}';
  try {
    const out = await claude(system, user, 1800);
    const data = extractJson(out);
    const variants = Array.isArray(data) ? data : (data.variants || [data]);
    return { ok: true, data: { variants } };
  } catch (e: any) {
    return { ok: false, error: "שגיאה ביצירת קופי", detail: String(e?.message || e) };
  }
}

export interface ConceptOut {
  presetKey?: string;
  title?: string;
  angle?: string;
  why?: string;
  palette?: string;
  copyHint?: string;
}

export interface DesignCritiqueIssue {
  severity: "low" | "medium" | "high";
  area: string;
  note: string;
}

export interface DesignCritique {
  score: number; // 0-100, איכות עיצובית כוללת
  strengths: string[];
  issues: DesignCritiqueIssue[];
  suggestions: string[];
}

/**
 * מבקר QA — בודק טיוטת מודעה קיימת (שכבות + רקע, בלי base64 של תמונות) לפני
 * פרסום: היררכיה חזותית, קונטרסט/קריאות, עומס/איזון, עקביות טיפוגרפית/צבעונית.
 * זהו שלב "הביקורת" בלולאת טיוטה→ביקורת→ליטוש (CHECKLIST/graphics.md #13) —
 * מציג משוב ללקוח/מעצב לקריאה; לא מבצע שינוי אוטומטי בשכבות.
 */
export async function critiqueDesign(input: {
  category?: string;
  style?: string;
  width: number;
  height: number;
  background: Record<string, unknown>;
  layers: Array<Record<string, unknown>>;
  clientNotes?: string;
}): Promise<AiResult<DesignCritique>> {
  const system =
    "אתה מנהל אמנותי ומבקר QA בכיר במשרד פרסום חרדי מוביל, בוחן טיוטת מודעה לפני אישור סופי. " +
    "אתה בודק היררכיה חזותית, קונטרסט/קריאות טקסט מול רקע, עומס/איזון בין שכבות, עקביות טיפוגרפית " +
    "וצבעונית, וניצול נכון של מרחב הקנבס. אתה כותב בעברית מכובדת, ישירה וקונקרטית — " +
    "כל הערה מתייחסת לשכבה/תחום ספציפי, לא כלל כללי. אינך ממציא עובדות. החזר אך ורק JSON תקין.";
  const clientNotesLine = input.clientNotes?.trim()
    ? `\nהערת לקוח שנשמרה על הטיוטה הזו (תעדף בדיקה/התייחסות להערה הזו לפני כל דבר אחר): "${input.clientNotes.trim()}"\n`
    : "";
  const user =
    `קטגוריה: ${input.category || "כללי"}\n` +
    `סגנון: ${input.style || "כללי"}\n` +
    `גודל קנבס: ${input.width}x${input.height}\n` +
    `רקע: ${JSON.stringify(input.background)}\n` +
    `שכבות (${input.layers.length}, בלי תוכן תמונות בפועל — רק מיקום/גודל/סגנון): ` +
    `${JSON.stringify(input.layers)}\n` +
    clientNotesLine +
    "\nבחן את הטיוטה הזו כמבקר QA בכיר לפני שהיא יוצאת ללקוח. החזר JSON: " +
    '{"score": מספר 0-100 (איכות עיצובית כוללת),' +
    '"strengths": ["חוזקה קונקרטית אחת או יותר"],' +
    '"issues": [{"severity":"low|medium|high","area":"שם/סוג השכבה או תחום","note":"הבעיה הקונקרטית"}],' +
    '"suggestions": ["הצעת שיפור קונקרטית וניתנת-לביצוע"]}. ' +
    "אם הטיוטה טובה — score גבוה ו-issues מעטים/ריקים, לא לחפש בעיות מלאכותיות.";
  try {
    const out = await claude(system, user, 2000);
    const data = extractJson(out);
    const critique: DesignCritique = {
      score: typeof data.score === "number" ? Math.max(0, Math.min(100, data.score)) : 70,
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      issues: Array.isArray(data.issues) ? data.issues : [],
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    };
    return { ok: true, data: critique };
  } catch (e: any) {
    return { ok: false, error: "שגיאה בביקורת AI", detail: String(e?.message || e) };
  }
}

export async function generateConcepts(input: {
  category?: string;
  audience?: string;
  mood?: string[];
  message?: string;
  colorPref?: string;
  refNotes?: string;
  presets?: Array<{ key: string; name: string; studio: string; mood: string[] }>;
}): Promise<AiResult<{ understanding: string; concepts: ConceptOut[] }>> {
  const presetsMin = (input.presets || []).slice(0, 12).map((p) => ({ key: p.key, name: p.name, studio: p.studio, mood: p.mood }));
  const system =
    "אתה מנהל אמנותי ומנהל לקוח בכיר במשרד פרסום חרדי מוביל (ברמת בולטון-פוטנציאל / סטודיו 7). " +
    "אתה מקבל בריף ראשוני ומנסח הבנת-רעיון קצרה, ואז מציע כיווני עיצוב (קונספטים) " +
    "כשכל קונספט קשור לאחד מהפריסטים הנתונים. אתה מסביר בעברית מכובדת מדוע כל כיוון מתאים ללקוח. " +
    "אל תמציא עובדות. החזר אך ורק JSON תקין.";
  const user =
    `בריף:\n` +
    `- קטגוריה: ${input.category || ""}\n` +
    `- קהל יעד: ${input.audience || ""}\n` +
    `- אווירה: ${(input.mood || []).join(", ")}\n` +
    `- המסר: ${input.message || ""}\n` +
    `- העדפת צבע: ${input.colorPref || ""}\n` +
    `- רפרנסים שאהב: ${input.refNotes || ""}\n\n` +
    `פריסטים זמינים (בחר מהם presetKey): ${JSON.stringify(presetsMin)}\n\n` +
    'החזר JSON: {"understanding":"פסקה קצרה שמראה שהבנת בדיוק מה הלקוח רוצה",' +
    '"concepts":[{"presetKey":"","title":"שם הקונספט","angle":"הזווית הרעיונית",' +
    '"why":"למה מתאים ללקוח","palette":"תיאור צבעוני קצר","copyHint":"רמז לקופי"}]}. ' +
    "הצע 3-4 קונספטים מגוונים (משרדים/סגנונות שונים).";
  try {
    const out = await claude(system, user, 2000);
    const data = extractJson(out);
    return { ok: true, data: { understanding: data.understanding || "", concepts: data.concepts || [] } };
  } catch (e: any) {
    return { ok: false, error: "שגיאה בהצעת קונספטים", detail: String(e?.message || e) };
  }
}
