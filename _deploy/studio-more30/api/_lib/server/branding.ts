/**
 * מחלקת מיתוג — שירותי שרת.
 *   - generateStrategy: Claude מנתח בריף → אסטרטגיה, ארכיטיפ, ערכי מותג, קול (JSON)
 *   - generateLogoConcepts: Nano Banana Pro מייצר קונספטי לוגו עם טקסט עברי מדויק
 *   - vectorizeLogo: Recraft Vectorize ממיר PNG → SVG וקטורי אמיתי
 *
 * כל קריאות ה-AI עוברות דרך proxyFetch (custom-cred), ונשמרות לאחר פרסום.
 * מבוסס מחקר: research2/branding_dept.md
 */

import { proxyFetch } from "./proxyFetch";
import { generateBackground } from "./gemini";
import {
  ARCHETYPES, getArchetype, colorSpec,
  type BrandStrategy, type BrandColors, type BrandTypography,
} from "../shared/branding";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = process.env.ANTHROPIC_TEXT_MODEL || "claude-sonnet-4-5-20250929";
const RECRAFT_VECTORIZE = "https://external.api.recraft.ai/v1/images/vectorize";
const RECRAFT_GENERATE = "https://external.api.recraft.ai/v1/images/generations";
const RECRAFT_REMOVE_BG = "https://external.api.recraft.ai/v1/images/removeBackground";

// Claude Opus 5 runs adaptive thinking by default, and max_tokens caps thinking
// PLUS response text. The origin app's 1500/2500 budgets were sized for a
// no-thinking model and truncate the JSON payload here, so the deployed copy
// raises the floor. Nothing else about the call changes.
async function claude(system: string, user: string, maxTokens = 2500): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };
  if (process.env.ANTHROPIC_API_KEY) headers["x-api-key"] = process.env.ANTHROPIC_API_KEY;
  const res = await proxyFetch(ANTHROPIC_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: Math.max(maxTokens, 8000), system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json: any = await res.json();
  return (json.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
}

function extractJson(text: string): any {
  let t = text.trim();
  if (t.startsWith("```")) {
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) t = m[1].trim();
  }
  const i = t.indexOf("{");
  const j = t.lastIndexOf("}");
  if (i !== -1 && j > i) {
    try { return JSON.parse(t.slice(i, j + 1)); } catch { /* fall */ }
  }
  return JSON.parse(t);
}

export interface StrategyResult {
  ok: boolean;
  strategy?: BrandStrategy;
  colors?: BrandColors;
  typography?: BrandTypography;
  source?: "ai" | "local";
  error?: string;
  detail?: string;
}

/**
 * מייצר אסטרטגיית מותג מלאה מתוך תשובות הבריף.
 * Claude בוחר ארכיטיפ ומנסח מיצוב/ערכים/קול; אם נכשל — נבנה תוצר מקומי מהארכיטיפ שנבחר.
 */
