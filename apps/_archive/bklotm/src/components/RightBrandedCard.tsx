import { useRef, useState } from "react";
import domtoimage from "dom-to-image-more";
import { Download, Loader2, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

type RightData = {
  topic_name: string;
  category: string;
  target_audience?: string | null;
  what_you_get?: string | null;
  eligibility_criteria?: string | null;
  exact_parameters?: string | null;
  details_to_prepare?: string | null;
  required_documents?: string | null;
  gold_tip?: string | null;
  handling_body?: string | null;
  service_link?: string | null;
  physical_form_url?: string | null;
  // Legacy fields (kept for backwards compatibility)
  plain_description?: string | null;
  economic_necessity?: number | null;
  financial_potential?: string | null;
  accompanying_benefit?: string | null;
  bureaucratic_pitfalls?: string | null;
  how_to_apply?: string | null;
};

const FIELD_CONFIG: { key: keyof RightData; label: string; iconSvg: string; color: string }[] = [
  { key: "target_audience", label: "למי מיועד", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, color: "#1a4d2e" },
  { key: "what_you_get", label: "מה ניתן לקבל", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`, color: "#c4a44b" },
  { key: "eligibility_criteria", label: "תנאי סף לזכאות", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`, color: "#2563a8" },
  { key: "exact_parameters", label: "פרמטרים מדויקים", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`, color: "#0891b2" },
  { key: "details_to_prepare", label: "מה להכין", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, color: "#0d9488" },
  { key: "required_documents", label: "מסמכים לצרף", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`, color: "#7c3aed" },
  { key: "gold_tip", label: "טיפ זהב של בקלות", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`, color: "#ca8a04" },
  { key: "handling_body", label: "היכן מגישים", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`, color: "#dc2626" },
  { key: "service_link", label: "קישור ישיר", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`, color: "#2563eb" },
  { key: "physical_form_url", label: "מסמך פיזי למילוי", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`, color: "#9333ea" },
];

const HEADER_HTML = `
  <div style="background:linear-gradient(135deg,#1a4d2e 0%,#2d6b45 100%);padding:28px 36px 26px;position:relative;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="text-align:right;vertical-align:middle;">
          <table style="border-collapse:collapse;margin-right:0;margin-left:auto;">
            <tr>
              <td style="vertical-align:middle;padding-left:12px;">
                <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#c4a44b,#d4b85a);text-align:center;line-height:48px;box-shadow:0 4px 12px rgba(196,164,75,0.4);">
                  <span style="color:#fff;font-size:24px;font-weight:900;">&#10003;</span>
                </div>
              </td>
              <td style="vertical-align:middle;">
                <div style="color:#ffffff;font-size:28px;font-weight:800;letter-spacing:1px;">בקלות</div>
                <div style="color:#c4a44b;font-size:13px;font-weight:500;">הזכות שלך, האחריות שלנו</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="text-align:left;vertical-align:middle;color:rgba(255,255,255,0.8);font-size:11px;white-space:nowrap;">
          <div>מיצוי זכויות מקצועי</div>
          <div>02-3131500</div>
          <div>L023131500@gmail.com</div>
        </td>
      </tr>
    </table>
    <div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#c4a44b,#d4b85a,#c4a44b);"></div>
  </div>`;

const FOOTER_HTML = `
  <div style="background:linear-gradient(135deg,#1a4d2e 0%,#2d6b45 100%);padding:14px 36px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="text-align:right;vertical-align:middle;color:rgba(255,255,255,0.7);font-size:11px;">
          כל הזכויות שמורות &copy; בקלות
        </td>
        <td style="text-align:left;vertical-align:middle;white-space:nowrap;">
          <span style="color:#c4a44b;font-size:12px;font-weight:600;">02-3131500</span>
          <span style="color:rgba(255,255,255,0.4);margin:0 6px;">|</span>
          <span style="color:rgba(255,255,255,0.7);font-size:11px;">L023131500@gmail.com</span>
        </td>
      </tr>
    </table>
  </div>`;

const CTA_HTML = `
  <div style="margin:0 36px 20px;background:linear-gradient(135deg,rgba(196,164,75,0.08),rgba(196,164,75,0.03));border:2px solid rgba(196,164,75,0.25);border-radius:12px;padding:16px 20px;text-align:center;">
    <div style="font-size:18px;font-weight:800;color:#1a4d2e;margin-bottom:4px;">
      <span style="color:#c4a44b;font-size:20px;">&#128273;</span> המפתח להצלחה - תעשו את זה עכשיו!
    </div>
    <div style="font-size:13px;color:#666;">
      צרו קשר לייעוץ מקצועי בחינם: 02-3131500
    </div>
  </div>`;

function buildFieldHTML(field: typeof FIELD_CONFIG[number], right: RightData): string {
  const val = String(right[field.key]);
  const contentHTML = (field.key === "service_link" || field.key === "physical_form_url")
    ? `<span style="color:#2563a8;text-decoration:underline;word-break:break-all;">${val}</span>`
    : val.replace(/\n/g, "<br/>");
  return `
    <div style="margin-bottom:14px;border-radius:10px;overflow:hidden;border:1px solid ${field.color}33;background:#fafafa;">
      <div style="background:linear-gradient(135deg,${field.color},${field.color}dd);padding:8px 16px;">
        <table style="border-collapse:collapse;"><tr>
          <td style="vertical-align:middle;padding-left:8px;">${field.iconSvg}</td>
          <td style="vertical-align:middle;"><span style="color:#fff;font-size:14px;font-weight:700;">${field.label}</span></td>
        </tr></table>
      </div>
      <div style="padding:12px 16px;font-size:13.5px;line-height:1.7;color:#333;">
        ${contentHTML}
      </div>
    </div>`;
}

function buildNecessityHTML(right: RightData): string {
  if (!right.economic_necessity) return "";
  return `
    <table style="border-collapse:collapse;margin-top:10px;"><tr>
      <td style="vertical-align:middle;padding-left:8px;"><span style="font-size:12px;color:#666;font-weight:500;">נחיצות כלכלית:</span></td>
      <td style="vertical-align:middle;padding-left:8px;">
        <table style="border-collapse:collapse;"><tr>
          ${Array.from({ length: 10 }).map((_, i) => `
            <td style="padding:0 1.5px;"><div style="width:20px;height:8px;border-radius:4px;background:${i < (right.economic_necessity || 0) ? 'linear-gradient(135deg,#1a4d2e,#2d6b45)' : '#e5e7eb'};"></div></td>
          `).join("")}
        </tr></table>
      </td>
      <td style="vertical-align:middle;"><span style="font-size:13px;font-weight:700;color:#1a4d2e;">${right.economic_necessity}/10</span></td>
    </tr></table>`;
}

function buildTitleSection(right: RightData): string {
  return `
    <div style="padding:24px 36px 16px;background:linear-gradient(180deg,#f8faf9 0%,#ffffff 100%);">
      <div style="display:inline-block;background:linear-gradient(135deg,rgba(26,77,46,0.08),rgba(26,77,46,0.03));border:1px solid rgba(26,77,46,0.12);border-radius:8px;padding:4px 14px;font-size:12px;color:#1a4d2e;font-weight:600;margin-bottom:10px;">
        ${right.category}
      </div>
      <h1 style="font-size:26px;font-weight:800;color:#1a4d2e;margin:0;line-height:1.4;">
        ${right.topic_name}
      </h1>
      ${buildNecessityHTML(right)}
    </div>`;
}

/** Build pages - each page has header+footer, fields split across pages */
function buildPages(right: RightData): string[] {
  const activeFields = FIELD_CONFIG.filter(f => {
    const val = right[f.key];
    return val !== null && val !== undefined && val !== "";
  });

  // Split fields: first page gets title + up to 4 fields, rest get up to 5
  const FIRST_PAGE_MAX = 4;
  const OTHER_PAGE_MAX = 5;
  const pages: string[] = [];

  let fieldIndex = 0;

  // Page 1: header + title + first batch of fields + CTA (if fits) + footer
  const firstBatch = activeFields.slice(0, FIRST_PAGE_MAX);
  fieldIndex = firstBatch.length;
  const isLastPage = fieldIndex >= activeFields.length;

  pages.push(`
    <div style="width:800px;font-family:Rubik,Arial,sans-serif;background:#ffffff;direction:rtl;text-align:right;">
      ${HEADER_HTML}
      ${buildTitleSection(right)}
      <div style="padding:8px 36px 20px;">
        ${firstBatch.map(f => buildFieldHTML(f, right)).join("")}
      </div>
      ${isLastPage ? CTA_HTML : ''}
      ${FOOTER_HTML}
    </div>`);

  // Additional pages
  while (fieldIndex < activeFields.length) {
    const batch = activeFields.slice(fieldIndex, fieldIndex + OTHER_PAGE_MAX);
    fieldIndex += batch.length;
    const isLast = fieldIndex >= activeFields.length;

    pages.push(`
      <div style="width:800px;font-family:Rubik,Arial,sans-serif;background:#ffffff;direction:rtl;text-align:right;">
        ${HEADER_HTML}
        <div style="padding:20px 36px 8px;">
          <div style="font-size:14px;color:#999;margin-bottom:12px;">
            ${right.topic_name} - המשך (עמוד ${pages.length + 1})
          </div>
        </div>
        <div style="padding:0 36px 20px;">
          ${batch.map(f => buildFieldHTML(f, right)).join("")}
        </div>
        ${isLast ? CTA_HTML : ''}
        ${FOOTER_HTML}
      </div>`);
  }

  return pages;
}

/** For preview - show only page 1 */
function buildCardHTML(right: RightData): string {
  return buildPages(right)[0];
}

/** Download all pages as separate images */
export async function downloadBrandedImage(right: RightData): Promise<void> {
  const pages = buildPages(right);

  for (let i = 0; i < pages.length; i++) {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.zIndex = "-1";
    container.innerHTML = pages[i];
    document.body.appendChild(container);

    const cardEl = container.firstElementChild as HTMLElement;

    try {
      await new Promise(r => setTimeout(r, 300));
      const dataUrl = await domtoimage.toPng(cardEl, {
        width: 800,
        height: cardEl.scrollHeight,
        style: { transform: "none", "font-family": "Rubik, Arial, sans-serif" },
      });
      const link = document.createElement("a");
      const suffix = pages.length > 1 ? `_${i + 1}` : "";
      link.download = `${right.topic_name}${suffix}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      document.body.removeChild(container);
    }

    // Small delay between downloads
    if (i < pages.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
}

/** Build a text summary of the right for sharing */
function buildShareText(right: RightData): string {
  const lines: string[] = [`*${right.topic_name}*`, `קטגוריה: ${right.category}`];
  const fields = [
    { key: "target_audience", label: "למי מיועד" },
    { key: "what_you_get", label: "מה ניתן לקבל" },
    { key: "eligibility_criteria", label: "תנאי זכאות" },
    { key: "gold_tip", label: "⭐ טיפ זהב של בקלות" },
    { key: "handling_body", label: "היכן מגישים" },
    { key: "service_link", label: "קישור" },
  ] as const;
  for (const f of fields) {
    const val = right[f.key];
    if (val) lines.push(`\n${f.label}:\n${val}`);
  }
  lines.push(`\nבקלות - מיצוי זכויות: 02-3131500`);
  return lines.join("\n");
}

/** Share via WhatsApp */
export function shareViaWhatsApp(right: RightData, phone?: string): void {
  const text = encodeURIComponent(buildShareText(right));
  const url = phone
    ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${text}`
    : `https://wa.me/?text=${text}`;
  window.open(url, "_blank");
}

/** Share via Email */
export function shareViaEmail(right: RightData, to?: string): void {
  const subject = encodeURIComponent(`בקלות - ${right.topic_name}`);
  const body = encodeURIComponent(buildShareText(right));
  const mailto = `mailto:${to || ""}?subject=${subject}&body=${body}`;
  window.open(mailto, "_self");
}

interface RightBrandedCardProps {
  right: RightData;
}

const RightBrandedCard = ({ right }: RightBrandedCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const pages = buildPages(right);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadBrandedImage(right);
    } catch (err) {
      console.error("Download failed:", err);
    }
    setDownloading(false);
  };

  return (
    <div>
      {/* Preview all pages */}
      {pages.map((html, i) => (
        <div
          key={i}
          ref={i === 0 ? cardRef : undefined}
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ marginBottom: pages.length > 1 && i < pages.length - 1 ? 16 : 0 }}
        />
      ))}
      <div className="flex gap-2 mt-4 flex-wrap">
        <Button onClick={handleDownload} disabled={downloading} className="gap-2">
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? "מוריד..." : pages.length > 1 ? `הורד ${pages.length} תמונות` : "הורד כתמונה"}
        </Button>
        <Button variant="outline" onClick={() => shareViaWhatsApp(right)} className="gap-2 text-green-600 border-green-300 hover:bg-green-50">
          <MessageCircle className="w-4 h-4" />
          שלח בוואטסאפ
        </Button>
        <Button variant="outline" onClick={() => shareViaEmail(right)} className="gap-2">
          <Mail className="w-4 h-4" />
          שלח במייל
        </Button>
      </div>
    </div>
  );
};

export default RightBrandedCard;
