import Anthropic from '@anthropic-ai/sdk';
import type { HtrLine, HtrMaterial } from './htr-types';
import type { HtrEngine, HtrResult } from './htr-engine';
import { HtrEngineNotConfigured } from './htr-engine';
import { fetchWithTimeout } from './fetch-with-timeout';

// ============================================================
// VisionEngine — זיהוי כתב יד עברי בעזרת מודלי ראייה.
// ------------------------------------------------------------
// ההערה שבראש htr-engine.ts קובעת: "המנוע הראשי הוא תמיד לא-גנרטיבי
// (Kraken/Transkribus) כדי למנוע הזיות. VLM לעולם לא ראשי לעברית רבנית."
//
// החשש נכון לגמרי, והוא לא נעלם: מודל גנרטיבי שלא הצליח לקרוא מילה ימציא
// מילה סבירה — ובטקסט תורני התוצאה תיראה כשרה לחלוטין, בלי שום סימן שמשהו
// הומצא. זה בדיוק סוג הנזק שאי אפשר לגלות בקריאה.
//
// אבל שני המנועים הלא-גנרטיביים אינם מוגדרים ואינם זמינים: Kraken דורש שרת
// GPU נפרד ו-Transkribus דורש מנוי. בפועל המודול היה מת לגמרי — כל בקשה
// החזירה HtrEngineNotConfigured. "בטוח אבל לא עובד" אינו פתרון.
//
// מה שנעשה כאן הוא לא לוותר על העיקרון אלא לממש אותו אחרת: **שתי קריאות
// עצמאיות של אותו דף, בשני מודלים שונים, והצלבה שורה מול שורה.**
//
// הזיה היא, מעצם טבעה, המצאה של מודל אחד. שני מודלים שלא ראו זה את פלטו של
// זה כמעט לעולם לא ימציאו את אותה מילה בדיוק. לכן:
//   · שתי הקריאות זהות בשורה  → ביטחון גבוה, וזו ראיה ולא הבטחה.
//   · הן נחלקות               → השורה מסומנת, ושתי הגרסאות נשמרות לעורך.
//
// זה חזק יותר ממנוע יחיד לא-גנרטיבי, שאין לו דעה שנייה כלל ושמדד הביטחון
// שלו הוא הערכה עצמית. כאן אי-הוודאות נמדדת מול קורא בלתי תלוי.
//
// המנוע לעולם לא ממציא כדי למלא חור: שני הקוראים מונחים לסמן [?] במקום לנחש,
// ו-[?] נשמר בפלט.
// ============================================================

const CLAUDE_MODEL = process.env.HTR_CLAUDE_MODEL || 'claude-opus-5';
const OPENAI_MODEL = process.env.HTR_OPENAI_MODEL || 'gpt-5';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/** תקציב פלט. ב-Claude 5 החשיבה נספרת בתוך max_tokens יחד עם הטקסט. */
const MAX_TOKENS = 16000;

const MATERIAL_HINT: Record<HtrMaterial, string> = {
  modern_handwriting: 'כתב יד עברי עכשווי — הערות, טיוטות, מכתבים.',
  rabbinic_18_19: 'כתב יד רבני מהמאות ה-18–19 (אשכנזי / איטלקי / ספרדי), עם קיצורים וראשי תיבות נפוצים.',
  medieval_square: 'כתב מרובע ימי-ביניימי.',
  rashi_ladino: 'כתב רש"י (חצי-קולמוס ספרדי), ייתכן גם לדינו.',
  print: 'דפוס עברי, ייתכן דפוס ישן.',
};