export async function generateStrategy(input: {
  brandName: string;
  brief: Record<string, unknown>;
  preferredArchetype?: string; // מהסגנון החזותי שהמשתמש בחר
}): Promise<StrategyResult> {
  const archList = ARCHETYPES.map((a) => `${a.key} (${a.name} — ${a.desc})`).join("; ");
  const system =
    "אתה אסטרטג מיתוג בכיר המתמחה בקהל החרדי/תורני בישראל. " +
    "אתה מקבל בריף מלקוח, ובוחר ארכיטיפ מותג דומיננטי (ומשני) מתוך 12 הארכיטיפים של יונג, " +
    "מנסח משפט מיצוב חד, מיסיון, 3-5 ערכי מותג התנהגותיים, ותכונות קול. " +
    "השפה מכובדת ומתאימה לקהל תורני. אינך ממציא עובדות. החזר אך ורק JSON תקין.";
  const user =
    `שם המותג: ${input.brandName}\n` +
    `בריף (תשובות הלקוח): ${JSON.stringify(input.brief)}\n` +
    (input.preferredArchetype ? `רמז לארכיטיפ מהסגנון שהלקוח בחר: ${input.preferredArchetype}\n` : "") +
    `רשימת ארכיטיפים לבחירה (השתמש ב-key בלבד): ${archList}\n\n` +
    "ממדי Aaker לבחירה (keys): sincerity, excitement, competence, sophistication, ruggedness\n\n" +
    'החזר JSON: {' +
    '"positioning":"משפט מיצוב אחד חד וברור",' +
    '"mission":"2-3 משפטי מיסיון",' +
    '"values":["ערך 1","ערך 2","ערך 3"],' +
    '"archetypePrimary":"key",' +
    '"archetypeSecondary":"key",' +
    '"aaker":["key","key"],' +
    '"voiceTraits":["תכונה","תכונה","תכונה"],' +
    '"voiceDo":["אנחנו כן — דוגמה","..."],' +
    '"voiceDont":["אנחנו לא — דוגמה","..."],' +
    '"tagline":"סלוגן קצר (אופציונלי)"}';

  try {
    const out = await claude(system, user, 2500);
    const data = extractJson(out);
    const strategy: BrandStrategy = {
      positioning: data.positioning || "",
      mission: data.mission || "",
      values: Array.isArray(data.values) ? data.values : [],
      archetypePrimary: data.archetypePrimary || input.preferredArchetype || "sage",
      archetypeSecondary: data.archetypeSecondary,
      aaker: Array.isArray(data.aaker) ? data.aaker : [],
      voiceTraits: Array.isArray(data.voiceTraits) ? data.voiceTraits : [],
      voiceDo: Array.isArray(data.voiceDo) ? data.voiceDo : [],
      voiceDont: Array.isArray(data.voiceDont) ? data.voiceDont : [],
      tagline: data.tagline,
    };
    const { colors, typography } = deriveVisuals(strategy.archetypePrimary);
    return { ok: true, strategy, colors, typography, source: "ai" };
  } catch (e: any) {
    // גיבוי מקומי — מבוסס על הארכיטיפ המועדף
    const arch = getArchetype(input.preferredArchetype || "sage") || ARCHETYPES[3];
    const strategy: BrandStrategy = {
      positioning: "",
      mission: "",
      values: [],
      archetypePrimary: arch.key,
      aaker: [],
      voiceTraits: arch.voice,
      voiceDo: [],
      voiceDont: [],
    };
    const { colors, typography } = deriveVisuals(arch.key);
    return { ok: true, strategy, colors, typography, source: "local", error: "AI לא זמין — נוצר תוצר בסיסי מהארכיטיפ", detail: String(e?.message || e) };
  }
}

/** גוזר פלטת צבע וטיפוגרפיה מברירות-המחדל של הארכיטיפ. */
export function deriveVisuals(archetypeKey: string): { colors: BrandColors; typography: BrandTypography } {
  const arch = getArchetype(archetypeKey) || ARCHETYPES[3];
  const pal = arch.palette;
  const colors: BrandColors = {
    primary: [colorSpec(pal[0], "ראשי"), colorSpec(pal[1], "ראשי משני")],
    secondary: [colorSpec(pal[3], "הדגשה")],
    neutral: [colorSpec(pal[2], "רקע בהיר"), colorSpec(pal[4], "טקסט כהה")],
    usageRatio: "60 / 30 / 10",
  };
  const typography: BrandTypography = {
    headline: arch.fontHeadline,
    body: arch.fontBody,
    scale: [
      { label: "H1 — כותרת ראשית", size: "48px", weight: "700", use: "כותרת עמוד" },
      { label: "H2 — כותרת משנה", size: "32px", weight: "600", use: "כותרות מדורים" },
      { label: "H3 — כותרת קטנה", size: "24px", weight: "600", use: "תת-מדורים" },
      { label: "גוף טקסט", size: "18px", weight: "400", use: "פסקאות" },
      { label: "טקסט משני", size: "14px", weight: "400", use: "כיתובים והערות" },
    ],
  };
  return { colors, typography };
}

// ═══════════════════ יצירת קונספטי לוגו (Nano Banana Pro) ═══════════════════

export interface LogoConcept {
  base64: string;
  mimeType: string;
  prompt: string;
  label: string;
}

/**
 * בונה פרומפט לוגו מקצועי באנגלית (לאיכות מודל מרבית) עם הוראת טקסט עברי מפורשת.
 * Nano Banana Pro הוא המודל היחיד שמרנדר עברית אמינה (לפי המחקר).
 */
