/**
 * רקע גיבוי פרוצדורלי — נוצר מקומית ללא AI.
 *
 * משמש כאשר מנוע ה-AI אינו זמין (למשל חיוב לא פעיל / 429 / 403 / תקלת רשת),
 * כדי שהמערכת תמשיך לייצר מודעה מוגמרת וניתנת להורדה גם ללא רקע מ-AI.
 *
 * הרקע נבנה מלוח הצבעים של הסגנון: גרדיאנט רדיאלי עדין + מסגרת דקורטיבית דקה +
 * וינייטה, בהתאמה לאסתטיקה המכובדת של הקהל. אין טקסט ואין דמויות.
 */
import sharp from "sharp";
import type { AdStyle } from "@shared/config";

/** ממיר #RRGGBB ל-{r,g,b}. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 20, g: 30, b: 55 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** מכהה/מבהיר צבע לפי פקטor (0..2). */
function shade(c: { r: number; g: number; b: number }, f: number) {
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return { r: cl(c.r * f), g: cl(c.g * f), b: cl(c.b * f) };
}

function rgbStr(c: { r: number; g: number; b: number }) {
  return `rgb(${c.r},${c.g},${c.b})`;
}

/**
 * בונה רקע גרדיאנט מכובד לפי לוח הצבעים של הסגנון.
 * גוזר צבע-בסיס כהה מה-overlay/accent של הסגנון.
 */
export async function generateFallbackBackground(
  style: AdStyle,
  width: number,
  height: number
): Promise<{ base64: string; mimeType: string }> {
  const accent = hexToRgb(style.palette.accent);
  // בסיס כהה: נגזר מ-accent אך מוכהה משמעותית לרקע מכובד
  const baseDark = shade(accent, 0.16);
  const baseMid = shade(accent, 0.28);
  const glow = shade(accent, 0.55);
  const border = style.palette.accent;

  const cx = Math.round(width / 2);
  const cyTop = Math.round(height * 0.28);
  const bw = Math.round(Math.min(width, height) * 0.012); // עובי מסגרת
  const inset = Math.round(Math.min(width, height) * 0.045);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="50%" cy="28%" r="70%">
      <stop offset="0%" stop-color="${rgbStr(glow)}" stop-opacity="0.55"/>
      <stop offset="42%" stop-color="${rgbStr(baseMid)}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${rgbStr(baseDark)}" stop-opacity="1"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
      <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#glow)"/>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#vignette)"/>
  <rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}"
        fill="none" stroke="${border}" stroke-opacity="0.85" stroke-width="${bw}"/>
  <rect x="${inset + bw * 2}" y="${inset + bw * 2}" width="${width - (inset + bw * 2) * 2}" height="${height - (inset + bw * 2) * 2}"
        fill="none" stroke="${border}" stroke-opacity="0.35" stroke-width="${Math.max(1, Math.round(bw / 2))}"/>
  <circle cx="${cx}" cy="${cyTop}" r="${Math.round(width * 0.5)}" fill="url(#glow)" opacity="0.18"/>
</svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { base64: png.toString("base64"), mimeType: "image/png" };
}
