// ---------------------------------------------------------------------------
// מנוע התמלול — תמלול שיעורי תורה בעברית באיכות הגבוהה ביותר שאפשר להשיג
// מהמפתחות שקיימים בפועל.
//
// מה שהיה קודם: קריאה אחת ל-`whisper-1` בלי שום הקשר, עם תקרה קשיחה של 25MB.
// מה שהתקבל בפועל על הקלטות אמיתיות מהארכיון (1,137 הקלטות) — למשל 217.wav:
//
//   "ירחם אישי גיין בן תמוז תפשין פבאב ... ירי שמיים ... השולחן ברוך"
//
// כלומר "יראת שמיים" הפך ל"ירי שמיים" ו"השולחן ערוך" ל"השולחן ברוך", ובכל
// 2,230 התווים היו **ארבעה** סימני פיסוק — טקסט שאי אפשר לקרוא.
//
// שלוש סיבות, ולכל אחת טיפול כאן:
//
// 1. המודל. `whisper-1` הוא הישן שבחבורה. בחשבון הזה זמינים גם
//    `gpt-4o-transcribe` ו-`gpt-transcribe`. הבחירה ביניהם נעשית לפי מדידה על
//    הקלטות אמיתיות (ראה `/api/lab/transcribe`), לא לפי הנחה.
//
// 2. חוסר הקשר. מנוע תמלול מכריע בין מילים שנשמעות זהה לפי מה שהוא מצפה
//    לשמוע. שיעור תורה מלא במונחים ובשמות שאינם בעברית יומיומית, ובלי רמז
//    מוקדם המנוע בוחר את המילה השכיחה. ה-prompt למטה הוא בדיוק הרמז הזה.
//
// 3. אורך. מעל 25MB הבקשה נדחית — כלומר שיעור ארוך פשוט לא תומלל. כאן האודיו
//    נחתך לקטעים על גבולות חוקיים של הפורמט, ולכל קטע מועבר סוף הטקסט הקודם
//    כהקשר, כדי שהתפר לא ייראה.
// ---------------------------------------------------------------------------

const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";

/** התקרה הרשמית היא 25MB. משאירים שוליים ל-multipart עצמו. */
const MAX_REQUEST_BYTES = 24 * 1024 * 1024;

/** חפיפה בין קטעים, כדי שמילה שנחתכה באמצע תיאמר במלואה באחד מהם. */
const CHUNK_OVERLAP_SECONDS = 2;

export type TranscribeResult = {
  text: string;
  segments: { start: number | null; end: number | null; text: string }[];
  model: string;
  chunks: number;
  /** קטעים שהמנוע עצמו סימן כלא־בטוחים — לעורך יש מה לבדוק. */
  lowConfidence: { start: number | null; end: number | null; text: string; reason: string }[];
};

// ---------------------------------------------------------------------------
// ההקשר שניתן למנוע לפני שהוא מתחיל
// ---------------------------------------------------------------------------
// זו אינה "רשימת מילים לתקן" — המנוע אינו מבצע כאן החלפות. זהו טקסט שמטה את
// ההסתברויות: אחרי שראה "שולחן ערוך" הוא מעדיף אותו על "השולחן ברוך".
//
// ⚠️ נמדד, ולא כפי שציפיתי: מול `gpt-transcribe` ההקשר הזה כמעט לא משנה. על
// שתי הקלטות מהארכיון (217.wav, 216.wav) התוצאה עם ההקשר ובלעדיו הייתה כמעט
// זהה — המודל תיקן בעצמו גם "הסתלפותו"→"הסתלקותו" וגם "הרב המוס גואטה"→
// "הרב משה גואטה". השדרוג האמיתי כאן הוא המודל, לא הרשימה.
//
// ההקשר נשאר כי הוא זול, כי שתי הקלטות אינן ראיה לאודיו רועש או לדובר קשה,
// וכי אין לו מחיר נצפה. הוא קוצר בכוונה לצירופים שבאמת נשמעים זהה לצירוף אחר,
// כי רשימה ארוכה מדי היא בעצמה סיכון — היא מזמינה את המנוע לשמוע מונח שברשימה
// גם כשלא נאמר.
const TORAH_PROMPT = [
  "שיעור תורה בעברית.",
  "שולחן ערוך, משנה ברורה, תיקון חצות, ירא שמים, חורבן בית המקדש.",
  "פרשת שלח לך, שבת קודש, לשון הרע, חס ושלום, אור החיים הקדוש.",
].join(" ");