function instructions(material: HtrMaterial): string {
  return [
    'אתה קורא דף כתוב בעברית ומעתיק אותו אות באות.',
    `סוג החומר: ${MATERIAL_HINT[material]}`,
    '',
    'כללים:',
    '· העתק בדיוק את מה שכתוב. שורה בתמונה = שורה בפלט, באותו סדר.',
    '· אל תשלים, אל תתקן, אל תפתח ראשי תיבות ואל תנקד מה שאינו מנוקד.',
    '· אם ציטוט נכתב בשגיאה או בקיצור — העתק אותו כפי שהוא. אל "תתקן" לפי המקור.',
    '· מילה או אות שאינך מצליח לקרוא: כתוב [?] במקומה. אל תנחש מילה סבירה.',
    '  שורה שאינה קריאה כלל: החזר אותה כ-[?] בלבד.',
    '· מחיקות, תיקונים והוספות בין השורות — העתק את הנוסח הסופי, וציין',
    '  ב-note של אותה שורה שהיה שם תיקון.',
    '· התעלם מכותרות רצות, מספרי עמוד וחותמות, אלא אם הם חלק מהטקסט.',
    '',
    'החזר JSON בלבד, במבנה:',
    '{"lines":[{"n":1,"text":"...","note":""}]}',
    'ללא markdown, ללא הסבר, ללא טקסט לפני או אחרי.',
  ].join('\n');
}

type Reading = { reader: string; lines: string[]; notes: string[] };

// ---------- קורא 1: Claude ----------
async function readWithClaude(
  imageBase64: string,
  mediaType: string,
  material: HtrMaterial,
): Promise<Reading> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const msg = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: instructions(material),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType as any, data: imageBase64 },
          },
          { type: 'text', text: 'העתק את הדף.' },
        ],
      },
    ],
  });
  // בקשה שנדחתה מחזירה 200 עם stop_reason=refusal ו-content ריק; לקרוא
  // content[0] בלי לבדוק זה קריסה על מקרה תקין לחלוטין.
  if ((msg as any).stop_reason === 'refusal') {
    throw new Error('הקריאה נדחתה על ידי מסנני הבטיחות של המודל');
  }
  const text = msg.content
    .filter((b) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
  return { reader: `claude:${CLAUDE_MODEL}`, ...parseLines(text) };
}

// ---------- קורא 2: GPT ----------
// קורא שני, בכוונה מספק אחר. שני מודלים מאותה משפחה נוטים לטעות יחד, ואז
// ההצלמה מאשרת טעות משותפת במקום לחשוף אותה.
async function readWithOpenAI(
  imageBase64: string,
  mediaType: string,
  material: HtrMaterial,
): Promise<Reading> {
  const key = (process.env.OPENAI_API_KEY || '').replace(/﻿/g, '').trim();
  const res = await fetchWithTimeout(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: instructions(material) },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
            { type: 'text', text: 'העתק את הדף.' },
          ],
        },
      ],
    }),
  }, 60000);
  if (!res.ok) {
    throw new Error(`מנוע הראייה השני החזיר ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data: any = await res.json();
  return { reader: `openai:${OPENAI_MODEL}`, ...parseLines(data?.choices?.[0]?.message?.content ?? '') };
}

/** המודלים מחזירים לפעמים JSON עטוף ב-```json. */
function parseLines(raw: string): { lines: string[]; notes: string[] } {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      if (Array.isArray(parsed?.lines)) {
        return {
          lines: parsed.lines.map((l: any) => String(l?.text ?? '').trim()),
          notes: parsed.lines.map((l: any) => String(l?.note ?? '').trim()),
        };
      }
    } catch {
      /* נופלים לפירוק לפי שורות */
    }
  }
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return { lines, notes: lines.map(() => '') };
}

// ---------- ההצלבה ----------

