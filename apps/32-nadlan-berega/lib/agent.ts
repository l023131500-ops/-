// ==== סוכן AI — ניסוח "תעודת זהות" מקיפה ====
// מקבל פרופיל נכס (נתונים אמיתיים בלבד) ומרכיב דוח מנוסח + דגלים + המלצה.
// עובד עם Anthropic או OpenAI לפי ENV. אם אין מפתח — מחזיר סיכום דטרמיניסטי
// שנבנה מהנתונים האמיתיים (בלי להמציא), כך שהמערכת "מוכנה" וללא מפתח.

import type { PropertyProfile } from './types';

const PROVIDER = process.env.AI_PROVIDER ?? 'anthropic'; // anthropic | openai
const API_KEY = process.env.AI_API_KEY;
const MODEL =
  process.env.AI_MODEL ?? (PROVIDER === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-latest');

export interface AgentReport {
  narrative: string;
  usedAi: boolean;
  provider?: string;
}

function buildPrompt(profile: any): string {
  return [
    'אתה אנליסט נדל"ן ישראלי. הרכב "תעודת זהות" מקיפה, מקצועית ותמציתית לנכס,',
    'אך ורק מהנתונים שמסופקים למטה. אל תמציא נתונים. אם שדה חסר — ציין "לא זמין / דורש בדיקה".',
    'מבנה הדוח: (1) תמצית מנהלים; (2) שווי והשוואת עסקאות; (3) מצב תכנוני וחריגות אפשריות;',
    '(4) פוטנציאל השבחה; (5) סביבה; (6) דגלים משפטיים לבדיקה (טאבו/רמ"י); (7) המלצת פעולה + בדיקות המשך.',
    'כתוב בעברית, בפסקאות קצרות. בסוף ציין את המקורות ותאריך ההפקה.',
    '',
    'נתוני הנכס (JSON):',
    JSON.stringify(profile).slice(0, 12000),
  ].join('\n');
}

async function callAnthropic(prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY as string,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
  const j: any = await res.json();
  return j?.content?.[0]?.text ?? '';
}

async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: 'אתה אנליסט נדל"ן ישראלי מקצועי.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const j: any = await res.json();
  return j?.choices?.[0]?.message?.content ?? '';
}

// סיכום דטרמיניסטי (ללא AI) — מהנתונים האמיתיים בלבד.
function fallbackNarrative(profile: PropertyProfile): string {
  const k = profile.key;
  const lines: string[] = [];
  lines.push(`תעודת זהות — ${k.address ?? ''} (גוש ${k.gush ?? '—'} חלקה ${k.helka ?? '—'}).`);
  lines.push(`ציון הזדמנות: ${profile.opportunityScore ?? '—'}.`);
  const valueLayer = profile.layers.find((l) => l.key === 'value');
  if (valueLayer) {
    const okFields = valueLayer.fields.filter((f) => f.status === 'ok');
    if (okFields.length) lines.push('שווי: ' + okFields.map((f) => `${f.label}: ${f.value}`).join(' · ') + '.');
  }
  const renewal = profile.layers.find((l) => l.key === 'renewal');
  const rOk = renewal?.fields.find((f) => f.status === 'ok');
  if (rOk) lines.push(`פוטנציאל השבחה: ${rOk.label} — ${rOk.value}.`);
  lines.push('דגלים לבדיקה: נסח טאבו (בעלות/שעבודים) וחריגות בנייה — דורשים בדיקה נפרדת.');
  if (profile.warnings.length) lines.push('מקורות שלא נטענו: ' + profile.warnings.join(' · '));
  lines.push('הערכות אינן מהוות ייעוץ. הופק על ידי נדל"ן ברגע.');
  return lines.join('\n');
}

export async function composeReport(profile: PropertyProfile): Promise<AgentReport> {
  if (!API_KEY) {
    return { narrative: fallbackNarrative(profile), usedAi: false };
  }
  try {
    const prompt = buildPrompt(profile);
    const text = PROVIDER === 'openai' ? await callOpenAI(prompt) : await callAnthropic(prompt);
    return { narrative: text || fallbackNarrative(profile), usedAi: !!text, provider: PROVIDER };
  } catch {
    return { narrative: fallbackNarrative(profile), usedAi: false };
  }
}
