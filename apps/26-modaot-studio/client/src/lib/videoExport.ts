// ייצוא "וידאו קידום" — הבנייה בפועל שהובטחה ב-CHECKLIST/graphics.md #16 (שלב 5):
// רצף פריימים על גבי התמונה הסטטית ברזולוציה מלאה (אותו stage.toCanvas ששכבות
// PNG/PDF כבר משתמשות בו ב-lib/exporter.ts — שום רינדור/שכבה קיימים לא משתנים),
// עם פתיח "בניית סצנה" (הרקע נחשף, עיטורים/תמונות/טיפוגרפיה נכנסים בהדרגה
// בסדר תפקידים — buildEntranceGroups/captureBuildUpSnapshots) ואז תנועת
// זום/פאן איטית (Ken Burns) שמסונכרנת למשך הקריינות שנוצרה ב-#16
// (server/narration.ts). מוקלט ב-MediaRecorder + canvas.captureStream בדפדפן,
// בלי תלות ב-ffmpeg בסביבת Vercel serverless — בדיוק לפי התוכנית שתועדה שם.
//
// כתוביות עבריות בשכבת הרינדור (המשך ישיר ל-#17, לא פריט חדש בצ'קליסט): אותו
// תסריט קריינות שכבר קיים (narrationScript) מפוצל למקטעים ומצויר על הפריים
// עצמו, כי רוב הצפייה במדיה חברתית היא ללא קול — וידאו-קידום שקול הקריינות
// היחיד שלו הוא הפס האודיו מפספס את הקהל הזה. כש-narrationAlignment קיים
// (תזמון-תווים אמיתי מ-ElevenLabs with-timestamps, server/narration.ts) הכתוביות
// מסתנכרנות לדיבור בפועל (buildCaptionSegmentsFromAlignment); אחרת — או
// לקריינות ישנה שנשמרה לפני השדרוג הזה, או לכתוביות אנגלית מתורגמות שאין להן
// alignment משלהן — נופלות לקירוב לפי יחס אורך-תווים (buildCaptionSegments).
import type Konva from "konva";
import { wrapText } from "./autofit";
import type { NarrationAlignment } from "@shared/tts-hebrew";

const MAX_VIDEO_DIM = 1080;
const FPS = 30;
const FALLBACK_DURATION_SEC = 6;
// פתיח "בניית סצנה" (scene build-up): הוידאו לא נפתח על המודעה הגמורה אלא בונה
// אותה מול העיניים — רקע → עיטורים/צורות → תמונות → טיפוגרפיה לפי תפקיד
// (פתיח→כותרת→תוכן→תחתית) — ואז ממשיך ב-Ken Burns הרגיל על הקומפוזיציה
// המלאה. תקרת אורך הפתיח נמוכה ממחצית הקליפ כדי שהמודעה השלמה תמיד תחזיק
// את רוב זמן המסך.
const BUILDUP_MAX_SEC = 3.2;
const BUILDUP_MAX_FRACTION = 0.45;
const BUILDUP_MAX_TEXT_STEPS = 4;
// כשאין קריינות בכלל (רק מוזיקת רקע) אין קצב-דיבור שקובע אורך טבעי לוידאו,
// אז משתמשים באורך קליפ-קידום קצר סטנדרטי (8-15 שניות ברשתות חברתיות) במקום
// ב-FALLBACK_DURATION_SEC (שנשאר רק "רשת ביטחון" למקרה שמטא-דאטה של קריינות
// לא נטענה, לא ברירת מחדל למוזיקה-בלבד).
const MUSIC_ONLY_DURATION_SEC = 10;
const MAX_DURATION_SEC = 90; // תקרת ביטחון — קריינות ל-2000 תווים לא אמורה לעבור את זה
const ZOOM_END = 1.08;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function pickMimeType(): string {
  // webm קודם (Chrome/Firefox/Edge — התנהגות זהה לקודם), ואז MP4: ספארי
  // (macOS/iPhone/iPad) לא מקליט webm בכלל — כל שלושת מועמדי ה-webm נדחים —
  // ועד עכשיו הפונקציה החזירה "video/webm" בכל זאת, ובניית MediaRecorder זרקה
  // NotSupportedError: ייצוא הוידאו נכשל תמיד אצל כל משתמש ספארי. ספארי כן
  // מקליט video/mp4 (H.264/AAC), אז הוא המועמד הבא.
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
  ];
  if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported) {
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    // אף פורמט לא דוּוח כנתמך — עדיף לתת לדפדפן לבחור את ברירת המחדל שלו
    // (MediaRecorder בלי mimeType) מאשר לכפות מחרוזת שהוא הרגע דחה.
    return "";
  }
  return "video/webm";
}

