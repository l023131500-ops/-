// מנוע auto-fit (shrink-to-fit) — מקטין את גודל הפונט עד שהטקסט נכנס לתיבה.
// משתמש ב-canvas measureText כדי למדוד רוחב שורות, כולל גלישת שורות (word-wrap) עברית RTL.

const _canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
const _ctx = _canvas ? _canvas.getContext("2d") : null;

function fontStr(fontSize: number, fontFamily: string, bold: boolean): string {
  return `${bold ? "700" : "400"} ${fontSize}px "${fontFamily}"`;
}

// עוטף טקסט למספר שורות לפי רוחב מקסימלי (word wrap)
export function wrapText(
  text: string,
  fontSize: number,
  fontFamily: string,
  bold: boolean,
  maxWidth: number,
  letterSpacing = 0,
): string[] {
  if (!_ctx) return text.split("\n");
  _ctx.font = fontStr(fontSize, fontFamily, bold);
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  const measure = (s: string) => _ctx!.measureText(s).width + Math.max(0, s.length - 1) * letterSpacing;

  for (const para of paragraphs) {
    const words = para.split(" ");
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (measure(test) <= maxWidth || !cur) {
        cur = test;
      } else {
        lines.push(cur);
        cur = w;
      }
    }
    lines.push(cur);
  }
  return lines;
}

export interface FitResult {
  fontSize: number;
  lines: string[];
  totalHeight: number;
}

/**
 * מוצא את גודל הפונט המקסימלי שבו הטקסט נכנס לתיבה (maxWidth × maxHeight).
 * אם אין maxHeight — בודק רק רוחב (שורה אחת או wrap לפי רוחב).
 */
export function fitText(opts: {
  text: string;
  fontFamily: string;
  bold: boolean;
  maxWidth: number;
  maxHeight?: number;
  startFontSize: number;
  minFontSize: number;
  lineHeight?: number;
  letterSpacing?: number;
}): FitResult {
  const {
    text,
    fontFamily,
    bold,
    maxWidth,
    maxHeight,
    startFontSize,
    minFontSize,
    lineHeight = 1.15,
    letterSpacing = 0,
  } = opts;

  let size = startFontSize;
  while (size >= minFontSize) {
    const lines = wrapText(text, size, fontFamily, bold, maxWidth, letterSpacing);
    const totalHeight = lines.length * size * lineHeight;
    if (!maxHeight || totalHeight <= maxHeight) {
      return { fontSize: size, lines, totalHeight };
    }
    size -= 1;
  }
  const lines = wrapText(text, minFontSize, fontFamily, bold, maxWidth, letterSpacing);
  return {
    fontSize: minFontSize,
    lines,
    totalHeight: lines.length * minFontSize * lineHeight,
  };
}

// מוודא שהפונטים נטענו לפני מדידה
export async function ensureFontsLoaded(families: string[]): Promise<void> {
  if (typeof document === "undefined" || !(document as any).fonts) return;
  const fonts = (document as any).fonts;
  await Promise.all(
    families.flatMap((f) => [
      fonts.load(`400 40px "${f}"`).catch(() => {}),
      fonts.load(`700 40px "${f}"`).catch(() => {}),
    ]),
  );
  await fonts.ready;
}
