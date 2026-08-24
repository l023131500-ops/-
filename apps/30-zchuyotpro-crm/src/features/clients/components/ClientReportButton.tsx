import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  clientQuery,
  familyQuery,
  financialQuery,
  housingQuery,
  vehiclesQuery,
  entitlementsCatalogQuery,
  clientEntitlementsQuery,
  documentsQuery,
  propertyMediaQuery,
  referralsQuery,
} from "@/features/clients/queries";
import {
  CLIENT_STATUS,
  MARITAL_STATUS,
  RELATION,
  HEALTH_FUND,
  EMPLOYMENT_STATUS,
  HOUSING_TYPE,
  ENTITLEMENT_STATUS,
  ENTITLEMENT_CATEGORY,
  REFERRAL_STATUS,
} from "@/features/clients/constants";
import { formatILS, formatDateHe } from "@/lib/format";
import {
  CATEGORY_LABELS,
  LOAN_TYPES,
  PAYMENT_BURDEN_MAX,
  PAYMENT_BURDEN_WARN,
  budgetLimitsQuery,
  loansQuery,
  monthLabel,
  monthRange,
  monthsToPayoff,
  summarizeLoans,
  summarizeMonth,
} from "@/features/clients/finance";
import { Button } from "@/components/ui/button";

// The report is written into a window we open synchronously (popup-blocker
// safe) and rendered as a standalone RTL document, so it prints / saves to
// PDF via the browser without depending on the app's stylesheet.

