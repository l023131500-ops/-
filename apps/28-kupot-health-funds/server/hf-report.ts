/**
 * קופות חולים — דוח השוואה מודפס/PDF.
 *
 * מרנדר את הנושאים המסוננים (אותם פילטרים כמו מסך הבית) כמסמך HTML עברי RTL
 * עצמאי, בעיצוב האתר. הדפדפן מדפיס אותו ל-PDF (window.print()) — אותה שיטה
 * בדיוק כמו מחירון (apps/27-bkalut-price/server/pc-report.ts), בלי תלות
 * כבדה בספריית PDF.
 */
import type { HfTopic } from "@shared/schema";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// זהה ל-FUND_BY_NAME/bestFundKey ב-client/src/lib/hf.ts — הועתק (לא יובא)
// כי זה קובץ צד-לקוח וזה קובץ צד-שרת; שני הצדדים חייבים להסכים על אותו מיפוי.
const FUND_BY_NAME: Record<string, string> = {
  כללית: "clalit",
  מכבי: "maccabi",
  מאוחדת: "meuhedet",
  לאומית: "leumit",
};

function bestFundKey(bestFund?: string | null): string | null {
  if (!bestFund) return null;
  for (const [name, key] of Object.entries(FUND_BY_NAME)) {
    if (bestFund.includes(name)) return key;
  }
  return null;
}

const KIND_LABELS: Record<string, string> = {
  fund: "קופות חולים",
  gov: "זכויות ממשלה",
  ngo: "עמותות וסיוע",
};

export function filterTopicsForReport(
  topics: HfTopic[],
  opts: { kind: string; category?: string; fund?: string; search?: string },
): HfTopic[] {
  const q = (opts.search || "").trim();
  return topics.filter((t) => {
    if (t.kind !== opts.kind) return false;
    if (opts.category && t.category !== opts.category) return false;
    if (opts.fund) {
      const winner = bestFundKey(t.bestFund);
      if (opts.fund === "undecided" ? winner !== null : winner !== opts.fund) return false;
    }
    if (q) {
      const hay = `${t.topic} ${t.audience} ${t.benefitSummary} ${t.rangeText} ${t.category}`;
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function renderHfReportHtml(opts: {
  kind: string;
  rows: HfTopic[];
  filtersLabel?: string;
  autoPrint?: boolean;
}): string {
  const generatedAt = new Date().toLocaleString("he-IL");
  const rowsHtml = opts.rows.length === 0
    ? `<tr><td colspan="4" class="empty">לא נמצאו נושאים מתאימים לסינון הנוכחי.</td></tr>`
    : opts.rows.map((t) => {
        const bestLabel = t.bestFund ? esc(t.bestFund) : "טעון השוואה פרטנית";
        // rangeText חסר ב-113 מ-515 הנושאים; publicSiteText הוא הטקסט הציבורי
        // שהוכן בדיוק בשביל המקרה הזה (ר' TopicCard.tsx / shared/schema.ts)
        // ולא נבדק כאן — הנפילה הייתה מדלגת ישר ל"—" בעוד לכל 113 יש חלופה.
        const value = t.rangeText || t.publicSiteText || "—";
        // subCategory מוצג כתג נפרד ב-TopicCard.tsx (ר' commit 0ab8e968) אך
        // הדוח כאן הרכיב את שורת התיאור רק מ-category+audience — subCategory
        // (מאוכלס ב-80 מתוך 515 נושאים, בעיקר ממשלה/עמותות) נשמט בשקט.
        const subLine = [t.category, t.subCategory, t.audience].filter(Boolean).join(" · ");
        // sourceName מוצג ליד "מקור:" ב-TopicCard.tsx (מאוכלס ב-515/515 נושאים
        // — ר' hf_data_export.json) אך נשמט מהדוח המודפס: מי שמדפיס/שומר את
        // הדוח יוצא בלי לדעת על סמך אילו מקורות (תקנון השב"ן, ביטוח לאומי,
        // משרד הבריאות וכו') נבנתה כל שורה.
        return `<tr>
          <td class="name">${esc(t.topic)}<div class="muted">${esc(subLine)}</div></td>
          <td>${esc(value)}</td>
          <td class="best">${bestLabel}</td>
          <td class="muted small">${esc(t.benefitSummary || "—")}${t.sourceName ? `<div class="muted">מקור: ${esc(t.sourceName)}</div>` : ""}</td>
        </tr>`;
      }).join("\n");

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>דוח השוואת קופות חולים — בקלות</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, "Noto Sans Hebrew", sans-serif; color: #1a2b2b; margin: 0; padding: 24px; background: #fff; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #12938F; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand .logo { width: 40px; height: 40px; border-radius: 10px; background: #12938F; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; }
  .brand .t { font-size: 20px; font-weight: 800; }
  .brand .s { font-size: 12px; color: #666; }
  h1 { font-size: 18px; margin: 8px 0 2px; }
  .meta { color: #888; font-size: 11px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: right; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 700; font-size: 12px; }
  td.best { color: #12938F; font-weight: 800; white-space: nowrap; }
  td.name { font-weight: 600; }
  .muted { color: #777; font-weight: 400; font-size: 11px; margin-top: 2px; }
  .muted.small { line-height: 1.5; }
  .empty { text-align: center; color: #999; padding: 32px; }
  .foot { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; color: #888; font-size: 11px; display: flex; justify-content: space-between; }
  @media print { body { padding: 0; } .noprint { display: none; } }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">
      <div class="logo">ק</div>
      <div>
        <div class="t">השוואת קופות חולים</div>
        <div class="s">מבית בקלות</div>
      </div>
    </div>
    <div style="text-align:left">
      <div class="meta">הופק: ${esc(generatedAt)}</div>
    </div>
  </div>

  <h1>דוח השוואה — ${esc(KIND_LABELS[opts.kind] || opts.kind)}</h1>
  ${opts.filtersLabel ? `<div class="meta">סינון: ${esc(opts.filtersLabel)}</div>` : ""}
  <div class="meta">סה״כ נושאים בדוח: ${esc(opts.rows.length)}</div>

  <table>
    <thead>
      <tr>
        <th>נושא</th>
        <th>מה ניתן לקבל</th>
        <th>המסלול הבולט</th>
        <th>פירוט ההטבה</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="foot">
    <span>השוואת קופות חולים — מבית בקלות. המידע כללי ומבוסס על מקורות ציבוריים; לפרטים מדויקים יש לפנות לקופה.</span>
    <span>© בקלות</span>
  </div>

  ${opts.autoPrint ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});</script>` : ""}
</body>
</html>`;
}
