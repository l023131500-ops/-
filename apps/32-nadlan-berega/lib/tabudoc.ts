// ==== ניתוח נסח טאבו ====
//
// המפרט: כפתור "העלאת נסח טאבו" וכפתור "ניתוח טאבו" שקורא את הנסח, מחלץ בעלות,
// שעבודים והערות אזהרה, ומצרף לדוח לפי דירה / כניסה / בניין.
//
// למה קריאה במודל ולא פרסר: נסח טאבו אינו טופס אחיד. יש נסחים דיגיטליים, יש
// סרוקים, המבנה שונה בין לשכות רישום, וטבלאות "בעלויות" ו"משכנתאות" מופיעות
// בסדר ובניסוח שונים. פרסר קבוע היה שובר על כל נסח שלא ראינו. במקום להוסיף
// תלות של חילוץ טקסט, ה-PDF נשלח כמו שהוא למודל שקורא גם סרוקים.
//
// ⚠️ שלושה כללים שהמודול הזה מחויב להם:
// 1. אין ניחוש. שדה שלא נקרא מהנסח נכנס ל-`unreadable` ולא מושלם מהקשר. נסח
//    טאבו הוא מסמך משפטי, ו"בעלים משוער" הוא נזק ולא נתון.
// 2. אין ניתוח בלי מפתח AI. בלעדיו המסמך נשמר, והניהול אומר במפורש שהניתוח
//    דורש מפתח — ולא מציג "אין שעבודים".
// 3. הנסח עצמו לא נשלח ללקוח ולא נשמר בתשובה — רק מה שחולץ ממנו.

import type { TabuAnalysis } from './requests';
import { env, envSet } from './env';

const PROVIDER = process.env.AI_PROVIDER ?? 'anthropic';
const MODEL = process.env.AI_MODEL ?? 'claude-3-5-sonnet-latest';

export function tabuAnalysisConfigured(): boolean {
  return envSet('AI_API_KEY') && PROVIDER === 'anthropic';
}

const PROMPT = [
  'לפניך נסח רישום מקרקעין (נסח טאבו) מישראל. חלץ ממנו את הנתונים המשפטיים.',
  '',
  'כללים מחייבים:',
  '· אל תמציא ואל תשלים מהקשר. שדה שאינו כתוב בנסח במפורש — הוסף את שמו למערך unreadable.',
  '· העתק שמות, סכומים ומספרים **בדיוק** כפי שהם מופיעים, כולל ניסוח עברי.',
  '· "הערת אזהרה" היא לא משכנתה. אל תערבב ביניהן.',
  '· אם הנסח מרוכז וכולל כמה תתי-חלקות, חלץ את מה שמשותף לבניין, וציין ב-summary',
  '  שזהו נסח מרוכז וכמה תתי-חלקות מופיעות בו.',
  '· אם הנסח מרוכז וכולל כמה תתי-חלקות/קומות, מלא גם את perFloorRights: פירוט קצר',
  '  (קומה/תת-חלקה + מי רשום עליה + שעבוד אם יש) לכל יחידה שמופיעה בנסח בנפרד.',
  '  אם הנסח הוא של דירה בודדת — perFloorRights יכול להישאר מערך ריק.',
  '· summary: שלוש עד חמש שורות בעברית מדוברת, מה שקונה צריך לדעת מהנסח הזה.',
  '',
  'החזר JSON יחיד בלבד, בלי טקסט לפניו ואחריו, במבנה הזה:',
  '{',
  '  "owners": [{"name": "", "share": null, "note": null}],',
  '  "mortgages": [{"holder": "", "amount": null, "note": null}],',
  '  "cautionNotes": [{"kind": "", "inFavourOf": null, "note": null}],',
  '  "leases": [{"holder": "", "until": null, "note": null}],',
  '  "otherEncumbrances": [],',
  '  "perFloorRights": [{"floor": null, "tatHelka": null, "summary": ""}],',
  '  "parcelArea": null, "subParcelArea": null, "sharedAreas": null,',
  '  "extractDate": null,',
  '  "identifiedGush": null, "identifiedHelka": null, "identifiedTatHelka": null,',
  '  "unreadable": [],',
  '  "summary": ""',
  '}',
].join('\n');

const EMPTY: TabuAnalysis = {
  owners: [],
  mortgages: [],
  cautionNotes: [],
  leases: [],
  otherEncumbrances: [],
  perFloorRights: [],
  parcelArea: null,
  subParcelArea: null,
  sharedAreas: null,
  extractDate: null,
  identifiedGush: null,
  identifiedHelka: null,
  identifiedTatHelka: null,
  unreadable: [],
  summary: '',
};

/** חילוץ JSON מתשובת מודל, גם כשהוא עטוף בגדר קוד או בטקסט. */
function parseJson(text: string): any | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function asString(v: unknown): string | null {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s && s.toLowerCase() !== 'null' ? s : null;
}

