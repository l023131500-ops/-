import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const AdminTips = () => {
  const [tips, setTips] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [displayDate, setDisplayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const fetchTips = async () => {
    const { data } = await supabase.from("tips").select("*").order("created_at", { ascending: false });
    setTips(data || []);
  };

  useEffect(() => { fetchTips(); }, []);

  const addTip = async () => {
    if (!title || !content) return;
    const { error } = await supabase.from("tips").insert({ title, content, display_date: displayDate || null });
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "הטיפ נוסף בהצלחה" });
      setTitle(""); setContent(""); setDisplayDate(new Date().toISOString().slice(0, 10)); setOpen(false);
      fetchTips();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("tips").update({ is_active: !current }).eq("id", id);
    fetchTips();
  };

  // TipsSection.tsx (the public homepage carousel) orders active tips by
  // display_date descending — until now nothing ever wrote this column, so
  // every tip's order there was an unset NULL and the "order by date" was a
  // no-op. Written immediately on change, same as toggleActive above.
  const updateDisplayDate = async (id: string, value: string) => {
    setTips(prev => prev.map(t => t.id === id ? { ...t, display_date: value || null } : t));
    await supabase.from("tips").update({ display_date: value || null }).eq("id", id);
  };

  const deleteTip = async (id: string) => {
    await supabase.from("tips").delete().eq("id", id);
    fetchTips();
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">ניהול טיפים</h1>
            <p className="text-muted-foreground">טיפים יומיים למגידי השיעורים</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 ml-2" />הוסף טיפ</Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>טיפ חדש</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="כותרת הטיפ" value={title} onChange={e => setTitle(e.target.value)} />
                <Textarea placeholder="תוכן הטיפ" value={content} onChange={e => setContent(e.target.value)} rows={4} />
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">תאריך הצגה (קובע את סדר ההצגה בעמוד הבית)</label>
                  <Input type="date" value={displayDate} onChange={e => setDisplayDate(e.target.value)} />
                </div>
                <Button onClick={addTip} className="w-full">שמור</Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        <div className="space-y-3">
          {tips.map(tip => (
            <motion.div key={tip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-card rounded-xl border border-border p-4 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tip.is_active ? "bg-secondary/10" : "bg-muted"}`}>
                <Lightbulb className={`w-5 h-5 ${tip.is_active ? "text-secondary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground">{tip.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{tip.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-xs text-muted-foreground shrink-0">תאריך הצגה:</label>
                  <Input type="date" value={tip.display_date || ""} onChange={e => updateDisplayDate(tip.id, e.target.value)} className="w-40 h-8 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant={tip.is_active ? "outline" : "default"} onClick={() => toggleActive(tip.id, tip.is_active)}>
                  {tip.is_active ? "השבת" : "הפעל"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteTip(tip.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}
          {tips.length === 0 && (
            <p className="text-center text-muted-foreground py-8">אין טיפים עדיין</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTips;