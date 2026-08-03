import OpenAI from "openai";

export function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY חסר ב-ENV");
  return new OpenAI({ apiKey: key });
}

// Whisper מודלים מתאימים לעברית
export const WHISPER_MODEL = "whisper-1";
// GPT-4 לעריכה ולזיהוי מקורות
export const EDITOR_MODEL = "gpt-4o";  // הכי איכותי וזול היחסית

// מגבלת קובץ של Whisper: ~25MB. נתחיל לחתוך מ-24MB
export const WHISPER_MAX_BYTES = 24 * 1024 * 1024;