/** סיומת הקובץ להורדה לפי מה שהוקלט בפועל — ספארי מפיק mp4, השאר webm. */
export function videoFileExtension(blob: Blob): "mp4" | "webm" {
  return blob.type.includes("mp4") ? "mp4" : "webm";
}

/** ממתין למשך האודיו האמיתי. data URL טעון במלואו בזיכרון (לא סטרימינג), ולכן
 * loadedmetadata אמור למסור duration תקין; אם לא (או שאין קריינות בכלל) —
 * נופל למשך קבוע כדי שהייצוא תמיד יסתיים ולא ייתקע. */
function waitForAudioDuration(audioEl: HTMLAudioElement): Promise<number> {
  if (Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
    return Promise.resolve(Math.min(audioEl.duration, MAX_DURATION_SEC));
  }
  return new Promise((resolve) => {
    const finish = () => {
      audioEl.removeEventListener("loadedmetadata", finish);
      const d = audioEl.duration;
      resolve(Number.isFinite(d) && d > 0 ? Math.min(d, MAX_DURATION_SEC) : FALLBACK_DURATION_SEC);
    };
    audioEl.addEventListener("loadedmetadata", finish, { once: true });
    setTimeout(finish, 4000);
  });
}

/** ציור Ken Burns בלי ניקוי הקנבס — כדי שאפשר יהיה לצייר שני מקורות זה על זה
 * (cross-fade בפתיח בניית-הסצנה) באותה טרנספורמציית זום/פאן בדיוק. */
function drawKenBurnsImage(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, vw: number, vh: number, t: number) {
  const p = easeInOut(t);
  const scale = 1 + (ZOOM_END - 1) * p;
  const sw = src.width / scale;
  const sh = src.height / scale;
  const dxMax = src.width - sw;
  const dyMax = src.height - sh;
  const sx = dxMax * 0.5 * p;
  const sy = dyMax * 0.35 * p;
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, vw, vh);
}

/** מצייר פריים בודד: זום איטי מהמרכז + פאן קל, לפי חלקיק זמן t ב-[0,1]. */
function drawKenBurnsFrame(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, vw: number, vh: number, t: number) {
  ctx.clearRect(0, 0, vw, vh);
  drawKenBurnsImage(ctx, src, vw, vh, t);
}

/** תיאור-שכבה מינימלי שהעורך מוסר לצורך פתיח בניית-הסצנה — לא TemplateDoc
 * מלא, כדי שהמודול יישאר בלי תלות בסכמת השכבות המלאה. */
export interface SceneLayerInfo {
  id: string;
  type: "text" | "image" | "shape" | "decoration";
  z?: number;
  visible?: boolean;
  /** LayerRole של שכבות טקסט (opener/title/subtitle/body/field/footer) — קובע את סדר הכניסה. */
  role?: string;
  y?: number;
}

// סדר-כניסה לטיפוגרפיה לפי תפקיד: פתיח לפני כותרת, תחתית אחרונה — כמו שמעצב
// מניח שכבות מול לקוח. תפקיד לא מוכר משתבץ אחרי התוכן ולפני התחתית.
const ROLE_ENTRY_ORDER: Record<string, number> = {
  opener: 0, title: 1, subtitle: 2, body: 3, field: 4, footer: 6,
};

/**
 * מחלק את השכבות הנראות לקבוצות-כניסה: [עיטורים+צורות], [תמונות], ואז שכבות
 * טקסט לפי תפקיד (ROLE_ENTRY_ORDER) ואז מיקום-אנכי — כל אחת שלב משלה, עד
 * BUILDUP_MAX_TEXT_STEPS שלבים (העודף מתמזג לשלב הטקסט האחרון כדי שפתיח לא
 * יהפוך למצגת אינסופית במודעות עמוסות). קבוצות ריקות נשמטות.
 */
