import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, Trash2, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUS = {
  new: { label: "חדש", color: "bg-blue-100 text-blue-700" },
  handled: { label: "טופל", color: "bg-green-100 text-green-700" },
  not_handled: { label: "לא טופל", color: "bg-orange-100 text-orange-700" },
};

const AdminMessages = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data, error } = await supabase
      .from("portal_messages")
      // The recipient column is to_user_id; teacher_id went with the old schema.
      .select("*, profiles:to_user_id (full_name)")
      .order("created_at", { ascending: false });
    if (error) {
      // fallback: load messages without join if relationship still cached
      const { data: msgs } = await supabase.from("portal_messages").select("*").order("created_at", { ascending: false });
      const ids = Array.from(new Set((msgs || []).map((m: any) => m.to_user_id).filter(Boolean)));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as any[] };
      const profMap = new Map((profs || []).map((p: any) => [p.id, p.full_name]));
      setMessages((msgs || []).map((m: any) => ({ ...m, profiles: { full_name: profMap.get(m.to_user_id) || null } })));
      return;
    }
    setMessages(data || []);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("portal_messages").update({ status }).eq("id", id);
    toast.success("הסטטוס עודכן");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את הפנייה?")) return;
    await supabase.from("portal_messages").delete().eq("id", id);
    toast.success("נמחק");
    load();
  };

  const filtered = filter === "all" ? messages : messages.filter(m => m.status === filter);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              <Mail className="w-6 h-6 text-secondary" />ניהול פניות
            </h1>
            <p className="text-muted-foreground text-sm mt-1">כל הפניות מהדפים הציבוריים של מגידי השיעורים</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הפניות</SelectItem>
              <SelectItem value="new">חדשות</SelectItem>
              <SelectItem value="handled">טופלו</SelectItem>
              <SelectItem value="not_handled">לא טופלו</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{messages.length}</p>
            <p className="text-xs text-muted-foreground">סה"כ</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{messages.filter(m => m.status === "new").length}</p>
            <p className="text-xs text-muted-foreground">חדשות</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{messages.filter(m => m.status === "handled").length}</p>
            <p className="text-xs text-muted-foreground">טופלו</p>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((m, i) => {
            const status = STATUS[m.status as keyof typeof STATUS] || STATUS.new;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{m.from_name}</p>
                      <Badge className={`${status.color} hover:${status.color}`}>{status.label}</Badge>
                      {m.profiles?.full_name && (
                        <span className="text-xs text-muted-foreground">למגיד: {m.profiles.full_name}</span>
                      )}
                    </div>
                    {m.subject && <p className="text-sm font-medium text-muted-foreground mb-1">{m.subject}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      {m.from_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.from_phone}</span>}
                      {m.from_email && <span dir="ltr">{m.from_email}</span>}
                      <span>{new Date(m.created_at).toLocaleString("he-IL")}</span>
                    </div>
                    {m.body && <p className="text-foreground text-sm bg-muted/50 p-3 rounded-lg">{m.body}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => updateStatus(m.id, "handled")} className="gap-1">
                    <CheckCircle className="w-3 h-3" />טופל
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(m.id, "not_handled")} className="gap-1">
                    <Clock className="w-3 h-3" />לא טופל
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(m.id)} className="gap-1 text-destructive mr-auto">
                    <Trash2 className="w-3 h-3" />מחק
                  </Button>
                </div>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">אין פניות</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMessages;