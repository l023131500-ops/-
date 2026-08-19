/**
 * Branded poster generator for a public Bkalut topic.
 *
 * Renders directly to an offscreen <canvas> (PNG) so Hebrew RTL text always
 * shows correctly in any image viewer / WhatsApp / email — SVG with Hebrew is
 * unreliable across renderers, which previously caused the "cut/garbled"
 * downloads. The layout flows top→bottom and auto-wraps so content never
 * clips off-canvas.
 *
 * Public-only content: title, short general info, main assistance bullets,
 * contact details. No internal-only fields (cost, scripts, etc).
 */
import type { PublicRightRow, RightRow } from "@shared/schema";

/**
 * The image / Word / share-text generators only use fields safe for the
 * general public. Either a `PublicRightRow` (already filtered) or a full
 * `RightRow` may be passed — internal-only fields are never read.
 */
type AnyRight = PublicRightRow | RightRow;

export interface TopicImageMeta {
  contactPhone: string;
  contactEmail: string;
  contactWebsite: string;
}

const WIDTH = 1080;
const HEIGHT = 1350; // 4:5 portrait, social-friendly

const COLORS = {
  bgTop: "#fbfaf6",
  bgBot: "#f1ede2",
  brand: "#0f5560",
  gold: "#f3c84a",
  text: "#1f2933",
  textMuted: "#6b7280",
  card: "#ffffff",
};

