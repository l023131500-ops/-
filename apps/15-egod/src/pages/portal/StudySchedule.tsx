import { useState, useEffect, useRef } from "react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import { Calendar, Plus, ChevronRight, ChevronLeft, Star, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const daysOfWeek = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "שבת"];

const StudySchedule = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [dailyEntries, setDailyEntries] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [newSchedule, setNewSchedule] = useState({ topic: "", pace_type: "pages", pace_amount: 1, lesson_id: "", start_date: "" });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
    if (!prof) return;
    setProfile(prof);

    const { data: lessonsData } = await supabase.from("lessons").select("*").eq("teacher_id", prof.id);
    setLessons(lessonsData || []);

    if (lessonsData && lessonsData.length > 0) {
      const ids = lessonsData.map(l => l.id);
      const { data: sched } = await supabase.from("study_schedule").select("*").in("lesson_id", ids);
      setSchedules(sched || []);

      if (sched && sched.length > 0) {
        const schedIds = sched.map(s => s.id);
        const { data: daily } = await supabase.from("study_daily").select("*").in("schedule_id", schedIds);
        setDailyEntries(daily || []);
      }
    }
  };

  const exportMonthAsPng = async () => {
    if (!exportRef.current) { toast.error("לא ניתן לייצא"); return; }
    try {
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `lesson-schedule-${monthName}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("הלוח הורד!");
    } catch (e) {
      toast.error("שגיאה בייצוא");
    }
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.topic || !newSchedule.lesson_id || !newSchedule.start_date) {
      toast.error("נא למלא את כל השדות");
      return;
    }
    const { error } = await supabase.from("study_schedule").insert({
      lesson_id: newSchedule.lesson_id,
      topic: newSchedule.topic,
      pace_type: newSchedule.pace_type,
      pace_amount: newSchedule.pace_amount,
      start_date: newSchedule.start_date,
    });
    if (error) { toast.error("שגיאה בשמירה"); return; }
    toast.success("הספק לימודי נוסף!");
    setShowAdd(false);
    setNewSchedule({ topic: "", pace_type: "pages", pace_amount: 1, lesson_id: "", start_date: "" });
    fetchData();
  };

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getDayColor = (date: Date) => {
    const day = date.getDay();
    if (day === 6) return "bg-blue-50 text-blue-700 border-blue-200"; // שבת
    if (day === 5) return "bg-yellow-50 text-yellow-700 border-yellow-200"; // שישי
    return "bg-card border-border";
  };

  const getDailyContent = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return dailyEntries.find(d => d.date === dateStr);
  };

  const monthName = currentDate.toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  return (
    <PortalLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-6 h-6 text-secondary" />
              הספק לימודי
            </h1>
            <p className="text-muted-foreground text-sm mt-1">ניהול וצפייה בלוח ההספק הלימודי שלך</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportMonthAsPng} variant="outline" size="sm">
              <Download className="w-4 h-4 ml-1" />ייצא PNG
            </Button>
            <Select value={view} onValueChange={(v) => setView(v as any)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">חודשי</SelectItem>
                <SelectItem value="week">שבועי</SelectItem>
                <SelectItem value="list">רשימה</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button className="bg-secondary text-secondary-foreground hover:bg-gold-dark">
                  <Plus className="w-4 h-4 ml-2" />הוסף הספק
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>הוסף הספק לימודי חדש</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">שיעור</label>
                    <Select value={newSchedule.lesson_id} onValueChange={(v) => setNewSchedule(p => ({ ...p, lesson_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="בחר שיעור" /></SelectTrigger>
                      <SelectContent>{lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.subject}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-sm font-medium mb-1 block">נושא</label>
                    <Input value={newSchedule.topic} onChange={(e) => setNewSchedule(p => ({ ...p, topic: e.target.value }))} placeholder='למשל: מסכת ברכות' /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium mb-1 block">סוג קצב</label>
                      <Select value={newSchedule.pace_type} onValueChange={(v) => setNewSchedule(p => ({ ...p, pace_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pages">עמודים ליום</SelectItem>
                          <SelectItem value="dapim">דפים ליום</SelectItem>
                          <SelectItem value="halachot">הלכות ליום</SelectItem>
                          <SelectItem value="chapters">פרקים ליום</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><label className="text-sm font-medium mb-1 block">כמות</label>
                      <Input type="number" min={1} value={newSchedule.pace_amount} onChange={(e) => setNewSchedule(p => ({ ...p, pace_amount: parseInt(e.target.value) || 1 }))} /></div>
                  </div>
                  <div><label className="text-sm font-medium mb-1 block">תאריך התחלה</label>
                    <Input type="date" value={newSchedule.start_date} onChange={(e) => setNewSchedule(p => ({ ...p, start_date: e.target.value }))} /></div>
                  <Button onClick={handleAddSchedule} className="w-full bg-secondary text-secondary-foreground hover:bg-gold-dark">שמור</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Active Schedules */}
        {schedules.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((s) => (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-card rounded-2xl p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-secondary" />
                  <span className="font-heading font-bold text-foreground">{s.topic}</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  קצב: {s.pace_amount} {s.pace_type === "pages" ? "עמודים" : s.pace_type === "dapim" ? "דפים" : s.pace_type === "halachot" ? "הלכות" : "פרקים"} ליום
                </p>
                <p className="text-muted-foreground text-xs mt-1">התחלה: {new Date(s.start_date).toLocaleDateString("he-IL")}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Calendar View */}
        {view === "month" && (
          <div ref={exportRef} className="bg-card rounded-2xl border border-border overflow-hidden">
            {/* Branded header for export */}
            <div className="bg-gradient-to-l from-secondary/20 to-secondary/5 p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                {profile?.rabbi_photo_url && (
                  <img src={profile.rabbi_photo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-secondary" crossOrigin="anonymous" />
                )}
                <div>
                  <p className="font-heading font-bold text-foreground">{profile?.full_name || "לוח הספק לימודי"}</p>
                  <p className="text-xs text-muted-foreground">{schedules[0]?.topic || "לוח הספק חודשי"}</p>
                </div>
              </div>
              {profile?.logo_url && (
                <img src={profile.logo_url} alt="" className="h-10 object-contain" crossOrigin="anonymous" />
              )}
            </div>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
              <h2 className="font-heading text-lg font-bold">{monthName}</h2>
              <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-7">
              {daysOfWeek.map((d) => (
                <div key={d} className="p-2 text-center text-xs font-bold text-muted-foreground border-b border-border bg-muted">{d}</div>
              ))}
              {Array.from({ length: startDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} className="p-2 border border-border min-h-[80px]" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const date = new Date(year, month, i + 1);
                const daily = getDailyContent(date);
                const colorClass = getDayColor(date);
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div key={i} className={`p-2 border border-border min-h-[80px] ${colorClass} ${isToday ? "ring-2 ring-secondary ring-inset" : ""}`}>
                    <span className={`text-xs font-bold ${isToday ? "text-secondary" : ""}`}>{i + 1}</span>
                    {daily && (
                      <div className="mt-1">
                        <p className="text-[10px] text-foreground truncate">{daily.content}</p>
                        {daily.is_special && <Star className="w-3 h-3 text-secondary inline" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Branded footer for export */}
            <div className="p-3 text-center text-xs text-muted-foreground border-t border-border bg-muted/30">
              בסיוע איגוד השיעורים · 023131600
            </div>
          </div>
        )}

        {/* Empty State */}
        {schedules.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">אין הספק לימודי עדיין</h3>
            <p className="text-muted-foreground mb-4">הוסף שיעור ראשון ולאחר מכן הגדר את ההספק הלימודי.</p>
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default StudySchedule;