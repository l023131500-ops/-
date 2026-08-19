/**
 * מנוע רנדור טקסט עברי — הלבשת טקסט מדויק על רקע שנוצר ע"י AI.
 *
 * הבעיה: מודלי AI כושלים בעברית. הפתרון: ה-AI מייצר רק את הרקע (ללא טקסט),
 * ואנחנו מלבישים את הטקסט בעברית מדויקת בעזרת Chrome headless + HTML/CSS + פונטים אמיתיים,
 * עם תמיכת RTL מושלמת ופריסה אוטומטית.
 */
import puppeteer, { Browser } from "puppeteer";
import fs from "fs";
import path from "path";
import type { AdStyle, AdType, Community } from "@shared/config";

// איתור תיקיית הפונטים בצורה עמידה גם ב-dev (ESM) וגם ב-production (CJS bundle).
// ב-CJS אין import.meta, לכן מנסים כמה מיקומים אפשריים.
function resolveFontsDir(): string {
  const candidates = [
    path.join(process.cwd(), "server", "fonts"),
    path.join(process.cwd(), "dist", "fonts"),
    path.join(process.cwd(), "fonts"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}
const FONTS_DIR = resolveFontsDir();

// טעינת הפונטים כ-base64 פעם אחת (data URI ב-@font-face)
const FONT_FILES: Record<string, string> = {
  FrankRuhlLibre: "FrankRuhlLibre-Medium.ttf",
  DavidLibre: "DavidLibre.ttf",
  Heebo: "Heebo.ttf",
  Rubik: "Rubik.ttf",
  Assistant: "Assistant.ttf",
};

let fontFaceCss = "";
function buildFontFaceCss(): string {
  if (fontFaceCss) return fontFaceCss;
  const faces: string[] = [];
  for (const [family, file] of Object.entries(FONT_FILES)) {
    const p = path.join(FONTS_DIR, file);
    if (!fs.existsSync(p)) continue;
    const b64 = fs.readFileSync(p).toString("base64");
    faces.push(
      `@font-face{font-family:'${family}';src:url(data:font/ttf;base64,${b64}) format('truetype');font-weight:400 700;font-display:block;}`
    );
  }
  fontFaceCss = faces.join("\n");
  return fontFaceCss;
}

// דפדפן משותף — נשמר חי בין קריאות לשיפור ביצועים
let browserPromise: Promise<Browser> | null = null;
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: "shell",
      timeout: 90000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-features=DBus",
      ],
    });
  }
  return browserPromise;
}

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

export interface RenderInput {
  backgroundDataUrl: string; // data:image/png;base64,...
  adType: AdType;
  style: AdStyle;
  fields: Record<string, string>;
  width: number;
  height: number;
}

/**
 * בונה את גוף הטקסט לפי סוג המודעה — כל סוג עם היררכיה משלו.
 */
function buildContent(adType: AdType, style: AdStyle, f: Record<string, string>): string {
  const { text, subtext, accent } = style.palette;
  const rule = `<div style="width:120px;height:2px;background:${accent};margin:28px auto;opacity:.85"></div>`;

  const h = (s: string, size: number, weight = 700, color = text, mt = 0, mb = 0, lh = 1.25) =>
    s
      ? `<div style="font-size:${size}px;font-weight:${weight};color:${color};margin-top:${mt}px;margin-bottom:${mb}px;line-height:${lh};text-shadow:0 2px 12px rgba(0,0,0,.45)">${esc(
          s
        )}</div>`
      : "";

  if (adType.id === "memorial") {
    return [
      h(f.opening, 34, 500, subtext, 0, 10),
      h(f.deceased, 68, 700, text, 6, 6, 1.15),
      rule,
      h(f.details, 32, 400, subtext, 8, 8, 1.55),
      f.mourners ? h(f.mourners, 30, 600, text, 34, 0) : "",
    ].join("");
  }

  if (adType.id === "event") {
    return [
      h(f.headline, 44, 700, accent, 0, 8),
      h(f.main, 34, 500, subtext, 6, 12, 1.5),
      h(f.names, 60, 700, text, 8, 8, 1.2),
      rule,
      h(f.when, 32, 400, subtext, 6, 8, 1.55),
      f.signature ? h(f.signature, 30, 600, text, 30, 0) : "",
    ].join("");
  }

  // organization
  return [
    h(f.headline, 60, 700, text, 0, 6, 1.15),
    h(f.subheadline, 36, 500, accent, 4, 14),
    h(f.body, 32, 400, subtext, 6, 12, 1.55),
    (f.when || f.where)
      ? `${rule}${h(f.when, 32, 600, text, 0, 6)}${h(f.where, 30, 400, subtext, 0, 0)}`
      : "",
    f.signature ? h(f.signature, 30, 600, text, 30, 0) : "",
  ].join("");
}

export async function renderAd(input: RenderInput): Promise<Buffer> {
  const { backgroundDataUrl, adType, style, fields, width, height } = input;
  const content = buildContent(adType, style, fields);
  const overlay = style.palette.overlay;

  const html = `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"/>
<style>
${buildFontFaceCss()}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${width}px;height:${height}px;overflow:hidden}
.stage{position:relative;width:${width}px;height:${height}px;font-family:'${style.font}','FrankRuhlLibre',serif}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.veil{position:absolute;inset:0;background:${overlay}}
.content{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:${Math.round(width * 0.11)}px ${Math.round(width * 0.09)}px;direction:rtl}
.inner{max-width:100%}
</style></head>
<body>
<div class="stage">
  <img class="bg" src="${backgroundDataUrl}"/>
  <div class="veil"></div>
  <div class="content"><div class="inner">${content}</div></div>
</div>
</body></html>`;

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });
    // המתנה לטעינת הרקע והפונטים לפני צילום
    await page.evaluate(async () => {
      const img = document.querySelector(".bg") as HTMLImageElement | null;
      if (img && !img.complete) {
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }
      // @ts-ignore
      if ((img as any)?.decode) { try { await (img as any).decode(); } catch {} }
      // @ts-ignore
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    });
    // settle קצר לוודא paint
    await new Promise((r) => setTimeout(r, 300));
    // חשוב: אין להשתמש ב-clip עם headless:'shell' — הוא מייצר פלט לבן ריק.
    // ה-viewport כבר מוגדר בדיוק ל-width×height, כך שצילום מלא נותן את אותן מידות.
    const buf = (await page.screenshot({ type: "png" })) as Buffer;
    return buf;
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}