/** השוואה שמתעלמת מהבדלים שאינם קריאה שונה של האותיות. */
function normalize(s: string): string {
  return s
    // תווי כיווניות בלתי נראים (LRM/RLM/embedding/isolate). המודלים מפזרים
    // אותם בטקסט עברי מעורב, והם הפילו את ההשוואה: שתי קריאות שנראו זהות
    // בדיוק — "למה רגשו גוים", "טוב לכתב הראש" — נספרו כמחלוקת וקיבלו 0.30,
    // כי אחת מהן הכילה U+200E שהעין אינה רואה.
    .replace(/[‎‏‪-‮⁦-⁩​﻿]/g, '')
    .replace(/[֑-ׇ]/g, '') // טעמים וניקוד
    .replace(/["'`״׳]/g, '')         // גרשיים בכתיבים שונים
    .replace(/[.,:;!?()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** דמיון ברמת המילה, 0..1 — מרחק עריכה מנורמל. */
function similarity(a: string, b: string): number {
  const wa = normalize(a).split(' ').filter(Boolean);
  const wb = normalize(b).split(' ').filter(Boolean);
  if (!wa.length && !wb.length) return 1;
  if (!wa.length || !wb.length) return 0;
  let prev = Array.from({ length: wb.length + 1 }, (_, i) => i);
  for (let i = 1; i <= wa.length; i++) {
    const cur = [i];
    for (let j = 1; j <= wb.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (wa[i - 1] === wb[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return Math.max(0, 1 - prev[wb.length] / Math.max(wa.length, wb.length));
}

export type VisionLine = HtrLine & {
  /** הגרסה של הקורא השני, כשהיא שונה — כדי שהעורך יראה את שתיהן. */
  alternative?: string;
  note?: string;
  /** agreed = שניהם קראו אותו דבר · disputed = קראו אחרת · unverified = רק אחד קרא */
  status?: 'agreed' | 'disputed' | 'unverified';
};

/** שורה שהקורא סירב לנחש אותה. */
function isAbstention(s: string): boolean {
  const t = s.trim();
  return t === '' || /^\[\?\]$/.test(t) || t.replace(/\[\?\]/g, '').trim() === '';
}

/**
 * הימנעות איננה מחלוקת.
 *
 * זה התגלה במדידה על דף אמיתי (Wellcome A34, כתב חצי-קולמוס ספרדי): קורא אחד
 * החזיר תעתיק מלא ונכון ברובו, והשני החזיר [?] כמעט על כל הדף — הוא ציית
 * להוראה "אל תנחש" בצורה שמרנית מאוד. הגרסה הראשונה ספרה כל [?] כאילו הוא
 * סותר, וקיבלה 1/32 שורות "בהסכמה" וביטחון ממוצע 0.34 — כלומר דיווחה שקריאה
 * טובה היא כמעט חסרת ערך.
 *
 * זו הייתה שגיאה שלי, לא של המנוע: "לא ידעתי לקרוא" אינו "קראתי אחרת".
 * שורה שקורא אחד קרא והשני נמנע ממנה היא **לא מאומתת** — פחות מהסכמה, אבל
 * הרבה יותר ממחלוקת.
 */
const ABSTENTION_RATIO_FOR_MOSTLY_SILENT = 0.6;

export class VisionEngine implements HtrEngine {
  name = 'vision';

  async recognize(imageUrl: string, material: HtrMaterial): Promise<HtrResult> {
    const hasClaude = !!(process.env.ANTHROPIC_API_KEY || '').trim();
    const hasOpenAI = !!(process.env.OPENAI_API_KEY || '').trim();
    if (!hasClaude && !hasOpenAI) {
      throw new HtrEngineNotConfigured(
        'vision',
        'לא מוגדר אף מפתח לזיהוי (ANTHROPIC_API_KEY / OPENAI_API_KEY).',
      );
    }

    const img = await fetchWithTimeout(imageUrl, {}, 20000);
    if (!img.ok) throw new Error(`הורדת התמונה נכשלה: ${img.status}`);
    const mediaType = (img.headers.get('content-type') || 'image/jpeg').split(';')[0];
    const imageBase64 = Buffer.from(await img.arrayBuffer()).toString('base64');

    // שתי הקריאות רצות במקביל ואינן רואות זו את זו — זה מה שהופך את ההסכמה
    // ביניהן לראיה. Promise.allSettled ולא all: קורא שנפל לא אמור להפיל את
    // הזיהוי כולו, רק להוריד אותו לקריאה יחידה ומסומנת ככזו.
    const [a, b] = await Promise.allSettled([
      hasClaude ? readWithClaude(imageBase64, mediaType, material) : Promise.reject(new Error('אין מפתח')),
      hasOpenAI ? readWithOpenAI(imageBase64, mediaType, material) : Promise.reject(new Error('אין מפתח')),
    ]);

    const readings = [a, b]
      .filter((r): r is PromiseFulfilledResult<Reading> => r.status === 'fulfilled')
      .map((r) => r.value);
    if (!readings.length) {
      const why = [a, b]
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => String(r.reason?.message ?? r.reason))
        .join(' · ');
      throw new Error(`שני הקוראים נכשלו: ${why}`);
    }

    if (readings.length === 1) return singleReading(readings[0]);

    // קורא ששתק כמעט על כל הדף אינו דעה שנייה. הצלבה מולו הייתה מייצרת
    // "מחלוקת" בכל שורה ומטביעה קריאה טובה — ראה ABSTENTION_RATIO_FOR_MOSTLY_SILENT.
    const silent = readings.map(
      (r) => r.lines.filter(isAbstention).length / Math.max(1, r.lines.length),
    );
    const spoke = readings.filter((_, i) => silent[i] < ABSTENTION_RATIO_FOR_MOSTLY_SILENT);
    if (spoke.length === 1) {
      const quiet = readings.find((r) => r !== spoke[0])!;
      const quietPct = Math.round(silent[readings.indexOf(quiet)] * 100);

      // הקורא השני שתק, אבל לוותר על אימות לגמרי זה לוותר על העיקרון. קריאה
      // שנייה **עצמאית** מאותו מודל היא ראיה חלשה יותר משני ספקים — שני
      // מודלים מאותה משפחה נוטים לטעות יחד — אך היא עדיין תופסת הזיה, כי
      // הזיה היא הגרלה ולא טעות שיטתית: אותה מילה מומצאת פעמיים היא נדירה.
      // התווית אומרת בדיוק מה נעשה, כדי שאיש לא יקרא לזה אימות צולב.
      if (spoke[0].reader.startsWith('claude') && hasClaude) {
        try {
          const second = await readWithClaude(imageBase64, mediaType, material);
          const r = crossCheck(spoke[0], second);
          return {
            ...r,
            engine:
              `vision (שתי קריאות עצמאיות של ${CLAUDE_MODEL} — אימות חלש, לא בין-ספקי; ` +
              `${quiet.reader} נמנע מ-${quietPct}% מהשורות) · ` +
              r.engine.replace(/^vision \([^)]*\) — /, ''),
          };
        } catch {
          /* הקריאה השנייה נכשלה — נופלים לקריאה יחידה מסומנת */
        }
      }

      const r = singleReading(spoke[0]);
      return {
        ...r,
        engine: `${r.engine} — ${quiet.reader} נמנע מ-${quietPct}% מהשורות ולכן לא שימש לאימות`,
      };
    }

    return crossCheck(readings[0], readings[1]);
  }
}

/** קורא אחד בלבד — אין דעה שנייה, והביטחון חייב לשקף את זה. */
function singleReading(r: Reading): HtrResult {
  const lines: VisionLine[] = r.lines.map((text, i) => ({
    line: i,
    text,
    // תקרה מכוונת מתחת ל-LOW_CONFIDENCE_THRESHOLD (0.75): בלי קורא שני אין
    // שום ראיה שהשורה נכונה, ולכן כל הדף צריך לעבור עין אנושית.
    confidence: text.includes('[?]') ? 0.3 : 0.6,
    note: r.notes[i] || undefined,
  }));
  return {
    engine: `vision (${r.reader}, קורא יחיד — ללא הצלבה)`,
    lines,
    rawText: lines.map((l) => l.text).join('\n'),
    meanConfidence: lines.length ? lines.reduce((s, l) => s + l.confidence, 0) / lines.length : 0,
  };
}

function crossCheck(x: Reading, y: Reading): HtrResult {
  // מספר השורות עשוי להיות שונה בין הקוראים (שורה שנבלעה, שורה שפוצלה).
  // מיישרים לפי דמיון עם חלון קטן, במקום להשוות אינדקס מול אינדקס ולקבל
  // אי-התאמה מדומה בכל השורות שאחרי הפער.
  const pairs = align(x.lines, y.lines);

  const lines: VisionLine[] = pairs.map(([left, right], i) => {
    // הימנעות מטופלת כשתיקה, לא כקריאה נגדית.
    const lAbst = left === null || isAbstention(left);
    const rAbst = right === null || isAbstention(right);

    if (lAbst && rAbst) {
      return { line: i, text: '[?]', confidence: 0.2, status: 'disputed' as const };
    }
    if (lAbst || rAbst) {
      // קורא אחד קרא, השני נמנע — לא מאומת, אבל לא סותר.
      const text = (lAbst ? right : left)!;
      return {
        line: i,
        text,
        confidence: 0.6,
        status: 'unverified' as const,
        note: x.notes[i] || y.notes[i] || undefined,
      };
    }

    const sim = similarity(left!, right!);
    // ההשוואה מתבצעת על הצורה המנורמלת, ולכן "זהות" נמדדת שם ולא בתווים הגולמיים.
    const agreed = sim >= 0.999 || normalize(left!) === normalize(right!);
    return {
      line: i,
      text: agreed ? left! : longer(left!, right!),
      // הביטחון הוא מדידה: כמה שני קוראים בלתי תלויים הסכימו על השורה הזו.
      confidence: agreed ? 0.97 : Math.max(0.3, sim * 0.9),
      alternative: agreed ? undefined : right!,
      status: agreed ? ('agreed' as const) : ('disputed' as const),
      note: x.notes[i] || y.notes[i] || undefined,
    };
  });

  const agreed = lines.filter((l) => l.status === 'agreed').length;
  const unverified = lines.filter((l) => l.status === 'unverified').length;
  return {
    engine:
      `vision (${x.reader} + ${y.reader}) — ` +
      `${agreed} בהסכמה · ${lines.length - agreed - unverified} במחלוקת · ${unverified} לא מאומתות`,
    lines,
    rawText: lines.map((l) => l.text).join('\n'),
    meanConfidence: lines.length ? lines.reduce((s, l) => s + l.confidence, 0) / lines.length : 0,
  };
}

function longer(a: string, b: string): string {
  // כששתי הקריאות נחלקות, הארוכה נבחרת כברירת מחדל — מודל שקרא פחות בדרך כלל
  // השמיט, והשמטה גרועה יותר מהצגה. שתי הגרסאות נשמרות ממילא.
  return normalize(a).length >= normalize(b).length ? a : b;
}

/** יישור שתי רשימות שורות. חלון של 2 מספיק לפערים של שורה־שתיים. */
function align(a: string[], b: string[]): [string | null, string | null][] {
  const out: [string | null, string | null][] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i >= a.length) { out.push([null, b[j++]]); continue; }
    if (j >= b.length) { out.push([a[i++], null]); continue; }
    // הימנעות אינה דומה לשום דבר, ולכן דמיון לא יכול ליישר אותה — מיישרים
    // אותה לפי מיקום, אחרת כל שורה אחריה מתפספסת.
    if (isAbstention(a[i]) || isAbstention(b[j])) { out.push([a[i++], b[j++]]); continue; }
    if (similarity(a[i], b[j]) >= 0.5) { out.push([a[i++], b[j++]]); continue; }
    // לא דומות: בודקים אם אחת מהן מתאימה לשורה הבאה אצל השנייה.
    const skipA = j + 1 < b.length ? similarity(a[i], b[j + 1]) : 0;
    const skipB = i + 1 < a.length ? similarity(a[i + 1], b[j]) : 0;
    if (skipA > skipB && skipA >= 0.5) out.push([null, b[j++]]);
    else if (skipB >= 0.5) out.push([a[i++], null]);
    else out.push([a[i++], b[j++]]); // באמת שונות — נרשם כמחלוקת
  }
  return out;
}
