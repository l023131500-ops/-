/**
 * מנוע האורקסטרציה — "המנצח".
 * מריץ את המודעה מקצה לקצה דרך מספר כלי AI וכלי רנדור, עד למוצר מוגמר:
 *
 *   1) בניית פרומפט חכם  (טקסט: enhanceBackgroundPrompt) — הרחבת תיאור הרקע + הזרקת מודרציה
 *   2) יצירת רקע          (תמונה: Gemini/Nano Banana Pro) — רקע בלבד, ללא טקסט, ללא אנשים
 *   3) הלבשת טקסט עברי    (רנדור: Chrome headless) — טקסט עברי מדויק RTL עם פונטים אמיתיים
 *   4) ליטוש (אופציונלי)  (תמונה: עריכת AI) — מושבת כברירת מחדל כדי לא לפגוע בחדות הטקסט
 *
 * כל שלב מדווח התקדמות דרך callback (מוזרם ל-frontend).
 */
import { generateBackground, enhanceBackgroundPrompt } from "./gemini";
import { generateFallbackBackground } from "./bgfallback";
import { renderAd } from "./renderer";
import {
  getAdType,
  getStyle,
  getCommunity,
  ASPECT_RATIOS,
  type AdTypeId,
} from "@shared/config";

export interface OrchestrateParams {
  adType: string;
  styleId: string;
  community: string;
  fields: Record<string, string>;
  aspectRatio?: string;
  enhancePrompt?: boolean; // שיפור פרומפט ע"י מודל טקסט (ברירת מחדל: כן)
}

export interface StageEvent {
  stage: "prompt" | "background" | "text" | "polish" | "done" | "error";
  status: "start" | "ok" | "skip" | "error";
  message: string;
  progress: number; // 0..100
  data?: any;
}

export interface OrchestrateResult {
  backgroundDataUrl: string;
  finalDataUrl: string;
  usedPrompt: string;
  usedFallbackBg: boolean;
}

const DEFAULT_AR = "4:5";

export async function orchestrate(
  params: OrchestrateParams,
  onEvent: (e: StageEvent) => void = () => {}
): Promise<OrchestrateResult> {
  const adType = getAdType(params.adType);
  const style = getStyle(params.adType, params.styleId);
  const community = getCommunity(params.community) || getCommunity("general")!;
  if (!adType) throw new Error("סוג מודעה לא תקין");
  if (!style) throw new Error("סגנון לא תקין");

  const arId = params.aspectRatio || DEFAULT_AR;
  const ar = ASPECT_RATIOS.find((a) => a.id === arId) || ASPECT_RATIOS[0];

  // ---------- שלב 1: בניית פרומפט חכם ----------
  onEvent({ stage: "prompt", status: "start", message: "בונה פרומפט חכם ומזריק כללי צניעות…", progress: 8 });
  const basePrompt = `${style.bgPromptEn}\n\nCultural constraints (MUST follow): ${community.moderation}`;
  let finalPrompt = basePrompt;
  if (params.enhancePrompt !== false) {
    finalPrompt = await enhanceBackgroundPrompt(basePrompt);
  }
  // חיזוק נוסף של כללי הרקע-בלבד
  finalPrompt +=
    "\n\nABSOLUTE: no text, no letters, no words, no numbers, no logos, no people, no faces. Leave clear empty space in the center for text to be overlaid separately.";
  onEvent({ stage: "prompt", status: "ok", message: "הפרומפט מוכן", progress: 20, data: { prompt: finalPrompt } });

  // ---------- שלב 2: יצירת רקע ----------
  onEvent({ stage: "background", status: "start", message: "יוצר רקע גרפי בעזרת AI (Nano Banana Pro)…", progress: 30 });
  let backgroundDataUrl: string;
  let usedFallbackBg = false;
  try {
    const bg = await generateBackground(finalPrompt, arId);
    backgroundDataUrl = `data:${bg.mimeType};base64,${bg.base64}`;
    onEvent({ stage: "background", status: "ok", message: "הרקע נוצר באמצעות AI", progress: 60, data: { backgroundDataUrl } });
  } catch (err: any) {
    // גיבוי: אם ה-AI אינו זמין (למשל חיוב לא פעיל / 429 / 403) —
    // מייצרים רקע גרדיאנט מכובד מקומית כדי שהמערכת תמשיך לעבוד.
    const status = err?.status;
    console.warn("[orchestrator] AI background failed (status=" + status + "), using procedural fallback:", err?.message);
    const fb = await generateFallbackBackground(style, ar.w, ar.h);
    backgroundDataUrl = `data:${fb.mimeType};base64,${fb.base64}`;
    usedFallbackBg = true;
    const note =
      status === 429
        ? "מנוע ה-AI לא זמין (נדרש להפעיל חיוב). נוצר רקע מעוצב מקומי כגיבוי."
        : "רקע ה-AI לא זמין כרגע — נוצר רקע מעוצב מקומי כגיבוי.";
    onEvent({ stage: "background", status: "ok", message: note, progress: 60, data: { backgroundDataUrl, fallback: true } });
  }

  // ---------- שלב 3: הלבשת טקסט עברי ----------
  onEvent({ stage: "text", status: "start", message: "מלביש טקסט עברי מדויק (RTL, פונטים אמיתיים)…", progress: 70 });
  const rendered = await renderAd({
    backgroundDataUrl,
    adType,
    style,
    fields: params.fields,
    width: ar.w,
    height: ar.h,
  });
  const finalDataUrl = `data:image/png;base64,${rendered.toString("base64")}`;
  onEvent({ stage: "text", status: "ok", message: "הטקסט הולבש", progress: 92, data: { finalDataUrl } });

  // ---------- שלב 4: ליטוש (מושבת כברירת מחדל) ----------
  onEvent({ stage: "polish", status: "skip", message: "מדלג על ליטוש AI כדי לשמור על חדות הטקסט", progress: 96 });

  onEvent({ stage: "done", status: "ok", message: "המודעה מוכנה", progress: 100, data: { finalDataUrl } });

  return { backgroundDataUrl, finalDataUrl, usedPrompt: finalPrompt, usedFallbackBg };
}
