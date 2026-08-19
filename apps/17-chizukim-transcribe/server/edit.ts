// ---------------------------------------------------------------------------
// שלב העריכה — להפוך תמלול גולמי לטקסט שאפשר לקרוא, בלי לכתוב אותו מחדש.
//
// מה שהיה קודם (`basicEdit`): פיצול לפסקה אחרי כל שלושה משפטים, כשמשפט מזוהה
// לפי נקודה/סימן שאלה. על תמלול עברי שחוזר כמעט בלי פיסוק זה לא עושה כלום —
// בהקלטה 217.wav היו ארבעה סימני פיסוק בכל 2,230 התווים, ולכן ה"עריכה" החזירה
// בדיוק את אותו בלוק טקסט אחד. זה נמדד: `edited_transcript` יצא 2,228 תווים
// עם **אפס** מעברי פסקה.
//
// מה שנעשה כאן: מודל שפה מוסיף פיסוק, מחלק לפסקאות, ומתקן צירופים שנשמעים זהה
// אך נכתבו שגוי ("פרסת סלח לך" → "פרשת שלח לך").
//
// ⚠️ הסכנה בשלב כזה ברורה: מודל שפה עלול "לשפר" שיעור — להשלים מקור, לתקן
// ציטוט, להחליק משפט. בשיעור תורה זה מסוכן במיוחד, כי התוצאה נראית סבירה
// לחלוטין ואי אפשר לדעת מה נאמר באמת. לכן יש כאן שומר: הטקסט שחוזר נמדד מול
// המקור, ואם הוא חורג — הוא נזרק, ונשמרת החלוקה המכנית. עדיף טקסט פחות מלוטש
// על פני טקסט שאיננו יודעים אם הוא אמת.
// ---------------------------------------------------------------------------

import { openaiKey } from "./transcribe";

const EDIT_MODEL = process.env.EDIT_MODEL || "gpt-4.1";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

/** מעל זה — התערבות חשודה מכדי לסמוך עליה. */
const MAX_WORD_CHANGE_RATIO = 0.18;
/** אורך התוצאה חייב להישאר בטווח הזה ביחס למקור. */
const MIN_LENGTH_RATIO = 0.8;
const MAX_LENGTH_RATIO = 1.35;

// אותיות כמספר הן נקודת התורפה שנשארה. על שיעור אמיתי מהארכיון
// ("סימן קס''ח סעיף ח'") המנוע כתב "סימן קפ״ח" — התוכן (לחמניות, אובליאש,
// ברכות מ״ב) הוא חד־משמעית סימן קס״ח, כלומר הסימן עצמו תומלל שגוי. ההבדל בין
// קס״ח לקפ״ח הוא הברה אחת, ואין שום דרך לשמוע אותה נכון בוודאות.
//
// שם הקובץ יודע את התשובה. לכן הוא נמסר לעורך כהקשר — בתור עובדה על ההקלטה,
// לא בתור רשות לשנות תוכן.
const SYSTEM = [
  "אתה עורך תמלול של שיעורי תורה בעברית.",
  "התפקיד שלך הוא לנקד את הטקסט בסימני פיסוק ולחלק אותו לפסקאות — ותו לא.",
  "",
  "מותר לך:",
  "· להוסיף נקודות, פסיקים, סימני שאלה, גרשיים ומרכאות.",
  "· לחלק לפסקאות לפי מעבר נושא.",
  "· לתקן מילה שתומללה שגוי כשברור מההקשר מה נאמר, והמילה הנכונה נשמעת זהה —",
  "  למשל 'פרסת סלח לך' → 'פרשת שלח לך', 'ירי שמיים' → 'יראת שמיים',",
  "  'השולחן ברוך' → 'השולחן ערוך', 'חוץ ושלום' → 'חס ושלום'.",
  "· לכתוב שמות וכינויים בכתיב המקובל: רש״י, רמב״ם, הקב״ה.",
  "",
  "אסור לך בהחלט:",
  "· להוסיף מילה, משפט, הסבר, מקור או ציטוט שלא נאמרו.",
  "· להשלים ציטוט חלקי או 'לתקן' מקור שנאמר לא במדויק.",
  "· להשמיט תוכן, לקצר, לסכם או לנסח מחדש.",
  "· לשנות סדר דברים.",
  "",
  "אם קטע אינו מובן — השאר אותו כפי שהוא. אל תנחש.",
  "החזר את הטקסט הערוך בלבד, בלי הקדמה ובלי הערות.",
].join("\n");

