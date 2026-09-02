import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Check, X, Send, AlertCircle, StickyNote } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import FeatureLocked from "@/components/portal/FeatureLocked";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Attendance = () => {
  const { user } = useAuth();
  const { locked, checked } = useFeatureGate("attendance");
  const [lessons, setLessons] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [absentStreaks, setAbsentStreaks] = useState<Record<string, number>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => { if (user) loadInit(); }, [user]);
  useEffect(() => { if (selectedLesson) loadAttendance(); }, [selectedLesson, date]);

  const loadInit = async () => {
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
    if (!profile) return;
    const { data: lessonsData } = await supabase.from("lessons").select("*").eq("teacher_id", profile.id).eq("is_active", true);
    setLessons(lessonsData || []);
    if (lessonsData?.[0]) setSelectedLesson(lessonsData[0].id);
  };

  const loadAttendance = async () => {
    const { data: parts } = await supabase.from("participants").select("*").eq("lesson_id", selectedLesson).order("full_name");
    setParticipants(parts || []);
    const { data: att } = await supabase.from("attendance").select("*").eq("lesson_id", selectedLesson).eq("date", date);
    setAttendance(att || []);

    // Calculate absent streaks (last 5 sessions)
    const { data: history } = await supabase.from("attendance").select("*").eq("lesson_id", selectedLesson)
      .order("date", { ascending: false }).limit(500);
    const streaks: Record<string, number> = {};
    (parts || []).forEach((p: any) => {
      const sessions = Array.from(new Set((history || []).map((h: any) => h.date))).slice(0, 5);
      let streak = 0;
      for (const d of sessions) {
        const rec = (history || []).find((h: any) => h.date === d && h.participant_id === p.id);
        if (rec && !rec.was_present) streak++;
        else break;
      }
      streaks[p.id] = streak;
    });
    setAbsentStreaks(streaks);
  };

  const toggle = async (participantId: string, present: boolean) => {
    const existing = attendance.find(a => a.participant_id === participantId);
    if (existing) {
      await supabase.from("attendance").update({ was_present: present }).eq("id", existing.id);
    } else {
      await supabase.from("attendance").insert({ participant_id: participantId, lesson_id: selectedLesson, date, was_present: present });
    }
    loadAttendance();
  };

  const openNoteEditor = (p: any) => {
    setEditingNote(p.id);
    setNoteDraft(getStatus(p.id)?.notes || "");
  };

  const saveNote = async (participantId: string) => {
    const existing = attendance.find(a => a.participant_id === participantId);
    const trimmed = noteDraft.trim();
    if (existing) {
      await supabase.from("attendance").update({ notes: trimmed || null }).eq("id", existing.id);
    } else {
      await supabase.from("attendance").insert({ participant_id: participantId, lesson_id: selectedLesson, date, notes: trimmed || null });
    }
    setEditingNote(null);
    loadAttendance();
  };

  const sendEncouragement = (p: any) => {
    if (!p.phone) { toast.error("אין מספר טלפון למשתתף זה"); return; }
    const msg = encodeURIComponent(`שלום ${p.full_name}, התגעגענו אליך בשיעור! נשמח לראותך בשיעור הקרוב 🌿`);
    window.open(`https://wa.me/${p.phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
  };

  const getStatus = (pid: string) => attendance.find(a => a.participant_id === pid);
  const presentCount = attendance.filter(a => a.was_present).length;
  const absentCount = attendance.filter(a => !a.was_present).length;

  if (checked && locked) {
    return <PortalLayout><FeatureLocked /></PortalLayout>;
  }

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-secondary" />מעקב נוכחות
          </h1>
          <p className="text-muted-foreground text-sm mt-1">סמן מי השתתף בשיעור ושלח עידוד לנעדרים</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 bg-card p-4 rounded-2xl border border-border">
          <Select value={selectedLesson} onValueChange={setSelectedLesson}>
            <SelectTrigger className="w-60"><SelectValue placeholder="בחר שיעור" /></SelectTrigger>
            <SelectContent>{lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.subject}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          <div className="flex gap-2 mr-auto items-center">
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">נוכחים: {presentCount}</Badge>
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">נעדרים: {absentCount}</Badge>
            <Badge variant="outline">סה"כ: {participants.length}</Badge>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {participants.map((p, i) => {
            const status = getStatus(p.id);
            const streak = absentStreaks[p.id] || 0;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{p.full_name}</p>
                    {streak >= 2 && (
                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 gap-1">
                        <AlertCircle className="w-3 h-3" />נעדר {streak} שיעורים
                      </Badge>
                    )}
                  </div>
                  {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                  {editingNote === p.id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="הערה (למשל: הגיע באיחור)" className="h-8 text-xs" autoFocus
                        onKeyDown={(e) => e.key === "Enter" && saveNote(p.id)} />
                      <Button size="sm" className="h-8" onClick={() => saveNote(p.id)}>שמור</Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingNote(null)}>ביטול</Button>
                    </div>
                  ) : status?.notes ? (
                    <button onClick={() => openNoteEditor(p)} className="text-xs text-muted-foreground mt-1 flex items-center gap-1 hover:text-foreground">
                      <StickyNote className="w-3 h-3" />{status.notes}
                    </button>
                  ) : null}
                </div>

                {streak >= 2 && p.phone && (
                  <Button size="sm" variant="outline" onClick={() => sendEncouragement(p)} className="gap-1">
                    <Send className="w-3 h-3" />שלח עידוד
                  </Button>
                )}

                {editingNote !== p.id && !status?.notes && (
                  <Button size="sm" variant="ghost" onClick={() => openNoteEditor(p)} title="הוסף הערה">
                    <StickyNote className="w-4 h-4" />
                  </Button>
                )}

                <div className="flex gap-1">
                  <Button size="sm"
                    variant={status?.was_present === true ? "default" : "outline"}
                    className={status?.was_present === true ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => toggle(p.id, true)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm"
                    variant={status?.was_present === false ? "default" : "outline"}
                    className={status?.was_present === false ? "bg-red-600 hover:bg-red-700" : ""}
                    onClick={() => toggle(p.id, false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}

          {participants.length === 0 && selectedLesson && (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">אין משתתפים בשיעור זה. הוסף משתתפים בעמוד "משתתפים".</p>
            </div>
          )}
          {!selectedLesson && (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">בחר שיעור כדי לסמן נוכחות</p>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
};

export default Attendance;