function esc(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function label(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}

function row(title: string, value: string): string {
  return `<tr><th>${title}</th><td>${value}</td></tr>`;
}

const STATUS_CHIP: Record<string, string> = {
  handled: "background:#dcfce7;color:#14532d;border-color:#86efac",
  recommended: "background:#dbeafe;color:#1e3a8a;border-color:#93c5fd",
  to_check: "background:#fef9c3;color:#713f12;border-color:#fde047",
  not_relevant: "background:#f1f5f9;color:#64748b;border-color:#cbd5e1",
};

export function ClientReportButton({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [building, setBuilding] = useState(false);

  async function buildReport() {
    // Must open synchronously inside the click handler, before any await.
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("הדפדפן חסם את חלון הדוח", { description: "אפשר חלונות קופצים לאתר ונסה שוב" });
      return;
    }
    win.document.write(
      `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>מכין דוח…</title></head><body style="font-family:sans-serif;text-align:center;padding-top:4rem">מכין את הדוח…</body></html>`,
    );
    setBuilding(true);
    try {
      // Cashflow window: the current month plus the two before it, so the
      // report shows a short trend and not just a single-month snapshot.
      const now = new Date();
      const months = [2, 1, 0].map((back) => {
        const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
        return { year: d.getFullYear(), month: d.getMonth() + 1 };
      });
      const ledgerFrom = monthRange(months[0].year, months[0].month).from;
      const ledgerTo = monthRange(months[2].year, months[2].month).to;

      const [client, family, financial, housing, vehicles, catalog, assigned, documents, media, referrals, limits, loans] =
        await Promise.all([
          qc.fetchQuery(clientQuery(clientId)),
          qc.fetchQuery(familyQuery(clientId)),
          qc.fetchQuery(financialQuery(clientId)),
          qc.fetchQuery(housingQuery(clientId)),
          qc.fetchQuery(vehiclesQuery(clientId)),
          qc.fetchQuery(entitlementsCatalogQuery({ category: "all" })),
          qc.fetchQuery(clientEntitlementsQuery(clientId)),
          qc.fetchQuery(documentsQuery(clientId)),
          qc.fetchQuery(propertyMediaQuery(clientId)),
          qc.fetchQuery(referralsQuery(clientId)),
          qc.fetchQuery(budgetLimitsQuery(clientId)),
          qc.fetchQuery(loansQuery(clientId)),
        ]);

      const [{ data: tenant }, { data: tasks }, { data: ledger }] = await Promise.all([
        supabase.from("tenants").select("name").eq("id", client.tenant_id).maybeSingle(),
        supabase
          .from("tasks")
          .select("title, status, due_date")
          .eq("client_id", clientId)
          .eq("status", "open")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(20),
        supabase
          .from("client_transactions")
          .select("*")
          .eq("client_id", clientId)
          .gte("occurred_on", ledgerFrom)
          .lt("occurred_on", ledgerTo)
          .order("occurred_on"),
      ]);

      // Bucket the ledger rows per month; occurred_on is YYYY-MM-DD so plain
      // string comparison against the month bounds is exact.
      const cashflowMonths = months.map((m) => {
        const { from, to } = monthRange(m.year, m.month);
        const rows = (ledger ?? []).filter((t) => t.occurred_on >= from && t.occurred_on < to);
        return { ...m, rows, summary: summarizeMonth(rows) };
      });
      const currentMonth = cashflowMonths[cashflowMonths.length - 1];
      const hasCashflow = (ledger ?? []).length > 0 || limits.length > 0;
      // Budget meters: every category that has a ceiling or actual spending this month.
      const budgetRows = [
        ...limits.map((l) => ({ category: l.category, limit: Number(l.monthly_limit) })),
        ...Object.keys(currentMonth.summary.expenseByCategory)
          .filter((c) => !limits.some((l) => l.category === c))
          .map((category) => ({ category, limit: null as number | null })),
      ].map((r) => ({ ...r, spent: currentMonth.summary.expenseByCategory[r.category] ?? 0 }));

      // Loans: same math as the on-screen loans panel, so print always matches
      // screen — burden is measured against the current month's actual income.
      const loansSummary = summarizeLoans(loans);
      const loanBurden =
        currentMonth.summary.income > 0 ? loansSummary.totalMonthly / currentMonth.summary.income : null;
      const loanRows = loans.map((l) => {
        const principal = l.principal === null ? null : Number(l.principal);
        const balance = Number(l.balance) || 0;
        const paidPct =
          principal && principal > 0
            ? Math.max(0, Math.min(100, Math.round(((principal - balance) / principal) * 100)))
            : null;
        const payoff = monthsToPayoff(balance, Number(l.annual_rate_pct) || 0, Number(l.monthly_payment) || 0);
        const horizon = l.end_date
          ? `עד ${formatDateHe(l.end_date)}`
          : payoff !== null && payoff > 0
            ? `~${payoff} חודשים`
            : payoff === null && balance > 0
              ? "ההחזר אינו מכסה את הריבית"
              : "—";
        return { l, balance, paidPct, horizon };
      });

      // Sign up to 8 property photos so the report shows the property itself.
      const photos = media.filter((m) => m.media_type === "photo").slice(0, 8);
      const photoUrls: { url: string; label: string | null }[] = [];
      for (const p of photos) {
        const { data } = await supabase.storage.from("property-media").createSignedUrl(p.storage_path, 3600);
        if (data) photoUrls.push({ url: data.signedUrl, label: p.property_label });
      }

      const assignedMap = new Map(assigned.map((a) => [a.entitlement_id, a]));
      const counts = { handled: 0, recommended: 0, to_check: 0, not_relevant: 0 };
      const entRows = catalog
        .map((e) => {
          const a = assignedMap.get(e.id);
          const status = (a?.status ?? "to_check") as keyof typeof counts;
          if (status in counts) counts[status]++;
          return { e, a, status };
        })
        // The client-facing report leads with what was achieved / recommended;
        // not-relevant items are summarized as a count only.
        .filter((r) => r.status !== "not_relevant")
        .sort((x, y) => {
          const order = { handled: 0, recommended: 1, to_check: 2, not_relevant: 3 };
          return order[x.status] - order[y.status];
        });
      const checkedPct =
        catalog.length === 0
          ? 0
          : Math.round(((counts.handled + counts.recommended + counts.not_relevant) / catalog.length) * 100);

      const agentName =
        (client as { assigned_agent?: { full_name: string | null } | null }).assigned_agent?.full_name ?? null;
      const today = new Date().toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });

      const html = `<!doctype html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<title>דוח תיק — ${esc(client.first_name)} ${esc(client.last_name)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0; color: #0f172a; background: #f8fafc;
    font-family: "Segoe UI", "Noto Sans Hebrew", Arial, sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page { max-width: 800px; margin: 0 auto; padding: 24px; background: #fff; }
  header.brand {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 20px;
  }
  .brand h1 { margin: 0; font-size: 22px; color: #1d4ed8; }
  .brand .sub { color: #64748b; font-size: 13px; margin-top: 4px; }
  .brand .meta { text-align: left; font-size: 12px; color: #64748b; line-height: 1.7; }
  h2.section {
    font-size: 15px; color: #1d4ed8; border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px; margin: 24px 0 10px; break-after: avoid;
  }
  table.kv { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.kv th { text-align: right; color: #64748b; font-weight: 500; padding: 5px 0 5px 12px; width: 170px; vertical-align: top; }
  table.kv td { padding: 5px 0; }
  table.list { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  table.list th { text-align: right; background: #f1f5f9; color: #475569; padding: 6px 8px; font-weight: 600; }
  table.list td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr { break-inside: avoid; }
  .chips { display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0 4px; }
  .chip { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; min-width: 110px; background: #f8fafc; }
  .chip .num { font-size: 20px; font-weight: 700; color: #1d4ed8; }
  .chip .lbl { font-size: 11.5px; color: #64748b; margin-top: 2px; }
  .status { display: inline-block; border: 1px solid; border-radius: 999px; padding: 1px 10px; font-size: 11.5px; white-space: nowrap; }
  .bar { background: #e2e8f0; border-radius: 999px; height: 8px; overflow: hidden; margin-top: 8px; }
  .bar > div { background: #1d4ed8; height: 100%; }
  .notes { color: #475569; font-size: 12px; margin-top: 2px; white-space: pre-wrap; }
  .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .photos figure { margin: 0; break-inside: avoid; }
  .photos img { width: 100%; height: 190px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; }
  .photos figcaption { font-size: 11px; color: #64748b; margin-top: 3px; }
  footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
  .print-btn {
    position: fixed; top: 14px; left: 14px; background: #1d4ed8; color: #fff; border: 0;
    border-radius: 8px; padding: 10px 18px; font-size: 14px; cursor: pointer; font-family: inherit;
    box-shadow: 0 2px 8px rgba(29, 78, 216, .35);
  }
  @page { size: A4; margin: 14mm 12mm; }
  @media print {
    body { background: #fff; }
    .page { padding: 0; max-width: none; }
    .print-btn { display: none; }
  }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">הדפס / שמור PDF</button>
<div class="page">
  <header class="brand">
    <div>
      <h1>${esc(tenant?.name ?? "זכויות פרו")}</h1>
      <div class="sub">דוח סטטוס תיק ללקוח</div>
    </div>
    <div class="meta">
      <div>תאריך הפקה: ${esc(today)}</div>
      <div>מס׳ תיק: ${esc(client.file_number)}</div>
      ${agentName ? `<div>מנהל התיק: ${esc(agentName)}</div>` : ""}
    </div>
  </header>

  <h2 style="margin:0;font-size:19px">${esc(client.first_name)} ${esc(client.last_name)}
    <span class="status" style="${STATUS_CHIP.recommended};margin-inline-start:8px">${esc(label(CLIENT_STATUS, client.status))}</span>
  </h2>

  <div class="chips">
    <div class="chip"><div class="num">${checkedPct}%</div><div class="lbl">מהזכאויות נבדקו</div></div>
    <div class="chip"><div class="num">${counts.handled}</div><div class="lbl">זכאויות טופלו</div></div>
    <div class="chip"><div class="num">${counts.recommended}</div><div class="lbl">מומלץ לבדוק</div></div>
    <div class="chip"><div class="num">${counts.to_check}</div><div class="lbl">ממתינות לבדיקה</div></div>
    <div class="chip"><div class="num">${documents.length}</div><div class="lbl">מסמכים בתיק</div></div>
    ${(tasks ?? []).length ? `<div class="chip"><div class="num">${(tasks ?? []).length}</div><div class="lbl">משימות פתוחות</div></div>` : ""}
    ${hasCashflow ? `<div class="chip"><div class="num" style="color:${currentMonth.summary.net >= 0 ? "#047857" : "#b91c1c"}">${esc(formatILS(currentMonth.summary.net))}</div><div class="lbl">יתרה — ${esc(monthLabel(currentMonth.year, currentMonth.month))}</div></div>` : ""}
  </div>
  <div class="bar"><div style="width:${checkedPct}%"></div></div>

  <h2 class="section">פרטים אישיים</h2>
  <table class="kv">
    ${row("ת.ז.", esc(client.id_number))}
    ${row("טלפון", `<span dir="ltr">${esc(client.phone)}</span>`)}
    ${row("אימייל", `<span dir="ltr">${esc(client.email)}</span>`)}
    ${row("כתובת", `${esc(client.address)}${client.city ? `, ${esc(client.city)}` : ""}`)}
    ${row("תאריך לידה", esc(formatDateHe(client.birth_date)))}
    ${row("מצב משפחתי", esc(label(MARITAL_STATUS, client.marital_status)))}
  </table>

  ${family.length ? `
  <h2 class="section">בני משפחה בתיק</h2>
  <table class="list">
    <tr><th>שם</th><th>קרבה</th><th>תאריך לידה</th><th>קופת חולים</th></tr>
    ${family.map((m) => `<tr>
      <td>${esc(m.first_name)} ${esc(m.last_name)}</td>
      <td>${esc(label(RELATION, m.relation))}</td>
      <td>${esc(formatDateHe(m.birth_date))}</td>
      <td>${esc(label(HEALTH_FUND, m.health_fund))}</td>
    </tr>`).join("")}
  </table>` : ""}

  ${financial ? `
  <h2 class="section">תמונה פיננסית</h2>
  <table class="kv">
    ${row("מצב תעסוקתי", esc(label(EMPLOYMENT_STATUS, financial.employment_status)))}
    ${row("עיסוק / מעסיק", `${esc(financial.occupation)}${financial.employer_name ? ` — ${esc(financial.employer_name)}` : ""}`)}
    ${row("הכנסה חודשית ברוטו", esc(formatILS(financial.gross_monthly_income)))}
    ${row("הכנסה חודשית נטו", esc(formatILS(financial.net_monthly_income)))}
    ${row("הכנסת בן/בת זוג", esc(formatILS(financial.spouse_income)))}
    ${row("פנסיה", financial.has_pension ? `יש${financial.pension_details ? ` — ${esc(financial.pension_details)}` : ""}` : "אין")}
    ${row("ביטוח חיים", financial.has_life_insurance ? `יש${financial.insurance_details ? ` — ${esc(financial.insurance_details)}` : ""}` : "אין")}
  </table>` : ""}

  ${hasCashflow ? `
  <h2 class="section">תזרים חודשי</h2>
  <table class="list">
    <tr><th>חודש</th><th>הכנסות</th><th>הוצאות</th><th>יתרה</th><th>תנועות</th></tr>
    ${cashflowMonths.map((m) => `<tr>
      <td>${esc(monthLabel(m.year, m.month))}</td>
      <td style="color:#047857">${esc(formatILS(m.summary.income))}</td>
      <td style="color:#b91c1c">${esc(formatILS(m.summary.expense))}</td>
      <td style="color:${m.summary.net >= 0 ? "#047857" : "#b91c1c"};font-weight:600">${esc(formatILS(m.summary.net))}</td>
      <td>${m.rows.length}</td>
    </tr>`).join("")}
  </table>
  ${budgetRows.length ? `
  <div class="notes" style="margin:10px 0 4px;font-weight:600;color:#334155">הוצאות ${esc(monthLabel(currentMonth.year, currentMonth.month))} לפי קטגוריה${limits.length ? " — מול תקרות התקציב" : ""}</div>
  <table class="list">
    <tr><th>קטגוריה</th><th style="width:130px">הוצאה בפועל</th><th style="width:130px">תקרה חודשית</th><th style="width:170px">ניצול</th></tr>
    ${budgetRows.map((b) => {
      const pct = b.limit && b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : null;
      const over = b.limit !== null && b.spent > b.limit;
      return `<tr>
      <td>${esc(CATEGORY_LABELS[b.category] ?? b.category)}</td>
      <td>${esc(formatILS(b.spent))}</td>
      <td>${b.limit === null ? "—" : esc(formatILS(b.limit))}</td>
      <td>${pct === null ? "—" : `<div style="display:flex;align-items:center;gap:6px">
        <div class="bar" style="flex:1;margin-top:0"><div style="width:${Math.min(100, pct)}%;background:${over ? "#dc2626" : "#1d4ed8"}"></div></div>
        <span style="font-size:11px;color:${over ? "#b91c1c" : "#64748b"};white-space:nowrap">${pct}%${over ? " · חריגה" : ""}</span>
      </div>`}</td>
    </tr>`;
    }).join("")}
  </table>` : ""}
  <div class="notes" style="margin-top:6px">התזרים כולל תנועות שנרשמו על ידי הצוות, הלקוח באזור האישי והקו הטלפוני.</div>` : ""}

  ${loanRows.length ? `
  <h2 class="section">הלוואות (${loanRows.length})</h2>
  <div class="chips" style="margin:8px 0 10px">
    <div class="chip"><div class="num">${esc(formatILS(loansSummary.totalBalance))}</div><div class="lbl">סה״כ יתרת חוב</div></div>
    <div class="chip"><div class="num">${esc(formatILS(loansSummary.totalMonthly))}</div><div class="lbl">סה״כ החזר חודשי</div></div>
    ${loanBurden !== null ? `<div class="chip"><div class="num" style="color:${loanBurden > PAYMENT_BURDEN_MAX ? "#b91c1c" : loanBurden > PAYMENT_BURDEN_WARN ? "#b45309" : "#047857"}">${Math.round(loanBurden * 100)}%</div><div class="lbl">נטל החזרים מהכנסות ${esc(monthLabel(currentMonth.year, currentMonth.month))}${loanBurden > PAYMENT_BURDEN_MAX ? " · מעל התקרה" : loanBurden > PAYMENT_BURDEN_WARN ? " · גבוה" : ""}</div></div>` : ""}
  </div>
  <table class="list">
    <tr><th>גוף מלווה</th><th>סוג</th><th style="width:110px">יתרת חוב</th><th style="width:110px">החזר חודשי</th><th style="width:70px">ריבית</th><th style="width:150px">שולם</th><th>צפי סילוק</th></tr>
    ${loanRows.map(({ l, balance, paidPct, horizon }) => `<tr>
      <td>${esc(l.lender)}${l.notes ? `<div class="notes">${esc(l.notes)}</div>` : ""}</td>
      <td>${esc(LOAN_TYPES[l.loan_type as keyof typeof LOAN_TYPES] ?? l.loan_type)}</td>
      <td>${esc(formatILS(balance))}</td>
      <td>${esc(formatILS(Number(l.monthly_payment)))}</td>
      <td>${l.annual_rate_pct === null ? "—" : `${esc(Number(l.annual_rate_pct))}%`}</td>
      <td>${paidPct === null ? "—" : `<div style="display:flex;align-items:center;gap:6px">
        <div class="bar" style="flex:1;margin-top:0;min-width:50px"><div style="width:${paidPct}%"></div></div>
        <span style="font-size:11px;color:#64748b;white-space:nowrap">${paidPct}%</span>
      </div>`}</td>
      <td>${esc(horizon)}</td>
    </tr>`).join("")}
  </table>
  <div class="notes" style="margin-top:6px">צפי הסילוק מחושב לפי לוח שפיצר מהיתרה, ההחזר והריבית שנרשמו — הערכה בלבד, אינה ייעוץ פיננסי.</div>` : ""}

  ${housing ? `
  <h2 class="section">דיור ונכסים</h2>
  <table class="kv">
    ${row("סוג דיור", esc(label(HOUSING_TYPE, housing.housing_type)))}
    ${row("כתובת הנכס", esc(housing.property_address))}
    ${housing.monthly_rent ? row("שכירות חודשית", esc(formatILS(housing.monthly_rent))) : ""}
    ${row("משכנתא", housing.has_mortgage ? `יש${housing.mortgage_details ? ` — ${esc(housing.mortgage_details)}` : ""}` : "אין")}
    ${((housing.additional_properties as { address: string }[] | null) ?? []).length
      ? row("נכסים נוספים", ((housing.additional_properties as { address: string }[]).map((p) => esc(p.address)).join("<br>")))
      : ""}
  </table>` : ""}

  ${vehicles.length ? `
  <h2 class="section">רכבים</h2>
  <table class="list">
    <tr><th>יצרן ודגם</th><th>שנה</th><th>מס׳ רישוי</th><th>תו נכה</th></tr>
    ${vehicles.map((v) => `<tr>
      <td>${esc(v.make)} ${esc(v.model)}</td>
      <td>${esc(v.year)}</td>
      <td dir="ltr">${esc(v.license_plate)}</td>
      <td>${v.disability_badge ? "יש" : "אין"}</td>
    </tr>`).join("")}
  </table>` : ""}

  <h2 class="section">זכאויות — סטטוס מלא</h2>
  ${entRows.length === 0 ? `<div class="notes">טרם שויכו זכאויות לתיק.</div>` : `
  <table class="list">
    <tr><th>זכאות</th><th>קטגוריה</th><th>שנה</th><th>סטטוס</th></tr>
    ${entRows.map(({ e, a, status }) => `<tr>
      <td>${esc(e.title)}${a?.notes ? `<div class="notes">${esc(a.notes)}</div>` : ""}</td>
      <td>${esc(label(ENTITLEMENT_CATEGORY, e.category))}</td>
      <td>${esc(e.year)}</td>
      <td><span class="status" style="${STATUS_CHIP[status]}">${esc(label(ENTITLEMENT_STATUS, status))}</span>
        ${a?.handled_at ? `<div class="notes">${esc(formatDateHe(a.handled_at))}</div>` : ""}</td>
    </tr>`).join("")}
  </table>`}
  ${counts.not_relevant ? `<div class="notes" style="margin-top:6px">בנוסף נבדקו ${counts.not_relevant} זכאויות שנמצאו לא רלוונטיות לתיק זה.</div>` : ""}

  ${(tasks ?? []).length ? `
  <h2 class="section">משימות פתוחות בתיק</h2>
  <table class="list">
    <tr><th>משימה</th><th>תאריך יעד</th></tr>
    ${(tasks ?? []).map((t) => `<tr><td>${esc(t.title)}</td><td>${esc(formatDateHe(t.due_date))}</td></tr>`).join("")}
  </table>` : ""}

  ${referrals.length ? `
  <h2 class="section">הפניות לגורמי מקצוע</h2>
  <table class="list">
    <tr><th>גורם</th><th>תחום</th><th>סטטוס</th><th>נשלח</th></tr>
    ${referrals.map((r) => `<tr>
      <td>${esc((r as { partner?: { company_name?: string | null } | null }).partner?.company_name)}</td>
      <td>${esc(label(ENTITLEMENT_CATEGORY, (r as { partner?: { category?: string | null } | null }).partner?.category ?? null))}</td>
      <td>${esc(label(REFERRAL_STATUS, (r as { status?: string | null }).status ?? null))}</td>
      <td>${esc(formatDateHe((r as { sent_at?: string | null }).sent_at))}</td>
    </tr>`).join("")}
  </table>` : ""}

  ${documents.length ? `
  <h2 class="section">מסמכים בתיק (${documents.length})</h2>
  <table class="list">
    <tr><th>מסמך</th><th>הועלה</th></tr>
    ${documents.slice(0, 30).map((d) => `<tr><td>${esc(d.file_name)}</td><td>${esc(formatDateHe(d.created_at))}</td></tr>`).join("")}
  </table>
  ${documents.length > 30 ? `<div class="notes" style="margin-top:6px">מוצגים 30 המסמכים האחרונים מתוך ${documents.length}.</div>` : ""}` : ""}

  ${photoUrls.length ? `
  <h2 class="section">תמונות הנכס</h2>
  <div class="photos">
    ${photoUrls.map((p) => `<figure><img src="${p.url.replace(/"/g, "&quot;")}" alt="">${p.label ? `<figcaption>${esc(p.label)}</figcaption>` : ""}</figure>`).join("")}
  </div>` : ""}

  <footer>
    <span>הופק ממערכת ${esc(tenant?.name ?? "זכויות פרו")} · ${esc(today)}</span>
    <span>הדוח משקף את נתוני התיק במועד ההפקה בלבד</span>
  </footer>
</div>
</body>
</html>`;

      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (e) {
      win.close();
      toast.error("שגיאה בהפקת הדוח", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBuilding(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={buildReport} disabled={building}>
      {building ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <FileText className="h-4 w-4 ms-2" />}
      דוח ללקוח
    </Button>
  );
}
