// בונה HTML לספר מותג מלא (7 סעיפים) המיועד להדפסה/שמירה כ-PDF.
// שימוש בחלון הדפסה של הדפדפן מבטיח תמיכה מלאה בעברית ו-RTL וגופנים מוטמעים.
import type { BrandKit, Archetype, ColorSpec } from "@shared/branding";
import { AAKER_DIMENSIONS, contrastRatio } from "@shared/branding";

interface BrandRow {
  brandName: string;
  logoPng: string | null;
  logoSvg: string | null;
}

export function buildBrandBookHtml(opts: {
  brand: BrandRow;
  kit: BrandKit;
  arch?: Archetype;
  archSec?: Archetype;
}): string {
  const { brand, kit, arch, archSec } = opts;
  const allColors: ColorSpec[] = [...kit.colors.primary, ...kit.colors.secondary, ...kit.colors.neutral];
  const s = kit.strategy;

  const logoSrc = brand.logoSvg
    ? `data:image/svg+xml;utf8,${encodeURIComponent(brand.logoSvg)}`
    : brand.logoPng || "";

  const colorSwatches = allColors.map((c) => `
    <div class="swatch">
      <div class="chip" style="background:${c.hex}"></div>
      <div class="meta">
        <div class="role">${esc(c.role)}</div>
        <div class="mono">${esc(c.hex)}</div>
        <div class="dim">RGB ${esc(c.rgb)}</div>
        <div class="dim">CMYK ${esc(c.cmyk)}</div>
        <div class="dim">ניגודיות/לבן ${contrastRatio(c.hex, "#FFFFFF")}:1</div>
      </div>
    </div>`).join("");

  const typeScale = kit.typography.scale.map((t) => `
    <div class="type-row">
      <span class="sample" style="font-size:${clampSize(t.size)};font-weight:${t.weight}">אבגד ABCabc</span>
      <span class="type-meta">${esc(t.label)} · ${esc(t.size)} · ${esc(t.weight)} · ${esc(t.use)}</span>
    </div>`).join("");

  const values = s.values.map((v) => `<span class="pill">${esc(v)}</span>`).join("");
  const voiceTraits = s.voiceTraits.map((v) => `<span class="pill">${esc(v)}</span>`).join("");
  const aaker = s.aaker.map((k) => {
    const d = AAKER_DIMENSIONS.find((x) => x.key === k);
    return `<span class="pill light">${esc(d?.name || k)}</span>`;
  }).join("");
  const voiceDo = s.voiceDo.length ? s.voiceDo.map((v) => `<li>✓ ${esc(v)}</li>`).join("") : "<li class='dim'>—</li>";
  const voiceDont = s.voiceDont.length ? s.voiceDont.map((v) => `<li>✗ ${esc(v)}</li>`).join("") : "<li class='dim'>—</li>";

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<title>ספר מותג — ${esc(brand.brandName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700;900&family=Assistant:wght@300;400;600;700;800&family=Heebo:wght@400;500;700&family=David+Libre:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Assistant', sans-serif; color: #1a1a1a; background: #fff; direction: rtl; }
  .page { width: 210mm; min-height: 297mm; padding: 22mm 20mm; margin: 0 auto; page-break-after: always; position: relative; }
  .page:last-child { page-break-after: auto; }
  h1, h2, h3 { font-family: 'Frank Ruhl Libre', serif; }
  .kicker { font-size: 11px; letter-spacing: 2px; color: #C9A227; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
  .sec-title { font-size: 30px; font-weight: 900; color: #0B1E3F; margin-bottom: 4px; }
  .sec-sub { font-size: 13px; color: #666; margin-bottom: 26px; }
  .field { margin-bottom: 18px; }
  .field .lbl { font-size: 12px; font-weight: 700; color: #C9A227; margin-bottom: 4px; }
  .field .val { font-size: 15px; line-height: 1.7; color: #222; }
  .pill { display: inline-block; background: #0B1E3F; color: #fff; font-size: 12px; padding: 5px 12px; border-radius: 999px; margin: 0 0 6px 6px; }
  .pill.light { background: #F5F0E6; color: #0B1E3F; border: 1px solid #C9A227; }
  .grid-c { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .swatch { border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
  .swatch .chip { height: 70px; }
  .swatch .meta { padding: 10px; font-size: 11px; }
  .swatch .role { font-weight: 700; font-size: 12px; margin-bottom: 3px; }
  .swatch .mono { font-family: monospace; color: #C9A227; font-weight: 700; }
  .swatch .dim { color: #888; }
  .type-row { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid #eee; padding: 10px 0; }
  .type-row .sample { color: #0B1E3F; }
  .type-row .type-meta { font-size: 11px; color: #888; }
  .voice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .voice-box { border-radius: 10px; padding: 16px; }
  .voice-box.do { background: #f2faf5; border: 1px solid #b7e4c7; }
  .voice-box.dont { background: #fdf3f3; border: 1px solid #f5c2c2; }
  .voice-box h4 { font-family: 'Assistant'; font-size: 14px; margin-bottom: 10px; }
  .voice-box.do h4 { color: #2d8a4e; }
  .voice-box.dont h4 { color: #c0392b; }
  .voice-box ul { list-style: none; }
  .voice-box li { font-size: 13px; line-height: 1.8; }
  .dim { color: #aaa; }
  .cover { background: #0B1E3F; color: #F5F0E6; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .cover .logo-wrap { background: #fff; border-radius: 16px; padding: 30px; margin-bottom: 34px; max-width: 60%; }
  .cover img { max-width: 100%; max-height: 180px; object-fit: contain; }
  .cover h1 { font-size: 46px; font-weight: 900; color: #C9A227; margin-bottom: 12px; }
  .cover .tag { font-size: 17px; opacity: .85; }
  .cover .foot { position: absolute; bottom: 22mm; font-size: 12px; letter-spacing: 3px; opacity: .6; }
  .info-box { background: #F5F0E6; border-right: 4px solid #C9A227; padding: 14px 16px; border-radius: 6px; margin-bottom: 18px; }
  .info-box .t { font-weight: 700; color: #0B1E3F; margin-bottom: 4px; }
  .info-box .d { font-size: 13px; color: #555; }
  .logo-showcase { display: flex; align-items: center; justify-content: center; background: #F5F0E6; border-radius: 12px; padding: 40px; margin-bottom: 20px; }
  .logo-showcase img { max-height: 200px; max-width: 100%; object-fit: contain; }
  .two-up { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .mini { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 20px; text-align: center; }
  .mini.dark { background: #0B1E3F; }
  .mini img { max-height: 90px; max-width: 100%; object-fit: contain; }
  @media print { .page { margin: 0; } }
  @page { size: A4; margin: 0; }
</style>
</head>
<body>

  <!-- שער -->
  <section class="page cover">
    ${logoSrc ? `<div class="logo-wrap"><img src="${logoSrc}" alt="לוגו" /></div>` : ""}
    <h1>${esc(brand.brandName)}</h1>
    ${s.tagline ? `<p class="tag">״${esc(s.tagline)}״</p>` : ""}
    <p class="tag">ספר מותג</p>
    <div class="foot">BRAND GUIDELINES</div>
  </section>

  <!-- 1. סקירת מותג -->
  <section class="page">
    <div class="kicker">01 · סקירת מותג</div>
    <h2 class="sec-title">מהות המותג</h2>
    <p class="sec-sub">מיצוב, מיסיון, ערכים ואישיות</p>
    ${s.positioning ? field("משפט מיצוב", s.positioning) : ""}
    ${s.mission ? field("מיסיון", s.mission) : ""}
    ${values ? `<div class="field"><div class="lbl">ערכי מותג</div><div>${values}</div></div>` : ""}
    ${arch ? `<div class="info-box"><div class="t">ארכיטיפ דומיננטי · ${esc(arch.name)} (${esc(arch.nameEn)})</div><div class="d">${esc(arch.desc)} · דוגמאות: ${esc(arch.brands)}</div></div>` : ""}
    ${archSec ? `<div class="info-box"><div class="t">ארכיטיפ משני · ${esc(archSec.name)}</div><div class="d">${esc(archSec.desc)}</div></div>` : ""}
    ${aaker ? `<div class="field"><div class="lbl">ממדי אישיות (Aaker)</div><div>${aaker}</div></div>` : ""}
  </section>

  <!-- 2. מערכת הלוגו -->
  <section class="page">
    <div class="kicker">02 · מערכת הלוגו</div>
    <h2 class="sec-title">הלוגו</h2>
    <p class="sec-sub">גרסה ראשית, שטח מגן ושימוש נכון</p>
    ${logoSrc ? `<div class="logo-showcase"><img src="${logoSrc}" alt="לוגו ראשי" /></div>` : `<div class="info-box"><div class="d">טרם נוצר לוגו — חזור לערכת המותג וצור קונספטים.</div></div>`}
    ${logoSrc ? `<div class="two-up">
      <div class="mini"><img src="${logoSrc}" /><div style="font-size:11px;color:#888;margin-top:8px">על רקע בהיר</div></div>
      <div class="mini dark"><img src="${logoSrc}" /><div style="font-size:11px;color:#F5F0E6;margin-top:8px">על רקע כהה</div></div>
    </div>` : ""}
    <div class="info-box" style="margin-top:18px"><div class="t">שטח מגן</div><div class="d">שמור מרווח מינימלי סביב הלוגו בגובה האות בשם המותג. אין למקם טקסט או אלמנטים בתוך שטח זה.</div></div>
    <div class="info-box"><div class="t">מה לא לעשות</div><div class="d">אין למתוח, לסובב, לשנות צבעים, להוסיף צללים או להציב על רקע בעל ניגודיות נמוכה.</div></div>
    ${brand.logoSvg ? `<div class="info-box"><div class="t">קובץ וקטורי</div><div class="d">קיים קובץ SVG וקטורי חד לכל שימושי הדפוס והדיגיטל.</div></div>` : ""}
  </section>

  <!-- 3. מערכת הצבע -->
  <section class="page">
    <div class="kicker">03 · מערכת הצבע</div>
    <h2 class="sec-title">פלטת הצבעים</h2>
    <p class="sec-sub">יחסי שימוש: ${esc(kit.colors.usageRatio)} · כל הצבעים עם ערכי HEX / RGB / CMYK</p>
    <div class="grid-c">${colorSwatches}</div>
  </section>

  <!-- 4. טיפוגרפיה -->
  <section class="page">
    <div class="kicker">04 · טיפוגרפיה</div>
    <h2 class="sec-title">גופנים וסולם</h2>
    <p class="sec-sub">גופן כותרות: ${esc(kit.typography.headline)} · גופן גוף: ${esc(kit.typography.body)}</p>
    ${typeScale}
    <div class="info-box" style="margin-top:20px"><div class="t">רישוי</div><div class="d">הגופנים המומלצים זמינים ב-Google Fonts תחת רישיון פתוח (OFL) לשימוש מסחרי.</div></div>
  </section>

  <!-- 5. imagery -->
  <section class="page">
    <div class="kicker">05 · Imagery וצילום</div>
    <h2 class="sec-title">שפה חזותית</h2>
    <p class="sec-sub">סגנון הדימויים התומך בזהות המותג</p>
    <div class="info-box"><div class="t">מתאים</div><div class="d">דימויים ${arch ? esc(arch.keywords.join(", ")) : "מכובדים, נקיים ותומכי-ערכים"}; קומפוזיציה מסודרת; פלטת צבעי המותג; אווירה מכובדת התואמת לקהל.</div></div>
    <div class="info-box"><div class="t">לא מתאים</div><div class="d">דימויים רועשים/עמוסים; צבעוניות מנוגדת לפלטה; סגנון זול או גנרי; תוכן שאינו תואם לרוח הקהל.</div></div>
  </section>

  <!-- 6. קול וטון -->
  <section class="page">
    <div class="kicker">06 · קול וטון</div>
    <h2 class="sec-title">קול המותג</h2>
    <p class="sec-sub">כך המותג מדבר</p>
    ${voiceTraits ? `<div class="field"><div class="lbl">תכונות קול</div><div>${voiceTraits}</div></div>` : ""}
    <div class="voice-grid">
      <div class="voice-box do"><h4>אנחנו כן</h4><ul>${voiceDo}</ul></div>
      <div class="voice-box dont"><h4>אנחנו לא</h4><ul>${voiceDont}</ul></div>
    </div>
  </section>

  <!-- 7. יישום -->
  <section class="page">
    <div class="kicker">07 · דוגמאות יישום</div>
    <h2 class="sec-title">המותג בפעולה</h2>
    <p class="sec-sub">כרטיס ביקור, חתימת אימייל, פוסט לרשתות ונייר מכתבים</p>
    <div class="two-up">
      <div class="mini" style="text-align:right;padding:24px;background:${allColors[0]?.hex || "#0B1E3F"};color:#fff">
        ${logoSrc ? `<img src="${logoSrc}" style="max-height:44px;margin-bottom:14px" />` : ""}
        <div style="font-family:'Frank Ruhl Libre';font-size:18px;font-weight:700">${esc(brand.brandName)}</div>
        <div style="font-size:12px;opacity:.8;margin-top:6px">כרטיס ביקור · שם · תפקיד · טלפון</div>
      </div>
      <div class="mini" style="text-align:right;padding:24px">
        <div style="font-size:12px;color:#888;border-bottom:2px solid ${allColors[0]?.hex || "#C9A227"};padding-bottom:8px;margin-bottom:8px">חתימת אימייל</div>
        <div style="font-family:'Frank Ruhl Libre';font-weight:700;color:#0B1E3F">${esc(brand.brandName)}</div>
        <div style="font-size:11px;color:#888">${s.tagline ? esc(s.tagline) : "שם · תפקיד · יצירת קשר"}</div>
      </div>
    </div>
    <div class="two-up" style="margin-top:14px">
      <div class="mini" style="padding:0;overflow:hidden;background:${allColors[1]?.hex || "#101B32"};color:#fff;min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center">
        ${logoSrc ? `<img src="${logoSrc}" style="max-height:60px;margin-bottom:10px" />` : ""}
        <div style="font-size:12px;opacity:.8">פוסט לרשתות · 1:1</div>
      </div>
      <div class="mini" style="text-align:right;padding:24px;min-height:150px">
        ${logoSrc ? `<img src="${logoSrc}" style="max-height:40px;margin-bottom:14px" />` : ""}
        <div style="font-size:11px;color:#aaa;line-height:1.8">נייר מכתבים רשמי<br/>עם לוגו בראש הדף<br/>ופרטי יצירת קשר בתחתית</div>
      </div>
    </div>
  </section>

</body>
</html>`;
}

function field(lbl: string, val: string): string {
  return `<div class="field"><div class="lbl">${esc(lbl)}</div><div class="val">${esc(val)}</div></div>`;
}

function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// מגביל את גודל ה-sample בסולם כך שלא יחרוג מהעמוד
function clampSize(size: string): string {
  const n = parseInt(size, 10);
  if (isNaN(n)) return size;
  return `${Math.min(n, 42)}px`;
}
