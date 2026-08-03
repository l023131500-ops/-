import { FileText, Table2 } from "lucide-react";
import { useFinancial } from "@/contexts/FinancialContext";
import { useApp } from "@/contexts/AppContext";

export default function ExportButtons() {
  const { transactions } = useFinancial();
  const { profile } = useApp();

  const exportCSV = () => {
    const headers = ["תאריך", "סוג", "קטגוריה", "תיאור", "סכום"];
    const rows = transactions.map((tx) => [
      tx.date, tx.type === "income" ? "הכנסה" : "הוצאה", tx.category, tx.description, tx.amount.toString(),
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financehub_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const now = new Date();
    const monthIncome = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return tx.type === "income" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, tx) => s + tx.amount, 0);
    const monthExpenses = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return tx.type === "expense" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, tx) => s + tx.amount, 0);

    const html = `
      <html dir="rtl"><head><meta charset="utf-8"><title>דוח פיננסי - FinanceHub</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Heebo', sans-serif; padding: 48px; color: #e2e8f0; background: #020617; }
        h1 { color: #F59E0B; border-bottom: 2px solid #F59E0B; padding-bottom: 16px; font-size: 28px; font-weight: 800; }
        h2 { color: #e2e8f0; margin-top: 40px; font-size: 18px; font-weight: 700; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .logo { background: linear-gradient(135deg, #F59E0B, #b45309); color: #020617; padding: 12px 24px; border-radius: 16px; font-weight: 800; font-size: 14px; }
        .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 28px 0; }
        .summary-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 24px; text-align: center; }
        .summary-card .value { font-size: 28px; font-weight: 800; }
        .income { color: #22c55e; } .expense { color: #ef4444; } .balance { color: #F59E0B; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #1e293b; padding: 14px; text-align: right; font-size: 13px; }
        th { background: #0f172a; font-weight: 600; color: #94a3b8; }
        tr:nth-child(even) { background: #0f172a; }
        .footer { margin-top: 48px; text-align: center; color: #475569; font-size: 11px; border-top: 1px solid #1e293b; padding-top: 24px; }
      </style></head>
      <body>
        <div class="header">
          <div><h1>דוח פיננסי חודשי</h1>
          <p style="color:#64748b">${profile.name} · ${now.toLocaleDateString("he-IL", { month: "long", year: "numeric" })}</p></div>
          <div class="logo">FinanceHub</div>
        </div>
        <div class="summary">
          <div class="summary-card"><div class="value income">₪${monthIncome.toLocaleString()}</div><div style="color:#64748b;margin-top:6px">הכנסות</div></div>
          <div class="summary-card"><div class="value expense">₪${monthExpenses.toLocaleString()}</div><div style="color:#64748b;margin-top:6px">הוצאות</div></div>
          <div class="summary-card"><div class="value balance">₪${(monthIncome - monthExpenses).toLocaleString()}</div><div style="color:#64748b;margin-top:6px">יתרה</div></div>
        </div>
        <h2>פירוט עסקאות</h2>
        <table><thead><tr><th>תאריך</th><th>סוג</th><th>קטגוריה</th><th>תיאור</th><th>סכום</th></tr></thead>
        <tbody>${transactions.map((tx) => `<tr><td>${tx.date}</td><td>${tx.type === "income" ? "הכנסה" : "הוצאה"}</td><td>${tx.category}</td><td>${tx.description}</td><td>₪${tx.amount.toLocaleString()}</td></tr>`).join("")}</tbody></table>
        <div class="footer"><p>הופק אוטומטית על ידי FinanceHub · ${now.toLocaleDateString("he-IL")}</p></div>
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  return (
    <div className="flex gap-3">
      <button onClick={exportPDF}
        className="btn-clay flex items-center gap-2 px-5 py-2.5 rounded-2xl glass-card-gold text-accent text-xs font-bold">
        <FileText className="w-4 h-4" strokeWidth={1.5} />
        ייצוא PDF
      </button>
      <button onClick={exportCSV}
        className="btn-clay flex items-center gap-2 px-5 py-2.5 rounded-2xl glass-card text-muted-foreground text-xs font-bold hover:text-foreground">
        <Table2 className="w-4 h-4" strokeWidth={1.5} />
        ייצוא Excel
      </button>
    </div>
  );
}