export function buildEntranceGroups(layers: SceneLayerInfo[]): string[][] {
  const visible = layers.filter((l) => l.visible !== false && l.id);
  const byZ = (a: SceneLayerInfo, b: SceneLayerInfo) => (a.z ?? 0) - (b.z ?? 0);
  const scenery = visible.filter((l) => l.type === "shape" || l.type === "decoration").sort(byZ);
  const images = visible.filter((l) => l.type === "image").sort(byZ);
  const texts = visible
    .filter((l) => l.type === "text")
    .sort((a, b) => {
      const ra = ROLE_ENTRY_ORDER[a.role ?? ""] ?? 5;
      const rb = ROLE_ENTRY_ORDER[b.role ?? ""] ?? 5;
      return ra !== rb ? ra - rb : (a.y ?? 0) - (b.y ?? 0);
    });

  const groups: string[][] = [];
  if (scenery.length) groups.push(scenery.map((l) => l.id));
  if (images.length) groups.push(images.map((l) => l.id));
  const textSteps = Math.min(texts.length, BUILDUP_MAX_TEXT_STEPS);
  for (let i = 0; i < textSteps; i++) {
    groups.push(
      i === textSteps - 1 ? texts.slice(i).map((l) => l.id) : [texts[i].id],
    );
  }
  return groups;
}

/**
 * מצלם את הבמה בשלבי-חשיפה מצטברים: רקע בלבד, ואז כל קבוצת-כניסה נוספת מעל
 * קודמותיה. מסתיר צמתים לפי id (CanvasStage נותן לכל צומת-שורש את מזהה
 * השכבה שלו), מצלם, ומשחזר את הנראוּת — הכל סינכרוני בתוך אותה משימת JS,
 * כך שהעורך על המסך לא מהבהב. צומת שלא אותר (שכבה ישנה בלי id על הצומת)
 * פשוט נשאר גלוי בכל התמונות — במקרה הגרוע הוא "כבר שם" מהפריים הראשון,
 * אף פעם לא נעלם מהתוצאה.
 */
function captureBuildUpSnapshots(stage: Konva.Stage, groups: string[][], pixelRatio: number): HTMLCanvasElement[] {
  const allIds = new Set(groups.flat());
  const nodes = stage.find((n: Konva.Node) => allIds.has(n.id()));
  if (!nodes.length) return [];
  const byId = new Map<string, Konva.Node[]>();
  for (const n of nodes) {
    const arr = byId.get(n.id()) ?? [];
    arr.push(n);
    byId.set(n.id(), arr);
  }
  const snapshots: HTMLCanvasElement[] = [];
  try {
    nodes.forEach((n) => n.visible(false));
    snapshots.push(stage.toCanvas({ pixelRatio })); // רקע בלבד
    for (const group of groups) {
      for (const id of group) byId.get(id)?.forEach((n) => n.visible(true));
      snapshots.push(stage.toCanvas({ pixelRatio }));
    }
  } finally {
    // כל הצמתים שהוסתרו רונדרו כנראים (שכבת visible===false לא מרונדרת בכלל
    // ב-CanvasStage) — שחזור ל-true מחזיר את הבמה בדיוק למצבה.
    nodes.forEach((n) => n.visible(true));
    stage.batchDraw();
  }
  return snapshots;
}

interface CaptionSegment {
  text: string;
  start: number;
  end: number;
}

const MAX_CAPTION_CHARS = 70; // ~2 שורות קריאות ברוחב סרטון סטנדרטי

/** מפצל תסריט קריינות חופשי למשפטים, ומפוצל שוב משפט ארוך מדי בגבול מילה. */
function splitIntoCaptionChunks(script: string): string[] {
  const sentences = script
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= MAX_CAPTION_CHARS) {
      chunks.push(sentence);
      continue;
    }
    const words = sentence.split(" ");
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (test.length > MAX_CAPTION_CHARS && cur) {
        chunks.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) chunks.push(cur);
  }
  return chunks;
}

/**
 * מחלק את משך הוידאו בין מקטעי הכתוביות לפי יחס אורך-תווים (אין timestamps
 * אמיתיים מהקריינות), עם רצפת-זמן מינימלית כדי שמקטע קצר לא יהבהב ויעלם.
 */
export function buildCaptionSegments(script: string, totalDurationSec: number): CaptionSegment[] {
  const chunks = splitIntoCaptionChunks(script);
  if (!chunks.length || !(totalDurationSec > 0)) return [];
  const MIN_SEC = 1.1;
  const totalChars = chunks.reduce((sum, c) => sum + c.length, 0) || 1;
  const raw = chunks.map((text) => Math.max(MIN_SEC, (text.length / totalChars) * totalDurationSec));
  const scale = totalDurationSec / raw.reduce((a, b) => a + b, 0);
  const segments: CaptionSegment[] = [];
  let t = 0;
  chunks.forEach((text, i) => {
    const dur = raw[i] * scale;
    segments.push({ text, start: t, end: t + dur });
    t += dur;
  });
  return segments;
}

/** מנרמל רשימת-תווים לאותה נורמליזציית-רווחים ש-splitIntoCaptionChunks מבצעת
 * (\s+ -> " ", trim), תוך שמירת מיפוי בין מיקום בטקסט המנורמל למיקום המקורי
 * במערך התווים של ה-alignment — כדי לתרגם היסט של מקטע-כתובית בטקסט המנורמל
 * בחזרה לתזמון האמיתי (startTimes/endTimes) מ-ElevenLabs. */
function normalizeWithIndexMap(characters: string[]): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  let lastWasSpace = true; // מדמה trim() בתחילת הטקסט — רווח מוביל לא נכנס
  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    if (/\s/.test(ch)) {
      if (!lastWasSpace) {
        text += " ";
        map.push(i);
      }
      lastWasSpace = true;
    } else {
      text += ch;
      map.push(i);
      lastWasSpace = false;
    }
  }
  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    map.pop();
  }
  return { text, map };
}

/**
 * מתזמן כתוביות לפי תזמון-תווים אמיתי מ-ElevenLabs (server/narration.ts,
 * with-timestamps) במקום הקירוב לפי יחס אורך-תווים ב-buildCaptionSegments.
 * alignment.characters הוא בדיוק הטקסט ה"בטוח" שנשלח לקריינות (לא בהכרח זהה
 * מילה-במילה ל-narrationScript הגולמי, למשל מספרים שהומרו למילים) — לכן
 * הכתוביות נבנות מתוכו ישירות, לא מ-narrationScript. כשל התאמה (ריק/לא
 * תקין) מחזיר [] כדי שהקורא ייפול חזרה לקירוב הרגיל — אפס רגרסיה.
 */
export function buildCaptionSegmentsFromAlignment(
  alignment: NarrationAlignment | null | undefined,
  totalDurationSec: number,
): CaptionSegment[] {
  if (!alignment?.characters?.length || !(totalDurationSec > 0)) return [];
  const { characters, startTimes, endTimes } = alignment;
  if (characters.length !== startTimes?.length || characters.length !== endTimes?.length) return [];

  const { text: normalizedText, map } = normalizeWithIndexMap(characters);
  const chunks = splitIntoCaptionChunks(normalizedText);
  if (!chunks.length) return [];

  const MIN_SEC = 1.1;
  const segments: CaptionSegment[] = [];
  let searchFrom = 0;
  for (const chunkText of chunks) {
    const idx = normalizedText.indexOf(chunkText, searchFrom);
    if (idx === -1) return []; // לא אמור לקרות — chunks נגזרו מ-normalizedText עצמו
    const lastIdx = idx + chunkText.length - 1;
    const start = startTimes[map[idx]] ?? 0;
    const rawEnd = endTimes[map[lastIdx]] ?? start;
    const end = Math.min(Math.max(rawEnd, start + MIN_SEC), totalDurationSec);
    segments.push({ text: chunkText, start, end });
    searchFrom = idx + chunkText.length;
  }
  segments[segments.length - 1].end = Math.max(segments[segments.length - 1].end, totalDurationSec);
  return segments;
}

function activeCaption(segments: CaptionSegment[], elapsedSec: number): string | null {
  for (const s of segments) {
    if (elapsedSec >= s.start && elapsedSec < s.end) return s.text;
  }
  return segments.length && elapsedSec >= segments[segments.length - 1].start
    ? segments[segments.length - 1].text
    : null;
}

/**
 * מצייר את שורת/שורות הכתובית הפעילה בתחתית הפריים, עם פס רקע כהה לקריאות.
 * `textEn` אופציונלי — כתובית אנגלית מקבילה (מ-#/api/ai/translate-captions),
 * מצוירת מתחת לעברית באותו פס-רקע, פונט קטן יותר, LTR. כש-textEn חסר ההתנהגות/
 * המידות זהות ל-100% למה שהיה קודם (בלוק עברית בלבד) — אפס רגרסיה.
 */
