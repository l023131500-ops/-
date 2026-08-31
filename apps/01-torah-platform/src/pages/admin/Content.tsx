import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MATERIAL_CATEGORIES } from "@/types/questionnaire";

const AdminContent = () => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data: ms, error } = await supabase.from("materials").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("שגיאה בטעינת החומרים: " + error.message); return; }
    setMaterials(ms || []);
    const ids = Array.from(new Set((ms || []).map((m: any) => m.owner_user_id).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.full_name; });
      setProfilesMap(map);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string, notes?: string) => {
    const { error } = await supabase.from("materials").update({ status, rejection_reason: notes || null }).eq("id", id);
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success(status === "approved" ? "הקובץ אושר" : status === "rejected" ? "הקובץ נדחה" : "עודכן");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את הקובץ?")) return;
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success("נמחק");
    load();
  };

  const filtered = materials.filter(m =>
    (statusFilter === "all" || m.status === statusFilter) &&
    (categoryFilter === "all" || m.category === categoryFilter) &&
    (!search || m.title?.includes(search) || profilesMap[m.owner_user_id]?.includes(search))
  );

  const counts = {
    pending: materials.filter(m => m.status === "pending").length,
    approved: materials.filter(m => m.status === "approved").length,
    rejected: materials.filter(m => m.status === "rejected").length,
  };

  return (
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <FileText className="w-6 h-6 text-secondary" />ניהול חומרי עזר
          </h1>
          <p className="text-muted-foreground">קבצים שהעלו מגידי השיעור, מסודרים לפי קטגוריה ותת־קטגוריה</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-500">{counts.pending}</p>
            <p className="text-xs text-muted-foreground">ממתינים לאישור</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{counts.approved}</p>
            <p className="text-xs text-muted-foreground">מאושרים</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{counts.rejected}</p>
            <p className="text-xs text-muted-foreground">נדחו</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input placeholder="חיפוש לפי שם קובץ או מגיד..." className="max-w-xs" value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="pending">ממתין לאישור</SelectItem>
              <SelectItem value="approved">מאושר</SelectItem>
              <SelectItem value="rejected">נדחה</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {Object.keys(MATERIAL_CATEGORIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filtered.map(m => {
            const Icon = m.status === "approved" ? CheckCircle2 : m.status === "rejected" ? XCircle : Clock;
            const color = m.status === "approved" ? "text-green-600" : m.status === "rejected" ? "text-destructive" : "text-orange-500";
            return (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-foreground">{m.title}</p>
                      <Badge variant="outline" className="text-xs">{m.category}{m.subcategory ? ` / ${m.subcategory}` : ""}</Badge>
                      <span className={`text-xs flex items-center gap-1 ${color}`}><Icon className="w-3 h-3" />{m.status === "approved" ? "מאושר" : m.status === "rejected" ? "נדחה" : "ממתין"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">העלה: {profilesMap[m.owner_user_id] || "—"} · {new Date(m.created_at).toLocaleString("he-IL")}</p>
                    {m.description && <p className="text-sm text-muted-foreground mt-2">{m.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={m.file_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="gap-1"><Download className="w-3 h-3" />צפה</Button>
                    </a>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {m.status !== "approved" && (
                    <Button size="sm" onClick={() => updateStatus(m.id, "approved")} className="bg-green-600 hover:bg-green-700 text-white gap-1">
                      <CheckCircle2 className="w-3 h-3" />אשר
                    </Button>
                  )}
                  {m.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => {
                      const note = prompt("סיבת דחייה (אופציונלי):") || undefined;
                      updateStatus(m.id, "rejected", note);
                    }} className="gap-1">
                      <XCircle className="w-3 h-3" />דחה
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(m.id)} className="gap-1 mr-auto">
                    <Trash2 className="w-3 h-3 text-destructive" />מחק
                  </Button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">אין קבצים שתואמים לסינון</p>
            </div>
          )}
        </div>
      </div>
  );
};

export default AdminContent;