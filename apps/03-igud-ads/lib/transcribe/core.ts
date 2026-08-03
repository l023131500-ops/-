import { getOpenAI, WHISPER_MODEL, WHISPER_MAX_BYTES } from "../openai";

/**
 * תמלול אודיו בעברית.
 * אם הקובץ גדול ממגבלת Whisper, אנו מחזירים שגיאה ברורה. (פיצול אמיתי
 * דורש ffmpeg על השרת. במצב deployment ב-Vercel — נמליץ לפצל בצד הלקוח
 * או בקול אחר. כאן יש פיצול חכם אם ffmpeg זמין במכונה.)
 */
export async function transcribeAudio(opts: {
  file: Blob;            // Blob של אודיו (mp3/m4a/mp4/webm/wav/ogg)
  filename: string;
  language?: string;     // ברירת מחדל "he"
  prompt?: string;       // הקשר/מילון אופציונלי
}): Promise<{ text: string; durationSec?: number }> {
  const openai = getOpenAI();
  const { file, filename, language = "he", prompt } = opts;

  if (file.size > WHISPER_MAX_BYTES) {
    throw new Error(
      `קובץ גדול מדי ל-Whisper API (${(file.size / 1024 / 1024).toFixed(1)}MB). ` +
      "אנא העלה קובץ קטן מ-24MB, או פצל לקטעים של 5-8 דקות."
    );
  }

  const resp = await openai.audio.transcriptions.create({
    file: new File([file], filename, { type: file.type || "audio/mpeg" }),
    model: WHISPER_MODEL,
    language,
    response_format: "verbose_json",
    prompt
  });

  // ב-verbose_json יש text + duration
  const text = (resp as any).text ?? "";
  const durationSec = (resp as any).duration as number | undefined;
  return { text, durationSec };
}