// ---------------------------------------------------------------------------
// חיתוך אודיו לקטעים בגבולות חוקיים של הפורמט
// ---------------------------------------------------------------------------
// אין ffmpeg בסביבת ה-serverless, ולכן החיתוך נעשה על המבנה של הקובץ עצמו.
// WAV ו-MP3 מכסים את כל הארכיון; פורמט אחר עובר כמו שהוא ונכשל רק אם הוא באמת
// גדול מדי — וזה נאמר למשתמש במפורש ולא נבלע.

type Chunk = { buf: Buffer; offsetSeconds: number };

/** WAV לא דחוס: אפשר לחתוך בכל גבול דגימה ולכתוב כותרת חדשה לכל קטע. */
function splitWav(buf: Buffer): Chunk[] | null {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    return null;
  }
  // מאתרים את fmt ו-data במקום להניח כותרת של 44 בתים.
  let pos = 12;
  let fmt: Buffer | null = null;
  let dataStart = -1;
  let dataLen = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === "fmt ") fmt = buf.subarray(pos + 8, pos + 8 + size);
    else if (id === "data") { dataStart = pos + 8; dataLen = Math.min(size, buf.length - dataStart); break; }
    pos += 8 + size + (size % 2);
  }
  if (!fmt || dataStart < 0 || fmt.length < 16) return null;

  const channels = fmt.readUInt16LE(2);
  const sampleRate = fmt.readUInt32LE(4);
  const bitsPerSample = fmt.readUInt16LE(14);
  const blockAlign = Math.max(1, (channels * bitsPerSample) / 8);
  const bytesPerSecond = sampleRate * blockAlign;
  if (!bytesPerSecond) return null;

  const headerBytes = 44;
  const maxData = Math.floor((MAX_REQUEST_BYTES - headerBytes) / blockAlign) * blockAlign;
  if (dataLen <= maxData) return [{ buf, offsetSeconds: 0 }];

  const overlapBytes = Math.floor(CHUNK_OVERLAP_SECONDS * bytesPerSecond / blockAlign) * blockAlign;
  const chunks: Chunk[] = [];
  let start = 0;
  while (start < dataLen) {
    const end = Math.min(start + maxData, dataLen);
    const slice = buf.subarray(dataStart + start, dataStart + end);
    chunks.push({ buf: wrapWav(slice, channels, sampleRate, bitsPerSample), offsetSeconds: start / bytesPerSecond });
    if (end >= dataLen) break;
    start = end - overlapBytes;
  }
  return chunks;
}

