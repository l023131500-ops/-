import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, UserCheck, AlertCircle, Clock, CheckCircle2, Send, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RightsInquiry {
  id: string;
  client_id: string;
  right_type: string;
  description: string;
  service_preference: string;
  status: string;
  assigned_advisor_id: string | null;
  admin_notes: string;
  created_at: string;
  client_name?: string;
  client_email?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  new: { label: "חדש", color: "bg-blue-500/10 text-blue-500", icon: AlertCircle },
  in_progress: { label: "בטיפול", color: "bg-amber-500/10 text-amber-500", icon: Clock },
  assigned: { label: "הועבר ליועץ", color: "bg-purple-500/10 text-purple-500", icon: UserCheck },
  completed: { label: "טופל", color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
};

const SERVICE_LABELS: Record<string, string> = {
  full_service: "שירות מלא",
  diy: "עשה זאת בעצמך",
  consultation: "ייעוץ בלבד",
};

export default function AdminRightsInquiries() {
  const [inquiries, setInquiries] = useState<RightsInquiry[]>([]);
  const [advisors, setAdvisors] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RightsInquiry | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedAdvisor, setSelectedAdvisor] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = async () => {
    setLoading(true);
    const [inqRes, advRes] = await Promise.all([
      supabase.from("rights_inquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role").eq("role", "advisor"),
    ]);

    const inqs = (inqRes.data || []) as any[];

    // Fetch client names
    const clientIds = [...new Set(inqs.map(i => i.client_id))];
    let clientMap: Record<string, { name: string; email: string }> = {};
    if (clientIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", clientIds);
      (profiles || []).forEach((p: any) => { clientMap[p.id] = { name: p.name, email: "" }; });
    }

    setInquiries(inqs.map((i: any) => ({
      ...i,
      client_name: clientMap[i.client_id]?.name || "—",
      client_email: clientMap[i.client_id]?.email || "",
    })));

    // Load advisor profiles
    const advisorIds = (advRes.data || []).map((r: any) => r.user_id);
    if (advisorIds.length > 0) {
      const { data: advProfiles } = await supabase.from("profiles").select("id, name").in("id", advisorIds);
      setAdvisors((advProfiles || []).map((p: any) => ({ id: p.id, name: p.name, email: "" })));
    }

    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = inquiries.filter(i => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (search && !(i.client_name || "").includes(search) && !i.right_type.includes(search)) return false;
    return true;
  });

  const handleUpdateInquiry = async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase.from("rights_inquiries").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("שגיאה בעדכון"); return; }
    toast.success("עודכן בהצלחה");
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...updates } : null);
  };

  const stats = {
    total: inquiries.length,
    new: inquiries.filter(i => i.status === "new").length,
    in_progress: inquiries.filter(i => i.status === "in_progress").length,
    completed: inquiries.filter(i => i.status === "completed").length,
  };

  if (loading) {
    return <div className="p-8 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-secondary/40 animate-pulse" />)}</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">🏛️ פניות זכויות</h1>
        <p className="text-sm text-muted-foreground">ניהול פניות לקוחות לזכויות והטבות</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "סה״כ פניות", value: stats.total, color: "text-foreground" },
          { label: "חדשות", value: stats.new, color: "text-blue-500" },
          { label: "בטיפול", value: stats.in_progress, color: "text-amber-500" },
          { label: "טופלו", value: stats.completed, color: "text-emerald-500" },
        ].map(s => (
          <div key={s.label} className="bento-card text-center">
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
        </div>
        <div className="flex gap-1">
          {[{ key: "all", label: "הכל" }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === f.key ? "gold-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inquiries list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bento-card text-center py-12">
            <p className="text-sm text-muted-foreground">אין פניות להצגה</p>
          </div>
        )}
        {filtered.map(inq => {
          const st = STATUS_CONFIG[inq.status] || STATUS_CONFIG.new;
          const StIcon = st.icon;
          return (
            <motion.div key={inq.id} layout className="bento-card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => { setSelected(inq); setAdminNotes(inq.admin_notes || ""); setSelectedAdvisor(inq.assigned_advisor_id || ""); }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                    {(inq.client_name || "?").charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{inq.client_name}</p>
                    <p className="text-xs text-muted-foreground">{inq.right_type}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {SERVICE_LABELS[inq.service_preference] || inq.service_preference} · {new Date(inq.created_at).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${st.color}`}>
                  <StIcon className="w-3 h-3" /> {st.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()} className="glass-card-gold rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">פרטי פנייה</h3>
                <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground">לקוח</p>
                  <p className="text-sm font-semibold text-foreground">{selected.client_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground">סוג זכות</p>
                  <p className="text-sm font-semibold text-foreground">{selected.right_type}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground">העדפת שירות</p>
                  <p className="text-sm font-semibold text-foreground">{SERVICE_LABELS[selected.service_preference] || selected.service_preference}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground">תאריך פנייה</p>
                  <p className="text-sm font-semibold text-foreground">{new Date(selected.created_at).toLocaleDateString("he-IL")}</p>
                </div>
              </div>

              {selected.description && (
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground mb-1">תיאור הלקוח</p>
                  <p className="text-sm text-foreground">{selected.description}</p>
                </div>
              )}

              {/* Status update */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">סטטוס</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => handleUpdateInquiry(selected.id, { status: key })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selected.status === key ? "gold-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign advisor */}
              {advisors.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">שיוך ליועץ</label>
                  <div className="flex gap-2">
                    <select value={selectedAdvisor} onChange={e => setSelectedAdvisor(e.target.value)}
                      className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                      <option value="">ללא שיוך</option>
                      {advisors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <Button onClick={() => handleUpdateInquiry(selected.id, { assigned_advisor_id: selectedAdvisor || null, status: selectedAdvisor ? "assigned" : selected.status })}>
                      שייך
                    </Button>
                  </div>
                </div>
              )}

              {/* Admin notes */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">הערות מנהל</label>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} placeholder="הערות פנימיות..." />
                <Button className="mt-2 gap-2" onClick={() => handleUpdateInquiry(selected.id, { admin_notes: adminNotes })}>
                  <Send className="w-3 h-3" /> שמור הערות
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