export function buildLogoPrompt(opts: {
  brandName: string;
  archetypeKey: string;
  palette: string[];
  style: string; // חופשי בעברית מהמשתמש, אופציונלי
  variant: number;
}): string {
  const arch = getArchetype(opts.archetypeKey) || ARCHETYPES[3];
  const kw = arch.keywords.join(", ");
  const colors = opts.palette.slice(0, 3).join(", ");
  const approaches = [
    "a clean minimalist wordmark logo",
    "an emblem/badge logo with an abstract symbol above the name",
    "a monogram lettermark combined with the full name",
    "an elegant logotype with a subtle decorative flourish",
  ];
  const approach = approaches[opts.variant % approaches.length];
  return (
    `Professional ${approach} for a brand. ` +
    `The logo MUST prominently feature the exact Hebrew text "${opts.brandName}" spelled correctly, ` +
    `rendered as crisp, legible, beautifully-kerned Hebrew typography (right-to-left). ` +
    `Brand personality: ${arch.nameEn} archetype — ${kw}. ` +
    `Color palette: ${colors}. ` +
    (opts.style ? `Style direction: ${opts.style}. ` : "") +
    `Vector-style, flat, high contrast, centered on a pure solid white background, ` +
    `generous padding, no mockup, no photograph, no extra latin text, no watermark. ` +
    `Suitable for scaling and later vectorization. High resolution, sharp edges.`
  );
}

/** מייצר מספר קונספטי לוגו במקביל. aspectRatio 1:1 ללוגו. */
export async function generateLogoConcepts(opts: {
  brandName: string;
  archetypeKey: string;
  palette: string[];
  style?: string;
  count?: number;
}): Promise<{ ok: boolean; concepts?: LogoConcept[]; error?: string; detail?: string }> {
  const n = Math.min(opts.count || 3, 4);
  const labels = ["Wordmark נקי", "אמבלם עם סמל", "מונוגרם", "לוגוטייפ מעוטר"];
  try {
    const jobs = Array.from({ length: n }, (_, i) => {
      const prompt = buildLogoPrompt({
        brandName: opts.brandName,
        archetypeKey: opts.archetypeKey,
        palette: opts.palette,
        style: opts.style || "",
        variant: i,
      });
      return generateBackground(prompt, "1:1")
        .then((img) => ({ base64: img.base64, mimeType: img.mimeType, prompt, label: labels[i % labels.length] } as LogoConcept))
        .catch((err) => { throw new Error(`concept ${i}: ${err?.message || err}`); });
    });
    // ננסה כמה שיצליחו — Promise.allSettled כדי לא ליפול על אחד
    const settled = await Promise.allSettled(jobs);
    const concepts = settled.filter((s) => s.status === "fulfilled").map((s: any) => s.value as LogoConcept);
    if (!concepts.length) {
      const firstErr = (settled.find((s) => s.status === "rejected") as any)?.reason;
      return { ok: false, error: "כשל ביצירת קונספטי לוגו", detail: String(firstErr?.message || firstErr) };
    }
    return { ok: true, concepts };
  } catch (e: any) {
    return { ok: false, error: "כשל ביצירת קונספטי לוגו", detail: String(e?.message || e) };
  }
}

// ═══════════════════ וקטוריזציה (Recraft Vectorize → SVG) ═══════════════════

/**
 * ממיר PNG (base64) ל-SVG וקטורי אמיתי דרך Recraft Vectorize API.
 * מחזיר את תוכן ה-SVG כמחרוזת.
 */
export async function vectorizeLogo(base64Png: string, mimeType = "image/png"): Promise<{ ok: boolean; svg?: string; error?: string; detail?: string }> {
  try {
    const buf = Buffer.from(base64Png, "base64");
    const blob = new Blob([buf], { type: mimeType });
    const form = new FormData();
    form.append("file", blob, "logo.png");
    form.append("response_format", "url");

    const headers: Record<string, string> = {};
    if (process.env.RECRAFT_API_KEY) headers["Authorization"] = `Bearer ${process.env.RECRAFT_API_KEY}`;

    const res = await proxyFetch(RECRAFT_VECTORIZE, { method: "POST", headers, body: form as any });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `Recraft ${res.status}`, detail: txt.slice(0, 300) };
    }
    const json: any = await res.json();
    const svgUrl: string | undefined = json?.image?.url;
    if (!svgUrl) return { ok: false, error: "Recraft: לא הוחזר URL של SVG", detail: JSON.stringify(json).slice(0, 200) };

    // הורדת ה-SVG עצמו (img.recraft.ai — לא דורש אימות; משתמשים ב-fetch רגיל דרך proxyFetch שנופל ל-fallback)
    const svgRes = await proxyFetch(svgUrl, { method: "GET" });
    if (!svgRes.ok) {
      // ניסיון fetch ישיר (ה-CDN ציבורי)
      const direct = await fetch(svgUrl);
      if (!direct.ok) return { ok: false, error: `הורדת SVG נכשלה ${svgRes.status}` };
      return { ok: true, svg: await direct.text() };
    }
    return { ok: true, svg: await svgRes.text() };
  } catch (e: any) {
    return { ok: false, error: "כשל בוקטוריזציה", detail: String(e?.message || e) };
  }
}

