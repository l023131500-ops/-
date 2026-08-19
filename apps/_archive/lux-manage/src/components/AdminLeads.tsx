import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Download, Mail, Phone, Calendar, User, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  message: string;
  created_at: string;
}

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLeads() {
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/leads-api?limit=500`,
        { headers: { "Content-Type": "application/json" } }
      );
      if (res.ok) {
        const json = await res.json();
        setLeads((json.leads as Lead[]) ?? []);
      } else {
        const { data } = await supabase
          .from("leads" as any)
          .select("*")
          .order("created_at", { ascending: false });
        setLeads((data as any as Lead[]) ?? []);
      }
    } catch {
      const { data } = await supabase
        .from("leads" as any)
        .select("*")
        .order("created_at", { ascending: false });
      setLeads((data as any as Lead[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchLeads(); }, []);

  function exportCSV() {
    if (!leads.length) return;
    const headers = ["שם", "אימייל/טלפון", "מקור", "הודעה", "תאריך"];
    const rows = leads.map((l) => [
      l.name,
      l.email || l.phone,
      l.source,
      l.message,
      l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy HH:mm") : "",
    ]);
    const bom = "\uFEFF";
    const csv = bom + [headers, ...rows].map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 md:p-12 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">ניהול לידים</h1>
          <p className="text-sm text-muted-foreground mt-1">לידים שנאספו מהבוט הציבורי בדף הנחיתה</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
            <RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />
            רענון
          </Button>
          <Button size="sm" onClick={exportCSV} disabled={!leads.length} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Download className="w-4 h-4 me-2" />
            ייצוא CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "סה״כ לידים", value: leads.length, icon: User },
          { label: "היום", value: leads.filter((l) => l.created_at && new Date(l.created_at).toDateString() === new Date().toDateString()).length, icon: Calendar },
          { label: "בקשות הדגמה", value: leads.filter((l) => l.message?.includes("Demo")).length, icon: MessageCircle },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bento-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bento-card overflow-hidden p-0">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">טוען...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">עדיין אין לידים. הבוט הציבורי יאסוף אותם אוטומטית.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-start px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">שם</th>
                  <th className="text-start px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">אימייל / טלפון</th>
                  <th className="text-start px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">מקור</th>
                  <th className="text-start px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">הודעה</th>
                  <th className="text-start px-5 py-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">תאריך</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/10 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-foreground">{lead.name || "—"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        {lead.email?.includes("@") ? <Mail className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                        {lead.email || lead.phone || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-accent/10 text-accent">
                        {lead.source || "bot"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground max-w-[200px] truncate">{lead.message || "—"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">
                      {lead.created_at ? format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: he }) : "—"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
