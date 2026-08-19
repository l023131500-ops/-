/**
 * Price Comparison — branded printable report.
 *
 * Renders the current filtered search results as a self-contained, RTL Hebrew
 * HTML document with Bkalut branding. The browser prints it to PDF (the public
 * UI opens it and calls window.print()). This avoids adding a heavy PDF
 * dependency while giving correct Hebrew shaping and live data.
 */
import type { PcSearchRow } from "./price-comparison";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ils = (n: number | null) => (n == null ? "—" : `₪${n.toFixed(2)}`);

export function renderReportHtml(opts: {
  title?: string;
  subtitle?: string;
  rows: PcSearchRow[];
  filtersLabel?: string;
  autoPrint?: boolean;
}): string {
  const generatedAt = new Date().toLocaleString("he-IL");
  const rowsHtml = opts.rows.length === 0
    ? `<tr><td colspan="5" class="empty">לא נמצאו מוצרים מתאימים לסינון הנוכחי.</td></tr>`
    : opts.rows.map((r) => {
        const offers = r.offers.map((o) => `${esc(o.storeName)}: ${ils(o.price)}${o.onSale ? " (מבצע)" : ""}`).join(" · ");
        return `<tr>
          <td class="name">${esc(r.product.name)}<div class="muted">${esc([r.product.brand, r.product.unit, r.categoryName].filter(Boolean).join(" · "))}</div></td>
          <td class="num best">${ils(r.bestPrice)}</td>
          <td>${esc(r.bestStore ?? "—")}</td>
          <td class="num">${r.bestUnitPrice != null ? ils(r.bestUnitPrice) : "—"}</td>
          <td class="offers">${esc(r.offers.length)} חנויות<div class="muted small">${offers}</div></td>
        </tr>`;
      }).join("\n");

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(opts.title || "דוח השוואת מחירים — בקלות")}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, "Noto Sans Hebrew", sans-serif; color: #1a1a1a; margin: 0; padding: 24px; background: #fff; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand .logo { width: 40px; height: 40px; border-radius: 10px; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; }
  .brand .t { font-size: 20px; font-weight: 800; }
  .brand .s { font-size: 12px; color: #666; }
  h1 { font-size: 18px; margin: 8px 0 2px; }
  .sub { color: #555; font-size: 13px; margin-bottom: 4px; }
  .meta { color: #888; font-size: 11px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: right; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 700; font-size: 12px; }
  td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.best { color: #2563eb; font-weight: 800; }
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
      <div class="logo">ב</div>
      <div>
        <div class="t">בקלות</div>
        <div class="s">השוואת מחירים</div>
      </div>
    </div>
    <div style="text-align:left">
      <div class="meta">הופק: ${esc(generatedAt)}</div>
    </div>
  </div>

  <h1>${esc(opts.title || "דוח השוואת מחירים")}</h1>
  ${opts.subtitle ? `<div class="sub">${esc(opts.subtitle)}</div>` : ""}
  ${opts.filtersLabel ? `<div class="meta">סינון: ${esc(opts.filtersLabel)}</div>` : ""}
  <div class="meta">סה״כ מוצרים בדוח: ${esc(opts.rows.length)}</div>

  <table>
    <thead>
      <tr>
        <th>מוצר</th>
        <th>המחיר הזול ביותר</th>
        <th>חנות</th>
        <th>מחיר ליחידה</th>
        <th>השוואת חנויות</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="foot">
    <span>בקלות — השוואת מחירים. הנתונים מבוססים על המאגר בלבד נכון לזמן ההפקה.</span>
    <span>© בקלות</span>
  </div>

  ${opts.autoPrint ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});</script>` : ""}
</body>
</html>`;
}