function wrapWav(data: Buffer, channels: number, sampleRate: number, bits: number): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bits) / 8;
  const blockAlign = (channels * bits) / 8;
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bits, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/** MP3: חותכים רק על תחילת פריים, אחרת הקטע לא ניתן לפענוח. */
function splitMp3(buf: Buffer): Chunk[] | null {
  const RATES_V1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const RATES_V2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const SAMPLE_RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

  let pos = 0;
  // מדלגים על תג ID3v2 אם קיים.
  if (buf.length > 10 && buf.toString("ascii", 0, 3) === "ID3") {
    pos = 10 + ((buf[6] & 0x7f) << 21 | (buf[7] & 0x7f) << 14 | (buf[8] & 0x7f) << 7 | (buf[9] & 0x7f));
  }
  const frames: { offset: number; length: number; seconds: number }[] = [];
  while (pos + 4 <= buf.length) {
    if (buf[pos] !== 0xff || (buf[pos + 1] & 0xe0) !== 0xe0) { pos++; continue; }
    const versionBits = (buf[pos + 1] >> 3) & 0x03;
    const layerBits = (buf[pos + 1] >> 1) & 0x03;
    if (layerBits !== 0x01) { pos++; continue; } // Layer III בלבד
    const bitrateIdx = (buf[pos + 2] >> 4) & 0x0f;
    const sampleIdx = (buf[pos + 2] >> 2) & 0x03;
    const padding = (buf[pos + 2] >> 1) & 0x01;
    const rates = versionBits === 3 ? RATES_V1L3 : RATES_V2L3;
    const sampleRates = SAMPLE_RATES[versionBits];
    if (!sampleRates || bitrateIdx === 0 || bitrateIdx === 15 || sampleIdx === 3) { pos++; continue; }
    const bitrate = rates[bitrateIdx] * 1000;
    const sampleRate = sampleRates[sampleIdx];
    const samplesPerFrame = versionBits === 3 ? 1152 : 576;
    const length = Math.floor((samplesPerFrame / 8) * bitrate / sampleRate) + padding;
    if (length <= 4) { pos++; continue; }
    frames.push({ offset: pos, length, seconds: samplesPerFrame / sampleRate });
    pos += length;
  }
  if (frames.length < 2) return null;
  if (buf.length <= MAX_REQUEST_BYTES) return [{ buf, offsetSeconds: 0 }];

  const chunks: Chunk[] = [];
  let i = 0;
  let elapsed = 0;
  while (i < frames.length) {
    const startFrame = i;
    const startOffset = frames[i].offset;
    const startSeconds = elapsed;
    let bytes = 0;
    while (i < frames.length && bytes + frames[i].length <= MAX_REQUEST_BYTES) {
      bytes += frames[i].length;
      elapsed += frames[i].seconds;
      i++;
    }
    if (i === startFrame) break; // פריים בודד גדול מהתקרה — לא אמור לקרות
    const end = i < frames.length ? frames[i].offset : buf.length;
    chunks.push({ buf: buf.subarray(startOffset, end), offsetSeconds: startSeconds });
    // חוזרים מעט אחורה לחפיפה
    let back = 0;
    while (i > startFrame + 1 && back < CHUNK_OVERLAP_SECONDS) { i--; back += frames[i].seconds; elapsed -= frames[i].seconds; }
  }
  return chunks;
}

export function splitAudio(buf: Buffer, ext: string): { chunks: Chunk[]; splittable: boolean } {
  const byExt = ext === "wav" ? splitWav(buf) : ext === "mp3" ? splitMp3(buf) : null;
  const generic = splitWav(buf) ?? splitMp3(buf); // הסיומת לא תמיד נאמנה לתוכן
  const chunks = byExt ?? generic;
  if (chunks) return { chunks, splittable: true };
  return { chunks: [{ buf, offsetSeconds: 0 }], splittable: false };
}

// ---------------------------------------------------------------------------
// קריאה למנוע
// ---------------------------------------------------------------------------

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac",
    ogg: "audio/ogg", opus: "audio/ogg", webm: "audio/webm", flac: "audio/flac",
  };
  return map[ext] || "audio/mpeg";
}

export function openaiKey(): string {
  // מפתח שנכתב דרך pipeline של PowerShell מקבל BOM, ואז כותרת ה-Authorization
  // נבנית עם תו בלתי חוקי והבקשה נכשלת בהודעה שלא מרמזת על הסיבה.
  const key = (process.env.OPENAI_API_KEY || "").replace(/﻿/g, "").trim();
  if (!key) throw new Error("OPENAI_API_KEY אינו מוגדר בפריסה");
  return key;
}

/** `verbose_json` (ואיתו חותמות זמן) קיים רק ב-whisper-1. */
function supportsSegments(model: string): boolean {
  return model === "whisper-1";
}