function drawCaptionOverlay(ctx: CanvasRenderingContext2D, vw: number, vh: number, text: string, textEn?: string | null) {
  const fontSize = Math.max(20, Math.min(44, Math.round(vh * 0.045)));
  const maxWidth = vw * 0.86;
  const lines = wrapText(text, fontSize, "Heebo", true, maxWidth).slice(0, 3);
  const lineHeight = fontSize * 1.3;
  const padY = fontSize * 0.6;

  const fontSizeEn = Math.round(fontSize * 0.66);
  const lineHeightEn = fontSizeEn * 1.25;
  const linesEn = textEn ? wrapText(textEn, fontSizeEn, "Heebo", false, maxWidth).slice(0, 2) : [];
  const gapEn = linesEn.length ? padY * 0.5 : 0;

  const boxHeight = lines.length * lineHeight + padY * 2 + linesEn.length * lineHeightEn + gapEn;
  const boxBottom = vh - vh * 0.06;
  const boxTop = boxBottom - boxHeight;

  ctx.save();
  ctx.fillStyle = "rgba(10, 10, 10, 0.58)";
  const radius = 14;
  const boxLeft = vw * 0.05;
  const boxWidth = vw * 0.9;
  ctx.beginPath();
  ctx.moveTo(boxLeft + radius, boxTop);
  ctx.arcTo(boxLeft + boxWidth, boxTop, boxLeft + boxWidth, boxTop + boxHeight, radius);
  ctx.arcTo(boxLeft + boxWidth, boxTop + boxHeight, boxLeft, boxTop + boxHeight, radius);
  ctx.arcTo(boxLeft, boxTop + boxHeight, boxLeft, boxTop, radius);
  ctx.arcTo(boxLeft, boxTop, boxLeft + boxWidth, boxTop, radius);
  ctx.closePath();
  ctx.fill();

  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontSize}px "Heebo"`;
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 4;
  lines.forEach((line, i) => {
    const y = boxTop + padY + lineHeight * i + lineHeight / 2;
    ctx.fillText(line, vw / 2, y);
  });

  if (linesEn.length) {
    const enBlockTop = boxTop + padY + lines.length * lineHeight + gapEn;
    ctx.direction = "ltr";
    ctx.font = `500 ${fontSizeEn}px "Heebo"`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.shadowBlur = 3;
    linesEn.forEach((line, i) => {
      const y = enBlockTop + lineHeightEn * i + lineHeightEn / 2;
      ctx.fillText(line, vw / 2, y);
    });
  }
  ctx.restore();
}

export interface PromoVideoOptions {
  /** data:audio/mpeg;base64,... שכבר נוצר ב-server/narration.ts (שלב 5, #16). */
  narrationAudioUrl?: string | null;
  /** תסריט הקריינות החופשי — כשקיים וגם showCaptions!==false, מוצג ככתוביות בפריימים. */
  narrationScript?: string | null;
  /** תזמון-תווים אמיתי מ-ElevenLabs (server/narration.ts) לאותה קריינות שיצרה
   *  narrationAudioUrl — כשקיים, הכתוביות מסתנכרנות לדיבור בפועל (
   *  buildCaptionSegmentsFromAlignment) במקום קירוב לפי אורך-תווים. חסר/לא
   *  תואם = נופל אוטומטית לקירוב הישן, בדיוק כמו קודם. */
  narrationAlignment?: NarrationAlignment | null;
  /** ברירת מחדל: true כש-narrationScript קיים. אפשר לכבות מה-UI. */
  showCaptions?: boolean;
  /** תרגום אנגלי אופציונלי של narrationScript (POST /api/ai/translate-captions) —
   * כשקיים, מוצג כשורה שנייה מתחת לכתובית העברית. חסר = בלוק עברית בלבד, כמו קודם. */
  captionScriptEn?: string | null;
  /** blob:/object URL של קובץ מוזיקה שהלקוח העלה בעצמו (אין ספריית מוזיקה מוכנה —
   * לא ממציאים מקור מוזיקה; רק מערבבים מה שהמשתמש בחר). חסר = בלי מוזיקה, כמו קודם. */
  musicUrl?: string | null;
  /** עוצמת המוזיקה יחסית לקריינות, 0–1. ברירת מחדל 0.25 (מוזיקה ברקע, לא מתחרה בקריינות). */
  musicVolume?: number;
  /** תיאורי השכבות של המסמך (id/type/z/role/visible) — נדרש לפתיח בניית-הסצנה.
   * חסר/ריק = בלי פתיח, Ken Burns על הקומפוזיציה המלאה מהפריים הראשון, כמו קודם. */
  sceneLayers?: SceneLayerInfo[] | null;
  /** פתיח בניית-סצנה (רקע → עיטורים → תמונות → טיפוגרפיה). ברירת מחדל: true
   * כש-sceneLayers קיים. false = ההתנהגות הישנה בדיוק. */
  sceneBuildUp?: boolean;
  onProgress?: (fraction: number) => void;
}

/**
 * מרכיב וידאו קידום אמיתי מתוך תבנית סטטית: תמונה ברזולוציה מלאה (כמו PNG),
 * תנועת Ken Burns על פני משך הקריינות, ופס קול מהקריינות עצמה (אם קיימת).
 * מחזיר Blob של webm להורדה/שיתוף — לא נוגע ברינדור/בשמירה/בייצוא הקיימים.
 */
export async function exportPromoVideo(
  stage: Konva.Stage,
  fullWidth: number,
  fullHeight: number,
  opts: PromoVideoOptions = {},
): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("הדפדפן הזה לא תומך בהקלטת וידאו (MediaRecorder חסר)");
  }

  const displayW = stage.width();
  const basePixelRatio = fullWidth / displayW; // כמו stageToDataURL ב-lib/exporter.ts
  const longSide = Math.max(fullWidth, fullHeight);
  const videoScale = Math.min(1, MAX_VIDEO_DIM / longSide);
  const sourceCanvas = stage.toCanvas({ pixelRatio: basePixelRatio * videoScale });
  const vw = sourceCanvas.width;
  const vh = sourceCanvas.height;

  // פתיח בניית-סצנה — צילום שלבי-החשיפה חייב לקרות כאן, באותו רגע-במה שבו
  // צולמה הקומפוזיציה המלאה (לפני כל await), כדי ששני המקורות יהיו זהים
  // פיקסל-לפיקסל פרט לשכבות הנכנסות. כשל שקט = בלי פתיח, כמו קודם.
  let buildUpSnapshots: HTMLCanvasElement[] = [];
  if (opts.sceneBuildUp !== false && opts.sceneLayers?.length) {
    try {
      const groups = buildEntranceGroups(opts.sceneLayers);
      if (groups.length) {
        buildUpSnapshots = captureBuildUpSnapshots(stage, groups, basePixelRatio * videoScale);
      }
    } catch {
      buildUpSnapshots = []; // אסור שהפתיח יפיל ייצוא שעבד עד היום
    }
  }

  let audioEl: HTMLAudioElement | null = null;
  let duration = FALLBACK_DURATION_SEC;
  if (opts.narrationAudioUrl) {
    audioEl = new Audio(opts.narrationAudioUrl);
    audioEl.preload = "auto";
    duration = await waitForAudioDuration(audioEl);
  }

  // מוזיקת רקע — קובץ שהמשתמש העלה בעצמו (אין ספריית מוזיקה חינמית מוכנה בכלי,
  // ולכן לא ממציאים מקור; רק מערבבים את מה שנבחר). לולאה אם קצר ממשך הקריינות.
  let musicEl: HTMLAudioElement | null = null;
  if (opts.musicUrl) {
    musicEl = new Audio(opts.musicUrl);
    musicEl.preload = "auto";
    musicEl.loop = true;
    musicEl.volume = 1; // הכמות בפועל נשלטת ב-GainNode בהמשך, לא כאן
  }

  // אין קריינות בכלל אבל יש מוזיקת רקע (וידאו קידום שקט עם מוזיקה בלבד — פורמט
  // נפוץ ברשתות חברתיות) — אין קצב-דיבור לסנכרן איתו, אז המשך הוידאו הוא אורך
  // קליפ קבוע (MUSIC_ONLY_DURATION_SEC), לא נופל ל-FALLBACK_DURATION_SEC הקצר
  // שנועד רק כרשת-ביטחון לכשל טעינת מטא-דאטה של קריינות.
  if (!opts.narrationAudioUrl && musicEl) {
    duration = MUSIC_ONLY_DURATION_SEC;
  }

  const wantCaptions = opts.showCaptions !== false && !!opts.narrationScript?.trim();
  const alignedSegments = wantCaptions ? buildCaptionSegmentsFromAlignment(opts.narrationAlignment, duration) : [];
  const captionSegments = alignedSegments.length
    ? alignedSegments
    : wantCaptions
      ? buildCaptionSegments(opts.narrationScript!, duration)
      : [];
  const captionSegmentsEn = wantCaptions && opts.captionScriptEn?.trim()
    ? buildCaptionSegments(opts.captionScriptEn, duration)
    : [];

  const recordCanvas = document.createElement("canvas");
  recordCanvas.width = vw;
  recordCanvas.height = vh;
  const ctx = recordCanvas.getContext("2d");
  if (!ctx) throw new Error("לא ניתן ליצור הקשר ציור לקנבס הוידאו");

  // ציר-זמן הפתיח: כל מעבר (רקע→קבוצה 1→...→קומפוזיציה מלאה) מקבל פרוסה שווה
  // מתוך אורך הפתיח. ה-Ken Burns רץ ברציפות מ-t=0 על כל מקור שמצויר, כך
  // שהמעבר מהפתיח להמשך חלק — אותה טרנספורמציה, בלי קפיצה.
  const buildUpSec = buildUpSnapshots.length >= 2
    ? Math.min(BUILDUP_MAX_SEC, duration * BUILDUP_MAX_FRACTION)
    : 0;
  // מספר המעברים = צילומים-1 (רקע→קבוצה 1→...→הצילום האחרון, שהוא כבר
  // הקומפוזיציה המלאה); אחרי הפתיח עוברים ל-sourceCanvas — זהה ויזואלית
  // לצילום האחרון, כך שאין קפיצה.
  const buildUpStepSec = buildUpSec > 0 ? buildUpSec / (buildUpSnapshots.length - 1) : 0;

  function renderFrame(elapsedSec: number, t: number) {
    if (buildUpSec > 0 && elapsedSec < buildUpSec) {
      const step = Math.min(buildUpSnapshots.length - 2, Math.floor(elapsedSec / buildUpStepSec));
      const p = easeInOut(Math.min(1, (elapsedSec - step * buildUpStepSec) / buildUpStepSec));
      drawKenBurnsFrame(ctx!, buildUpSnapshots[step], vw, vh, t);
      ctx!.save();
      ctx!.globalAlpha = p;
      drawKenBurnsImage(ctx!, buildUpSnapshots[step + 1], vw, vh, t);
      ctx!.restore();
    } else {
      drawKenBurnsFrame(ctx!, sourceCanvas, vw, vh, t);
    }
    if (captionSegments.length) {
      const text = activeCaption(captionSegments, elapsedSec);
      const textEn = captionSegmentsEn.length ? activeCaption(captionSegmentsEn, elapsedSec) : null;
      if (text) drawCaptionOverlay(ctx!, vw, vh, text, textEn);
    }
  }

  renderFrame(0, 0);

  const canvasStream = (recordCanvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(FPS);
  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
  let audioCtx: AudioContext | null = null;
  // נשמר מחוץ ל-try כדי שאפשר יהיה לתזמן עמעום-סיום אחרי שהניגון מתחיל בפועל.
  let musicGainNode: GainNode | null = null;
  let musicBaseGain = 0;
  if (audioEl || musicEl) {
    // פס הקול נבנה תמיד דרך WebAudio — גם לקריינות-בלבד, לא רק לערבוב עם
    // מוזיקה. המסלול הישן לקריינות-בלבד הסתמך על HTMLMediaElement.captureStream,
    // שספארי לא מממש בכלל ופיירפוקס חושף רק בקידומת (mozCaptureStream) — שם
    // בדיקת ה-typeof פשוט דילגה על האודיו, ווידאו שהובטחה לו קריינות ירד אילם,
    // בלי שום שגיאה. createMediaElementSource + MediaStreamDestination הוא בדיוק
    // המסלול שכבר הוכח כאן לערבוב המוזיקה ועובד בכל שלושת הדפדפנים.
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new Ctx();
      const dest = audioCtx.createMediaStreamDestination();
      if (audioEl) {
        const narrGain = audioCtx.createGain();
        narrGain.gain.value = 1;
        const narrSrc = audioCtx.createMediaElementSource(audioEl);
        narrSrc.connect(narrGain).connect(dest);
        narrGain.connect(audioCtx.destination); // האזנה חיה בזמן הרכבה, כמו קודם
      }
      if (musicEl) {
        const musicGain = audioCtx.createGain();
        musicGain.gain.value = Math.max(0, Math.min(1, opts.musicVolume ?? 0.25));
        const musicSrc = audioCtx.createMediaElementSource(musicEl);
        musicSrc.connect(musicGain).connect(dest);
        musicGain.connect(audioCtx.destination);
        musicGainNode = musicGain;
        musicBaseGain = musicGain.gain.value;
      }
      // AudioContext שנוצר במצב suspended (מדיניות autoplay) מזרים שקט ל-dest —
      // וידאו שלם היה יוצא אילם. הייצוא מופעל מלחיצת כפתור, אז resume מותר.
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      tracks.push(...dest.stream.getAudioTracks());
    } catch {
      // AudioContext/createMediaElementSource לא נתמכים — נופלים ל-captureStream
      // של אלמנט הקריינות (כולל הקידומת של פיירפוקס), אותה רשת-ביטחון כמו קודם;
      // מוזיקה בלי WebAudio נשארת בחוץ, כמו בהתנהגות הקודמת.
      if (audioCtx) audioCtx.close().catch(() => {});
      audioCtx = null;
      musicGainNode = null;
      const capture = audioEl && ((audioEl as any).captureStream ?? (audioEl as any).mozCaptureStream);
      if (typeof capture === "function") {
        try {
          tracks.push(...(capture.call(audioEl) as MediaStream).getAudioTracks());
        } catch {
          // בלי פס קול בכלל — לא קריטי.
        }
      }
    }
  }

  const mimeType = pickMimeType();
  // mimeType ריק = "לא נמצא מועמד נתמך": בונים בלי mimeType כדי שהדפדפן יקליט
  // בפורמט הטבעי שלו במקום לזרוק, וקוראים את recorder.mimeType לסוג ה-Blob.
  const recorder = new MediaRecorder(
    new MediaStream(tracks),
    mimeType ? { mimeType, videoBitsPerSecond: 5_000_000 } : { videoBitsPerSecond: 5_000_000 },
  );
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<Blob>((resolve) => {
    // recorder.mimeType מאוכלס בוודאות רק אחרי start() — לכן סוג ה-Blob נקרא
    // כאן, בעצירה, ולא בזמן הבנייה (חשוב במסלול ה-mimeType הריק).
    recorder.onstop = () => {
      const containerType = (mimeType || recorder.mimeType || "video/webm").split(";")[0];
      resolve(new Blob(chunks, { type: containerType }));
    };
  });

  recorder.start();
  if (audioEl) {
    audioEl.currentTime = 0;
    await audioEl.play().catch(() => {});
  }
  if (musicEl) {
    musicEl.currentTime = 0;
    await musicEl.play().catch(() => {});
    // עמעום-סיום למוזיקה: הקליפ נגמר כשהקריינות נגמרת (או בתום קליפ-מוזיקה
    // קבוע), והמוזיקה המתנגנת בלולאה פשוט נקטעה באמצע תו — סיום חובבני בוידאו
    // שאמור להיות שיווקי. מתוזמן מרגע תחילת הניגון בפועל, רק במסלול הערבוב
    // (יש GainNode); במסלול-הנפילה בלי AudioContext אין ידית עוצמה לעמעם בה.
    if (musicGainNode && audioCtx) {
      const fadeSec = Math.min(1.5, duration * 0.2);
      const now = audioCtx.currentTime;
      musicGainNode.gain.setValueAtTime(musicBaseGain, now + Math.max(0, duration - fadeSec));
      musicGainNode.gain.linearRampToValueAtTime(0.0001, now + duration);
    }
  }

  const startTime = performance.now();
  await new Promise<void>((resolve) => {
    function frame() {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(1, elapsed / duration);
      renderFrame(elapsed, t);
      opts.onProgress?.(t);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });

  if (audioEl) audioEl.pause();
  if (musicEl) musicEl.pause();
  if (audioCtx) audioCtx.close().catch(() => {});
  recorder.stop();
  return stopped;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