// ═══════════════════ הסרת רקע (Recraft Remove Background) ═══════════════════

/**
 * מסיר את הרקע מתמונה (base64) דרך Recraft Remove Background API.
 * מחזיר data URL של PNG עם שקיפות — אותה תבנית קלט/פלט כמו vectorizeLogo.
 */
export async function removeBackgroundImage(base64Png: string, mimeType = "image/png"): Promise<{ ok: boolean; dataUrl?: string; error?: string; detail?: string }> {
  try {
    const buf = Buffer.from(base64Png, "base64");
    const blob = new Blob([buf], { type: mimeType });
    const form = new FormData();
    form.append("file", blob, "image.png");
    form.append("response_format", "url");

    const headers: Record<string, string> = {};
    if (process.env.RECRAFT_API_KEY) headers["Authorization"] = `Bearer ${process.env.RECRAFT_API_KEY}`;

    const res = await proxyFetch(RECRAFT_REMOVE_BG, { method: "POST", headers, body: form as any });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `Recraft ${res.status}`, detail: txt.slice(0, 300) };
    }
    const json: any = await res.json();
    const imageUrl: string | undefined = json?.image?.url;
    if (!imageUrl) return { ok: false, error: "Recraft: לא הוחזר URL של תמונה", detail: JSON.stringify(json).slice(0, 200) };

    const imgRes = await proxyFetch(imageUrl, { method: "GET" }).catch(() => fetch(imageUrl));
    if (!imgRes.ok) return { ok: false, error: `הורדת התמונה נכשלה ${imgRes.status}` };
    const outBuf = Buffer.from(await imgRes.arrayBuffer());
    const outMime = imgRes.headers.get("content-type") || "image/png";
    return { ok: true, dataUrl: `data:${outMime};base64,${outBuf.toString("base64")}` };
  } catch (e: any) {
    return { ok: false, error: "כשל בהסרת רקע", detail: String(e?.message || e) };
  }
}

// ═══════════════════ רקעים פוטוריאליסטיים (Recraft V4) ═══════════════════

/**
 * מייצר תמונת רקע פוטוריאליסטית מטקסט דרך Recraft V4 (מנוע חלופי ל-Gemini).
 * מחזיר data URL מוכן להצבה כרקע — אותה צורת פלט בדיוק כמו generateBackground של Gemini.
 */
export async function generateBackgroundRecraft(
  prompt: string,
  aspectRatio: string = "4:5"
): Promise<{ ok: boolean; dataUrl?: string; error?: string; detail?: string }> {
  try {
    const size = aspectRatioToRecraftSize(aspectRatio);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.RECRAFT_API_KEY) headers["Authorization"] = `Bearer ${process.env.RECRAFT_API_KEY}`;

    const res = await proxyFetch(RECRAFT_GENERATE, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt,
        model: "recraftv4",
        // Recraft V4 (בשונה מ-V3) דוחה עם 400 את הפרמטרים style/style_id/negative_prompt לגמרי — אין להעביר אותם.
        size,
        n: 1,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `Recraft ${res.status}`, detail: txt.slice(0, 300) };
    }
    const json: any = await res.json();
    const imageUrl: string | undefined = json?.data?.[0]?.url;
    if (!imageUrl) return { ok: false, error: "Recraft: לא הוחזר URL של תמונה", detail: JSON.stringify(json).slice(0, 200) };

    const imgRes = await proxyFetch(imageUrl, { method: "GET" }).catch(() => fetch(imageUrl));
    if (!imgRes.ok) return { ok: false, error: `הורדת התמונה נכשלה ${imgRes.status}` };
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const mimeType = imgRes.headers.get("content-type") || "image/webp";
    return { ok: true, dataUrl: `data:${mimeType};base64,${buf.toString("base64")}` };
  } catch (e: any) {
    return { ok: false, error: "כשל ביצירת רקע (Recraft)", detail: String(e?.message || e) };
  }
}

/**
 * ממפה יחס-גובה-רוחב חופשי (למשל "4:5"/"16:9") לגודל הקרוב ביותר מתוך רשימת
 * הגדלים הסגורה שה-API של Recraft V4 (standard, לא Pro) מקבל — כל גודל אחר נדחה ב-400.
 */
function aspectRatioToRecraftSize(aspectRatio: string): string {
  const supported: Record<string, string> = {
    "1:1": "1024x1024",
    "4:5": "896x1152",
    "5:4": "1152x896",
    "3:4": "896x1216",
    "4:3": "1216x896",
    "9:16": "768x1344",
    "16:9": "1344x768",
  };
  return supported[aspectRatio] || "896x1152";
}
