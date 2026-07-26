/**
 * POST /api/spec-analyze  { id }
 *
 * ניתוח AI לאפיון שהתקבל בשאלון החכם (מערכת 33). נקרא מהניהול בלחיצה על
 * "שלח לניתוח AI".
 *
 * אבטחה: הפונקציה אינה מחזיקה service_role. היא מעבירה את ה-JWT של האדמין
 * המחובר ל-PostgREST, וכל הגישה ל-core.spec_submissions נעשית דרך שני RPC
 * שמאמתים `more30_is_admin()`. הסוד היחיד שיושב כאן הוא מפתח ה-AI, שאסור
 * שיגיע לדפדפן.
 */

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/﻿/g, '').trim();
const ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? '').replace(/﻿/g, '').trim();
const AI_KEY = (process.env.ANTHROPIC_API_KEY ?? '').replace(/﻿/g, '').trim();
const AI_MODEL = (process.env.AI_MODEL ?? 'claude-opus-5').replace(/﻿/g, '').trim();

export const config = { maxDuration: 300 };

interface Asked {
  key: string;
  label: string;
  step: string;
}

async function rpc(name: string, body: unknown, jwt: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${name}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

/** בונה prompt קריא מהשאלון הדינמי — שאלה ותשובה, לפי הסדר שהוצג למשתמש. */
function buildPrompt(spec: any): string {
  const asked: Asked[] = Array.isArray(spec.questions) ? spec.questions : [];
  const answers: Record<string, unknown> = spec.answers ?? {};
  const lines: string[] = [];

  lines.push(`מסלול שנבחר: ${spec.track ?? '—'}`);
  lines.push(`שם הפרויקט: ${spec.project_name ?? '—'}`);
  if (spec.city) lines.push(`עיר: ${spec.city}`);
  const services: string[] = Array.isArray(spec.services_wanted) ? spec.services_wanted : [];
  if (services.length) lines.push(`שירותים שהתבקשו: ${services.join(', ')}`);

  let lastStep = '';
  for (const q of asked) {
    const v = answers[q.key];
    if (v === undefined || v === null || (Array.isArray(v) ? !v.length : !String(v).trim())) continue;
    if (q.step !== lastStep) {
      lines.push(`\n== ${q.step} ==`);
      lastStep = q.step;
    }
    lines.push(`${q.label}: ${Array.isArray(v) ? v.join(', ') : String(v)}`);
  }

  // תשובות שנשמרו בלי רשומת שאלה מקבילה (שאלון שהשתנה בין גרסאות) — לא מאבדים אותן.
  const covered = new Set(asked.map((q) => q.key));
  const extra = Object.entries(answers).filter(([k]) => !covered.has(k));
  if (extra.length) {
    lines.push('\n== נתונים נוספים ==');
    for (const [k, v] of extra) {
      lines.push(`${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`);
    }
  }

  return [
    'אתה שותף מקצועי במור מערכות תוכנה, שמקבל אפיון גולמי מלקוח פוטנציאלי',
    'וצריך להכין לצוות חוות דעת פנימית לפני שיחת ההיכרות.',
    '',
    'הסתמך אך ורק על מה שנכתב באפיון. אל תמציא נתונים; מה שלא נאמר — כתוב במפורש',
    'שהוא חסר וצריך להישאל בשיחה.',
    '',
    'מבנה חוות הדעת:',
    '1. במה מדובר — 2-3 שורות בשפה שלנו.',
    '2. מה חזק כאן — נקודות אמיתיות לטובת הפרויקט.',
    '3. סיכונים ונקודות תורפה — כולל מה שהלקוח כנראה לא חשב עליו.',
    '4. מה חסר באפיון — רשימת שאלות קונקרטיות לשיחה.',
    '5. התאמה למה שיש לנו — האם אפשר לרתום מערכת קיימת שלנו במקום לבנות מאפס.',
    '6. הצעת צעד ראשון — מה מציעים ללקוח בפועל, והיקף ראשוני סביר.',
    '7. שורת סיכום אחת: להתקדם / להתקדם בזהירות / לא מתאים לנו — ולמה.',
    '',
    'כתוב בעברית, ענייני, עד 2,500 תווים. בלי חנופה ובלי סופרלטיבים.',
    '',
    `האפיון של ${spec.full_name ?? 'הלקוח'}:`,
    lines.join('\n'),
  ].join('\n');
}

async function callClaude(prompt: string, signal: AbortSignal): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'x-api-key': AI_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 4000,
      // ניסוח חוות דעת מתוך חומר שכבר קיים — חשיבה דלוקה רק מאריכה את הזמן.
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j: any = await res.json();
  const block = (j?.content ?? []).find((b: any) => b?.type === 'text');
  const text: string = block?.text ?? '';
  if (!text.trim()) throw new Error('Anthropic returned an empty response');
  return text;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!SUPABASE_URL || !ANON_KEY) {
    return res.status(500).json({ error: 'Supabase env חסר בפריסה' });
  }
  if (!AI_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY אינו מוגדר בפריסה' });
  }

  const auth = String(req.headers.authorization ?? '');
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!jwt) return res.status(401).json({ error: 'נדרשת התחברות אדמין' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  const id = String(body.id ?? '').trim();
  if (!id) return res.status(400).json({ error: 'חסר id' });

  // begin_ai נכשל אם המשתמש אינו אדמין, אם האפיון לא קיים, או אם ניתוח כבר רץ.
  let spec: any;
  try {
    spec = await rpc('more30_spec_begin_ai', { p_id: id }, jwt);
  } catch (e) {
    return res.status(403).json({ error: e instanceof Error ? e.message : 'not authorized' });
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 120_000);
  try {
    const analysis = await callClaude(buildPrompt(spec), ac.signal);
    await rpc(
      'more30_spec_save_ai',
      { p_id: id, p_model: AI_MODEL, p_analysis: analysis, p_error: null },
      jwt,
    );
    return res.status(200).json({ ok: true, model: AI_MODEL, analysis });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ניתוח נכשל';
    // חייבים לשחרר את ai_status='running', אחרת האפיון נשאר תקוע.
    try {
      await rpc(
        'more30_spec_save_ai',
        { p_id: id, p_model: AI_MODEL, p_analysis: null, p_error: msg },
        jwt,
      );
    } catch {
      /* אין מה לעשות מעבר לכך — השגיאה המקורית חוזרת ללקוח */
    }
    return res.status(502).json({ ok: false, error: msg });
  } finally {
    clearTimeout(timer);
  }
}