/** מה שידוע על ההקלטה מחוץ לאודיו — בעיקר שם הקובץ. */
export type EditContext = { title?: string | null; topic?: string | null };

function contextBlock(ctx?: EditContext): string {
  const bits = [ctx?.title, ctx?.topic].map((s) => (s ?? "").trim()).filter(Boolean);
  if (!bits.length) return "";
  return [
    "",
    `ידוע על ההקלטה: ${bits.join(" · ")}`,
    "אם מופיע שם מראה מקום (סימן, סעיף, דף, פרק) והתמלול נוקב במראה מקום אחר",
    "שנשמע דומה — העדף את זה שבשם ההקלטה, ותקן בהתאם גם אזכורים חוזרים שלו.",
    "זה תקף למראי מקום בלבד. אין לשנות שום דבר אחר על סמך השם.",
  ].join("\n");
}

/** חלוקה מכנית — נקודת הנפילה, וגם מה שרץ כשאין מפתח. */
export function mechanicalEdit(raw: string): string {
  const clean = raw.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentences = clean.match(/[^.!?׃]+[.!?׃]?/g) ?? [clean];
  // כשאין פיסוק בכלל, החלוקה למשפטים מחזירה בלוק אחד. במקרה כזה חותכים לפי
  // מספר מילים, כדי שלפחות תהיה חלוקה כלשהי במקום קיר טקסט.
  if (sentences.length === 1 && clean.split(/\s+/).length > 90) {
    const words = clean.split(/\s+/);
    const out: string[] = [];
    for (let i = 0; i < words.length; i += 70) out.push(words.slice(i, i + 70).join(" "));
    return out.join("\n\n");
  }
  const paragraphs: string[] = [];
  let buf: string[] = [];
  for (const s of sentences) {
    buf.push(s.trim());
    if (buf.length >= 3) { paragraphs.push(buf.join(" ")); buf = []; }
  }
  if (buf.length) paragraphs.push(buf.join(" "));
  return paragraphs.join("\n\n");
}

/** מילים בלבד, בלי פיסוק — כדי להשוות תוכן ולא סימנים. */
function words(s: string): string[] {
  return s.replace(/[.,!?;:"'`״׳()\[\]—–-]/g, " ").split(/\s+/).filter(Boolean);
}

/** מרחק עריכה על רמת מילים, מנורמל. */
function wordChangeRatio(a: string[], b: string[]): number {
  if (!a.length) return b.length ? 1 : 0;
  // Levenshtein על מילים, עם שורה אחת בזיכרון.
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length] / a.length;
}

export type EditResult = { text: string; method: "llm" | "mechanical"; note?: string };

export async function editTranscript(raw: string, ctx?: EditContext): Promise<EditResult> {
  const clean = raw.replace(/\s+/g, " ").trim();
  if (!clean) return { text: "", method: "mechanical" };

  let key: string;
  try {
    key = openaiKey();
  } catch {
    return { text: mechanicalEdit(clean), method: "mechanical", note: "אין מפתח למודל עריכה" };
  }

  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: EDIT_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM + contextBlock(ctx) },
          { role: "user", content: clean },
        ],
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
    const data: any = await res.json();
    const edited = String(data?.choices?.[0]?.message?.content ?? "").trim();
    if (!edited) throw new Error("תשובה ריקה");

    // --- השומר ---
    const before = words(clean);
    const after = words(edited);
    const lengthRatio = after.length / before.length;
    if (lengthRatio < MIN_LENGTH_RATIO || lengthRatio > MAX_LENGTH_RATIO) {
      return {
        text: mechanicalEdit(clean),
        method: "mechanical",
        note: `העריכה שינתה את אורך הטקסט ביחס ${lengthRatio.toFixed(2)} — נדחתה`,
      };
    }
    const changed = wordChangeRatio(before, after);
    if (changed > MAX_WORD_CHANGE_RATIO) {
      return {
        text: mechanicalEdit(clean),
        method: "mechanical",
        note: `העריכה שינתה ${(changed * 100).toFixed(0)}% מהמילים — נדחתה`,
      };
    }
    return { text: edited, method: "llm", note: `שונו ${(changed * 100).toFixed(1)}% מהמילים` };
  } catch (e: any) {
    return { text: mechanicalEdit(clean), method: "mechanical", note: `עריכה נכשלה: ${e?.message ?? e}` };
  }
}
