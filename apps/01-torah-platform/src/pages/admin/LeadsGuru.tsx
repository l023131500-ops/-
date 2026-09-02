import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  new: "חדש",
  contacted: "נוצר קשר",
  assigned: "שוייך למגיד",
  completed: "הושלם",
  cancelled: "בוטל",
};

const AdminLeads = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchLeads = async () => {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads(data || []);
  };

  useEffect(() => { fetchLeads(); }, []);

  const updateStatus = async (id: string, status: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) {
        toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      } else {
        await fetchLeads();
      }
    } finally {
      setBusyId(null);
    }
  };

  const filtered = leads.filter(l => {
    const matchSearch = l.full_name?.includes(search) || l.phone?.includes(search) || l.area?.includes(search);
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">ניהול לידים</h1>
          <p className="text-muted-foreground">פניות מהציבור לפתיחת שיעורים</p>
        </motion.div>

        <div className="flex flex-wrap gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="חיפוש..." className="pr-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-right p-4 font-medium text-muted-foreground">שם</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">טלפון</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">אזור</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">נושא</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">תאריך</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="p-4 font-medium text-foreground">{l.full_name}</td>
                    <td className="p-4 text-muted-foreground" dir="ltr">{l.phone}</td>
                    <td className="p-4 text-muted-foreground">{l.area || "—"}</td>
                    <td className="p-4 text-muted-foreground">{l.preferred_subject || "—"}</td>
                    <td className="p-4 text-muted-foreground">{new Date(l.created_at).toLocaleDateString("he-IL")}</td>
                    <td className="p-4">
                      <Select value={l.status || "new"} onValueChange={v => updateStatus(l.id, v)} disabled={busyId === l.id}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">לא נמצאו לידים</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
};

export default AdminLeads;