function normalize(raw: any): TabuAnalysis {
  return {
    owners: asArray<any>(raw?.owners)
      .map((o) => ({
        name: asString(o?.name) ?? '',
        share: asString(o?.share),
        note: asString(o?.note),
      }))
      .filter((o) => o.name),
    mortgages: asArray<any>(raw?.mortgages)
      .map((m) => ({
        holder: asString(m?.holder) ?? '',
        amount: asString(m?.amount),
        note: asString(m?.note),
      }))
      .filter((m) => m.holder),
    cautionNotes: asArray<any>(raw?.cautionNotes)
      .map((c) => ({
        kind: asString(c?.kind) ?? '',
        inFavourOf: asString(c?.inFavourOf),
        note: asString(c?.note),
      }))
      .filter((c) => c.kind),
    leases: asArray<any>(raw?.leases)
      .map((l) => ({
        holder: asString(l?.holder) ?? '',
        until: asString(l?.until),
        note: asString(l?.note),
      }))
      .filter((l) => l.holder),
    otherEncumbrances: asArray<unknown>(raw?.otherEncumbrances)
      .map((v) => asString(v))
      .filter((v): v is string => !!v),
    perFloorRights: asArray<any>(raw?.perFloorRights)
      .map((f) => ({
        floor: asString(f?.floor),
        tatHelka: asString(f?.tatHelka),
        summary: asString(f?.summary) ?? '',
      }))
      .filter((f) => f.summary),
    parcelArea: asString(raw?.parcelArea),
    subParcelArea: asString(raw?.subParcelArea),
    sharedAreas: asString(raw?.sharedAreas),
    extractDate: asString(raw?.extractDate),
    identifiedGush: asString(raw?.identifiedGush),
    identifiedHelka: asString(raw?.identifiedHelka),
    identifiedTatHelka: asString(raw?.identifiedTatHelka),
    unreadable: asArray<unknown>(raw?.unreadable)
      .map((v) => asString(v))
      .filter((v): v is string => !!v),
    summary: asString(raw?.summary) ?? '',
  };
}

async function callAnthropic(body: Record<string, unknown>): Promise<{ ok: boolean; text: string; error: string | null }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env('AI_API_KEY') as string,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, text: '', error: json?.error?.message ?? `Anthropic HTTP ${res.status}` };
  }
  // ⚠️ `content[0]` אינו בהכרח בלוק טקסט — מודלים שמחזירים בלוק חשיבה מקדימים
  // אותו. מחפשים את בלוק הטקסט במפורש.
  const blocks: any[] = json?.content ?? [];
  const text = blocks
    .filter((b) => b?.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return { ok: true, text, error: null };
}

export interface AnalyzeResult {
  analysis: TabuAnalysis | null;
  rawText: string | null;
  error: string | null;
}

/**
 * ניתוח קובץ נסח. `data` הוא base64 של ה-PDF או של התמונה.
 */
export async function analyzeTabuFile(
  data: string,
  mimeType: string,
  context: { gush?: string | null; helka?: string | null; tatHelka?: string | null; scope: string },
): Promise<AnalyzeResult> {
  if (!tabuAnalysisConfigured()) {
    return {
      analysis: null,
      rawText: null,
      error:
        'ניתוח נסח דורש מפתח AI (AI_API_KEY עם AI_PROVIDER=anthropic). הקובץ נשמר, אך לא נותח — ולא מוצגים נתונים משפטיים בלי קריאה אמיתית של הנסח.',
    };
  }

  const isPdf = mimeType === 'application/pdf';
  const source = isPdf
    ? { type: 'base64', media_type: 'application/pdf', data }
    : { type: 'base64', media_type: mimeType, data };

  const contextLine = [
    context.gush && context.helka ? `לפי המערכת מדובר בגוש ${context.gush} חלקה ${context.helka}.` : null,
    context.tatHelka ? `תת-חלקה ${context.tatHelka}.` : null,
    `היקף הנסח כפי שסומן בניהול: ${context.scope}.`,
    'אם הנסח מתייחס לגוש/חלקה אחרים — דווח על כך ב-summary ואל תתקן בשקט.',
  ]
    .filter(Boolean)
    .join(' ');

  const content = [
    { type: isPdf ? 'document' : 'image', source },
    { type: 'text', text: `${PROMPT}\n\n${contextLine}` },
  ];

  const base: Record<string, unknown> = {
    model: MODEL,
    // ⚠️ max_tokens מכסה חשיבה **וגם** טקסט במודלים החדשים. תקציב קטן מחזיר
    // JSON קטוע, שנראה כמו כשל פרסינג ולא כמו תקציב שנגמר.
    max_tokens: 8000,
    messages: [{ role: 'user', content }],
  };

  // ניסיון ראשון בלי חשיבה — מהיר וזול, ומספיק לחילוץ מובנה.
  let res = await callAnthropic({ ...base, thinking: { type: 'disabled' } });
  if (!res.ok && /thinking|unexpected|unknown|invalid/i.test(res.error ?? '')) {
    // מודל שאינו מכיר את הפרמטר — מנסים בלעדיו.
    res = await callAnthropic(base);
  }
  if (!res.ok) return { analysis: null, rawText: null, error: res.error };

  const raw = parseJson(res.text);
  if (!raw) {
    return {
      analysis: null,
      rawText: res.text.slice(0, 20000) || null,
      error: 'הניתוח חזר בפורמט שלא ניתן לקרוא. הטקסט הגולמי נשמר לבדיקה ידנית.',
    };
  }

  const analysis = normalize(raw);
  // נסח בלי אף בעלים הוא כמעט תמיד קריאה שנכשלה, לא נסח ריק.
  if (!analysis.owners.length && !analysis.unreadable.length) {
    analysis.unreadable.push('פרטי בעלות — לא זוהו בנסח');
  }
  return { analysis: { ...EMPTY, ...analysis }, rawText: res.text.slice(0, 20000) || null, error: null };
}
