import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Search, Phone, Mail, UserCheck, UserX, Send, History, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import FeatureLocked from "@/components/portal/FeatureLocked";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Participants = () => {
  const { user } = useAuth();
  const { locked, checked } = useFeatureGate("participants");
  const [participants, setParticipants] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ full_name: "", phone: "", email: "", lesson_id: "" });
  const [showNotify, setShowNotify] = useState(false);
  const [notifyLesson, setNotifyLesson] = useState("");
  const [notifyChannel, setNotifyChannel] = useState<"email" | "whatsapp" | "both">("email");
  const [notifySubject, setNotifySubject] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  const fetchHistory = async () => {
    if (lessons.length === 0) return;
    setLoadingHistory(true);
    const ids = lessons.map(l => l.id);
    const { data, error } = await supabase
      .from("notifications_log")
      .select("*")
      .in("lesson_id", ids)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setHistory(data || []);
    setLoadingHistory(false);
  };

  useEffect(() => { if (showHistory) fetchHistory(); }, [showHistory]);

  const handleNotify = async () => {
    if (!notifyLesson) { toast.error("נא לבחור שיעור"); return; }
    if (!notifyMessage.trim()) { toast.error("נא להזין תוכן הודעה"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-participants", {
        body: { lesson_id: notifyLesson, subject: notifySubject.trim() || undefined, message: notifyMessage.trim(), channel: notifyChannel },
      });
      if (error) throw error;
      if ((data as any)?.ok === false) throw new Error((data as any).error || "שליחה נכשלה");
      const { sent = 0, simulated = 0, failed = 0, results = [] } = data as any;
      const waLinks = results.filter((r: any) => r.channel === "whatsapp" && r.wa_link);
      waLinks.forEach((r: any) => window.open(r.wa_link, "_blank"));
      toast.success(`נשלח: ${sent} מייל, ${simulated} סימולציה/וואטסאפ${failed ? `, ${failed} נכשלו` : ""}`);
      setShowNotify(false);
      setNotifySubject("");
      setNotifyMessage("");
    } catch (e: any) {
      toast.error(e.message || "שגיאה בשליחת ההודעה");
    } finally {
      setSending(false);
    }
  };

  const filtered = participants.filter(p => {
    const matchSearch = p.full_name.includes(search) || (p.phone || "").includes(search);
    const matchLesson = !selectedLesson || p.lesson_id === selectedLesson;
    return matchSearch && matchLesson;
  });

  if (checked && locked) {
    return <PortalLayout><FeatureLocked /></PortalLayout>;
  }

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
          <div className="flex gap-2">
            <Dialog open={showHistory} onOpenChange={setShowHistory}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={lessons.length === 0}><History className="w-4 h-4 ml-2" />היסטוריית הודעות</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>היסטוריית הודעות שנשלחו</DialogTitle></DialogHeader>
                <div className="space-y-2 mt-2 max-h-[60vh] overflow-y-auto">
                  {loadingHistory && <p className="text-sm text-muted-foreground text-center py-6">טוען...</p>}
                  {!loadingHistory && history.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">לא נשלחו הודעות עדיין.</p>
                  )}
                  {!loadingHistory && history.map((h) => {
                    const lessonSubject = lessons.find(l => l.id === h.lesson_id)?.subject;
                    const participantName = participants.find(p => p.id === h.participant_id)?.full_name;
                    const statusMeta = h.status === "sent"
                      ? { icon: CheckCircle2, cls: "text-green-600", label: "נשלח" }
                      : h.status === "failed"
                        ? { icon: XCircle, cls: "text-red-500", label: "נכשל" }
                        : { icon: Clock, cls: "text-amber-500", label: "סימולציה" };
                    const StatusIcon = statusMeta.icon;
                    return (
                      <div key={h.id} className="bg-card rounded-lg p-3 border border-border text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            {h.channel === "email" ? <Mail className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                            {participantName || h.recipient}
                          </div>
                          <div className={`flex items-center gap-1 text-xs ${statusMeta.cls}`}>
                            <StatusIcon className="w-3.5 h-3.5" />{statusMeta.label}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {lessonSubject && `${lessonSubject} · `}{h.recipient} · {new Date(h.created_at).toLocaleString("he-IL")}
                        </p>
                        {h.status === "failed" && h.error && (
                          <p className="text-xs text-red-500 mt-1">{h.error}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showNotify} onOpenChange={setShowNotify}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={lessons.length === 0}><Send className="w-4 h-4 ml-2" />שלח הודעה לתלמידים</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>שליחת הודעה למשתתפים</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div><label className="text-sm font-medium mb-1 block">שיעור *</label>
                    <Select value={notifyLesson} onValueChange={setNotifyLesson}>
                      <SelectTrigger><SelectValue placeholder="בחר שיעור" /></SelectTrigger>
                      <SelectContent>{lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.subject}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">ערוץ שליחה</label>
                    <RadioGroup value={notifyChannel} onValueChange={(v) => setNotifyChannel(v as any)} className="flex gap-4">
                      <div className="flex items-center gap-2"><RadioGroupItem value="email" id="ch-email" /><Label htmlFor="ch-email">מייל</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="whatsapp" id="ch-wa" /><Label htmlFor="ch-wa">וואטסאפ</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="both" id="ch-both" /><Label htmlFor="ch-both">שניהם</Label></div>
                    </RadioGroup>
                  </div>
                  <div><label className="text-sm font-medium mb-1 block">נושא (למייל)</label>
                    <Input value={notifySubject} onChange={(e) => setNotifySubject(e.target.value)} placeholder="עדכון שיעור" /></div>
                  <div><label className="text-sm font-medium mb-1 block">תוכן ההודעה *</label>
                    <Textarea value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} placeholder="לדוגמה: השיעור השבוע יתקיים באיחור של חצי שעה" rows={4} /></div>
                  <p className="text-xs text-muted-foreground">ההודעה תישלח לכל המשתתפים הפעילים בשיעור שיש להם פרטי קשר מתאימים.</p>
                  <Button onClick={handleNotify} disabled={sending} className="w-full bg-secondary text-secondary-foreground hover:bg-gold-dark">
                    {sending ? "שולח..." : "שלח"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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