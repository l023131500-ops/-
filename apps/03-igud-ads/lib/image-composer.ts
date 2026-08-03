// Compose Hebrew text on top of an AI-generated background using sharp + SVG.
// This gives us perfect Hebrew text rendering (no AI letter mangling).
import sharp from "sharp";

export type OverlayPlan = {
  title: string;
  subtitle?: string;
  details: string[];
  contact?: string;
};

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!
  );
}

function buildOverlaySvg(
  width: number,
  height: number,
  plan: OverlayPlan,
  accent = "#C9A84C",
  textColor = "#FFFFFF"
): string {
  // Reserve lower 65% of the poster for text overlay
  const padX = Math.floor(width * 0.08);
  const cardY = Math.floor(height * 0.38);
  const cardH = height - cardY - Math.floor(height * 0.05);
  const cardW = width - padX * 2;

  const titleFs = Math.floor(width * 0.07);
  const subFs = Math.floor(width * 0.042);
  const detailFs = Math.floor(width * 0.032);
  const contactFs = Math.floor(width * 0.026);

  let y = cardY + Math.floor(cardH * 0.14);
  const titleY = y;
  y += titleFs + 20;
  const subY = plan.subtitle ? y : null;
  if (plan.subtitle) y += subFs + 30;
  const detailStartY = y;

  const details = plan.details
    .map((d, i) => {
      const dy = detailStartY + i * (detailFs + 18);
      return `<text x="${width / 2}" y="${dy}" text-anchor="middle" font-family="David, 'Frank Ruehl', 'Noto Serif Hebrew', serif" font-size="${detailFs}" fill="${textColor}" font-weight="500" direction="rtl">${escapeXml(d)}</text>`;
    })
    .join("\n");

  const contact = plan.contact
    ? `<text x="${width / 2}" y="${height - Math.floor(height * 0.04)}" text-anchor="middle" font-family="David, serif" font-size="${contactFs}" fill="${textColor}" opacity="0.92" direction="rtl">${escapeXml(plan.contact)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="35%" stop-color="rgba(0,0,0,0.55)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.85)"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${Math.floor(cardY * 0.85)}" width="${width}" height="${height - Math.floor(cardY * 0.85)}" fill="url(#cardGrad)"/>
  <rect x="${padX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="22" ry="22"
        fill="rgba(0,0,0,0.40)" stroke="${accent}" stroke-width="3"/>
  <line x1="${padX + 60}" y1="${cardY + Math.floor(cardH * 0.08)}" x2="${width - padX - 60}" y2="${cardY + Math.floor(cardH * 0.08)}" stroke="${accent}" stroke-width="2" opacity="0.7"/>
  <text x="${width / 2}" y="${titleY}" text-anchor="middle"
        font-family="David, 'Frank Ruehl', 'Noto Serif Hebrew', serif"
        font-size="${titleFs}" fill="${textColor}" font-weight="700" direction="rtl"
        letter-spacing="1">${escapeXml(plan.title)}</text>
  ${plan.subtitle ? `<text x="${width / 2}" y="${subY}" text-anchor="middle" font-family="David, serif" font-size="${subFs}" fill="${accent}" font-weight="500" direction="rtl">${escapeXml(plan.subtitle)}</text>` : ""}
  ${details}
  ${contact}
</svg>`;
}

export type CompositeResult = {
  main: Buffer;      // 1024x1536 PNG
  whatsapp: Buffer;  // 1080x1080 PNG square
};

export async function compositeAd(
  backgroundPng: Buffer,
  plan: OverlayPlan,
  accentHex = "#C9A84C"
): Promise<CompositeResult> {
  const bgMeta = await sharp(backgroundPng).metadata();
  const w = bgMeta.width || 1024;
  const h = bgMeta.height || 1536;

  const svg = buildOverlaySvg(w, h, plan, accentHex);

  const main = await sharp(backgroundPng)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png({ quality: 95 })
    .toBuffer();

  // WhatsApp square: 1080x1080, center-crop the composited poster
  const whatsapp = await sharp(main)
    .resize({ width: 1080, height: 1080, fit: "cover", position: "center" })
    .png({ quality: 92 })
    .toBuffer();

  return { main, whatsapp };
}

export async function pngBufferFromUrl(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch image: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  // normalize to PNG
  return sharp(buf).png().toBuffer();
}

export async function pngBufferFromB64(b64: string): Promise<Buffer> {
  const raw = Buffer.from(b64, "base64");
  return sharp(raw).png().toBuffer();
}
