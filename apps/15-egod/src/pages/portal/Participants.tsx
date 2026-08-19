import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Search, Phone, Mail, UserCheck, UserX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const Participants = () => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ full_name: "", phone: "", email: "", lesson_id: "" });

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
    if (!profile) return;
    const { data: lessonsData } = await supabase.from("lessons").select("*").eq("teacher_id", profile.id);
    setLessons(lessonsData || []);
    if (lessonsData && lessonsData.length > 0) {
      const ids = lessonsData.map(l => l.id);
      const { data: parts } = await supabase.from("participants").select("*").in("lesson_id", ids).order("full_name");
      setParticipants(parts || []);
    }
  };

  const handleAdd = async () => {
    if (!newParticipant.full_name || !newParticipant.lesson_id) { toast.error("נא למלא שם ושיעור"); return; }
    const { error } = await supabase.from("participants").insert(newParticipant);
    if (error) { toast.error("שגיאה"); return; }
    toast.success("משתתף נוסף!");
    setShowAdd(false);
    setNewParticipant({ full_name: "", phone: "", email: "", lesson_id: "" });
    fetchData();
  };

  const filtered = participants.filter(p => {
    const matchSearch = p.full_name.includes(search) || (p.phone || "").includes(search);
    const matchLesson = !selectedLesson || p.lesson_id === selectedLesson;
    return matchSearch && matchLesson;
  });

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-secondary" />משתתפים
            </h1>
            <p className="text-muted-foreground text-sm mt-1">ניהול משתתפי השיעורים שלך</p>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="bg-secondary text-secondary-foreground hover:bg-gold-dark"><Plus className="w-4 h-4 ml-2" />הוסף משתתף</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>הוסף משתתף חדש</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div><label className="text-sm font-medium mb-1 block">שיעור *</label>
                  <Select value={newParticipant.lesson_id} onValueChange={(v) => setNewParticipant(p => ({ ...p, lesson_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="בחר שיעור" /></SelectTrigger>
                    <SelectContent>{lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.subject}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium mb-1 block">שם מלא *</label>
                  <Input value={newParticipant.full_name} onChange={(e) => setNewParticipant(p => ({ ...p, full_name: e.target.value }))} placeholder="שם מלא" /></div>
                <div><label className="text-sm font-medium mb-1 block">טלפון</label>
                  <Input value={newParticipant.phone} onChange={(e) => setNewParticipant(p => ({ ...p, phone: e.target.value }))} placeholder="050-0000000" /></div>
                <div><label className="text-sm font-medium mb-1 block">מייל</label>
                  <Input value={newParticipant.email} onChange={(e) => setNewParticipant(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" dir="ltr" /></div>
                <Button onClick={handleAdd} className="w-full bg-secondary text-secondary-foreground hover:bg-gold-dark">שמור</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="חיפוש לפי שם או טלפון" value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
          <Select value={selectedLesson} onValueChange={setSelectedLesson}>
            <SelectTrigger className="w-48"><SelectValue placeholder="כל השיעורים" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">כל השיעורים</SelectItem>
              {lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.subject}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${p.is_active ? "bg-green-100" : "bg-red-100"}`}>
                  {p.is_active ? <UserCheck className="w-5 h-5 text-green-600" /> : <UserX className="w-5 h-5 text-red-500" />}
                </div>
                <div>
                  <p className="font-medium text-foreground">{p.full_name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
                    {p.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{participants.length === 0 ? "אין משתתפים עדיין. הוסף את המשתתפים הראשונים!" : "לא נמצאו תוצאות"}</p>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
};

export default Participants;