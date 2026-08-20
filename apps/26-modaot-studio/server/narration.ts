/**
 * קריינות עברית (narration TTS) — הבסיס לשכבת "וידאו קידום" של הסטודיו.
 *
 * מנוע: ElevenLabs text-to-speech, אותה תשתית וספק בדיוק כמו
 * apps/27-bkalut-price/server/hf-podcast.ts (ELEVENLABS_API_KEY, proxyFetch,
 * דגם eleven_multilingual_v2) — לא ספק חדש, שימוש חוזר במוסכמה הקיימת
 * בפלטפורמה. הטקסט עובר קודם toTtsSafeHebrew (מספרים/מטבע/אחוזים/שנים
 * למילים) כדי שהקריינות תישמע טבעית ולא תקריא ספרות אחת-אחת.
 *
 * הפלטפורמה (26-modaot-studio) אין לה אחסון קבצים משלה — בפרודקשן
 * (studio_* על Supabase) יש רק ארבע טבלאות פרויקטים/מותגים/תבניות/משתמשים,
 * בדיוק כמו שכבות תמונה שכבר מוטמעות כ-base64 (Recraft/Gemini). לכן קריינות
 * מוחזרת כ-data URL (mp3), לא כקישור לקובץ — אותו דפוס בדיוק כמו
 * `removeBackgroundImage`/`generateBackgroundRecraft` ב-branding.ts.
 */
import { proxyFetch } from "./proxyFetch";
import { toTtsSafeHebrew, type NarrationAlignment } from "@shared/tts-hebrew";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
// אותו קול-ברירת-מחדל (קריין עברי, סמכותי) בשימוש ב-27-bkalut-price/server/hf-podcast.ts —
// ניתן לדריסה דרך MODAOT_NARRATION_VOICE_ID אם יבחר קול אחר למותג הסטודיו.
const DEFAULT_VOICE_ID = process.env.MODAOT_NARRATION_VOICE_ID || "9mC4rMlfrKiadcMhOgey";

export interface NarrationResult {
  ok: boolean;
  dataUrl?: string;
  /** הטקסט בפועל שנשלח למנוע (אחרי toTtsSafeHebrew) — לשקיפות ב-UI. */
  script?: string;
  /** תזמון תווים אמיתי מ-ElevenLabs (with-timestamps) — כשקיים, וידאו הקידום
   *  מסנכרן כתוביות לפי הדיבור בפועל במקום קירוב לפי אורך-תווים
   *  (lib/videoExport.ts buildCaptionSegmentsFromAlignment). */
  alignment?: NarrationAlignment;
  error?: string;
  detail?: string;
}

/** יצירת קריינות עברית מטקסט חופשי. אף פעם לא זורק — תמיד מחזיר NarrationResult. */
export async function generateNarration(rawScript: string, voiceId?: string): Promise<NarrationResult> {
  const script = toTtsSafeHebrew(rawScript).trim();
  if (!script) return { ok: false, error: "אין טקסט לקריינות" };
  if (script.length > 2000) return { ok: false, error: "הטקסט ארוך מדי לקריינות (עד 2000 תווים)" };

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { ok: false, error: "ELEVENLABS_API_KEY חסר — קריינות אינה זמינה עדיין בסביבה הזו" };

  try {
    // with-timestamps (לא הנתיב הרגיל) — מחזיר גם alignment (תזמון תו-אחר-תו),
    // לא רק אודיו, כדי שכתוביות הוידאו יסתנכרנו לדיבור האמיתי במקום קירוב.
    const res = await proxyFetch(
      `${ELEVENLABS_BASE}/text-to-speech/${voiceId || DEFAULT_VOICE_ID}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `ElevenLabs ${res.status}`, detail: txt.slice(0, 300) };
    }
    const body: any = await res.json().catch(() => null);
    if (!body?.audio_base64) {
      return { ok: false, error: "תגובת ElevenLabs לא תקינה (חסר אודיו)" };
    }
    const a = body.alignment;
    const alignment: NarrationAlignment | undefined =
      a && Array.isArray(a.characters) && Array.isArray(a.character_start_times_seconds) && Array.isArray(a.character_end_times_seconds)
        ? { characters: a.characters, startTimes: a.character_start_times_seconds, endTimes: a.character_end_times_seconds }
        : undefined;
    return { ok: true, dataUrl: `data:audio/mpeg;base64,${body.audio_base64}`, script, alignment };
  } catch (e: any) {
    return { ok: false, error: "כשל ביצירת קריינות", detail: String(e?.message || e) };
  }
}
