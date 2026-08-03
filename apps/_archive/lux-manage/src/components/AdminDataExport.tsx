import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileSpreadsheet, Users, Receipt, Target, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";

function buildCSV(headers: string[], rows: (string | number | null)[][]) {
  const bom = "\uFEFF";
  return bom + [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const exports = [
  {
    key: "leads",
    label: "לידים",
    icon: Target,
    description: "כל הלידים שנאספו מהבוט ומטופס יצירת קשר",
    fetch: async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      const headers = ["שם", "אימייל", "טלפון", "מקור", "הודעה", "תאריך"];
      const rows = (data ?? []).map((l: any) => [
        l.name, l.email, l.phone, l.source, l.message,
        l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy HH:mm") : "",
      ]);
      return { headers, rows, filename: `leads_${format(new Date(), "yyyy-MM-dd")}.csv` };
    },
  },
  {
    key: "profiles",
    label: "פרופילים",
    icon: Users,
    description: "כל המשתמשים הרשומים ופרטי הפרופיל שלהם",
    fetch: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const headers = ["שם", "עיר", "מצב משפחתי", "ילדים", "הכנסה חודשית", "תוכנית", "פרופיל מלא", "תאריך"];
      const rows = (data ?? []).map((p: any) => [
        p.name, p.city, p.family_status, p.children_count, p.monthly_income, p.tier,
        p.profile_complete ? "כן" : "לא",
        p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy") : "",
      ]);
      return { headers, rows, filename: `profiles_${format(new Date(), "yyyy-MM-dd")}.csv` };
    },
  },
  {
    key: "transactions",
    label: "עסקאות",
    icon: Receipt,
    description: "כל העסקאות הפיננסיות של כל המשתמשים",
    fetch: async () => {
      const { data } = await supabase.from("transactions").select("*").order("date", { ascending: false });
      const headers = ["סוג", "קטגוריה", "סכום", "תיאור", "תאריך", "חוזר"];
      const rows = (data ?? []).map((t: any) => [
        t.type === "income" ? "הכנסה" : "הוצאה", t.category, t.amount, t.description, t.date,
        t.is_recurring ? "כן" : "לא",
      ]);
      return { headers, rows, filename: `transactions_${format(new Date(), "yyyy-MM-dd")}.csv` };
    },
  },
];

export default function AdminDataExport() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  async function handleExport(key: string, fetchFn: () => Promise<{ headers: string[]; rows: any[][]; filename: string }>) {
    setExporting(key);
    try {
      const { headers, rows, filename } = await fetchFn();
      if (!rows.length) {
        toast.error("אין נתונים לייצוא");
      } else {
        downloadCSV(buildCSV(headers, rows), filename);
        toast.success(`יוצאו ${rows.length} שורות`);
        setDone((d) => [...d, key]);
      }
    } catch {
      toast.error("שגיאה בייצוא");
    }
    setExporting(null);
  }

  return (
    <div className="p-8 md:p-12 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-accent" /> ייצוא נתונים
        </h1>
        <p className="text-sm text-muted-foreground mt-1">ייצוא כל הנתונים מהמערכת כקבצי CSV</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exports.map((exp, i) => (
          <motion.div key={exp.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }} className="bento-card flex flex-col items-center text-center gap-4 p-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
              {done.includes(exp.key) ? (
                <CheckCircle className="w-6 h-6 text-accent" />
              ) : (
                <exp.icon className="w-6 h-6 text-accent" />
              )}
            </div>
            <div>
              <p className="font-bold text-foreground">{exp.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{exp.description}</p>
            </div>
            <Button size="sm" onClick={() => handleExport(exp.key, exp.fetch)}
              disabled={exporting === exp.key}
              className="bg-accent text-accent-foreground hover:bg-accent/90 w-full">
              <Download className="w-4 h-4 me-2" />
              {exporting === exp.key ? "מייצא..." : "הורד CSV"}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