async function transcribeChunk(
  chunk: Chunk,
  ext: string,
  model: string,
  prompt: string,
): Promise<{ text: string; segments: TranscribeResult["segments"]; lowConfidence: TranscribeResult["lowConfidence"] }> {
  const form = new FormData();
  form.append("file", new Blob([chunk.buf], { type: mimeFromExt(ext) }), `audio.${ext}`);
  form.append("model", model);
  form.append("language", "he");
  if (prompt) form.append("prompt", prompt);
  // 0 = בלי דגימה אקראית. תמלול הוא משימת זיהוי, לא כתיבה.
  form.append("temperature", "0");
  form.append("response_format", supportsSegments(model) ? "verbose_json" : "json");

  // maxDuration בפריסה הוא 300s ועלולים לרוץ כמה קטעים ברצף (ראה transcribe()
  // למטה) — טיימאאוט לקטע בודד מונע מקריאה תקועה אחת לבלוע את כל התקציב על
  // חשבון הקטעים שאחריה, בלי לחתוך תמלול אמיתי שפשוט לוקח זמן.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  let res: Response;
  try {
    res = await fetch(OPENAI_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey()}` },
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    throw new Error(`מנוע התמלול החזיר שגיאה (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const data: any = await res.json();

  const segments: TranscribeResult["segments"] = [];
  const lowConfidence: TranscribeResult["lowConfidence"] = [];
  if (Array.isArray(data?.segments)) {
    for (const s of data.segments) {
      const seg = {
        start: s.start != null ? Number(s.start) + chunk.offsetSeconds : null,
        end: s.end != null ? Number(s.end) + chunk.offsetSeconds : null,
        text: String(s.text ?? "").trim(),
      };
      segments.push(seg);
      // המנוע מדווח כמה הוא בטוח. קטע חלש הוא בדיוק המקום שבו נולדות שגיאות
      // כמו "ירי שמיים", ולעורך אנושי כדאי לדעת איפה להסתכל.
      const reasons: string[] = [];
      if (typeof s.avg_logprob === "number" && s.avg_logprob < -0.6) reasons.push("ביטחון נמוך");
      if (typeof s.no_speech_prob === "number" && s.no_speech_prob > 0.5) reasons.push("ייתכן שאין דיבור");
      if (typeof s.compression_ratio === "number" && s.compression_ratio > 2.4) reasons.push("חזרתיות חריגה");
      if (reasons.length) lowConfidence.push({ ...seg, reason: reasons.join(", ") });
    }
  }
  return { text: String(data?.text ?? "").trim(), segments, lowConfidence };
}

export async function transcribe(
  buf: Buffer,
  filename: string,
  opts: { model: string; prompt?: string } ,
): Promise<TranscribeResult> {
  const ext = (filename.split(".").pop() || "mp3").toLowerCase();
  const { chunks, splittable } = splitAudio(buf, ext);

  if (!splittable && buf.length > MAX_REQUEST_BYTES) {
    throw new Error(
      `הקובץ ${(buf.length / 1048576).toFixed(1)}MB חורג מהמותר לבקשה אחת, והפורמט (${ext}) ` +
        `אינו ניתן לחיתוך בטוח כאן. יש להמיר ל-MP3 או ל-WAV.`,
    );
  }

  const prompt = opts.prompt ?? TORAH_PROMPT;
  const texts: string[] = [];
  const segments: TranscribeResult["segments"] = [];
  const lowConfidence: TranscribeResult["lowConfidence"] = [];

  for (const chunk of chunks) {
    // סוף הטקסט הקודם נכנס להקשר של הקטע הבא, כדי שהמנוע ימשיך את אותו משפט
    // ואותו נושא במקום להתחיל מאפס בכל תפר.
    const carry = texts.length ? texts[texts.length - 1].slice(-400) : "";
    const chunkPrompt = carry ? `${prompt}\n\nהמשך הדברים: ${carry}` : prompt;
    const r = await transcribeChunk(chunk, ext, opts.model, chunkPrompt);
    texts.push(r.text);
    segments.push(...r.segments);
    lowConfidence.push(...r.lowConfidence);
  }

  return {
    text: joinChunkTexts(texts),
    segments,
    model: opts.model,
    chunks: chunks.length,
    lowConfidence,
  };
}

/** מאחדים קטעים ומוחקים חזרה שנוצרה מהחפיפה. */
export function joinChunkTexts(texts: string[]): string {
  const parts = texts.map((t) => t.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const next = parts[i];
    // מחפשים את הזנב הארוך ביותר של out שהוא גם ראש של next.
    const window = Math.min(300, out.length, next.length);
    let cut = 0;
    for (let n = window; n >= 12; n--) {
      if (out.slice(-n) === next.slice(0, n)) { cut = n; break; }
    }
    out += (cut ? next.slice(cut) : ` ${next}`);
  }
  return out.replace(/\s+/g, " ").trim();
}
