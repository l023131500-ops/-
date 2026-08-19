/**
 * לקוח Gemini — יצירת רקעים ועריכת תמונות (Nano Banana Pro / Gemini 3 Pro Image).
 *
 * אימות: מפתח ה-API של המשתמש מוזרק אוטומטית דרך ה-HTTPS proxy כאשר השרת
 * מורץ עם api_credentials=["custom-cred:generativelanguage.googleapis.com"].
 * ה-proxy מוסיף את כותרת x-goog-api-key. לכן אנו קוראים ישירות לכתובת האמיתית.
 *
 * גיבוי: אם מוגדר GEMINI_API_KEY בסביבה — נשלח אותו ישירות בכותרת.
 */

import { proxyFetch } from "./proxyFetch";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

// מודל התמונה — Nano Banana Pro (Gemini 3 Pro Image). ניתן לשנות דרך משתנה סביבה.
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image";
const FALLBACK_IMAGE_MODEL = "gemini-2.5-flash-image";
// מודל טקסט לשיפור/ליטוש פרומפטים
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-3-flash-preview";

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const key = process.env.GEMINI_API_KEY;
  if (key) h["x-goog-api-key"] = key;
  return h;
}

export interface GenImageResult {
  base64: string; // ללא הקידומת data:
  mimeType: string;
}

/**
 * יצירת תמונת רקע מטקסט (text-to-image).
 * @param prompt תיאור הרקע באנגלית (ללא טקסט/אנשים)
 * @param aspectRatio יחס גובה-רוחב, למשל "4:5"
 */
export async function generateBackground(
  prompt: string,
  aspectRatio: string = "4:5"
): Promise<GenImageResult> {
  return callImageModel(IMAGE_MODEL, prompt, aspectRatio).catch(async (err) => {
    // אם המודל המתקדם לא זמין, ננסה גיבוי
    console.warn("[gemini] primary image model failed, trying fallback:", err?.message);
    return callImageModel(FALLBACK_IMAGE_MODEL, prompt, aspectRatio);
  });
}

/**
 * עריכת תמונה קיימת בעזרת הוראה בשפה טבעית (image + text -> image).
 * משמש לשלב הליטוש: העברת המודעה המולבשת + הוראת שיפור עדינה.
 */
export async function editImage(
  imageBase64: string,
  instruction: string,
  mimeType: string = "image/png",
  aspectRatio: string = "4:5"
): Promise<GenImageResult> {
  const model = IMAGE_MODEL;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
          { text: instruction },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["Image"],
      imageConfig: { aspectRatio },
    },
  };
  return callAndExtract(model, body);
}

async function callImageModel(
  model: string,
  prompt: string,
  aspectRatio: string
): Promise<GenImageResult> {
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["Image"],
      imageConfig: { aspectRatio },
    },
  };
  return callAndExtract(model, body);
}

async function callAndExtract(model: string, body: unknown): Promise<GenImageResult> {
  const url = `${BASE}/models/${model}:generateContent`;
  const res = await proxyFetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Gemini ${res.status}: ${txt.slice(0, 500)}`);
    (err as any).status = res.status;
    throw err;
  }

  const json: any = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    const inline = p.inlineData || p.inline_data;
    if (inline?.data) {
      return { base64: inline.data, mimeType: inline.mimeType || inline.mime_type || "image/png" };
    }
  }
  throw new Error("Gemini: no image returned in response");
}

/**
 * שיפור פרומפט הרקע בעזרת מודל טקסט — הופך תיאור בסיסי לתיאור עשיר ומפורט.
 * לא חובה בזרימה, אך משפר איכות. נכשל בשקט אם המודל לא זמין.
 */
export async function enhanceBackgroundPrompt(basePrompt: string): Promise<string> {
  try {
    const url = `${BASE}/models/${TEXT_MODEL}:generateContent`;
    const instruction =
      "You are an expert art director for print advertising backgrounds. " +
      "Rewrite the following background description into a single rich, vivid English prompt for an image model. " +
      "CRITICAL RULES: the image must contain NO text, NO letters, NO numbers, NO people, NO human figures. " +
      "It is only a decorative background/frame with empty center space for text to be added later. " +
      "Keep it under 90 words. Output only the prompt.\n\nDescription: " +
      basePrompt;
    const res = await proxyFetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: instruction }] }] }),
    });
    if (!res.ok) return basePrompt;
    const json: any = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(" ").trim();
    return text && text.length > 20 ? text : basePrompt;
  } catch {
    return basePrompt;
  }
}