function normalize(text: string): string {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function wrapByMeasure(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const clean = normalize(text);
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let buf = "";
  for (const word of words) {
    const candidate = buf ? `${buf} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      buf = candidate;
    } else {
      if (buf) lines.push(buf);
      if (ctx.measureText(word).width > maxWidth) {
        // hard-break very long token character by character
        let chunk = "";
        for (const ch of word) {
          const trial = chunk + ch;
          if (ctx.measureText(trial).width > maxWidth) {
            if (chunk) lines.push(chunk);
            chunk = ch;
          } else {
            chunk = trial;
          }
          if (lines.length >= maxLines) break;
        }
        buf = chunk;
      } else {
        buf = word;
      }
    }
    if (lines.length >= maxLines) break;
  }
  if (buf && lines.length < maxLines) lines.push(buf);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(last + "…").width > maxWidth && last.length > 4) {
      lines[maxLines - 1] = last.slice(0, last.length - 2).trim() + "…";
    } else if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
      lines[maxLines - 1] = last.replace(/[.\s]+$/, "") + "…";
    }
  }
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Render the poster onto a canvas and return a PNG data URL. */
export function renderTopicPng(row: AnyRight, meta: TopicImageMeta): string {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-not-supported");

  // background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, COLORS.bgTop);
  grad.addColorStop(1, COLORS.bgBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // top brand band
  ctx.fillStyle = COLORS.brand;
  ctx.fillRect(0, 0, WIDTH, 140);

  // brand logo + wordmark (right side; Hebrew RTL header)
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 44px 'Heebo', 'Arial Hebrew', Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.direction = "rtl";
  ctx.fillText("בקלות", WIDTH - 60, 80);
  ctx.font = "500 22px 'Heebo', 'Arial Hebrew', Arial, sans-serif";
  ctx.globalAlpha = 0.9;
  ctx.fillText("כל מה שמגיע לך, בקלות.", WIDTH - 60, 112);
  ctx.globalAlpha = 1;

  // little gold dot near the brand
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(WIDTH - 60 - 110, 56, 6, 0, Math.PI * 2);
  ctx.fill();

  // category line
  const categoryLine = [row.category, row.subCategory].filter(Boolean).join(" · ");
  let y = 200;
  if (categoryLine) {
    ctx.fillStyle = COLORS.brand;
    ctx.font = "600 24px 'Heebo', 'Arial Hebrew', Arial, sans-serif";
    ctx.fillText(categoryLine, WIDTH - 60, y);
    y += 40;
  }

  // topic title — measured wrap, max 3 lines
  const title = normalize(row.topic || "");
  const padX = 60;
  const maxTextWidth = WIDTH - padX * 2;
  const sizes = [64, 56, 48];
  let titleSize = sizes[0];
  let titleLines: string[] = [];
  for (const size of sizes) {
    ctx.font = `800 ${size}px 'Heebo', 'Arial Hebrew', Arial, sans-serif`;
    titleLines = wrapByMeasure(ctx, title, maxTextWidth, 3);
    if (titleLines.length <= 2) {
      titleSize = size;
      break;
    }
    titleSize = size;
  }
  ctx.font = `800 ${titleSize}px 'Heebo', 'Arial Hebrew', Arial, sans-serif`;
  ctx.fillStyle = COLORS.text;
  const titleLineHeight = Math.round(titleSize * 1.15);
  for (const line of titleLines) {
    y += titleLineHeight;
    ctx.fillText(line, WIDTH - padX, y);
  }
  y += 20;

  // gold separator
  ctx.fillStyle = COLORS.gold;
  drawRoundedRect(ctx, WIDTH - padX - 140, y, 140, 5, 2);
  ctx.fill();
  y += 40;

  // general info
  ctx.fillStyle = COLORS.brand;
  ctx.font = "700 24px 'Heebo', 'Arial Hebrew', Arial, sans-serif";
  ctx.fillText("המידע בקצרה", WIDTH - padX, y);
  y += 36;

  const generalInfoRaw = row.publicSiteText && row.publicSiteText.trim()
    ? row.publicSiteText
    : (row.whatReceived || "");
  // Public poster shows only the high-level "what is this benefit" line,
  // capped — detailed eligibility never appears here.
  const generalInfo = generalInfoRaw.length > 220 ? generalInfoRaw.slice(0, 220).trimEnd() + "…" : generalInfoRaw;
  ctx.fillStyle = COLORS.text;
  ctx.font = "400 26px 'Heebo', 'Arial Hebrew', Arial, sans-serif";
  const infoLines = wrapByMeasure(ctx, generalInfo, maxTextWidth, 5);
  const infoLineHeight = 40;
  for (const line of infoLines) {
    ctx.fillText(line, WIDTH - padX, y);
    y += infoLineHeight;
  }
  y += 28;

  // audience block
  if (row.audience && row.audience.trim()) {
    ctx.fillStyle = COLORS.brand;
    ctx.font = "800 26px 'Heebo', 'Arial Hebrew', Arial, sans-serif";
    ctx.fillText("למי זה מיועד", WIDTH - padX, y);
    y += 14;
    ctx.fillStyle = COLORS.gold;
    drawRoundedRect(ctx, WIDTH - padX - 120, y, 120, 5, 2);
    ctx.fill();
    y += 36;
    ctx.fillStyle = COLORS.text;
    ctx.font = "400 24px 'Heebo', 'Arial Hebrew', Arial, sans-serif";
    const audienceLines = wrapByMeasure(ctx, row.audience, maxTextWidth, 4);
    for (const line of audienceLines) {
      ctx.fillText(line, WIDTH - padX, y);
      y += 36;
    }
    y += 16;
  }

  // closing call to action — full details after the personal eligibility check
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = "500 22px 'Heebo', 'Arial Hebrew', Arial, sans-serif";
  const closingLines = wrapByMeasure(
    ctx,
    'הפרטים המלאים — תנאי זכאות, מסמכים ואופן ההגשה — נשלחים אישית בסיום "בדיקת זכאות בקליק".',
    maxTextWidth,
    3,
  );
  for (const line of closingLines) {
    ctx.fillText(line, WIDTH - padX, y);
    y += 32;
  }

  // contact card (fixed near bottom)
  const cardH = 130;
  const cardY = HEIGHT - 220;
  ctx.fillStyle = COLORS.card;
  drawRoundedRect(ctx, padX, cardY, WIDTH - padX * 2, cardH, 18);
  ctx.fill();
  ctx.strokeStyle = COLORS.brand;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, padX, cardY, WIDTH - padX * 2, cardH, 18);
  ctx.stroke();

  ctx.fillStyle = COLORS.brand;
  ctx.font = "800 24px 'Heebo', 'Arial Hebrew', Arial, sans-serif";
  ctx.fillText("פנו אלינו", WIDTH - padX - 20, cardY + 42);

  ctx.fillStyle = COLORS.text;
  ctx.font = "500 22px 'Heebo', 'Arial Hebrew', Arial, sans-serif";
  ctx.direction = "ltr";
  ctx.textAlign = "right";
  ctx.fillText(`${meta.contactPhone}  ·  ${meta.contactEmail}`, WIDTH - padX - 20, cardY + 78);

  ctx.fillStyle = COLORS.brand;
  ctx.font = "600 20px 'Heebo', 'Arial Hebrew', Arial, sans-serif";
  ctx.fillText(meta.contactWebsite, WIDTH - padX - 20, cardY + 108);

  ctx.direction = "rtl";

  // footer band
  ctx.fillStyle = COLORS.brand;
  ctx.fillRect(0, HEIGHT - 70, WIDTH, 70);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 24px 'Heebo', 'Arial Hebrew', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("המידע בסיוע ארגון בקלות", WIDTH / 2, HEIGHT - 26);

  return canvas.toDataURL("image/png");
}

function safeFileName(row: AnyRight): string {
  return (row.topic || `topic-${row.id}`)
    .replace(/[^֐-׿a-zA-Z0-9_-]+/g, "_")
    .slice(0, 60);
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Download a clean branded PNG poster for the topic. */
export function downloadTopicPng(row: AnyRight, meta: TopicImageMeta) {
  const dataUrl = renderTopicPng(row, meta);
  triggerDownload(dataUrl, `bkalut-${row.id}-${safeFileName(row)}.png`);
}

/**
 * Backwards-compatible name kept for any callers; now produces a PNG
 * (the previous SVG output rendered Hebrew unreliably in viewers).
 */
export function downloadTopicSvg(row: AnyRight, meta: TopicImageMeta) {
  try {
    downloadTopicPng(row, meta);
  } catch {
    // last-resort fallback for headless / non-canvas environments
    const svg =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
      `<rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bgTop}"/>` +
      `<text x="${WIDTH - 60}" y="200" text-anchor="end" fill="${COLORS.text}" font-size="48" font-family="Heebo, Arial, sans-serif">${row.topic}</text>` +
      `</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `bkalut-${row.id}-${safeFileName(row)}.svg`);
    URL.revokeObjectURL(url);
  }
}

/**
 * Build a self-contained HTML "letterhead" document for the topic with Bkalut
 * branding. Opens cleanly in Word (.doc) and any browser. Hebrew/RTL safe.
 * This is the user-facing "Word" download — true .docx requires a packager
 * we don't have here; .doc/HTML is what Word natively imports.
 */
export function buildTopicLetterheadHtml(row: AnyRight, meta: TopicImageMeta): string {
  function esc(text: string): string {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  const generalInfo = (row.publicSiteText && row.publicSiteText.trim())
    ? row.publicSiteText
    : (row.whatReceived || "");
  // Basic public sections only — detailed eligibility, application steps,
  // official forms, gold tips and qualifying-case lists are reserved for the
  // personal eligibility-check flow and never appear in public downloads.
  const allSections: Array<[string, string]> = [
    ["למי זה מיועד", (row.audience || "").slice(0, 280)],
  ];
  const sections: Array<[string, string]> = allSections.filter(
    (entry): entry is [string, string] => Boolean(entry[1] && entry[1].trim()),
  );

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${esc(row.topic)} — בקלות</title>
<style>
  @page { size: A4; margin: 22mm; }
  body { font-family: "Heebo", "Arial Hebrew", Arial, sans-serif; color: #1f2933; line-height: 1.55; direction: rtl; }
  .header { border-bottom: 4px solid #0f5560; padding-bottom: 14px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-size: 32px; font-weight: 800; color: #0f5560; letter-spacing: 0.5px; }
  .brand small { display: block; font-size: 12px; font-weight: 500; color: #555; letter-spacing: 0; }
  .meta { font-size: 12px; color: #555; text-align: left; direction: ltr; }
  h1 { font-size: 26px; color: #0f5560; margin: 0 0 6px 0; }
  .cat { color: #555; font-size: 13px; margin-bottom: 18px; }
  h2 { font-size: 16px; color: #0f5560; margin: 18px 0 6px 0; border-right: 4px solid #f3c84a; padding-right: 8px; }
  p, li { font-size: 13px; }
  .footer { margin-top: 30px; border-top: 2px solid #0f5560; padding-top: 10px; font-size: 11px; color: #555; display: flex; justify-content: space-between; }
  .lead { font-size: 14px; background: #f6f1de; padding: 12px 14px; border-right: 4px solid #f3c84a; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">בקלות<small>כל מה שמגיע לך, בקלות.</small></div>
    <div class="meta" dir="ltr">${esc(meta.contactPhone)} · ${esc(meta.contactEmail)}<br/>${esc(meta.contactWebsite)}</div>
  </div>
  <h1>${esc(row.topic)}</h1>
  <div class="cat">${esc([row.category, row.subCategory].filter(Boolean).join(" · "))}</div>
  ${generalInfo ? `<p class="lead">${esc(generalInfo)}</p>` : ""}
  ${sections.map(([title, body]) => `<h2>${esc(title)}</h2><p>${esc(body).replace(/\n/g, "<br/>")}</p>`).join("\n")}
  <p class="lead"><b>בדיקת זכאות בקליק</b> — לקבלת בדיקה אישית, רשימת מסמכים ואופן ההגשה, פנו אלינו דרך אתר בקלות או בטלפון ${esc(meta.contactPhone)}.</p>
  <div class="footer">
    <span>המידע בסיוע ארגון בקלות · המסמך אינו תחליף לייעוץ פרטני.</span>
    <span dir="ltr">${esc(meta.contactWebsite)}</span>
  </div>
</body>
</html>`;
}

/**
 * Build a plain-text public summary for share/copy buttons. Matches the
 * image export — no internal fields, no scripts, no detailed eligibility.
 */
export function buildTopicPublicText(
  row: AnyRight,
  meta: TopicImageMeta & { publicUrl?: string },
): string {
  const lines: string[] = [];
  lines.push(`📌 ${normalize(row.topic)}`);
  const catLine = [row.category, row.subCategory].filter(Boolean).join(" · ");
  if (catLine) lines.push(catLine);
  lines.push("");
  const summaryRaw = (row.publicSiteText && row.publicSiteText.trim())
    ? row.publicSiteText
    : (row.whatReceived || "");
  if (summaryRaw) {
    // Public summary is intentionally short — no detailed eligibility or
    // qualifying cases are exposed in copy/share text.
    const SHORT = 200;
    const summary = normalize(summaryRaw);
    const trimmed = summary.length > SHORT ? summary.slice(0, SHORT).trimEnd() + "…" : summary;
    lines.push(trimmed);
    lines.push("");
  }
  if (row.audience && row.audience.trim()) {
    const aud = normalize(row.audience);
    lines.push(`למי זה מיועד: ${aud.length > 180 ? aud.slice(0, 180).trimEnd() + "…" : aud}`);
  }
  lines.push("ניתן לקבל מידע ותזכורות ללא עלות.");
  lines.push("");
  lines.push("בדיקת זכאות בקליק — בקלות עוזרים לכם לבדוק התאמה אישית ולקבל את המידע המלא.");
  if (meta.publicUrl) lines.push(meta.publicUrl);
  lines.push(`${meta.contactPhone} · ${meta.contactEmail} · ${meta.contactWebsite}`);
  return lines.join("\n");
}

/** Download a Word-compatible letterhead document (.doc, opens in Word). */
export function downloadTopicLetterhead(row: AnyRight, meta: TopicImageMeta) {
  const html = buildTopicLetterheadHtml(row, meta);
  // application/msword + .doc extension is the most reliable "opens in Word"
  // format that we can produce without a docx packager dependency.
  const blob = new Blob(["﻿" + html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `bkalut-${row.id}-${safeFileName(row)}.doc`);
  URL.revokeObjectURL(url);
}
