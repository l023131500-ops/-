import { useRef, useState } from "react";
import domtoimage from "dom-to-image-more";
import { Download, Loader2, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type RightData = {
  topic_name: string;
  category: string;
  plain_description?: string | null;
  economic_necessity?: number | null;
  financial_potential?: string | null;
  eligibility_criteria?: string | null;
  accompanying_benefit?: string | null;
  bureaucratic_pitfalls?: string | null;
  required_documents?: string | null;
  how_to_apply?: string | null;
  service_link?: string | null;
};

const FIELD_CONFIG: { key: keyof RightData; label: string; iconSvg: string; color: string }[] = [
  { key: "plain_description", label: "מה זה", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`, color: "#1a4d2e" },
  { key: "financial_potential", label: "פוטנציאל", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`, color: "#c4a44b" },
  { key: "eligibility_criteria", label: "תנאי סף", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`, color: "#2563a8" },
  { key: "required_documents", label: "מסמכים", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`, color: "#7c3aed" },
  { key: "how_to_apply", label: "איך", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`, color: "#0d9488" },
  { key: "accompanying_benefit", label: "הטבות", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`, color: "#ea580c" },
  { key: "bureaucratic_pitfalls", label: "מוקשים", iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`, color: "#dc2626" },
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
  const val = escapeHtml(String(right[field.key]));
  const contentHTML = field.key === "service_link"
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
        ${escapeHtml(right.category)}
      </div>
      <h1 style="font-size:26px;font-weight:800;color:#1a4d2e;margin:0;line-height:1.4;">
        ${escapeHtml(right.topic_name)}
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
            ${escapeHtml(right.topic_name)} - המשך (עמוד ${pages.length + 1})
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
    { key: "plain_description", label: "מה זה אומר" },
    { key: "financial_potential", label: "פוטנציאל כספי" },
    { key: "eligibility_criteria", label: "תנאי זכאות" },
    { key: "how_to_apply", label: "איך מבצעים" },
  ] as const;
  for (const f of fields) {
    const val = right[f.key];
    if (val) lines.push(`\n${f.label}:\n${val}`);
  }
  if (right.economic_necessity) lines.push(`\nנחיצות כלכלית: ${right.economic_necessity}/10`);
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
